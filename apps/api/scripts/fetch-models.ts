/**
 * Downloads the face-detection model once and verifies its SHA-256 before it is ever loaded.
 * The weights are not committed: InsightFace models are licensed for non-commercial research only.
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FACE_MODEL } from '../src/constants';

const modelsDir = path.resolve(process.env.MODELS_DIR ?? './models');
const target = path.join(modelsDir, FACE_MODEL.FILE_NAME);

async function sha256OfFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function main(): Promise<void> {
  if (existsSync(target) && (await sha256OfFile(target)) === FACE_MODEL.SHA256) {
    console.log(`✓ ${FACE_MODEL.FILE_NAME} already present and verified`);
    return;
  }

  console.log(`Downloading ${FACE_MODEL.FILE_NAME} (${FACE_MODEL.SIZE_BYTES.toLocaleString()} bytes)…`);
  const response = await fetch(FACE_MODEL.DOWNLOAD_URL);
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());

  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== FACE_MODEL.SHA256) {
    throw new Error(`Checksum mismatch for ${FACE_MODEL.FILE_NAME}: expected ${FACE_MODEL.SHA256}, got ${digest}`);
  }

  await mkdir(modelsDir, { recursive: true });
  const temporary = `${target}.download`;
  await writeFile(temporary, bytes);
  await rm(target, { force: true });
  await rename(temporary, target);
  console.log(`✓ Saved and verified ${path.relative(process.cwd(), target)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
