'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Search + filter bar for dashboard tables.
 *
 * All state lives in the URL, so a filtered view is shareable, survives a
 * refresh, and lets the server do the filtering and pagination rather
 * than shipping every row to the browser.
 */
export function DataToolbar({
  searchPlaceholder = 'Search…', filters = [], showDateRange, className,
}: {
  searchPlaceholder?: string;
  filters?: FilterDef[];
  showDateRange?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get('q') ?? '');
  const [pending, startTransition] = React.useTransition();

  const apply = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '') params.delete(key);
        else params.set(key, value);
      }
      // Any filter change resets to the first page.
      params.delete('page');
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams],
  );

  // Debounce so typing does not fire a request per keystroke.
  React.useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (query === current) return;
    const timer = setTimeout(() => apply({ q: query || null }), 350);
    return () => clearTimeout(timer);
  }, [query, apply, searchParams]);

  const activeCount = [...searchParams.keys()].filter(
    (k) => !['page', 'q'].includes(k) && searchParams.get(k),
  ).length;

  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-2', className)}>
      <div className="relative min-w-52 flex-1">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="pl-9"
        />
      </div>

      {filters.map((filter) => (
        <Select
          key={filter.key}
          aria-label={filter.label}
          value={searchParams.get(filter.key) ?? ''}
          onChange={(e) => apply({ [filter.key]: e.target.value || null })}
          className="w-auto min-w-36"
        >
          <option value="">{filter.label}: all</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      ))}

      {showDateRange ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date" aria-label="From date" className="w-auto"
            value={searchParams.get('from') ?? ''}
            onChange={(e) => apply({ from: e.target.value || null })}
          />
          <span className="text-sm text-ink-500">to</span>
          <Input
            type="date" aria-label="To date" className="w-auto"
            value={searchParams.get('to') ?? ''}
            onChange={(e) => apply({ to: e.target.value || null })}
          />
        </div>
      ) : null}

      {activeCount > 0 || query ? (
        <Button
          variant="ghost" size="sm"
          onClick={() => {
            setQuery('');
            startTransition(() => router.push(pathname));
          }}
        >
          <X aria-hidden /> Clear
        </Button>
      ) : null}

      {pending ? <span className="text-xs text-ink-500">Updating…</span> : null}
    </div>
  );
}
