import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title, description, breadcrumbs, actions, className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-8', className)}>
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="size-3" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-ink-900 hover:underline">{crumb.label}</Link>
                ) : (
                  <span className="font-medium text-ink-700">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 lg:text-[1.75rem]">
            {title}
          </h1>
          {description ? <p className="mt-1.5 max-w-2xl text-ink-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
