import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WORKER_PORT: z.coerce.number().int().positive().default(3002),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://cybelinx:cybelinx_dev_password@localhost:5432/cybelinx_platform'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  IDP_PROVIDER: z.string().default('generic'),
  IDP_ISSUER: z.string().optional(),
  IDP_AUDIENCE: z.string().optional(),
  IDP_JWT_SECRET: z.string().optional(),
  IDP_JWKS_URI: z.string().optional(),
  IDP_JWT_CLOCK_SKEW_SECONDS: z.coerce.number().int().min(0).max(300).default(0),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(100).default(5000),
  WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(50),
});

export type Env = z.infer<typeof EnvSchema>;

export const parseEnv = (env: Record<string, unknown>): Env => EnvSchema.parse(env);

export const safeParseEnv = (env: Record<string, unknown>) => EnvSchema.safeParse(env);

export const getDefaultEnv = (): Env => EnvSchema.parse({});

export const isEnv = (value: unknown): value is Env => EnvSchema.safeParse(value).success;