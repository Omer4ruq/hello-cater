import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Verification queue', description: 'Partners awaiting verification.',
  path: '/admin/verification', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function VerificationQueuePage() {
  await requireUserPage('/admin/verification');
  const supabase = await createServerSupabase();

  const { data: partners } = await supabase
    .from('partner_profiles')
    .select('id, display_name, verification_status, created_at, business_type, max_guests, organizations(name, phone, email, city, trade_license), partner_documents(id, kind, is_verified), partner_categories(category_id, service_categories(name))')
    .in('verification_status', ['pending', 'under_review'])
    .order('created_at', { ascending: true });

  const rows = partners ?? [];

  return (
    <>
      <PageHeader
        title="Verification queue"
        description="Check business registration, capacity and references before a partner can quote."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing waiting"
          description="Every partner application has been reviewed. New applications appear here automatically."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((partner) => {
            const org = partner.organizations as unknown as {
              name: string; phone: string | null; email: string | null;
              city: string | null; trade_license: string | null;
            } | null;
            const documents = (partner.partner_documents as unknown as { id: string; kind: string; is_verified: boolean }[] | null) ?? [];
            const categories = (partner.partner_categories as unknown as { category_id: string; service_categories: { name: string } | null }[] | null) ?? [];

            return (
              <Card key={partner.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-sans text-base font-semibold text-ink-950">{partner.display_name}</h2>
                      <p className="mt-0.5 text-xs text-ink-500">
                        Applied {relativeDate(partner.created_at)}
                        {org?.city ? ` · ${org.city}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={partner.verification_status} />
                  </div>

                  <dl className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-600">Business type</dt>
                      <dd className="text-ink-900">{partner.business_type?.replace(/_/g, ' ') ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-600">Trade licence</dt>
                      <dd className="text-ink-900">{org?.trade_license ?? <span className="text-warning-700">Not provided</span>}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-600">Documents</dt>
                      <dd className="text-ink-900">
                        {documents.length === 0 ? (
                          <span className="text-warning-700">None uploaded</span>
                        ) : (
                          `${documents.filter((d) => d.is_verified).length}/${documents.length} verified`
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-600">Max guests</dt>
                      <dd className="text-ink-900">{partner.max_guests ?? '—'}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <Badge key={c.category_id} tone="neutral">{c.service_categories?.name}</Badge>
                    ))}
                  </div>

                  <Button asChild block className="mt-4">
                    <Link href={`/admin/partners/${partner.id}`}>Review application</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
