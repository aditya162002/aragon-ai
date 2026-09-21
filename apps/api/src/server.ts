/** API composition root: builds every dependency once, wires them together, and owns the process lifecycle. */
import { createApp } from './app';
import { loadConfig } from './config';
import { createPrismaClient } from './db';
import { SessionManager } from './http/session';
import { ImageService } from './images/image.service';
import { S3StorageService } from './storage/s3-storage.service';
import { UserRepository } from './users/user.repository';

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const storage = new S3StorageService(config.s3);
if (config.s3.autoCreateBucket) await storage.ensureBucket();

const app = createApp({
  config,
  imageService: new ImageService(prisma, storage),
  sessionManager: new SessionManager(new UserRepository(prisma), config),
  checkHealth: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
});

const server = app.listen(config.port, (error?: Error) => {
  if (error) throw error;
  console.log(`API listening on port ${config.port} (${config.env})`);
});

/** Stops accepting connections, lets in-flight requests finish, then releases the database pool. */
function shutDown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down`);
  server.close(async (error) => {
    if (error) console.error('HTTP server closed with an error', error);
    await prisma.$disconnect();
  });
}

for (const signal of SHUTDOWN_SIGNALS) process.once(signal, shutDown);
