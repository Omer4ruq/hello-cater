import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Refreshes the Supabase auth cookie on every request and returns both
 * the response (carrying updated cookies) and the current user, so the
 * proxy can gate protected route groups without a second round trip.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return { response, user: null };

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates the JWT with the auth server. Do not swap this
  // for getSession(), which trusts the cookie without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
