import 'server-only';

import { headers } from 'next/headers';
import { createAdminSupabase } from '@/lib/supabase/server';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export type RateLimitRule = { limit: number; windowSeconds: number };

/** Named buckets so limits are reviewable in one place. */
export const RATE_LIMITS = {
  request_submit: { limit: 5, windowSeconds: 3600 },
  contact_form: { limit: 5, windowSeconds: 3600 },
  auth_attempt: { limit: 10, windowSeconds: 900 },
  quote_submit: { limit: 60, windowSeconds: 3600 },
  message_send: { limit: 120, windowSeconds: 3600 },
  payment_init: { limit: 20, windowSeconds: 3600 },
  file_upload: { limit: 40, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/** Best-effort client IP, honouring the proxy headers Vercel sets. */
export async function clientIdentifier(fallback = 'anonymous'): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  return ip ?? fallback;
}

/**
 * Consumes one unit from a bucket. Throws a 429 when exhausted.
 *
 * Fails OPEN on infrastructure errors: a rate-limiter outage must not
 * take down request submission. Abuse is the lesser risk here, and the
 * failure is logged for follow-up.
 */
export async function enforceRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
  message = 'Too many attempts. Please wait a few minutes and try again.',
): Promise<void> {
  const rule = RATE_LIMITS[bucket];
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_bucket: bucket,
      p_identifier: identifier,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });

    if (error) {
      logger.warn('Rate limiter unavailable, allowing request', { bucket, error });
      return;
    }
    if (data === false) throw new AppError('rate_limited', message);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn('Rate limiter threw, allowing request', { bucket, error });
  }
}
