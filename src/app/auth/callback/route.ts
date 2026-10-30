import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { resolveLandingPath } from '@/features/auth/actions';
import { appUrl } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Exchanges a Supabase auth code (email confirmation, magic link,
 * password recovery, OAuth) for a session cookie.
 *
 * `next` is validated to be a same-origin path so the callback cannot be
 * used as an open redirect.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const rawNext = url.searchParams.get('next');

  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

  try {
    const supabase = await createServerSupabase();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
        token_hash: tokenHash,
      });
      if (error) throw error;
    } else {
      return NextResponse.redirect(
        `${appUrl}/login?message=${encodeURIComponent('That link is no longer valid. Please request a new one.')}`,
      );
    }

    return NextResponse.redirect(`${appUrl}${next ?? (await resolveLandingPath())}`);
  } catch (error) {
    logger.warn('Auth callback failed', { error });
    return NextResponse.redirect(
      `${appUrl}/login?message=${encodeURIComponent('That sign-in link has expired. Please request a new one.')}`,
    );
  }
}
