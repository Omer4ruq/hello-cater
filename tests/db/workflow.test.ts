import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  asAdmin, asAuthenticated, connect, disconnect,
  databaseAvailable, expectRejection, FIXTURES, USERS,
} from './helpers';

/**
 * Workflow integrity.
 *
 * Verifies the guarantees the database enforces regardless of which
 * surface issues the statement: derived totals, immutable history,
 * legal state transitions, capacity limits, review eligibility and a
 * balanced ledger.
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
      throw new Error('Test database unavailable. Run `npm run db:test:setup`.');
    }
    await fn();
  });

/** Runs inside a transaction that is always rolled back. */
async function inRollback<T>(fn: () => Promise<T>): Promise<T> {
  const db = await connect();
  await db.query('begin');
  try {
    return await fn();
  } finally {
    await db.query('rollback');
  }
}

describe('quote totals are derived, never supplied', () => {
  run('the subtotal is recomputed from line items', async () => {
    await inRollback(async () => {
      const { rows: version } = await asAdmin<{ id: string }>(
        `insert into quote_versions (quote_id, version_no, status, guest_count)
         values ($1, 99, 'draft', 100) returning id`,
        [FIXTURES.acceptedProposal ? 'bbbbbbbb-0000-4000-8000-000000000001' : ''],
      );

      await asAdmin(
        `insert into quote_items (quote_version_id, charge_kind, label, unit, quantity, unit_price_minor)
         values ($1, 'food', 'Test dish', 'per_person', 100, 50000)`,
        [version[0].id],
      );

      const { rows } = await asAdmin<{ subtotal_minor: number; total_minor: number; per_person_minor: number }>(
        'select subtotal_minor, total_minor, per_person_minor from quote_versions where id = $1',
        [version[0].id],
      );

      expect(rows[0].subtotal_minor).toBe(5_000_000);
      expect(rows[0].total_minor).toBe(5_000_000);
      expect(rows[0].per_person_minor).toBe(50_000);
    });
  });

  run('optional items are excluded from the total', async () => {
    await inRollback(async () => {
      const { rows: version } = await asAdmin<{ id: string }>(
        `insert into quote_versions (quote_id, version_no, status)
         values ('bbbbbbbb-0000-4000-8000-000000000001', 98, 'draft') returning id`,
      );
      await asAdmin(
        `insert into quote_items (quote_version_id, charge_kind, label, unit, quantity, unit_price_minor, is_optional)
         values ($1, 'food', 'Included', 'flat', 1, 100000, false),
                ($1, 'food', 'Optional add-on', 'flat', 1, 500000, true)`,
        [version[0].id],
      );

      const { rows } = await asAdmin<{ subtotal_minor: number }>(
        'select subtotal_minor from quote_versions where id = $1',
        [version[0].id],
      );
      expect(rows[0].subtotal_minor).toBe(100_000);
    });
  });

  run('discount and tax flow into the total', async () => {
    await inRollback(async () => {
      // The discount constraint compares against the subtotal, so the
      // line items must exist before a discount can be applied — the
      // same order the quote builder uses.
      const { rows: version } = await asAdmin<{ id: string }>(
        `insert into quote_versions (quote_id, version_no, status)
         values ('bbbbbbbb-0000-4000-8000-000000000001', 97, 'draft') returning id`,
      );
      await asAdmin(
        `insert into quote_items (quote_version_id, charge_kind, label, unit, quantity, unit_price_minor)
         values ($1, 'food', 'Base', 'flat', 1, 1000000)`,
        [version[0].id],
      );
      await asAdmin(
        'update quote_versions set discount_minor = 100000, tax_minor = 50000 where id = $1',
        [version[0].id],
      );

      const { rows } = await asAdmin<{ total_minor: number }>(
        'select total_minor from quote_versions where id = $1',
        [version[0].id],
      );
      expect(rows[0].total_minor).toBe(1_000_000 + 50_000 - 100_000);
    });
  });

  run('a discount larger than the quote is rejected', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `insert into quote_versions (quote_id, version_no, status, subtotal_minor, discount_minor)
         values ('bbbbbbbb-0000-4000-8000-000000000001', 96, 'draft', 1000, 999999)`,
      ),
    );
    expect(error.message).toMatch(/discount_sane|check constraint/i);
  });
});

