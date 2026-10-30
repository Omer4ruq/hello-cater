import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Runs before every request (Next.js 16 calls this file `proxy.ts`).
 *
 * Two jobs:
 *   1. Keep the Supabase session cookie fresh.
 *   2. Bounce signed-out users away from private route groups.
 *
 * This is a convenience gate, NOT the security boundary. Every private
 * page and action re-checks authorisation server-side, and RLS is the
 * final authority — a bug here can never expose another tenant's data.
 */
const PROTECTED_PREFIXES = ['/dashboard', '/partner', '/admin', '/reset-password'];

// `/partner` is customer-facing under `/partners`; keep them distinct.
const PUBLIC_PREFIXES = ['/partners'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  const isProtected =
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which never
     * need a session and would only add latency.
     */
    '/((?!_next/static|_next/image|favicon.svg|logo.svg|site.webmanifest|img/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)',
  ],
};
