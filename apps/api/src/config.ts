import { z } from 'zod';

/**
 * Environment is validated once, at boot. A missing secret should stop the process, not
 * surface as a confusing 500 three hours later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

  /** Comma-separated list of origins allowed to call the API with credentials. */
  CORS_ORIGINS: z.string().default('http://localhost:5190'),

  /**
   * Rate limiting is on everywhere except the test suite, which drives hundreds of signups
   * and signatures from one address and would otherwise be throttling itself.
   */
  RATE_LIMIT_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value !== 'false'),

  /** Signs nothing on its own — used to derive the session cookie signature. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  COOKIE_DOMAIN: z.string().optional(),

  /** Local driver writes here; the S3 driver ignores it. */
  STORAGE_DIR: z.string().default('./storage'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),

  /**
   * Seed an artist mid-flow so the product can be walked through immediately. Explicitly a
   * flag rather than a NODE_ENV check: the compose stack runs in production mode and still
   * wants demo data, and a real deployment must be able to say no in one place.
   */
  SEED_DEMO: z
    .string()
    .default('true')
    .transform((value) => value !== 'false'),

  /** Seeded on first boot so there is always a way in. */
  ADMIN_EMAIL: z.string().default('admin@altar.camp'),
  ADMIN_PASSWORD: z.string().default('AltarCampAdmin!2026'),

  /**
   * Transactional mail (the welcome email). `log` writes each message to the log instead of
   * sending it — development and tests; `smtp` sends through the SMTP_* account.
   */
  MAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** The sending address. Empty means SMTP_USER, which is the only one most providers accept. */
  MAIL_FROM: z.string().optional(),
  MAIL_FROM_NAME: z.string().default('Altar.Camp'),
  /** Replies reach Altar.Camp whichever mailbox actually sent the message. */
  MAIL_REPLY_TO: z.string().default('support@altar.camp'),

  PUBLIC_WEB_URL: z.string().default('http://localhost:5190'),
});

export type AppConfig = z.infer<typeof envSchema> & {
  isProduction: boolean;
  corsOrigins: string[];
};

let cached: AppConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached;
  const parsed = envSchema
    .superRefine((value, context) => {
      if (value.MAIL_DRIVER !== 'smtp') return;
      for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const) {
        if (!value[key]) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: 'required when MAIL_DRIVER=smtp',
          });
        }
      }
    })
    .safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${problems}`);
  }
  cached = {
    ...parsed.data,
    isProduction: parsed.data.NODE_ENV === 'production',
    corsOrigins: parsed.data.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
  return cached;
}

/** Tests build isolated configs. */
export function resetConfigCache(): void {
  cached = null;
}