describe('submitted quotes are immutable', () => {
  run('line items cannot be changed after submission', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `insert into quote_items (quote_version_id, charge_kind, label, unit, quantity, unit_price_minor)
         values ('cccccccc-0000-4000-8000-000000000001', 'food', 'Sneaky extra', 'flat', 1, 1)`,
      ),
    );
    expect(error.message).toMatch(/submitted quote version/i);
  });

  run('line items cannot be deleted after submission', async () => {
    const error = await expectRejection(() =>
      asAdmin(`delete from quote_items where quote_version_id = 'cccccccc-0000-4000-8000-000000000001'`),
    );
    expect(error.message).toMatch(/submitted quote version/i);
  });

  run('a new version CAN be created for the same quote', async () => {
    await inRollback(async () => {
      const { rows } = await asAdmin<{ version_no: number }>(
        `insert into quote_versions (quote_id, version_no, status, change_summary)
         values ('bbbbbbbb-0000-4000-8000-000000000001', 2, 'draft', 'Reduced per-head price')
         returning version_no`,
      );
      expect(rows[0].version_no).toBe(2);
    });
  });
});

describe('sent proposals are immutable', () => {
  run('a sent proposal cannot have its money changed', async () => {
    const error = await expectRejection(() =>
      asAdmin('update proposals set service_fee_minor = 0 where id = $1', [FIXTURES.acceptedProposal]),
    );
    expect(error.message).toMatch(/create a revision/i);
  });

  run('proposal totals are derived from the lines', async () => {
    const { rows } = await asAdmin<{
      partner_gross_minor: number; total_minor: number;
      platform_revenue_minor: number; commission_minor: number;
      service_fee_minor: number; coordination_fee_minor: number; delivery_fee_minor: number;
    }>(
      `select partner_gross_minor, total_minor, platform_revenue_minor, commission_minor,
              service_fee_minor, coordination_fee_minor, delivery_fee_minor
       from proposals where id = $1`,
      [FIXTURES.acceptedProposal],
    );
    const p = rows[0];

    const { rows: lines } = await asAdmin<{ sum_amount: number; sum_commission: number }>(
      `select coalesce(sum(amount_minor),0) as sum_amount,
              coalesce(sum(commission_minor),0) as sum_commission
       from proposal_lines where proposal_id = $1`,
      [FIXTURES.acceptedProposal],
    );

    expect(p.partner_gross_minor).toBe(lines[0].sum_amount);
    expect(p.commission_minor).toBe(lines[0].sum_commission);
    expect(p.total_minor).toBe(
      p.partner_gross_minor + p.service_fee_minor + p.coordination_fee_minor + p.delivery_fee_minor,
    );
    expect(p.platform_revenue_minor).toBe(
      p.commission_minor + p.service_fee_minor + p.coordination_fee_minor,
    );
  });

  run('every proposal line satisfies payable = amount - commission', async () => {
    const { rows } = await asAdmin<{ bad: number }>(
      `select count(*)::int as bad from proposal_lines
       where partner_payable_minor <> amount_minor - commission_minor`,
    );
    expect(rows[0].bad).toBe(0);
  });
});

describe('booking state machine', () => {
  run('an illegal transition is rejected', async () => {
    const error = await expectRejection(() =>
      asAdmin(`update bookings set status = 'completed' where id = $1`, [FIXTURES.cateringBooking]),
    );
    expect(error.message).toMatch(/illegal booking transition/i);
  });

  run('a legal forward transition is accepted', async () => {
    await inRollback(async () => {
      const { rowCount } = await asAdmin(
        `update bookings set status = 'in_preparation' where id = $1`,
        [FIXTURES.cateringBooking],
      );
      expect(rowCount).toBe(1);
    });
  });

  run('a closed booking cannot be reopened', async () => {
    await inRollback(async () => {
      await asAdmin(`update bookings set status = 'closed' where id = $1`, [FIXTURES.completedBooking]);
      const error = await expectRejection(() =>
        asAdmin(`update bookings set status = 'confirmed' where id = $1`, [FIXTURES.completedBooking]),
      );
      expect(error.message).toMatch(/illegal booking transition/i);
    });
  });

  run('every status change is written to the history table', async () => {
    await inRollback(async () => {
      await asAdmin(`update bookings set status = 'in_preparation' where id = $1`, [FIXTURES.cateringBooking]);
      const { rows } = await asAdmin<{ to_status: string }>(
        `select to_status from booking_status_history
         where booking_id = $1 order by created_at desc limit 1`,
        [FIXTURES.cateringBooking],
      );
      expect(rows[0].to_status).toBe('in_preparation');
    });
  });

  run('the payable is constrained to gross - commission + adjustment', async () => {
    const error = await expectRejection(() =>
      asAdmin('update bookings set partner_payable_minor = 999999 where id = $1', [FIXTURES.cateringBooking]),
    );
    expect(error.message).toMatch(/booking_payable|check constraint/i);
  });

  run('commission cannot exceed the gross', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `update bookings set commission_minor = gross_minor + 1,
                             partner_payable_minor = -1
         where id = $1`,
        [FIXTURES.cateringBooking],
      ),
    );
    expect(error.message).toMatch(/commission_le_gross|check constraint/i);
  });
});

