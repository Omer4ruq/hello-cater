import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireUserPage } from '@/features/auth/session';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Proposals', description: 'Review and respond to proposals.',
  path: '/dashboard/proposals', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function ProposalsPage() {
  await requireUserPage('/dashboard/proposals');
  const supabase = await createServerSupabase();

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, reference, title, status, total_minor, valid_until, sent_at, version_no, service_requests(reference, event_date, event_types(name))')
    .neq('status', 'draft')
    .order('sent_at', { ascending: false, nullsFirst: false });

  const rows = proposals ?? [];

  return (
    <>
      <PageHeader
        title="Proposals"
        description="Every proposal we have assembled for you, with its full breakdown."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No proposals yet"
          description="After partners quote against your requirement, our team combines the best options into a single proposal — including multi-vendor events."
          action={<Button asChild><Link href="/plan">Submit a requirement</Link></Button>}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Proposals" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Proposal</TH>
                  <TH>Event</TH>
                  <TH>Event date</TH>
                  <TH>Valid until</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((proposal) => {
                  const request = proposal.service_requests as unknown as {
                    reference: string; event_date: string | null; event_types: { name: string } | null;
                  } | null;
                  return (
                    <TR key={proposal.id}>
                      <TD>
                        <Link
                          href={`/dashboard/proposals/${proposal.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {proposal.reference}
                        </Link>
                        {proposal.version_no > 1 ? (
                          <span className="ml-1.5 text-xs text-ink-500">v{proposal.version_no}</span>
                        ) : null}
                      </TD>
                      <TD>{proposal.title || request?.event_types?.name || '—'}</TD>
                      <TD>{formatDateShort(request?.event_date)}</TD>
                      <TD>{formatDateShort(proposal.valid_until)}</TD>
                      <TDNum><Money minor={proposal.total_minor} /></TDNum>
                      <TD><StatusBadge status={proposal.status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
