import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/components/login-form';
import { getSessionUser } from '@/features/auth/session';
import { resolveLandingPath } from '@/features/auth/actions';
import { buildMetadata } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/env';
import { Alert } from '@/components/ui/feedback';

export const metadata = buildMetadata({
  title: 'Log in',
  description: 'Sign in to your Evently BD account.',
  path: '/login',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const params = await searchParams;

  if (isSupabaseConfigured) {
    const user = await getSessionUser().catch(() => null);
    if (user) redirect(await resolveLandingPath());
  }

  return (
    <div>
      <h1 className="text-display-sm font-extrabold tracking-tight text-ink-900">Welcome back</h1>
      <p className="mt-2 text-ink-600">
        Sign in to track requests, review proposals and manage your events.
      </p>

      {params.message ? (
        <Alert tone="info" className="mt-6">{params.message}</Alert>
      ) : null}

      {!isSupabaseConfigured ? (
        <Alert tone="warning" className="mt-6" title="Authentication is not configured">
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
          enable sign-in. See <code>docs/LOCAL-DEVELOPMENT.md</code>.
        </Alert>
      ) : (
        <LoginForm next={params.next} />
      )}

      <p className="mt-8 text-sm text-ink-600">
        New here?{' '}
        <Link href="/register" className="font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-ink-900">
          Create an account
        </Link>
        {' · '}
        <Link href="/become-a-partner" className="font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-ink-900">
          Join as a partner
        </Link>
      </p>
    </div>
  );
}
