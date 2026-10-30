import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { requirePermission } from '@/features/auth/session';
import { recordAudit } from '@/features/audit/log';
import { toMajor } from '@/lib/money';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * CSV export for admin reports.
 *
 * Requires `reports.view` and writes an audit entry — an export is a bulk
 * read of commercial data and should be traceable to a person.
 */
const REPORTS = ['bookings', 'payouts', 'payments', 'partners', 'categories'] as const;
type Report = (typeof REPORTS)[number];

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('reports.view');
    const report = request.nextUrl.searchParams.get('report') as Report | null;

    if (!report || !REPORTS.includes(report)) {
      return NextResponse.json({ error: 'Unknown report' }, { status: 400 });
    }

    const admin = createAdminSupabase();
    let rows: Record<string, unknown>[] = [];

    switch (report) {
      case 'bookings': {
        const { data } = await admin
          .from('bookings')
          .select('reference, status, service_date, gross_minor, commission_minor, partner_payable_minor, partner_profiles(display_name), service_categories(name), events(title, reference)')
          .order('service_date', { ascending: false })
          .limit(5000);
        rows = (data ?? []).map((b) => ({
          booking_reference: b.reference,
          event: (b.events as unknown as { title: string } | null)?.title ?? '',
          event_reference: (b.events as unknown as { reference: string } | null)?.reference ?? '',
          partner: (b.partner_profiles as unknown as { display_name: string } | null)?.display_name ?? '',
          category: (b.service_categories as unknown as { name: string } | null)?.name ?? '',
          status: b.status,
          service_date: b.service_date,
          gross_bdt: toMajor(b.gross_minor),
          commission_bdt: toMajor(b.commission_minor),
          partner_payable_bdt: toMajor(b.partner_payable_minor),
        }));
        break;
      }
      case 'payouts': {
        const { data } = await admin
          .from('payouts')
          .select('reference, status, period_start, period_end, gross_minor, commission_minor, adjustment_minor, net_minor, method, provider_ref, paid_at, partner_profiles(display_name)')
          .order('created_at', { ascending: false })
          .limit(5000);
        rows = (data ?? []).map((p) => ({
          payout_reference: p.reference,
          partner: (p.partner_profiles as unknown as { display_name: string } | null)?.display_name ?? '',
          status: p.status,
          period_start: p.period_start ?? '',
          period_end: p.period_end ?? '',
          gross_bdt: toMajor(p.gross_minor),
          commission_bdt: toMajor(p.commission_minor),
          adjustment_bdt: toMajor(p.adjustment_minor),
          net_bdt: toMajor(p.net_minor),
          method: p.method ?? '',
          bank_reference: p.provider_ref ?? '',
          paid_at: p.paid_at ?? '',
        }));
        break;
      }
      case 'payments': {
        const { data } = await admin
          .from('payments')
          .select('reference, status, purpose, amount_minor, gateway_fee_minor, refunded_minor, provider, provider_ref, method, paid_at, created_at')
          .order('created_at', { ascending: false })
          .limit(5000);
        rows = (data ?? []).map((p) => ({
          payment_reference: p.reference,
          status: p.status,
          purpose: p.purpose,
          amount_bdt: toMajor(p.amount_minor),
          gateway_fee_bdt: toMajor(p.gateway_fee_minor),
          refunded_bdt: toMajor(p.refunded_minor),
          provider: p.provider,
          provider_reference: p.provider_ref ?? '',
          method: p.method ?? '',
          paid_at: p.paid_at ?? '',
          created_at: p.created_at,
        }));
        break;
      }
      case 'partners': {
        const { data } = await admin
          .from('partner_profiles')
          .select('display_name, slug, verification_status, rating_avg, rating_count, completed_bookings, response_rate_bps, min_order_minor, commission_bps, created_at, organizations(name, city, phone, email)')
          .order('completed_bookings', { ascending: false })
          .limit(5000);
        rows = (data ?? []).map((p) => {
          const org = p.organizations as unknown as { name: string; city: string | null; phone: string | null; email: string | null } | null;
          return {
            partner: p.display_name,
            slug: p.slug,
            organisation: org?.name ?? '',
            city: org?.city ?? '',
            phone: org?.phone ?? '',
            email: org?.email ?? '',
            verification: p.verification_status,
            rating: p.rating_avg,
            reviews: p.rating_count,
            delivered: p.completed_bookings,
            response_rate_pct: p.response_rate_bps / 100,
            min_order_bdt: toMajor(p.min_order_minor),
            commission_pct: p.commission_bps != null ? p.commission_bps / 100 : '',
            joined: p.created_at,
          };
        });
        break;
      }
      case 'categories': {
        const { data } = await admin
          .from('bookings')
          .select('gross_minor, commission_minor, service_categories(name)')
          .in('status', ['completed', 'closed', 'confirmed', 'in_preparation', 'ready', 'in_progress']);
        const grouped = new Map<string, { gmv: number; commission: number; count: number }>();
        for (const row of data ?? []) {
          const name = (row.service_categories as unknown as { name: string } | null)?.name ?? 'Uncategorised';
          const entry = grouped.get(name) ?? { gmv: 0, commission: 0, count: 0 };
          entry.gmv += row.gross_minor;
          entry.commission += row.commission_minor;
          entry.count += 1;
          grouped.set(name, entry);
        }
        rows = [...grouped.entries()].map(([name, v]) => ({
          category: name,
          bookings: v.count,
          gmv_bdt: toMajor(v.gmv),
          commission_bdt: toMajor(v.commission),
        }));
        break;
      }
    }

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'data.exported',
      entity: 'reports', entityId: report, summary: `Exported ${rows.length} rows of ${report}`,
    });

    const csv = toCsv(rows);
    const filename = `evently-${report}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    logger.error('Report export failed', { error });
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

/**
 * Serialises rows to CSV.
 *
 * Values starting with =, +, - or @ are prefixed with a single quote:
 * without it, opening the file in Excel executes them as formulas, which
 * is a real injection vector when any field is user-supplied.
 */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);

  const escape = (value: unknown): string => {
    const raw = value == null ? '' : String(value);
    const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${guarded.replace(/"/g, '""')}"`;
  };

  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ].join('\r\n');
}
