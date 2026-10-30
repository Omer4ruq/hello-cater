import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/features/auth/components/register-form';
import { getSessionUser } from '@/features/auth/session';
import { buildMetadata } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/env';
import { Alert } from '@/components/ui/feedback';

export const metadata = buildMetadata({
  title: 'Create an account',
  description: 'Create your Evently BD account to request quotations and manage events.',
  path: '/register',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (isSupabaseConfigured) {
    const user = await getSessionUser().catch(() => null);
    if (user) redirect('/dashboard');
  }

  return (
    <div>
      <h1 className="text-display-sm">Create your account</h1>
      <p className="mt-2 text-ink-600">
        Submit requirements, compare proposals and keep every event in one place.
      </p>

      {!isSupabaseConfigured ? (
        <Alert tone="warning" className="mt-6" title="Authentication is not configured">
          Add your Supabase environment variables to enable registration.
        </Alert>
      ) : (
        <RegisterForm />
      )}

      <p className="mt-8 text-sm text-ink-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  );
}
