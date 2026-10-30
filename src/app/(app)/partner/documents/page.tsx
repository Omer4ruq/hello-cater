import Link from 'next/link';
import { FileText, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerProfile } from '@/features/partner/queries';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Documents', description: 'Your verification documents.',
  path: '/partner/documents', noIndex: true,
});

export const dynamic = 'force-dynamic';

const REQUIRED = [
  ['trade_license', 'Trade licence', 'Required. Your current, valid trade licence.'],
  ['nid', 'Owner NID', 'Required. National ID of the owner or authorised signatory.'],
  ['tin', 'TIN certificate', 'Needed for invoicing and settlement.'],
  ['bin_vat', 'BIN / VAT registration', 'If your business is VAT registered.'],
  ['food_license', 'Food licence', 'Required for caterers and kitchens.'],
  ['bank_statement', 'Bank account proof', 'A cheque leaf or statement header confirming your payout account.'],
] as const;

const KIND_LABELS = Object.fromEntries(REQUIRED.map(([kind, label]) => [kind, label])) as Record<string, string>;

export default async function PartnerDocumentsPage() {
  const user = await requireUserPage('/partner/documents');
  const partner = activePartner(user);
  const supabase = await createServerSupabase();

  const [profile, { data: documents }] = await Promise.all([
    getPartnerProfile(partner.partnerId),
    supabase
      .from('partner_documents')
      .select('id, kind, title, storage_path, mime_type, size_bytes, expires_on, is_verified, review_notes, created_at')
      .eq('partner_id', partner.partnerId)
      .order('created_at', { ascending: false }),
  ]);

  const uploaded = documents ?? [];
  const byKind = new Map(uploaded.map((d) => [d.kind, d]));
  const missing = REQUIRED.filter(([kind]) => !byKind.has(kind));

  return (
    <>
      <PageHeader
        title="Documents"
        description="Your verification paperwork. Stored privately — only you and our verification team can open these."
        actions={profile ? <StatusBadge status={profile.verification_status} /> : null}
      />

      <Alert tone="info" className="mb-6" title="How your documents are handled">
        Documents are kept in private storage and served only through short-lived signed links.
        They are never shown on your public profile, never shared with customers, and never
        indexed. Only staff performing verification can open them.
      </Alert>

      {missing.length > 0 && profile?.verification_status !== 'approved' ? (
        <Alert tone="warning" className="mb-6" title={`${missing.length} documents still needed`}>
          <ul className="mt-1 list-inside list-disc">
            {missing.map(([kind, label, hint]) => (
              <li key={kind}><strong>{label}</strong> — {hint}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle as="h2">Uploaded documents</CardTitle></CardHeader>
          <CardContent className="p-0">
            {uploaded.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={FileText}
                  title="Nothing uploaded yet"
                  description="Send your documents to our partner team and they will attach them to your account. Self-service upload is coming; until then this keeps document handling auditable."
                />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {uploaded.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
                      <div>
                        <p className="text-sm font-medium text-ink-950">
                          {KIND_LABELS[doc.kind] ?? doc.kind.replace(/_/g, ' ')}
                          {doc.is_verified ? <Badge tone="success" className="ml-2">Verified</Badge> : (
                            <Badge tone="warning" className="ml-2">Awaiting review</Badge>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {doc.title} · uploaded {relativeDate(doc.created_at)}
                          {doc.expires_on ? ` · expires ${formatDateShort(doc.expires_on)}` : ''}
                        </p>
                        {doc.review_notes ? (
                          <p className="mt-1.5 rounded-lg bg-ink-50 p-2 text-xs text-ink-700">
                            {doc.review_notes}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/api/files/partner-documents?path=${encodeURIComponent(doc.storage_path)}`}>
                        Open
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-4 text-brand-600" /> What we check
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="space-y-3 text-sm">
              {REQUIRED.map(([kind, label, hint]) => (
                <li key={kind}>
                  <p className="font-medium text-ink-900">
                    {label}
                    {byKind.has(kind) ? (
                      <Badge tone="success" className="ml-2">Received</Badge>
                    ) : (
                      <Badge tone="neutral" className="ml-2">Pending</Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-600">{hint}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
