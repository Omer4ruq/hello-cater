import { ResetPasswordForm } from '@/features/auth/components/password-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Choose a new password', description: 'Set a new password for your account.',
  path: '/reset-password', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-display-sm">Choose a new password</h1>
      <p className="mt-2 text-ink-600">Pick something you have not used elsewhere.</p>
      <ResetPasswordForm />
    </div>
  );
}
