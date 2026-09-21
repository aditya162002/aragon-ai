## 1. The big picture

Four pieces, and each has one job:

```
┌─────────────┐        ┌─────────────┐        ┌──────────────────┐
│   BROWSER   │ ─────▶ │     API     │ ─────▶ │   S3 STORAGE     │  ← the image files
│   (React)   │ ◀───── │  (Express)  │        │ (RustFS locally) │
└─────────────┘        └──────┬──────┘        └────────▲─────────┘
       ▲                      │                        │
       │                      ▼                        │
       │               ┌─────────────┐        ┌────────┴─────────┐
       │               │  POSTGRES   │ ◀────▶ │     WORKER       │  ← does the checking
       │               │ images table│        │ (separate process)│
       │               │ = the queue │        └──────────────────┘
       │               └─────────────┘
       └──── thumbnails come straight from S3 (signed URL), not through the API
```

- **API:** the front door. It accepts files, stores them, and answers "what's the status?"
- **Worker:** the inspector. It does all the heavy image work in the background.
- **Postgres:** the source of truth, and the to-do list for the worker.
- **S3:** holds the actual image bytes.

## 2. Step 1: Upload (browser → API → storage + database)

```
BROWSER                              API                              S3                 POSTGRES
───────                              ───                              ──                 ────────
User picks photos
  │
  ├─ check extension, first bytes, size (50 KB–20 MB)
  │    ✗ fail → card "Rejected · Not uploaded" (file never leaves the browser)
  │    ✓ pass ↓
  │
  └─ POST /api/images  ───────────▶  size cap 20 MB (else 413)
     (1 file per request,            read first bytes: JPEG/PNG/HEIC? (else 415)
      progress % shown)              cookie → who is this user?
                                     (new visitor → create user + cookie)
                                          │
                                          ├─ PUT original ──────────▶ users/{user}/{image}/original
                                          │
                                          └─ INSERT row status=PENDING ───────────────────────▶ images row
                                                                                                (this IS the job)
     ◀──────────── 202 { id, status: PENDING }
```

**Order matters:** the file is stored first, *then* the row is inserted. So the worker can never pick up a job whose file isn't there yet. If the insert fails, the API deletes the orphaned file.

## 3. Step 2: Checking (worker, in the background)

```
WORKER (wakes every 1 s)                                     S3                    POSTGRES
──────                                                       ──                    ────────
Claim up to 4 jobs ◀── UPDATE PENDING → PROCESSING ──────────────────────────────── (FOR UPDATE SKIP LOCKED)
  │
  ├─ GET original ◀───────────────────────────────────────── original
  │
  │   Checks run cheapest first; STOP at the first failure:
  │   ① File size ≥ 50 KB? ................................ else FILE_TOO_SMALL
  │   ② Decode → one "working" JPEG ......................... else UNREADABLE
  │        HEIC → heic-decode → sharp        (this is the HEIC→JPEG conversion)
  │        JPEG/PNG → sharp: rotate upright, strip EXIF/GPS, shrink to ≤ 2048 px
  │   ③ Shortest side ≥ 512 px? ............................. else RESOLUTION_TOO_LOW
  │   ④ Faces (SCRFD model):
  │        none ≥ 0.5 confidence ............................ NO_FACE
  │        second real face ................................. MULTIPLE_FACES
  │        main face < 15% of height ........................ FACE_TOO_SMALL
  │   ⑤ Blur measured on the FACE only ...................... else BLURRY
  │
  ├─ PUT normalized.jpg + thumbnail.jpg ──────────────────▶ (saved even when rejected,
  │                                                          so the user sees WHICH photo failed)
  │
  └─ ⑥ Passed everything? compute fingerprint (dHash)
        [lock this user] ── "similar to one of my ACCEPTED photos?" ──────────────▶ yes → REJECTED (DUPLICATE)
                                                                                    no  → ACCEPTED
```

**Life of a row:**

```
PENDING ──claim──▶ PROCESSING ──all checks pass──▶ ACCEPTED
   ▲                   ├──────── a check fails ──▶ REJECTED (+ reason)
   └── server/DB error ┘ (retry up to 3×) ───────▶ FAILED
```

## 4. Step 3: Showing results (browser pulls)

```
BROWSER                                   API                     POSTGRES           S3
every 1.5 s, ONLY while something
is still pending/processing:
GET /api/images ───────────────────────▶  SELECT my rows ───────▶
                ◀── list + signed thumbnail URLs (valid 10 min)
<img src="signed URL"> ──────────────────────────────────────────────────────────▶ thumbnail.jpg
Card moves: "In progress" (inside upload box) → Accepted ✓ / Rejected ✗ + reason
Polling stops by itself once nothing is in flight.
```

## 5. What's stored where

```
S3 (private bucket)
  users/{userId}/{imageId}/original         exact bytes the user uploaded
                          /normalized.jpg   upright, no EXIF/GPS, ≤ 2048 px (HEIC ends up as JPEG here)
                          /thumbnail.jpg    480 px, the only thing the browser ever displays

POSTGRES
  users   (id)                               anonymous user, identified by a signed cookie
  images  status, rejection reason, size, width/height,
          perceptual_hash, blur_score, faces (JSON), attempts, file keys
```