describe('partner capacity and availability', () => {
  run('a booking on a blocked date is rejected', async () => {
    await inRollback(async () => {
      await asAdmin(
        `insert into partner_availability (partner_id, on_date, is_blocked)
         values ($1, current_date + 200, true)`,
        [FIXTURES.zaikaKitchen],
      );

      const error = await expectRejection(() =>
        asAdmin(
          `insert into bookings (event_id, partner_id, status, gross_minor, commission_bps,
                                 commission_minor, partner_payable_minor, service_date)
           values ($1, $2, 'confirmed', 100000, 1200, 12000, 88000, current_date + 200)`,
          [FIXTURES.holudEvent, FIXTURES.zaikaKitchen],
        ),
      );
      expect(error.message).toMatch(/blocked/i);
    });
  });

  run('a booking beyond daily capacity is rejected', async () => {
    await inRollback(async () => {
      // Orchid Decor has a declared capacity of 2 events per day.
      await asAdmin(
        `insert into bookings (event_id, partner_id, status, gross_minor, commission_bps,
                               commission_minor, partner_payable_minor, service_date)
         values ($1, $2, 'confirmed', 100000, 1500, 15000, 85000, current_date + 210),
                ($1, $2, 'confirmed', 100000, 1500, 15000, 85000, current_date + 210)`,
        [FIXTURES.holudEvent, FIXTURES.orchidDecor],
      );

      const error = await expectRejection(() =>
        asAdmin(
          `insert into bookings (event_id, partner_id, status, gross_minor, commission_bps,
                                 commission_minor, partner_payable_minor, service_date)
           values ($1, $2, 'confirmed', 100000, 1500, 15000, 85000, current_date + 210)`,
          [FIXTURES.holudEvent, FIXTURES.orchidDecor],
        ),
      );
      expect(error.message).toMatch(/at capacity/i);
    });
  });

  run('cancelled bookings do not consume capacity', async () => {
    await inRollback(async () => {
      await asAdmin(
        `insert into bookings (event_id, partner_id, status, gross_minor, commission_bps,
                               commission_minor, partner_payable_minor, service_date)
         values ($1, $2, 'cancelled', 100000, 1500, 15000, 85000, current_date + 220),
                ($1, $2, 'cancelled', 100000, 1500, 15000, 85000, current_date + 220)`,
        [FIXTURES.holudEvent, FIXTURES.orchidDecor],
      );

      const { rowCount } = await asAdmin(
        `insert into bookings (event_id, partner_id, status, gross_minor, commission_bps,
                               commission_minor, partner_payable_minor, service_date)
         values ($1, $2, 'confirmed', 100000, 1500, 15000, 85000, current_date + 220)`,
        [FIXTURES.holudEvent, FIXTURES.orchidDecor],
      );
      expect(rowCount).toBe(1);
    });
  });
});

