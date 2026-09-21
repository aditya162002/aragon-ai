/** Worker composition root: builds the validation pipeline once, then drains the image queue until stopped. */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config';
import { FACE_MODEL, QUEUE, WORKER } from './constants';
import { createPrismaClient } from './db';
import { ImageDecoder } from './imaging/image-decoder';
import { ScrfdFaceDetector } from './imaging/scrfd-face-detector';
import { configureSharp } from './imaging/sharp-setup';
import { createImageChecks } from './processing/checks';
import { describeError } from './processing/describe-error';
import { ImageProcessor } from './processing/image-processor';
import { ImageQueue } from './processing/image-queue';
import { ProcessingWorker } from './processing/processing-worker';
import { ValidationPipeline } from './processing/validation-pipeline';
import { S3StorageService } from './storage/s3-storage.service';

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

const config = loadConfig();
const modelPath = path.resolve(config.modelsDir, FACE_MODEL.FILE_NAME);
if (!existsSync(modelPath)) {
  console.error(`Face detection model not found at ${modelPath}. Run "npm run models:fetch -w @aragon/api" first.`);
  process.exit(WORKER.FAILURE_EXIT_CODE);
}

configureSharp();
const prisma = createPrismaClient(config.databaseUrl);
const storage = new S3StorageService(config.s3);
if (config.s3.autoCreateBucket) await storage.ensureBucket();

const decoder = new ImageDecoder();
const detector = await ScrfdFaceDetector.create(modelPath);
const queue = new ImageQueue(prisma);
const pipeline = new ValidationPipeline(createImageChecks(decoder, detector));
const worker = new ProcessingWorker(queue, new ImageProcessor(storage, pipeline, decoder, queue));

worker.start();
console.log(`Worker started (batch size ${QUEUE.BATCH_SIZE}, polling every ${QUEUE.POLL_INTERVAL_MS}ms)`);

/** Lets the in-flight batch finish recording its verdicts, then releases the database pool. */
async function shutDown(signal: NodeJS.Signals): Promise<void> {
  console.log(`${signal} received, finishing in-flight images`);
  await worker.stop();
  await prisma.$disconnect();
}

for (const signal of SHUTDOWN_SIGNALS) {
  process.once(signal, (received) => {
    shutDown(received).catch((error: unknown) => {
      console.error(`Worker shutdown failed: ${describeError(error)}`);
      process.exitCode = WORKER.FAILURE_EXIT_CODE;
    });
  });
}
