import { ImageResponse } from 'next/og';
import { brand } from '@/config/brand';

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Default social share image, rendered at request time so it always
 * matches the current brand configuration — no static asset to
 * regenerate when the name or tagline changes.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: 72,
          background: 'linear-gradient(135deg, #0b3e30 0%, #185c4b 58%, #0b3e30 100%)',
          color: '#ffffff', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14, background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0e4f3c', fontSize: 30, fontWeight: 700,
            }}
          >
            E
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
            <span>{brand.shortName}</span>
            <span style={{ color: '#ecbc66' }}>BD</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2, maxWidth: 900 }}>
            {brand.tagline}
          </div>
          <div style={{ display: 'flex', marginTop: 26, fontSize: 28, color: 'rgba(255,255,255,0.72)', maxWidth: 860, lineHeight: 1.4 }}>
            {`Verified caterers and event partners in ${brand.launchCity}. One request, comparable proposals, one invoice.`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, fontSize: 22, color: '#ecbc66' }}>
          <span>Catering</span><span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span>Event management</span><span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span>Decor, venue & more</span>
        </div>
      </div>
    ),
    size,
  );
}
