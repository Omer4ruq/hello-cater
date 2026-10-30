import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/shared/logo';
import { brand } from '@/config/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <header className="mb-10">
          <Logo />
        </header>
        <main id="main" className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </main>
        <footer className="mt-10 text-xs text-ink-500">
          <p>
            © {new Date().getFullYear()} {brand.legalName} ·{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink-700">Terms</Link>
            {' · '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink-700">Privacy</Link>
          </p>
        </footer>
      </div>

      {/* Editorial panel — hidden on small screens where it would only
          push the form below the fold. */}
      <aside className="relative hidden overflow-hidden bg-brand-950 lg:block">
        <Image src="/img/hero.svg" alt="" fill sizes="50vw" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-14">
          <blockquote className="max-w-md">
            <p className="font-display text-3xl leading-snug text-white">
              One requirement in. Comparable proposals out. One invoice at the end.
            </p>
            <footer className="mt-6 text-sm text-white/60">
              How {brand.name} runs catering and events across {brand.launchCity}.
            </footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
