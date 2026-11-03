import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/feedback';
import { getCmsPage } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { LEGAL_PAGES, legalFallback } from '@/features/content/legal';
import { formatDateShort } from '@/lib/dates';
import { brand } from '@/config/brand';
import { slugify } from '@/lib/utils';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL_PAGES.find((p) => p.slug === slug);
  if (!page) return buildMetadata({ title: 'Not found', description: '', noIndex: true });

  const cms = await getCmsPage(slug);
  return buildMetadata({
    title: cms?.seo_title ?? page.title,
    description: cms?.seo_description ?? page.description,
    path: `/${slug}`,
  });
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();

  const cms = await getCmsPage(slug);
  const body = cms?.body?.trim() ? cms.body : legalFallback(slug);
  const needsReview = cms?.needs_legal_review ?? true;
  const toc = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.startsWith('## '))
    .map((block) => ({ id: slugify(block.slice(3)), title: block.slice(3) }));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: page.title, path: `/${slug}` }])} />

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 lg:py-20">
        {toc.length > 1 ? (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
              <p className="text-sm font-semibold text-ink-900">On this page</p>
              <ol className="mt-3 space-y-0.5 border-l border-ink-200">
                {toc.map((item, i) => (
                  <li key={i}>
                    <a
                      href={`#${item.id}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-ink-600 transition-colors duration-200 hover:border-ink-900 hover:text-ink-900"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        ) : <div aria-hidden className="hidden lg:block" />}

        <article className="min-w-0 max-w-[68ch]">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-3 text-display-md font-extrabold tracking-[-0.03em] text-ink-900">{cms?.title ?? page.title}</h1>
          <p className="mt-4 text-lg text-ink-600">{cms?.subtitle ?? page.description}</p>
          <p className="mt-2 text-sm text-ink-500">
            Last updated {cms?.updated_at ? formatDateShort(cms.updated_at) : 'on publication'}
          </p>

          {needsReview ? (
            <Alert tone="warning" className="mt-8" title="Draft — pending legal review">
              This is a working draft prepared as a starting point. It has <strong>not</strong> been
              reviewed by a Bangladesh-qualified lawyer and must not be relied on as the final terms.
              Have it reviewed — together with your VAT and settlement treatment — before public launch.
            </Alert>
          ) : null}

          <div className="mt-10 space-y-5 text-base leading-[1.75] text-ink-700 [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:border-t [&_h2]:border-ink-200 [&_h2]:pt-8 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink-900 [&_h2:first-child]:mt-0 [&_h2:first-child]:border-t-0 [&_h2:first-child]:pt-0 [&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:font-sans [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:mt-2 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-ink-400">
            {renderMarkdownish(body)}
          </div>

          <footer className="mt-14 rounded-2xl bg-ink-50 p-6 text-sm text-ink-600 sm:p-7">
            <p>
              Questions about these terms? Write to{' '}
              <a href={`mailto:${brand.supportEmail}`} className="font-semibold text-ink-900 underline underline-offset-4">
                {brand.supportEmail}
              </a>
              .
            </p>
            <nav aria-label="Other legal pages" className="mt-4 flex flex-wrap gap-2">
              {LEGAL_PAGES.filter((p) => p.slug !== slug).map((p) => (
                <Link
                  key={p.slug}
                  href={`/${p.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-ink-300 bg-white px-4 font-medium text-ink-900 transition-colors duration-200 hover:border-ink-900"
                >
                  {p.title}
                </Link>
              ))}
            </nav>
          </footer>
        </article>
      </div>
    </>
  );
}

/**
 * Minimal, safe renderer for the CMS body.
 *
 * Deliberately NOT `dangerouslySetInnerHTML`: legal copy is edited by
 * staff through the admin, and rendering raw HTML there would turn a
 * content-editor account into a stored-XSS vector. We support headings,
 * lists and paragraphs — everything else renders as plain text.
 */
function renderMarkdownish(markdown: string): React.ReactNode {
  const blocks = markdown.split(/\n{2,}/);

  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('## ')) {
      return <h2 key={index} id={slugify(trimmed.slice(3))}>{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith('### ')) {
      return <h3 key={index}>{trimmed.slice(4)}</h3>;
    }
    if (/^[-*]\s/m.test(trimmed)) {
      const items = trimmed.split('\n').filter((line) => /^[-*]\s/.test(line.trim()));
      return (
        <ul key={index}>
          {items.map((item, i) => <li key={i}>{item.trim().replace(/^[-*]\s/, '')}</li>)}
        </ul>
      );
    }
    return <p key={index}>{trimmed}</p>;
  });
}
