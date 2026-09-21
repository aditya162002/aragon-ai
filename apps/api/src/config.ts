import { z } from 'zod';

const DEFAULT_PORT = 4000;
const MIN_SESSION_SECRET_LENGTH = 32;

/** Environment-specific settings, validated once at startup so misconfiguration fails fast. */
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  WEB_ORIGIN: z.url(),
  DATABASE_URL: z.url(),
  SESSION_SECRET: z.string().min(MIN_SESSION_SECRET_LENGTH),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  S3_AUTO_CREATE_BUCKET: z.stringbool().default(false),
  MODELS_DIR: z.string().default('./models'),
});

export type RawConfig = z.infer<typeof configSchema>;

export interface AppConfig {
  env: RawConfig['NODE_ENV'];
  isProduction: boolean;
  port: number;
  webOrigin: string;
  databaseUrl: string;
  sessionSecret: string;
  modelsDir: string;
  s3: {
    endpoint: string | undefined;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    autoCreateBucket: boolean;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  const raw = result.data;
  return {
    env: raw.NODE_ENV,
    isProduction: raw.NODE_ENV === 'production',
    port: raw.PORT,
    webOrigin: raw.WEB_ORIGIN,
    databaseUrl: raw.DATABASE_URL,
    sessionSecret: raw.SESSION_SECRET,
    modelsDir: raw.MODELS_DIR,
    s3: {
      endpoint: raw.S3_ENDPOINT,
      region: raw.S3_REGION,
      bucket: raw.S3_BUCKET,
      accessKeyId: raw.S3_ACCESS_KEY_ID,
      secretAccessKey: raw.S3_SECRET_ACCESS_KEY,
      forcePathStyle: raw.S3_FORCE_PATH_STYLE,
      autoCreateBucket: raw.S3_AUTO_CREATE_BUCKET,
    },
  };
}
