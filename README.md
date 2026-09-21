# Aragon.ai: selfie upload & validation

Users upload selfies. Each photo is stored, validated **asynchronously** on the server, and sorted into **Accepted** or **Rejected**, and every rejection says why. The UI updates live.

**Stack:** React 19 · Vite 8 · TanStack Query · Tailwind 4 · Node 24 · Express 5 · Prisma 7 · PostgreSQL 17 · S3 (RustFS locally) · sharp · heic-decode · SCRFD face detection on ONNX Runtime

> Why each piece was chosen, and what we rejected: **[docs/DECISIONS.md](docs/DECISIONS.md)**

---

## Quick start

Needs **Node 24** (`nvm use`) and **Docker**, on macOS arm64 or Linux x64. `onnxruntime-node` ≥ 1.24 no longer ships Intel-Mac binaries.

```bash
cp apps/api/.env.example apps/api/.env
npm install
npm run setup   # starts Postgres + RustFS, runs migrations, downloads the face model and checks its SHA-256
npm run dev     # API :4000 + worker + web :5173
```
Open http://localhost:5173. The RustFS console is at http://localhost:9001 (login `aragon-dev` / `aragon-dev-secret`).

```bash
npm test          # all workspaces
npm run typecheck
```

---

## Architecture

```
 Browser (React)                        API (Express)                         PostgreSQL
 ───────────────                        ─────────────                         ──────────
 client checks: extension,     POST     multer (memory, 20 MB, 1 file)       users
 magic bytes, size ─────────▶ /images   magic-byte sniff → 415 if not         images  ◀── also the job queue
 XHR per file (upload %)                JPEG/PNG/HEIC                          (status = PENDING)
                                        S3 put original → INSERT PENDING ───▶
 TanStack Query polls          GET      → 202 ImageDto
 GET /images only while ◀─── /images    signed thumbnail URLs (10 min)
 something is in flight
                                                                             ▲  claim: UPDATE … WHERE id IN
 <img src=signed URL> ◀── S3 (RustFS / AWS), private bucket                  │  (SELECT … FOR UPDATE SKIP LOCKED)
                              ▲                                              │
                              │ originals, normalized.jpg, thumbnail.jpg     │
                              └────────────── Worker (separate process) ─────┘
                                   decode → checks (stop at first failure) → finalize
```

- **The `images` table is the queue.** Inserting the row *is* enqueuing it, so a job can never be lost between two systems. Workers claim batches with `FOR UPDATE SKIP LOCKED`: several workers can run in parallel and never grab the same image. Delivery is at-least-once, and every finalising update is guarded by `status = 'PROCESSING'`, so processing an image twice is harmless. A crashed worker's rows are reclaimed after 5 minutes; after 3 failed attempts a row is marked `FAILED`.
- **The worker runs in its own process.** ONNX inference blocks the event loop and image decoding is memory-heavy, so the API stays responsive, and a hostile image can't take it down.
- **Anonymous ownership.** A signed httpOnly cookie identifies the uploader. Every query is scoped to that user, and another user's image returns 404 so its existence isn't leaked.

## Validation pipeline

Cheapest checks run first, and the **first failure rejects the photo** with a single clear reason. All thresholds are in [`apps/api/src/constants.ts`](apps/api/src/constants.ts).

| # | Check | Rule | Reason |
|---|-------|------|--------|
| 0 | Format (browser + API) | Magic bytes are JPEG, PNG, or HEIC. HEIC means an HEVC brand appears anywhere in `ftyp`; AVIF is rejected. Extension and MIME type are ignored | 415 `UNSUPPORTED_FORMAT` |
| 1 | File size | ≥ 50 KB (max 20 MB, enforced by the upload middleware) | `FILE_TOO_SMALL` |
| 2 | Decode | HEIC → **heic-decode** (pixel count checked *before* decoding) → sharp. JPEG/PNG → sharp with auto-orientation and a 64 MP decompression-bomb limit. EXIF/GPS stripped | `UNREADABLE` |
| 3 | Resolution | Short side ≥ 512 px (after orientation) | `RESOLUTION_TOO_LOW` |
| 4 | Faces | **SCRFD-10G** with InsightFace defaults (`det_size` 640, `det_thresh` 0.5, NMS 0.4). No detection ≥ 0.5 → no face. Main face = largest box. A second face with ≥ 10% of the main face's area → multiple. Main face < 15% of the image height or < 100 px → too small | `NO_FACE` · `MULTIPLE_FACES` · `FACE_TOO_SMALL` |
| 5 | Blur | Variance of the Laplacian **on the padded face crop**, resized to 256 px, so portrait-mode backgrounds don't count | `BLURRY` |
| 6 | Near-duplicate | 64-bit dHash, Hamming distance ≤ 6 against the user's accepted photos, computed in SQL: `bit_count(hash # $1)`. Runs **inside the accept transaction under `pg_advisory_xact_lock(user)`**, so two near-identical photos processed at the same moment can't both be accepted | `DUPLICATE` |

