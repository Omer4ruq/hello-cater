import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth/components/password-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Reset your password', description: 'Request a password reset link.',
  path: '/forgot-password', noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-display-sm font-extrabold tracking-tight text-ink-900">Reset your password</h1>
      <p className="mt-2 text-ink-600">
        Enter your email address and we will send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-8 text-sm text-ink-600">
        <Link href="/login" className="font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-ink-900">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
