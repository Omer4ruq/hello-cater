import 'server-only';

import { createHash } from 'node:crypto';
import { logger } from '@/lib/logger';
import { toMajor, toMinor } from '@/lib/money';
import type {
  PaymentProvider, PaymentInitInput, PaymentInitResult,
  PaymentVerification, RefundInput, RefundResult,
} from '../provider';

/**
 * SSLCOMMERZ integration (API v4).
 *
 * Endpoints verified against https://developer.sslcommerz.com/doc/v4/.
 *
 * SECURITY POSTURE
 * The browser redirect and the IPN body are both attacker-influenceable,
 * so neither is trusted. Every state change runs through the Validation
 * API using `val_id`, and we additionally re-check that the amount,
 * currency and transaction id match what we recorded before a payment is
 * marked paid. The `verify_sign` check is implemented as a defence in
 * depth signal, but the official documentation does not fully specify its
 * construction, so a mismatch is logged rather than used as the sole
 * rejection criterion — the Validation API result is what decides.
 */

const ENDPOINTS = {
  sandbox: {
    session: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
    validation: 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',
    refund: 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php',
  },
  production: {
    session: 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
    validation: 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
    refund: 'https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php',
  },
} as const;

type SessionResponse = {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  redirectGatewayURL?: string;
};

type ValidationResponse = {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  store_amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  card_issuer?: string;
  tran_date?: string;
  error?: string;
};

export class SslcommerzProvider implements PaymentProvider {
  readonly name = 'sslcommerz';

