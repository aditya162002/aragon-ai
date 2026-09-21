/**
 * Throwaway Postgres schema for integration tests: created from the real migrations, dropped afterwards.
 * Tests get a real database without ever claiming or modifying rows of the development schema.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { createPrismaClient, PrismaClient } from '../../src/db';

const ENV_FILE = fileURLToPath(new URL('../../.env', import.meta.url));
const MIGRATIONS_DIR = new URL('../../prisma/migrations/', import.meta.url);
const MIGRATION_FILE = 'migration.sql';
const SQL_COMMENT = /^\s*--.*$/gm;

export interface TestDatabase {
  prisma: PrismaClient;
  drop(): Promise<void>;
}

/** Returns null when no database is configured or reachable, so callers can skip instead of failing. */
export async function createTestDatabase(): Promise<TestDatabase | null> {
  if (!process.env.DATABASE_URL && existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const schema = `worker_test_${randomUUID().replaceAll('-', '')}`;
  const admin = createPrismaClient(databaseUrl);
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } catch {
    await admin.$disconnect();
    return null;
  }

  // Raw SQL resolves unqualified names through search_path; Prisma's query API uses the adapter's schema.
  const url = new URL(databaseUrl);
  url.searchParams.set('options', `-c search_path=${schema}`);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });
  for (const statement of await migrationStatements()) await prisma.$executeRawUnsafe(statement);

  return {
    prisma,
    async drop() {
      await prisma.$disconnect();
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.$disconnect();
    },
  };
}

async function migrationStatements(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const scripts = await Promise.all(
    directories.map((directory) => readFile(new URL(`${directory}/${MIGRATION_FILE}`, MIGRATIONS_DIR), 'utf8')),
  );
  return scripts
    .flatMap((script) => script.replace(SQL_COMMENT, '').split(';'))
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
