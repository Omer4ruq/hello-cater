'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client. Uses the anon key only — RLS is what protects
 * the data. The service-role key must never reach this file.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  cached ??= createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