describe('review eligibility', () => {
  run('a review requires a completed booking', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `insert into reviews (booking_id, partner_id, author_id, rating)
         values ($1, $2, $3, 5)`,
        [FIXTURES.cateringBooking, FIXTURES.bengalFeast, USERS.individual],
      ),
    );
    expect(error.message).toMatch(/completed booking/i);
  });

  run('a review cannot be written by someone who did not own the booking', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `insert into reviews (booking_id, partner_id, author_id, rating)
         values ($1, $2, $3, 1)`,
        [FIXTURES.completedBooking, FIXTURES.zaikaKitchen, USERS.individual],
      ),
    );
    expect(error.message).toMatch(/belongs to the author|completed booking/i);
  });

  run('publishing a review updates the partner rating aggregate', async () => {
    const { rows } = await asAdmin<{ rating_avg: number; rating_count: number }>(
      'select rating_avg, rating_count from partner_profiles where id = $1',
      [FIXTURES.zaikaKitchen],
    );
    // The demo seed publishes one 5-star review for this partner.
    expect(rows[0].rating_count).toBeGreaterThanOrEqual(1);
    expect(Number(rows[0].rating_avg)).toBeGreaterThan(0);
  });

  run('one review per booking', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `insert into reviews (booking_id, partner_id, author_id, rating)
         values ($1, $2, $3, 4)`,
        [FIXTURES.completedBooking, FIXTURES.zaikaKitchen, USERS.companyAdmin],
      ),
    );
    expect(error.message).toMatch(/duplicate key|unique/i);
  });
});

describe('financial ledger', () => {
  run('every entry group balances', async () => {
    const { rows } = await asAdmin<{ unbalanced: number }>(
      `select count(*)::int as unbalanced from (
         select entry_group,
                sum(case when direction = 'debit' then amount_minor else -amount_minor end) as delta
         from financial_transactions group by entry_group
       ) g where delta <> 0`,
    );
    expect(rows[0].unbalanced).toBe(0);
  });

  run('an unbalanced posting is rejected', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `select app.post_ledger_entries($1::jsonb, 'unbalanced test')`,
        [
          JSON.stringify([
            { account: 'gateway_clearing', direction: 'debit', amount_minor: 1000 },
            { account: 'platform_revenue', direction: 'credit', amount_minor: 900 },
          ]),
        ],
      ),
    );
    expect(error.message).toMatch(/unbalanced ledger group/i);
  });

  run('ledger rows cannot be updated', async () => {
    const error = await expectRejection(() =>
      asAdmin('update financial_transactions set amount_minor = 1'),
    );
    expect(error.message).toMatch(/append-only/i);
  });

  run('ledger rows cannot be deleted', async () => {
    const error = await expectRejection(() =>
      asAdmin('delete from financial_transactions'),
    );
    expect(error.message).toMatch(/append-only/i);
  });

  run('audit log rows cannot be updated or deleted', async () => {
    const update = await expectRejection(() => asAdmin('update audit_logs set action = $1', ['tampered']));
    expect(update.message).toMatch(/append-only/i);

    const remove = await expectRejection(() => asAdmin('delete from audit_logs'));
    expect(remove.message).toMatch(/append-only/i);
  });

  run('money columns reject negative amounts', async () => {
    const error = await expectRejection(() =>
      asAdmin(
        `insert into payments (customer_profile_id, amount_minor, idempotency_key)
         values ($1, -100, 'negative-test')`,
        [USERS.individual],
      ),
    );
    expect(error.message).toMatch(/check constraint|amount_minor/i);
  });

  run('a payment cannot be refunded beyond its amount', async () => {
    const error = await expectRejection(() =>
      asAdmin('update payments set refunded_minor = amount_minor + 1 where id = $1', [FIXTURES.deposit]),
    );
    expect(error.message).toMatch(/refund_le_amount|check constraint/i);
  });

  run('webhook deliveries are idempotent', async () => {
    await inRollback(async () => {
      await asAdmin(
        `insert into payment_events (provider, provider_event_id, payload)
         values ('sslcommerz', 'replay-test-1', '{}'::jsonb)`,
      );
      const error = await expectRejection(() =>
        asAdmin(
          `insert into payment_events (provider, provider_event_id, payload)
           values ('sslcommerz', 'replay-test-1', '{}'::jsonb)`,
        ),
      );
      expect(error.code).toBe('23505');
    });
  });

  run('a booking cannot appear in two payouts', async () => {
    await inRollback(async () => {
      const { rows: payout } = await asAdmin<{ id: string }>(
        `insert into payouts (partner_id, status) values ($1, 'pending') returning id`,
        [FIXTURES.zaikaKitchen],
      );
      await asAdmin(
        `insert into payout_items (payout_id, booking_id, label, gross_minor, commission_minor, net_minor)
         values ($1, $2, 'First payout', 100, 10, 90)`,
        [payout[0].id, FIXTURES.completedBooking],
      );

      const error = await expectRejection(() =>
        asAdmin(
          `insert into payout_items (payout_id, booking_id, label, gross_minor, commission_minor, net_minor)
           values ($1, $2, 'Double pay', 100, 10, 90)`,
          [payout[0].id, FIXTURES.completedBooking],
        ),
      );
      expect(error.code).toBe('23505');
    });
  });

  run('a settled payout cannot be reopened', async () => {
    await inRollback(async () => {
      const { rows: payout } = await asAdmin<{ id: string }>(
        `insert into payouts (partner_id, status, method, paid_at)
         values ($1, 'paid', 'bank_transfer', now()) returning id`,
        [FIXTURES.zaikaKitchen],
      );
      const error = await expectRejection(() =>
        asAdmin(`update payouts set status = 'pending' where id = $1`, [payout[0].id]),
      );
      expect(error.message).toMatch(/settled and cannot be reopened/i);
    });
  });
});