Rejected photos still get a thumbnail, so the user can see *which* photo was rejected.

**HEIC:** sharp's prebuilt binaries can't decode HEVC-coded HEIC because of patents. We decode with `heic-decode` (libheif compiled to WASM) and encode with sharp. This is why the brief's "sharp or imagemagick" is sharp for encoding and libheif for decoding.

## REST API

| Method | Path | Response |
|--------|------|----------|
| `POST` | `/api/images` (multipart field `file`) | `202` ImageDto (`PENDING`) · `400` no file · `413` > 20 MB · `415` not JPEG/PNG/HEIC · `429` rate-limited |
| `GET` | `/api/images?status=&limit=&cursor=` | `200 { items, nextCursor }`: your photos, newest first, keyset-paginated |
| `GET` | `/api/images/:id` | `200` ImageDto · `404` |
| `DELETE` | `/api/images/:id` | `204`: the row is deleted first, then the S3 objects |
| `GET` | `/api/health` | `200` / `503` |

There's no `PUT`/`PATCH` because a user has nothing to edit on a photo. Errors always look like `{ "error": { "code", "message" } }`.

## Data model

`users (id)` 1—N `images (id, user_id, original_name, format, size_bytes, status, rejection_reason, width, height, original_key, normalized_key, thumbnail_key, perceptual_hash BIGINT, blur_score, faces JSONB, attempts, locked_at, last_error, created_at, updated_at, processed_at)`

Indexes:
- `(user_id, created_at DESC, id DESC)` for the gallery.
- Partial `(created_at) WHERE status IN ('PENDING','PROCESSING')`: the worker's claim scans only the backlog.
- Partial `(user_id) WHERE status = 'ACCEPTED'` for the duplicate scan.

`faces` and `blur_score` are kept for auditing and threshold tuning. They include the top detection score even when a photo is rejected as "no face".

## Security

- **Uploads:** multer 2.4 (patched against the 2026 DoS advisories), memory storage, strict limits, and no async `fileFilter`. Magic-byte sniffing happens server-side. The client's file name is display text only, never part of a storage key.
- **Storage:** keys are server-generated UUIDs (`users/{userId}/{imageId}/…`). The bucket is private, and images are served through 10-minute signed URLs.
- **Hardening:** sharp may only open JPEG/PNG buffers (loader allow-list); pixel limits are checked before decoding.
- **HTTP:** helmet, a rate limit on uploads, zod-validated params and queries, and no stack traces in responses.
- **Supply chain:** npm `allowScripts` lists exactly the four packages allowed to run install scripts. The model file is checked against a pinned SHA-256.

## Project layout

```
packages/shared   rules shared by browser and API: formats + magic bytes, limits, rejection reasons, DTO types
apps/api          src/http (routes, session, upload, errors) · src/images (service, mapper) · src/storage (S3)
                  src/processing (queue, processor, worker, checks/) · src/imaging (decoder, SCRFD, laplacian, dhash)
                  server.ts / worker.ts = composition roots · constants.ts = every tunable · config.ts = env (zod)
apps/web          src/api (ApiClient) · src/hooks (useImages polling, useUploads reducer) · src/lib (validation, card model) · src/components
```

## Trade-offs & next steps

- **Direct-to-S3 uploads** (presigned POST with `content-length-range`), so large batches never pass through the API.
- **Push instead of poll:** SSE fed by Postgres `LISTEN/NOTIFY`.
- **Global dedup at scale:** split the 64-bit hash into bands and index each (multi-index hashing), or use a pgvector `bit` HNSW index.
- **Shared rate-limit store** (Redis) when running more than one API instance; an S3 lifecycle rule for orphaned objects; real auth.
- **Face-model licence:** InsightFace's pretrained SCRFD weights are **non-commercial research only**. They're fine for this exercise and are downloaded rather than redistributed. In production: license them, train your own, or swap in MIT-licensed YuNet behind the same `FaceDetector` interface.
- **CORS:** in development the web app reaches the API through Vite's proxy, so everything is same-origin. A small single-origin CORS middleware covers split deployments.
- **Anonymous session:** the cookie is created on the first upload. To stop a new visitor's parallel first uploads from each creating a separate user, the client uploads one file at a time until a session exists, then three in parallel. Issuing the session on the first `GET` would remove the need for this.
- **Blur threshold** (100) was calibrated on real phone selfies: sharp 823–863, motion-blurred 44–67. Some low-resolution web headshots score lower, so production should tune it on a labelled set, or also normalise for face size.
- **Retries** return the image to `PENDING` with no backoff. A longer S3/DB outage should use an `available_at` column with exponential backoff.
- **Near-duplicates processed at the same moment:** exactly one is accepted (advisory lock), but lock order decides which one, not upload order.
