import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` (run on install) needs no database, so a missing URL must not break it;
  // migrate commands still fail loudly without one.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