  constructor(
    private readonly storeId: string | undefined,
    private readonly storePassword: string | undefined,
    private readonly sandbox: boolean,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.storeId && this.storePassword);
  }

  get configurationHint(): string {
    return 'Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD, and PAYMENT_SANDBOX=false for live.';
  }

  private get endpoints() {
    return this.sandbox ? ENDPOINTS.sandbox : ENDPOINTS.production;
  }

  async createPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    if (!this.isConfigured) {
      return { ok: false, error: 'Payment gateway is not configured.' };
    }

    // SSLCOMMERZ expects the major unit with two decimals.
    const body = new URLSearchParams({
      store_id: this.storeId!,
      store_passwd: this.storePassword!,
      total_amount: toMajor(input.amountMinor).toFixed(2),
      currency: input.currency,
      tran_id: input.reference,
      success_url: input.urls.success,
      fail_url: input.urls.fail,
      cancel_url: input.urls.cancel,
      ipn_url: input.urls.ipn,
      product_name: input.description.slice(0, 250),
      product_category: 'Event Services',
      product_profile: 'general',
      cus_name: input.customer.name.slice(0, 100),
      cus_email: input.customer.email,
      cus_phone: input.customer.phone,
      cus_add1: input.customer.address?.slice(0, 200) ?? 'Dhaka',
      cus_city: input.customer.city ?? 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      num_of_item: '1',
      // value_a carries our internal id so a webhook can always be tied
      // back to a row even if the reference is somehow mangled.
      value_a: input.paymentId,
      value_b: input.metadata?.eventId ?? '',
      value_c: input.metadata?.purpose ?? '',
    });

    try {
      const response = await fetch(this.endpoints.session, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        // A hung gateway must not hold our request open indefinitely.
        signal: AbortSignal.timeout(20_000),
      });

      const raw = (await response.json()) as SessionResponse;

      if (raw.status !== 'SUCCESS' || !(raw.GatewayPageURL || raw.redirectGatewayURL)) {
        return {
          ok: false,
          error: raw.failedreason || 'The payment gateway did not return a checkout page.',
          raw,
        };
      }

      return {
        ok: true,
        redirectUrl: (raw.GatewayPageURL || raw.redirectGatewayURL)!,
        providerSession: raw.sessionkey ?? null,
        raw,
      };
    } catch (error) {
      logger.error('SSLCOMMERZ session creation failed', { error });
      return {
        ok: false,
        error: 'We could not reach the payment gateway. Please try again in a moment.',
      };
    }
  }

  async verifyPayment(input: {
    validationId?: string | null;
    transactionId: string;
  }): Promise<PaymentVerification> {
    const empty: PaymentVerification = {
      status: 'unknown', amountMinor: null, currency: null, transactionId: input.transactionId,
      providerRef: null, bankTransactionId: null, method: null, feeMinor: null, raw: null,
    };

    if (!this.isConfigured || !input.validationId) return empty;

    const url = new URL(this.endpoints.validation);
    url.searchParams.set('val_id', input.validationId);
    url.searchParams.set('store_id', this.storeId!);
    url.searchParams.set('store_passwd', this.storePassword!);
    url.searchParams.set('format', 'json');
    url.searchParams.set('v', '1');

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      const raw = (await response.json()) as ValidationResponse;

      const status = ((): PaymentVerification['status'] => {
        switch ((raw.status ?? '').toUpperCase()) {
          // VALIDATED means "already validated previously" — still paid.
          case 'VALID':
          case 'VALIDATED':
            return 'paid';
          case 'FAILED':
            return 'failed';
          case 'CANCELLED':
            return 'cancelled';
          case 'EXPIRED':
            return 'expired';
          case 'UNATTEMPTED':
            return 'pending';
          default:
            return 'unknown';
        }
      })();

      const amountMinor = raw.amount != null ? toMinor(Number(raw.amount)) : null;
      // store_amount is net of the gateway's charge.
      const storeAmountMinor = raw.store_amount != null ? toMinor(Number(raw.store_amount)) : null;

      return {
        status,
        amountMinor,
        currency: raw.currency ?? null,
        transactionId: raw.tran_id ?? input.transactionId,
        providerRef: raw.val_id ?? input.validationId,
        bankTransactionId: raw.bank_tran_id ?? null,
        method: raw.card_type ?? raw.card_issuer ?? null,
        feeMinor:
          amountMinor != null && storeAmountMinor != null
            ? Math.max(amountMinor - storeAmountMinor, 0)
            : null,
        raw,
      };
    } catch (error) {
      logger.error('SSLCOMMERZ validation call failed', { error, validationId: input.validationId });
      return empty;
    }
  }

  parseWebhook(body: Record<string, string>) {
    return {
      transactionId: body.tran_id ?? null,
      validationId: body.val_id ?? null,
      // val_id is unique per transaction attempt, which makes replays a
      // no-op once stored against the unique (provider, provider_event_id).
      deliveryId: body.val_id ?? body.tran_id ?? `unknown-${Date.now()}`,
      signatureValid: this.checkSignature(body),
    };
  }

  /**
   * Best-effort `verify_sign` check.
   *
   * The published algorithm: take the fields named in `verify_key`, sort
   * them, build `k=v` pairs joined by `&`, append the md5 of the store
   * password as `store_passwd`, re-sort, and md5 the result. The official
   * documentation does not fully specify this, so the result is advisory:
   * `verifyPayment()` remains the authority.
   */
  private checkSignature(body: Record<string, string>): boolean {
    if (!body.verify_sign || !body.verify_key || !this.storePassword) return false;
    try {
      const keys = body.verify_key.split(',').map((k) => k.trim()).filter(Boolean);
      const pairs = keys.map((key) => `${key}=${body[key] ?? ''}`);
      pairs.push(`store_passwd=${createHash('md5').update(this.storePassword).digest('hex')}`);
      pairs.sort();
      const computed = createHash('md5').update(pairs.join('&')).digest('hex');
      return computed === body.verify_sign;
    } catch (error) {
      logger.debug('verify_sign computation failed', { error });
      return false;
    }
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    if (!this.isConfigured) return { ok: false, error: 'Payment gateway is not configured.' };

    const url = new URL(this.endpoints.refund);
    url.searchParams.set('bank_tran_id', input.bankTransactionId);
    url.searchParams.set('refund_amount', toMajor(input.amountMinor).toFixed(2));
    url.searchParams.set('refund_remarks', input.reason.slice(0, 250));
    url.searchParams.set('refe_id', input.refundReference);
    url.searchParams.set('store_id', this.storeId!);
    url.searchParams.set('store_passwd', this.storePassword!);
    url.searchParams.set('format', 'json');
    url.searchParams.set('v', '1');

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      const raw = (await response.json()) as { APIConnect?: string; status?: string; errorReason?: string; refund_ref_id?: string };

      const ok = (raw.status ?? '').toLowerCase() === 'success' || (raw.status ?? '').toLowerCase() === 'processing';
      return ok
        ? { ok: true, providerRef: raw.refund_ref_id ?? null, status: raw.status ?? 'processing', raw }
        : { ok: false, error: raw.errorReason ?? 'The gateway rejected the refund.', raw };
    } catch (error) {
      logger.error('SSLCOMMERZ refund failed', { error });
      return { ok: false, error: 'We could not reach the payment gateway to process the refund.' };
    }
  }
}
