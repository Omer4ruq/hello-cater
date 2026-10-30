import 'server-only';

import { integrations } from '@/lib/env.server';
import type { PaymentProvider } from './provider';
import { SslcommerzProvider } from './providers/sslcommerz';
import { ManualPaymentProvider } from './providers/manual';

let cached: PaymentProvider | null = null;

/**
 * Resolves the active payment provider from configuration.
 *
 * Falls back to manual/offline settlement when the gateway is not
 * configured, so the whole booking flow still works end to end in
 * development and in a pilot that invoices corporate customers.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  if (integrations.payments.provider === 'sslcommerz') {
    const provider = new SslcommerzProvider(
      integrations.payments.sslcommerz.storeId,
      integrations.payments.sslcommerz.storePassword,
      integrations.payments.sandbox,
    );
    cached = provider.isConfigured ? provider : new ManualPaymentProvider();
    return cached;
  }

  cached = new ManualPaymentProvider();
  return cached;
}

export type { PaymentProvider } from './provider';
