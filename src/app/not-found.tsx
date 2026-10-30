import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="container-page py-6">
        <Logo />
      </header>
      <main id="main" className="container-page flex flex-1 items-center justify-center py-16">
        <div className="max-w-lg text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Compass aria-hidden className="size-6" />
          </span>
          <h1 className="mt-6 text-display-md">We could not find that page</h1>
          <p className="mt-4 text-ink-600">
            The link may be outdated, or the page may have moved. Here are some useful places to go
            instead.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href="/">Back to home</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/plan">Plan an Event</Link></Button>
            <Button asChild size="lg" variant="ghost"><Link href="/partners">Browse partners</Link></Button>
          </div>
        </div>
      </main>
    </div>
  );
}
