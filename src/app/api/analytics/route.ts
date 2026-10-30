import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { Json } from '@/types/database';

const payloadSchema = z.object({
  events: z
    .array(
      z.object({
        name: z.enum(ANALYTICS_EVENTS),
        properties: z.record(z.string(), z.unknown()).optional(),
        path: z.string().max(512).optional(),
      }),
    )
    .min(1)
    .max(25),
});

/**
 * First-party analytics sink.
 *
 * The event name is validated against an allow-list so the table cannot be
 * used as an arbitrary write target, and the profile id is resolved from
 * the session rather than accepted from the client.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true });

  try {
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminSupabase();
    await admin.from('analytics_events').insert(
      parsed.data.events.map((event) => ({
        name: event.name,
        profile_id: user?.id ?? null,
        properties: (event.properties ?? {}) as Json,
        path: event.path ?? null,
        referrer: request.headers.get('referer'),
      })),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('Analytics ingest failed', { error });
    // Analytics failures are never surfaced to the user.
    return NextResponse.json({ ok: true });
  }
}
