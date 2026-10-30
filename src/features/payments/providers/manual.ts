import 'server-only';

import { logger } from '@/lib/logger';
import type {
  PaymentProvider, PaymentInitInput, PaymentInitResult,
  PaymentVerification, RefundInput, RefundResult,
} from '../provider';

/**
 * Manual/offline settlement provider.
 *
 * Used when no gateway is configured, and as a genuine production
 * option: many corporate customers in Bangladesh pay by bank transfer or
 * cheque against an invoice. Finance confirms receipt in the admin, which
 * runs exactly the same confirmation path as a gateway callback — so the
 * ledger and payout logic never learn about the difference.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';
  readonly isConfigured = true;
  readonly configurationHint =
    'Offline settlement. Finance marks payments received in Admin → Payments.';

  async createPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    logger.info('Manual payment created; awaiting finance confirmation', {
      reference: input.reference,
      amountMinor: input.amountMinor,
    });
    // Sends the customer to bank-transfer instructions rather than a gateway.
    return {
      ok: true,
      redirectUrl: `${input.urls.success.split('/api/')[0]}/dashboard/payments/${input.paymentId}/instructions`,
      providerSession: null,
      raw: { provider: 'manual' },
    };
  }

  async verifyPayment(input: { transactionId: string }): Promise<PaymentVerification> {
    // There is nothing to call: an offline payment is only ever confirmed
    // by a finance admin, through the audited admin action.
    return {
      status: 'pending',
      amountMinor: null,
      currency: 'BDT',
      transactionId: input.transactionId,
      providerRef: null,
      bankTransactionId: null,
      method: 'offline',
      feeMinor: 0,
      raw: null,
    };
  }

  parseWebhook(body: Record<string, string>) {
    return {
      transactionId: body.tran_id ?? null,
      validationId: null,
      deliveryId: `manual-${body.tran_id ?? Date.now()}`,
      signatureValid: false,
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    logger.info('Manual refund recorded; finance must transfer the funds', {
      reference: input.refundReference,
    });
    return { ok: true, providerRef: null, status: 'manual', raw: { provider: 'manual' } };
  }
}
