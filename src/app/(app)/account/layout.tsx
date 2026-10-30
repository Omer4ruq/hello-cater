import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { requireUserPage } from '@/features/auth/session';
import { resolveLandingPath } from '@/features/auth/actions';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUserPage('/account');
  const home = await resolveLandingPath();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo href={home} />
          <Link
            href={home}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back to dashboard
          </Link>
        </div>
      </header>
      <main id="main" className="container-page max-w-3xl py-10">{children}</main>
    </div>
  );
}
