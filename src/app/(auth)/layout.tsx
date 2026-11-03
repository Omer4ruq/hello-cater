import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/shared/logo';
import { brand } from '@/config/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-8">
        <header className="mb-10">
          <Logo />
        </header>
        <main id="main" className="flex flex-1 items-center">
          <div className="motion-stagger mx-auto w-full max-w-sm">{children}</div>
        </main>
        <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
          <span>© {new Date().getFullYear()} {brand.legalName}</span>
          <Link href="/terms" className="transition-colors hover:text-ink-900">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-ink-900">Privacy</Link>
        </footer>
      </div>

      {/* Photo panel: hidden on small screens where it would only push the
          form below the fold. */}
      <aside className="hidden p-4 lg:block">
        <div className="sticky top-4 h-[calc(100dvh-2rem)] overflow-hidden rounded-3xl">
          {/* next/image wants a relative parent; the sticky box stays the frame. */}
          <div className="relative size-full">
            <Image
              src="/img/photos/banquet.jpg" alt="" fill priority
              sizes="50vw" className="object-cover"
            />
          </div>
          <div className="absolute inset-x-6 bottom-6 max-w-sm rounded-2xl bg-white/95 p-5 shadow-lg backdrop-blur">
            <p className="text-lg font-bold leading-snug tracking-tight text-ink-900">
              One requirement in. Comparable proposals out. One invoice at the end.
            </p>
            <p className="mt-2 text-sm text-ink-600">
              How {brand.name} runs catering and events across {brand.launchCity}.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
