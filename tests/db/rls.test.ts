import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  asAdmin, asAnon, asAuthenticated, connect, disconnect,
  databaseAvailable, expectRejection, FIXTURES, USERS,
} from './helpers';

/**
 * Row Level Security.
 *
 * These run against a real PostgreSQL database built from the versioned
 * migrations, as the `anon` and `authenticated` roles with the same JWT
 * claim Supabase sets. They are the authoritative check that a tenant
 * cannot reach another tenant's data — UI checks and server-side guards
 * are defence in depth on top of this.
 */

let available = false;

beforeAll(async () => {
  available = await databaseAvailable();
  if (available) await connect();
});

afterAll(async () => {
  if (available) await disconnect();
});

const run = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!available) {
      throw new Error(
        'Test database unavailable. Run `npm run db:test:setup` (needs a local PostgreSQL).',
      );
    }
    await fn();
  });

describe('RLS: public catalogue', () => {
  run('anonymous visitors can read active service categories', async () => {
    const { rows } = await asAnon('select id from service_categories where is_active limit 5');
    expect(rows.length).toBeGreaterThan(0);
  });

  run('anonymous visitors cannot read partner_profiles directly', async () => {
    const error = await expectRejection(() => asAnon('select id from partner_profiles limit 1'));
    expect(error.message).toMatch(/permission denied/i);
  });

  run('anonymous visitors CAN read the curated public_partners view', async () => {
    const { rows } = await asAnon('select id, display_name from public_partners');
    expect(rows.length).toBeGreaterThan(0);
  });

  run('the public view excludes unpublished and unverified partners', async () => {
    const { rows } = await asAnon<{ id: string }>('select id from public_partners');
    const ids = rows.map((r) => r.id);
    // Nagar Sound is still pending verification in the demo seed.
    expect(ids).not.toContain(FIXTURES.nagarSound);
  });

  run('the public view does not expose commercial or verification columns', async () => {
    const { rows } = await asAdmin<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_name = 'public_partners'`,
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).not.toContain('commission_bps');
    expect(columns).not.toContain('verification_status');
  });

  run('anonymous visitors cannot read service requests at all', async () => {
    const error = await expectRejection(() => asAnon('select id from service_requests limit 1'));
    expect(error.message).toMatch(/permission denied/i);
  });
});

describe('RLS: customer tenant isolation', () => {
  run('a customer sees only their own requests', async () => {
    const { rows } = await asAuthenticated<{ id: string }>(
      USERS.individual,
      'select id from service_requests',
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(FIXTURES.holudRequest);
    // The corporate request belongs to a different customer and company.
    expect(ids).not.toContain(FIXTURES.corporateRequest);
  });

  run('a company member sees their company requests', async () => {
    const { rows } = await asAuthenticated<{ id: string }>(
      USERS.companyAdmin,
      'select id from service_requests',
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(FIXTURES.corporateRequest);
    expect(ids).not.toContain(FIXTURES.holudRequest);
  });

  run('a customer cannot read another customer’s event', async () => {
    const { rows } = await asAuthenticated(
      USERS.individual,
      'select id from events where id = $1',
      [FIXTURES.townHallEvent],
    );
    expect(rows).toHaveLength(0);
  });

  run('a customer cannot read another customer’s payments', async () => {
    const { rows } = await asAuthenticated(
      USERS.companyAdmin,
      'select id from payments where id = $1',
      [FIXTURES.deposit],
    );
    expect(rows).toHaveLength(0);
  });

  run('a customer cannot update another customer’s request', async () => {
    const { rowCount } = await asAuthenticated(
      USERS.individual,
      `update service_requests set title = 'hijacked' where id = $1`,
      [FIXTURES.corporateRequest],
    );
    expect(rowCount).toBe(0);
  });

  run('a customer cannot insert a request owned by someone else', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.individual,
        `insert into service_requests (customer_profile_id, status, contact_name, contact_phone)
         values ($1, 'draft', 'Impersonator', '+8801711111111')`,
        [USERS.companyAdmin],
      ),
    );
    expect(error.message).toMatch(/row-level security/i);
  });

  run('a customer CAN insert a request they own', async () => {
    // Guards a real bug: reference generation used to need raw sequence
    // privileges, so this failed with "permission denied for sequence".
    const { rows } = await asAuthenticated<{ reference: string }>(
      USERS.individual,
      `insert into service_requests (customer_profile_id, status, contact_name, contact_phone)
       values ($1, 'draft', 'Self Insert', '+8801711111111')
       returning reference`,
      [USERS.individual],
    );
    expect(rows[0].reference).toMatch(/^REQ-\d{4}-\d{5}$/);
  });
});

describe('RLS: partner isolation', () => {
  run('a partner sees only their own quotes', async () => {
    const { rows } = await asAuthenticated<{ reference: string }>(
      USERS.decoratorOwner,
      'select reference from quotes',
    );
    const references = rows.map((r) => r.reference);
    expect(references).toContain('QT-2026-90012');
    // Bengal Feast's catering quotes belong to a different partner org.
    expect(references).not.toContain('QT-2026-90001');
  });

  run('a partner sees only their own bookings', async () => {
    const { rows } = await asAuthenticated<{ id: string }>(
      USERS.decoratorOwner,
      'select id from bookings',
    );
    expect(rows.map((r) => r.id)).not.toContain(FIXTURES.cateringBooking);
  });

  run('an uninvited partner cannot read the request', async () => {
    // The photographer was not invited to the corporate conference.
    const { rows } = await asAuthenticated(
      USERS.photographerOwner,
      'select id from service_requests where id = $1',
      [FIXTURES.corporateRequest],
    );
    expect(rows).toHaveLength(0);
  });

  run('an invited partner CAN read the request they were invited to', async () => {
    const { rows } = await asAuthenticated(
      USERS.catererOwner,
      'select id from service_requests where id = $1',
      [FIXTURES.corporateRequest],
    );
    expect(rows).toHaveLength(1);
  });

  run('a partner cannot read another partner’s payout accounts', async () => {
    const { rows } = await asAuthenticated(
      USERS.decoratorOwner,
      'select id from partner_payout_accounts where partner_id = $1',
      [FIXTURES.bengalFeast],
    );
    expect(rows).toHaveLength(0);
  });

  run('a partner cannot read another partner’s verification documents', async () => {
    await asAdmin(
      `insert into partner_documents (partner_id, kind, title, storage_path)
       values ($1, 'trade_license', 'Licence', $2)
       on conflict do nothing`,
      [FIXTURES.bengalFeast, `${FIXTURES.bengalFeast}/trade_license/licence.pdf`],
    );

    const { rows } = await asAuthenticated(
      USERS.decoratorOwner,
      'select id from partner_documents where partner_id = $1',
      [FIXTURES.bengalFeast],
    );
    expect(rows).toHaveLength(0);
  });

  run('a partner cannot approve and publish themselves', async () => {
    // Regression test for a real privilege-escalation bug: RLS is
    // row-level, so the partner's own UPDATE policy also allowed setting
    // verification_status. A trigger now pins the platform-owned columns.
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.soundOwner,
        `update partner_profiles set verification_status = 'approved', published_at = now()
         where id = $1`,
        [FIXTURES.nagarSound],
      ),
    );
    expect(error.message).toMatch(/set by the platform/i);
    expect(error.code).toBe('42501');
  });

  run('a partner cannot inflate their own rating or booking count', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.catererOwner,
        'update partner_profiles set rating_avg = 5, rating_count = 999, completed_bookings = 999 where id = $1',
        [FIXTURES.bengalFeast],
      ),
    );
    expect(error.message).toMatch(/set by the platform/i);
  });

  run('a partner CAN still edit their own descriptive fields', async () => {
    const { rowCount } = await asAuthenticated(
      USERS.catererOwner,
      `update partner_profiles set tagline = 'Updated tagline', max_guests = 1600 where id = $1`,
      [FIXTURES.bengalFeast],
    );
    expect(rowCount).toBe(1);
  });

  run('a partner cannot change their own commission rate', async () => {
    const { rows: before } = await asAdmin<{ commission_bps: number | null }>(
      'select commission_bps from partner_profiles where id = $1',
      [FIXTURES.bengalFeast],
    );
    await asAuthenticated(
      USERS.catererOwner,
      'update partner_profiles set commission_bps = 0 where id = $1',
      [FIXTURES.bengalFeast],
    ).catch(() => undefined);

    const { rows: after } = await asAdmin<{ commission_bps: number | null }>(
      'select commission_bps from partner_profiles where id = $1',
      [FIXTURES.bengalFeast],
    );
    // The transaction is rolled back by the harness, but assert the
    // persisted value is untouched regardless.
    expect(after[0].commission_bps).toBe(before[0].commission_bps);
  });
});

describe('RLS: staff-only data', () => {
  run('a customer cannot read internal notes', async () => {
    const { rows } = await asAuthenticated(USERS.companyAdmin, 'select id from internal_notes');
    expect(rows).toHaveLength(0);
  });

  run('a partner cannot read internal notes', async () => {
    const { rows } = await asAuthenticated(USERS.catererOwner, 'select id from internal_notes');
    expect(rows).toHaveLength(0);
  });

  run('operations staff CAN read internal notes', async () => {
    const { rows } = await asAuthenticated(USERS.opsAdmin, 'select id from internal_notes');
    expect(rows.length).toBeGreaterThan(0);
  });

  run('a customer cannot read the audit log', async () => {
    const { rows } = await asAuthenticated(USERS.companyAdmin, 'select id from audit_logs');
    expect(rows).toHaveLength(0);
  });

  run('a customer cannot read match candidate scores', async () => {
    const { rows } = await asAuthenticated(
      USERS.companyAdmin,
      'select id from request_match_candidates',
    );
    expect(rows).toHaveLength(0);
  });

  run('a customer cannot read pricing rules', async () => {
    const { rows } = await asAuthenticated(USERS.companyAdmin, 'select id from pricing_rules');
    expect(rows).toHaveLength(0);
  });

  run('a partner cannot read pricing rules', async () => {
    const { rows } = await asAuthenticated(USERS.catererOwner, 'select id from pricing_rules');
    expect(rows).toHaveLength(0);
  });
});

describe('RLS: message contact protection', () => {
  run('authenticated sessions cannot select the raw message body', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(USERS.individual, 'select body from messages limit 1'),
    );
    expect(error.message).toMatch(/permission denied/i);
  });

  run('authenticated sessions CAN select the masked body', async () => {
    const { rows } = await asAuthenticated(
      USERS.individual,
      'select body_public from messages limit 1',
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  run('contact details are masked when sharing is not allowed', async () => {
    const { rows } = await asAdmin<{ body_public: string; flagged_contact: boolean }>(
      `with thread as (
         insert into message_threads (kind, subject, contact_sharing_allowed)
         values ('customer_partner', 'Masking test', false)
         returning id
       )
       insert into messages (thread_id, sender_side, kind, body)
       select id, 'customer', 'user',
              'Call me on 01712345678 or email me at test@example.com'
       from thread
       returning body_public, flagged_contact`,
    );

    expect(rows[0].body_public).not.toContain('01712345678');
    expect(rows[0].body_public).not.toContain('test@example.com');
    expect(rows[0].body_public).toContain('[contact hidden]');
    expect(rows[0].flagged_contact).toBe(true);

    await asAdmin(`delete from message_threads where subject = 'Masking test'`);
  });

  run('contact details pass through once operations opens the channel', async () => {
    const { rows } = await asAdmin<{ body_public: string; flagged_contact: boolean }>(
      `with thread as (
         insert into message_threads (kind, subject, contact_sharing_allowed)
         values ('customer_partner', 'Open channel test', true)
         returning id
       )
       insert into messages (thread_id, sender_side, kind, body)
       select id, 'platform', 'user', 'Reach the caterer on 01712345678'
       from thread
       returning body_public, flagged_contact`,
    );

    expect(rows[0].body_public).toContain('01712345678');
    expect(rows[0].flagged_contact).toBe(false);

    await asAdmin(`delete from message_threads where subject = 'Open channel test'`);
  });

  run('a non-participant cannot read a thread', async () => {
    const { rows } = await asAuthenticated(
      USERS.photographerOwner,
      'select id from message_threads',
    );
    expect(rows).toHaveLength(0);
  });
});

describe('RLS: privilege escalation', () => {
  run('a customer cannot grant themselves a platform role', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.individual,
        `insert into platform_staff (profile_id, role) values ($1, 'super_admin')`,
        [USERS.individual],
      ),
    );
    expect(error.message).toMatch(/row-level security/i);
  });

  run('a partner cannot grant themselves a platform role', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.catererOwner,
        `insert into platform_staff (profile_id, role) values ($1, 'ops_admin')`,
        [USERS.catererOwner],
      ),
    );
    expect(error.message).toMatch(/row-level security/i);
  });

  run('a customer cannot add themselves to another organisation', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.individual,
        `insert into organization_members (organization_id, profile_id, role, status)
         values ($1, $2, 'owner', 'active')`,
        [FIXTURES.abcTech, USERS.individual],
      ),
    );
    expect(error.message).toMatch(/row-level security/i);
  });

  run('a support admin cannot approve a payout (no finance permission)', async () => {
    // Payout writes are revoked from `authenticated` entirely; they only
    // happen server-side after an explicit permission check.
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.supportAdmin,
        `update payouts set status = 'approved' where status = 'pending'`,
      ),
    );
    expect(error.message).toMatch(/permission denied/i);
  });

  run('a customer cannot write to the financial ledger', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.individual,
        `insert into financial_transactions (entry_group, account, direction, amount_minor, description)
         values (gen_random_uuid(), 'platform_revenue', 'debit', 1, 'fraud')`,
      ),
    );
    expect(error.message).toMatch(/permission denied/i);
  });

  run('a customer cannot insert a payment record', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(
        USERS.individual,
        `insert into payments (customer_profile_id, amount_minor, idempotency_key)
         values ($1, 100, 'forged')`,
        [USERS.individual],
      ),
    );
    expect(error.message).toMatch(/permission denied/i);
  });

  run('a customer cannot modify a booking’s commercial terms', async () => {
    // No UPDATE policy matches a customer, so the statement affects no
    // rows rather than raising — the booking is untouched either way.
    const { rowCount } = await asAuthenticated(
      USERS.individual,
      'update bookings set gross_minor = 1 where id = $1',
      [FIXTURES.cateringBooking],
    );
    expect(rowCount).toBe(0);

    const { rows } = await asAdmin<{ gross_minor: number }>(
      'select gross_minor from bookings where id = $1',
      [FIXTURES.cateringBooking],
    );
    expect(rows[0].gross_minor).toBeGreaterThan(1);
  });
});
