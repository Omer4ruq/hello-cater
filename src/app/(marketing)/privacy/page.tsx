import LegalPage, {
  generateMetadata as buildLegalMetadata,
} from '../legal/[slug]/page';

/**
 * Stable public URL for the privacy page. The shared implementation lives in
 * `legal/[slug]` so every policy renders identically and is editable from
 * the admin CMS.
 */
export const revalidate = 3600;

const params = Promise.resolve({ slug: 'privacy' });

export function generateMetadata() {
  return buildLegalMetadata({ params });
}

export default function Page() {
  return LegalPage({ params });
}
