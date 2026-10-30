/**
 * First-party analytics.
 *
 * Business events only — no third-party pixels, no PII beyond the signed-in
 * profile id (attached server-side). Events are batched and sent with
 * `sendBeacon` so navigation is never delayed, and silently dropped if the
 * endpoint is unavailable.
 */
export const ANALYTICS_EVENTS = [
  'homepage_cta', 'request_started', 'request_step_completed', 'request_submitted',
  'partner_search', 'partner_viewed', 'partner_invited',
  'quote_started', 'quote_submitted',
  'proposal_viewed', 'proposal_accepted', 'proposal_rejected',
  'payment_started', 'payment_completed', 'payment_failed',
  'booking_confirmed', 'event_completed',
  'partner_signup_started', 'partner_signup_completed',
  'search_performed', 'filter_applied',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

type Payload = { name: AnalyticsEvent; properties?: Record<string, unknown>; path?: string };

let queue: Payload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (typeof window === 'undefined' || queue.length === 0) return;
  const batch = queue;
  queue = [];
  flushTimer = null;

  const body = JSON.stringify({ events: batch });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/analytics', {
        method: 'POST', body, keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // Analytics must never break the product.
  }
}

/** Records a business event. Safe to call during render or in handlers. */
export function track(name: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  queue.push({ name, properties, path: window.location.pathname });
  if (!flushTimer) flushTimer = setTimeout(flush, 800);
  if (queue.length >= 10) flush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
