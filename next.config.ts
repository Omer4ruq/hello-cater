import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * The CSP allows 'unsafe-inline' for styles because Tailwind and Next's
 * inlined critical CSS require it; scripts use nonce-free 'strict-dynamic'
 * alternatives are not viable with Next's inline bootstrap, so we keep
 * 'unsafe-inline' for scripts in development only.
 */
const isProd = process.env.NODE_ENV === 'production';

/**
 * Whether this deployment is actually served over HTTPS.
 *
 * `upgrade-insecure-requests` and HSTS must key off this, not off
 * NODE_ENV: `next start` on a developer machine is also NODE_ENV
 * =production but serves plain HTTP. Emitting the upgrade directive
 * there makes every asset request go to https://localhost, which
 * Chromium silently exempts but Safari does not — leaving the whole
 * site unstyled in WebKit. Caught by the cross-browser E2E run.
 */
const servesHttps = (process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://');

const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : '';
  } catch {
    return '';
  }
})();

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace('https://', 'wss://')} https://sandbox.sslcommerz.com https://securepay.sslcommerz.com https://api.resend.com`.trim(),
  "frame-src 'self' https://sandbox.sslcommerz.com https://securepay.sslcommerz.com",
  "form-action 'self' https://sandbox.sslcommerz.com https://securepay.sslcommerz.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(servesHttps ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabaseOrigin
      ? [{ protocol: 'https', hostname: new URL(supabaseOrigin).hostname, pathname: '/storage/v1/object/public/**' }]
      : [],
  },

  experimental: {
    // Trim the client bundle for icon and chart imports.
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          ...(isProd && servesHttps
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
        ],
      },
      {
        // Payment callbacks are posted to us by the gateway, never framed.
        source: '/api/payments/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
