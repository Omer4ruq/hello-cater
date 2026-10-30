import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv, isSupabaseConfigured } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import type { Database } from '@/types/database';

/**
 * Request-scoped Supabase client that carries the signed-in user's
 * session. Every query made with it is subject to RLS — this is the
 * default client for all server components and route handlers.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    );
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * ONLY use this after an explicit authorisation check in
 * `requirePermission`/`requireRole`, or in a trusted context such as a
 * verified payment webhook. Never expose its results directly to a
 * client without filtering.
 */
export function createAdminSupabase() {
  const env = serverEnv();
  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
