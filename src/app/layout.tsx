import type { Metadata, Viewport } from 'next';
import { Figtree, Noto_Sans_Bengali } from 'next/font/google';
import { Toaster } from 'sonner';
import { brand } from '@/config/brand';
import { appUrl } from '@/lib/env';
import './globals.css';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

const bangla = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bangla',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  authors: [{ name: brand.legalName }],
  formatDetection: { telephone: true, address: false, email: false },
  icons: { icon: '/favicon.svg', apple: '/apple-icon.png' },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${bangla.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: 'rounded-xl border border-ink-200 bg-white text-ink-900 shadow-lg',
              description: 'text-ink-600',
            },
          }}
        />
      </body>
    </html>
  );
}
