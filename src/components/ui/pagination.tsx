import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Server-rendered pagination. Takes the current search params so filters
 * survive page changes — dashboards must never silently drop a filter.
 */
export function Pagination({
  page, pageCount, total, basePath, searchParams, className,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}) {
  if (pageCount <= 1) {
    return total > 0 ? (
      <p className={cn('px-1 py-3 text-sm text-ink-600', className)}>
        {total} {total === 1 ? 'result' : 'results'}
      </p>
    ) : null;
  }

  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams ?? {})) {
      if (v != null && v !== '' && k !== 'page') params.set(k, v);
    }
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // A compact window around the current page keeps long lists usable.
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav className={cn('flex items-center justify-between gap-4 py-3', className)} aria-label="Pagination">
      <p className="text-sm text-ink-600">
        Page {page} of {pageCount} · {total} results
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className="flex size-8 items-center justify-center rounded-md border border-ink-200 text-ink-700 hover:bg-ink-50" aria-label="Previous page">
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
        ) : null}

        {pages.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && p - pages[i - 1] > 1 ? <span className="px-1 text-ink-400">…</span> : null}
            <Link
              href={href(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm',
                p === page
                  ? 'bg-brand-700 font-medium text-white'
                  : 'border border-ink-200 text-ink-700 hover:bg-ink-50',
              )}
            >
              {p}
            </Link>
          </span>
        ))}

        {page < pageCount ? (
          <Link href={href(page + 1)} className="flex size-8 items-center justify-center rounded-md border border-ink-200 text-ink-700 hover:bg-ink-50" aria-label="Next page">
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
