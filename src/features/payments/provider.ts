import 'server-only';

import type { Minor } from '@/lib/money';

/**
 * Payment provider abstraction.
 *
 * Adding bKash, Nagad or a card acquirer means implementing this
 * interface and registering it in `getPaymentProvider()`. Nothing
 * elsewhere in the application knows which gateway is in use.
 *
 * DESIGN NOTE — we do not assume the gateway supports marketplace split
 * settlement. The platform collects the full amount and partner payouts
 * are settled separately by our finance workflow (see features/payouts).
 * This is deliberate: split settlement is not reliably available to new
 * merchants in Bangladesh, and it would put partner money on the
 * gateway's schedule rather than ours.
 */

export type PaymentInitInput = {
  /** Our payment row id; becomes the gateway's transaction id. */
  paymentId: string;
  reference: string;
  amountMinor: Minor;
  currency: 'BDT';
  description: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string | null;
    city?: string | null;
  };
  urls: {
    success: string;
    fail: string;
    cancel: string;
    ipn: string;
  };
  metadata?: Record<string, string>;
};

export type PaymentInitResult =
  | { ok: true; redirectUrl: string; providerSession: string | null; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

/** The authoritative, server-verified state of a transaction. */
export type PaymentVerification = {
  /** Normalised outcome. */
  status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'expired' | 'unknown';
  /** Amount the gateway says was actually captured, in minor units. */
  amountMinor: Minor | null;
  currency: string | null;
  /** Our transaction id echoed back. Must match before we trust anything. */
  transactionId: string | null;
  /** Gateway-side identifiers, stored for reconciliation and refunds. */
  providerRef: string | null;
  bankTransactionId: string | null;
  method: string | null;
  /** Gateway charge, when the provider reports it. */
  feeMinor: Minor | null;
  raw: unknown;
};

export type RefundInput = {
  bankTransactionId: string;
  amountMinor: Minor;
  reason: string;
  refundReference: string;
};

export type RefundResult =
  | { ok: true; providerRef: string | null; status: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export interface PaymentProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  /** Human-readable reason when unconfigured, shown to admins only. */
  readonly configurationHint?: string;

  createPayment(input: PaymentInitInput): Promise<PaymentInitResult>;

  /**
   * Re-checks a transaction directly with the gateway.
   * This is the ONLY source of truth for whether money moved — browser
   * redirects and webhook payloads are treated as untrusted hints.
   */
  verifyPayment(input: { validationId?: string | null; transactionId: string }): Promise<PaymentVerification>;

  /**
   * Extracts the identifiers we need from a webhook/IPN body. It must not
   * decide the outcome; the caller always follows up with verifyPayment.
   */
  parseWebhook(body: Record<string, string>): {
    transactionId: string | null;
    validationId: string | null;
    /** A stable id for idempotent storage of this delivery. */
    deliveryId: string;
    signatureValid: boolean;
  };

  refundPayment(input: RefundInput): Promise<RefundResult>;
}