describe('accept_proposal transaction', () => {
  run('a customer cannot accept a proposal that is not theirs', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(USERS.companyAdmin, 'select app.accept_proposal($1)', [FIXTURES.acceptedProposal]),
    );
    expect(error.message).toMatch(/not authorised|cannot be accepted/i);
  });

  run('an already-accepted proposal cannot be accepted twice', async () => {
    const error = await expectRejection(() =>
      asAuthenticated(USERS.individual, 'select app.accept_proposal($1)', [FIXTURES.acceptedProposal]),
    );
    expect(error.message).toMatch(/cannot be accepted from status/i);
  });

  run('accepting creates an event and one booking per partner line', async () => {
    await inRollback(async () => {
      // Build a fresh, sendable proposal from the corporate request.
      const { rows: proposal } = await asAdmin<{ id: string }>(
        `insert into proposals (request_id, status, title, service_fee_minor, valid_until)
         values ($1, 'draft', 'Acceptance test', 100000, current_date + 30)
         returning id`,
        [FIXTURES.corporateRequest],
      );

      await asAdmin(
        `insert into proposal_lines (proposal_id, partner_id, label, amount_minor,
                                     commission_bps, commission_minor, partner_payable_minor)
         values ($1, $2, 'Catering', 1000000, 1200, 120000, 880000),
                ($1, $3, 'Stage', 500000, 1500, 75000, 425000)`,
        [proposal[0].id, FIXTURES.zaikaKitchen, '66666666-0000-4000-8000-000000000009'],
      );

      await asAdmin(
        `update proposals set status = 'sent', sent_at = now() where id = $1`,
        [proposal[0].id],
      );

      const { rows: result } = await asAdmin<{ accept_proposal: string }>(
        'select app.accept_proposal($1, $2) as accept_proposal',
        [proposal[0].id, USERS.companyAdmin],
      );
      const eventId = result[0].accept_proposal;
      expect(eventId).toBeTruthy();

      const { rows: bookings } = await asAdmin<{ count: number }>(
        'select count(*)::int as count from bookings where event_id = $1',
        [eventId],
      );
      expect(bookings[0].count).toBe(2);

      const { rows: event } = await asAdmin<{ total_minor: number; stage: string }>(
        'select total_minor, stage from events where id = $1',
        [eventId],
      );
      expect(event[0].stage).toBe('confirmed');
      expect(event[0].total_minor).toBe(1_000_000 + 500_000 + 100_000);

      const { rows: request } = await asAdmin<{ status: string }>(
        'select status from service_requests where id = $1',
        [FIXTURES.corporateRequest],
      );
      expect(request[0].status).toBe('won');

      // A customer<->platform thread is opened automatically.
      const { rows: threads } = await asAdmin<{ count: number }>(
        'select count(*)::int as count from message_threads where event_id = $1',
        [eventId],
      );
      expect(threads[0].count).toBe(1);
    });
  });

  run('accepting an expired proposal is refused', async () => {
    await inRollback(async () => {
      const { rows: proposal } = await asAdmin<{ id: string }>(
        `insert into proposals (request_id, status, title, valid_until, sent_at)
         values ($1, 'sent', 'Expired test', current_date - 1, now())
         returning id`,
        [FIXTURES.corporateRequest],
      );

      const error = await expectRejection(() =>
        asAdmin('select app.accept_proposal($1, $2)', [proposal[0].id, USERS.companyAdmin]),
      );
      expect(error.message).toMatch(/expired/i);
    });
  });
});
