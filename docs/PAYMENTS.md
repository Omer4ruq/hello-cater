# Payments

**Audience:** developers integrating or debugging payments, and finance staff who need to understand what the system guarantees.

---

## The model

**The platform collects. The platform settles.**

```
Customer ──pays──▶ Evently BD ──after delivery──▶ Partner
```

We deliberately do **not** use gateway split settlement:

- It is not reliably available to new merchants in Bangladesh.
- It would put partner money on the gateway's schedule rather than ours.
- It removes our ability to hold funds while a dispute is resolved — which is much of what a managed marketplace is for.

Partner payouts are a finance workflow we control, backed by a double-entry ledger.

---

## Money flow

```
1. Customer accepts a proposal
      → event created, bookings at `pending_payment`

2. Customer pays the deposit
      → payment row → gateway → server-side verification
      → event.paid_minor increases
      → bookings move to `confirmed`
      → ledger: debit gateway_clearing / credit partner_payable + platform_revenue

3. Partner delivers
      → booking reaches `completed`

4. Finance creates a payout run
      → payout + payout_items (booking locked against double payment)

5. Finance approves and settles
      → ledger: debit partner_payable / credit gateway_clearing
      → partner notified, statement issued
```

---

## The trust model

This is the part that matters. Three inputs, exactly one of them trusted:

| Input | Trusted? | Why |
|---|---|---|
| Browser redirect (`/api/payments/callback/success`) | **No** | The gateway returns the customer through their own browser. The payload is attacker-influenceable. |
| IPN webhook (`/api/payments/webhook/sslcommerz`) | **No** | An unauthenticated POST from the internet. |
| **Validation API** (server → gateway, with `val_id`) | **Yes** | Our server, our credentials, the gateway's answer. |

Both untrusted inputs are treated as *hints that something may have happened*. Each triggers the same verification, and whichever arrives first wins; the second is a no-op.

### What verification checks

Before a payment is marked paid, `confirmPayment()` requires all of:

1. The Validation API reports `VALID` or `VALIDATED`.
2. The amount matches our stored `amount_minor` **exactly**.
3. The currency is `BDT`.
4. The transaction id matches our reference.

An amount mismatch **fails the payment and alerts finance**. It never settles a different figure than the one the customer agreed to.

### Idempotency

Three mechanisms, because this is where marketplaces lose money:

- `payments.idempotency_key` is unique — a retried checkout cannot create a second charge.
- `payment_events` is unique on `(provider, provider_event_id)` — a replayed webhook is recognised and dropped.
- The settlement update carries `.neq('status', 'paid')` — if two confirmations race, only one applies the money.

### `verify_sign`

SSLCOMMERZ sends `verify_sign` and `verify_key` on the IPN. We compute and compare it as defence in depth, but their published documentation does not fully specify the construction, so **a mismatch is logged rather than used as the sole rejection criterion** — the Validation API decides.

That is a conscious trade-off, documented rather than hidden. If you can get the exact algorithm confirmed by SSLCOMMERZ support, tighten `SslcommerzProvider.checkSignature()` to reject on mismatch.

