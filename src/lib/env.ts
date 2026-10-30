import { z } from 'zod';

/**
 * Public environment configuration.
 *
 * ONLY values that are safe in a browser bundle belong here. Anything
 * secret — or even the *shape* of anything secret — lives in
 * `env.server.ts`, which is marked `server-only` so importing it from a
 * client component is a build error rather than a silent leak.
 *
 * These are validated eagerly because Next inlines them at build time.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
});

if (!parsedPublic.success) {
  throw new Error(
    `Invalid public environment configuration:\n${parsedPublic.error.issues
      .map((i) => `  \u2022 ${i.path.join('.')}: ${i.message}`)
      .join('\n')}`,
  );
}

export const publicEnv = parsedPublic.data;

/** True when Supabase credentials are present, so the app can degrade gracefully. */
export const isSupabaseConfigured = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
