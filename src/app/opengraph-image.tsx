import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { brand } from '@/config/brand';

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand tokens (mirrors globals.css; ImageResponse cannot read CSS variables).
const BERRY = '#9b1c45';
const INK = '#222222';
const MUTED = '#5e5e5e';
const LINE = '#ebebeb';

// Figtree (OFL), the site font; the renderer needs static TTFs.
const fontDir = join(process.cwd(), 'src/app/_fonts');
const [figtree400, figtree800] = await Promise.all([
  readFile(join(fontDir, 'figtree-400.ttf')),
  readFile(join(fontDir, 'figtree-800.ttf')),
]);

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
          background: '#ffffff', color: INK, fontFamily: 'Figtree',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Same plate-and-place-setting mark as the in-app Logo and favicon. */}
          <div
            style={{
              width: 64, height: 64, borderRadius: 16, background: BERRY,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
              <circle cx="12" cy="12" r="7.2" />
              <circle cx="12" cy="12" r="3.1" />
              <path d="M12 1.6v3M12 19.4v3" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>
            <span>{brand.shortName}</span>
            <span style={{ color: BERRY }}>BD</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2.5, maxWidth: 960 }}>
            {brand.tagline}
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 28, color: MUTED, maxWidth: 880, lineHeight: 1.4 }}>
            {`Verified caterers and event partners in ${brand.launchCity}. One request, comparable proposals, one invoice.`}
          </div>
        </div>

        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, color: MUTED,
            borderTop: `2px solid ${LINE}`, paddingTop: 28,
          }}
        >
          <span style={{ color: BERRY, fontWeight: 700 }}>Catering</span>
          <span>·</span>
          <span>Event management</span>
          <span>·</span>
          <span>Decor, venue & more</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Figtree', data: figtree400, weight: 400 },
        { name: 'Figtree', data: figtree800, weight: 800 },
      ],
    },
  );
}