---

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/payments/callback/success` | GET, POST | Browser return. Verifies, then redirects to the result page. |
| `/api/payments/callback/fail` | GET, POST | Browser return on failure. Verifies, then redirects. |
| `/api/payments/callback/cancel` | GET, POST | Customer abandoned checkout. Marks cancelled. |
| `/api/payments/webhook/[provider]` | POST | IPN. Always answers `200` once the delivery is stored. |

The webhook **always returns 200** after recording the delivery. Returning an error would make the gateway retry something we have already stored, and the work is idempotent anyway. Processing failures are recorded in `payment_events.process_error` for an admin to reprocess.

---

## Configuration

```bash
PAYMENT_PROVIDER = sslcommerz        # or `manual`
PAYMENT_SANDBOX  = true              # false = LIVE, real money
SSLCOMMERZ_STORE_ID = ...
SSLCOMMERZ_STORE_PASSWORD = ...
```

Endpoints resolve automatically:

| | Sandbox | Live |
|---|---|---|
| Session | `sandbox.sslcommerz.com/gwprocess/v4/api.php` | `securepay.sslcommerz.com/gwprocess/v4/api.php` |
| Validation | `sandbox.sslcommerz.com/validator/api/validationserverAPI.php` | `securepay.sslcommerz.com/...` |
| Refund | `.../merchantTransIDvalidationAPI.php` | same |

Verified against <https://developer.sslcommerz.com/doc/v4/>. Re-check before going live — payment APIs change.

If credentials are missing, the provider falls back to **manual settlement** automatically rather than failing.

---

## Manual settlement

Not a stub. Corporate customers in Bangladesh routinely pay by bank transfer against an invoice, and this is a legitimate production mode.

1. Customer is shown bank-transfer instructions with their payment reference.
2. They transfer and quote the reference.
3. Finance opens **Admin → Payments**, finds the pending payment, clicks **Record receipt**, enters the amount, method and bank reference.

That runs `confirmPayment()` with a `manual` verification — **the identical settlement path**. Event balance, booking states, ledger entries and notifications all behave exactly as they would for a gateway payment.

> Add your receiving bank account to **Admin → Settings** before sharing the instructions page with customers. Until then it shows a warning instead of account details.

---

## Refunds

1. Support or finance raises a refund against a payment, with a reason.
2. The refund amount is computed from the booking's **cancellation policy tiers** (`computeRefund()` in the pricing engine) — refund percentage by hours before the event, and whether the deposit is retained.
3. Finance approves.
4. For a gateway payment, `refundPayment()` calls the gateway with `bank_tran_id`. For manual, finance transfers and records the reference.
5. Ledger entries reverse the original posting.

`payments.refunded_minor` can never exceed `amount_minor` — a CHECK constraint, not a convention.

---

## Payouts

| Status | Meaning |
|---|---|
| `pending` | Created from delivered bookings, awaiting approval |
| `approved` | Finance approved; not yet transferred |
| `processing` | Transfer initiated |
| `paid` | Money sent, reference recorded |
| `failed` | Transfer failed |
| `cancelled` | Withdrawn before settlement |

**Admin → Payouts** groups every delivered, unsettled booking by partner. Finance selects bookings, optionally adds an adjustment with a reason, and creates the payout. Creating it locks those bookings — a partial unique index makes a booking appearing in two payouts impossible at the database level.

Marking paid requires a method **and** a transaction reference, because that is what reconciliation against the bank statement needs later. Settlement posts to the ledger and cannot be reversed; a settled payout raises if you try to reopen it.

Supported methods: bank transfer, bKash, Nagad, Rocket, cash, adjustment.

---

## Testing payments

### Without a gateway

```bash
PAYMENT_PROVIDER=manual
```

Walk the whole flow and record receipt in the admin. Everything downstream is identical.

### With the sandbox

```bash
PAYMENT_PROVIDER=sslcommerz
PAYMENT_SANDBOX=true
```

Use SSLCOMMERZ's sandbox test cards (in their merchant panel). Then verify:

- [ ] `payments.status` reaches `paid`
- [ ] `payments.provider_ref` holds the gateway `val_id`
- [ ] `events.paid_minor` increased by the right amount
- [ ] Bookings moved `pending_payment` → `confirmed`
- [ ] A **balanced** group exists in `financial_transactions`
- [ ] The customer received a receipt
- [ ] Replaying the same IPN changes nothing

```sql
-- Every ledger group must balance. This should always return zero rows.
select entry_group,
       sum(case when direction = 'debit' then amount_minor else -amount_minor end) as delta
from financial_transactions
group by entry_group
having sum(case when direction = 'debit' then amount_minor else -amount_minor end) <> 0;
```

### Local webhooks

The gateway cannot reach `localhost`. Expose it:

```bash
npx localtunnel --port 3000
# or
ngrok http 3000
```

Then set the IPN URL in the merchant panel to the public hostname.

---

## Adding another provider (bKash, Nagad, a card acquirer)

1. Implement `PaymentProvider` in `src/features/payments/providers/<name>.ts`:
   - `createPayment` — returns a redirect URL
   - `verifyPayment` — **server-to-server**; the only authority
   - `parseWebhook` — extract ids and a stable delivery id; do not decide the outcome here
   - `refundPayment`
2. Register it in `getPaymentProvider()`.
3. Add its origins to `connect-src`, `frame-src` and `form-action` in `next.config.ts`.
4. Add credentials to `.env.example` and the deployment guide.

Nothing else changes. The ledger, payouts, invoices and notifications do not know which gateway was used.

---

## Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Stuck at `pending` | IPN not configured or not reachable | `payment_events` — is the delivery there? |
| "Amount mismatch" | Gateway returned a different figure | `payment_transactions.response_body` |
| Paid at the gateway, not in the app | Validation call failed | Server logs for the validation request |
| Double payment | Should be impossible | Check `idempotency_key` uniqueness is intact |
| Payout blocked | Booking already settled | `payout_items` for that `booking_id` |
| Ledger does not balance | A posting failed midway | Run the query above; reconcile manually |

More in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
