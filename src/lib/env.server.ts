import 'server-only';

import { z } from 'zod';

/**
 * Server-only environment configuration.
 *
 * `server-only` makes importing this from a client component a build
 * error. Keeping the secret *names* out of the browser bundle matters
 * as much as keeping the values out: Next never inlines a non-public
 * variable, so a value could not leak, but publishing the shape of your
 * secrets tells an attacker exactly what to look for — and one careless
 * `NEXT_PUBLIC_` rename later would turn that into a real leak.
 */

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_URL: z.string().url(),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

/**
 * Server-only secrets. Throws with an actionable message when a secret
 * is missing, rather than failing deep inside a Supabase call.
 */
export function serverEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  if (!parsed.success) {
    throw new Error(
      'Missing server environment variables: ' +
        parsed.error.issues.map((i) => i.path.join('.')).join(', ') +
        '. Copy .env.example to .env.local and fill them in \u2014 see docs/LOCAL-DEVELOPMENT.md.',
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Optional integrations. Absence disables the feature rather than crashing. */
export const integrations = {
  email: {
    provider: (process.env.EMAIL_PROVIDER ?? 'console') as 'resend' | 'smtp' | 'console',
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM ?? 'Evently BD <no-reply@localhost>',
    replyTo: process.env.EMAIL_REPLY_TO,
    smtp: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  },
  payments: {
    provider: (process.env.PAYMENT_PROVIDER ?? 'manual') as 'sslcommerz' | 'manual',
    sandbox: process.env.PAYMENT_SANDBOX !== 'false',
    sslcommerz: {
      storeId: process.env.SSLCOMMERZ_STORE_ID,
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
    },
  },
  sentryDsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
} as const;

export const isEmailConfigured =
  integrations.email.provider === 'resend'
    ? Boolean(integrations.email.resendApiKey)
    : integrations.email.provider === 'smtp'
      ? Boolean(integrations.email.smtp.host)
      : false;

export const isPaymentConfigured =
  integrations.payments.provider === 'sslcommerz' &&
  Boolean(integrations.payments.sslcommerz.storeId) &&
  Boolean(integrations.payments.sslcommerz.storePassword);
