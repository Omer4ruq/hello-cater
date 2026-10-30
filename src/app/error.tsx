'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brand } from '@/config/brand';

/**
 * Route-level error boundary.
 *
 * Shows a recoverable message and the error digest (which correlates to
 * the server log) but never the message or stack — those can contain
 * internal detail.
 */
export default function RouteError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
     
    console.error('Route error', { digest: error.digest });
  }, [error]);

  return (
    <div className="container-page flex min-h-[60dvh] items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger-50 text-danger-700">
          <AlertTriangle aria-hidden className="size-6" />
        </span>
        <h1 className="mt-6 text-display-sm">Something went wrong</h1>
        <p className="mt-4 text-ink-600">
          We hit an unexpected error. Our team has been notified. You can try again, or contact us
          if it keeps happening.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-500">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>Try again</Button>
          <Button asChild size="lg" variant="secondary"><Link href="/">Back to home</Link></Button>
          <Button asChild size="lg" variant="ghost">
            <a href={`mailto:${brand.supportEmail}`}>Contact support</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
