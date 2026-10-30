import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/feedback';
import { getCmsPage } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { LEGAL_PAGES, legalFallback } from '@/features/content/legal';
import { formatDateShort } from '@/lib/dates';
import { brand } from '@/config/brand';

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

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: page.title, path: `/${slug}` }])} />

      <article className="container-page max-w-3xl py-14 lg:py-20">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-2 text-display-md">{cms?.title ?? page.title}</h1>
        <p className="mt-3 text-ink-600">{cms?.subtitle ?? page.description}</p>
        <p className="mt-2 text-sm text-ink-500">
          Last updated {cms?.updated_at ? formatDateShort(cms.updated_at) : 'on publication'}
        </p>

        {needsReview ? (
          <Alert tone="warning" className="mt-7" title="Draft — pending legal review">
            This is a working draft prepared as a starting point. It has <strong>not</strong> been
            reviewed by a Bangladesh-qualified lawyer and must not be relied on as the final terms.
            Have it reviewed — together with your VAT and settlement treatment — before public launch.
          </Alert>
        ) : null}

        <div className="mt-9 space-y-6 text-[0.95rem] leading-relaxed text-ink-700 [&_h2]:mt-9 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink-950 [&_h3]:mt-6 [&_h3]:font-sans [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink-950 [&_li]:mt-1.5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {renderMarkdownish(body)}
        </div>

        <footer className="mt-12 border-t border-ink-200 pt-6 text-sm text-ink-600">
          <p>
            Questions about these terms? Write to{' '}
            <a href={`mailto:${brand.supportEmail}`} className="font-medium text-brand-700 underline underline-offset-4">
              {brand.supportEmail}
            </a>
            .
          </p>
          <nav className="mt-4 flex flex-wrap gap-4">
            {LEGAL_PAGES.filter((p) => p.slug !== slug).map((p) => (
              <Link key={p.slug} href={`/${p.slug}`} className="text-brand-700 underline underline-offset-4">
                {p.title}
              </Link>
            ))}
          </nav>
        </footer>
      </article>
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
      return <h2 key={index}>{trimmed.slice(3)}</h2>;
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
