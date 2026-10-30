/**
 * Generates the placeholder artwork used across the marketing site.
 *
 * These are original, locally generated SVGs — deliberately abstract
 * "table setting" compositions in the brand palette — so the product has
 * no dependency on stock photography and no licensing exposure before
 * launch. Replace the files in /public/img with real photography when
 * shoot assets are available; the filenames are the contract.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('public/img', { recursive: true });

const PALETTES = {
  hero:        ['#0b3e30', '#185c4b', '#e0a33e', '#f4d69d'],
  catering:    ['#0e4f3c', '#2a7561', '#ecbc66', '#fdf7ec'],
  wedding:     ['#5c2f24', '#b75b3e', '#e5ab96', '#fcf4f1'],
  corporate:   ['#23211e', '#56514a', '#a19a8b', '#f7f6f3'],
  events:      ['#082d23', '#48937c', '#f4d69d', '#eef6f2'],
  vendors:     ['#73421d', '#cf8a26', '#f4d69d', '#fdf7ec'],
  partner:     ['#0b3e30', '#2a7561', '#d5e9e0', '#ffffff'],
};

/** A plate-and-linen composition: concentric circles over warm bands. */
function art(name, [deep, mid, warm, light], w = 1200, h = 800) {
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = (i) => ((Math.sin(seed * (i + 1)) + 1) / 2);

  const plates = Array.from({ length: 3 }, (_, i) => {
    const cx = w * (0.22 + rnd(i) * 0.6);
    const cy = h * (0.3 + rnd(i + 7) * 0.45);
    const r = h * (0.13 + rnd(i + 3) * 0.16);
    return `
    <g opacity="${0.5 + rnd(i + 11) * 0.35}">
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${light}" opacity="0.14"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.72).toFixed(1)}" fill="none" stroke="${warm}" stroke-width="1.6" opacity="0.5"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.4).toFixed(1)}" fill="${warm}" opacity="0.2"/>
    </g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Decorative ${name} artwork">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${deep}"/>
      <stop offset="62%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${deep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="72%" cy="18%" r="68%">
      <stop offset="0%" stop-color="${warm}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${warm}" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${plates}
  <g opacity="0.28">
    ${Array.from({ length: 7 }, (_, i) =>
      `<line x1="0" y1="${(h * (i + 1)) / 8}" x2="${w}" y2="${(h * (i + 1)) / 8 - 40}" stroke="${light}" stroke-width="0.6" opacity="0.2"/>`
    ).join('')}
  </g>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.055"/>
</svg>`;
}

for (const [name, palette] of Object.entries(PALETTES)) {
  writeFileSync(`public/img/${name}.svg`, art(name, palette));
}

// Favicon + logo mark, matching src/components/shared/logo.tsx.
const mark = (bg, fg, size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" rx="8" fill="${bg}"/>
  <g fill="none" stroke="${fg}" stroke-width="2.1" stroke-linecap="round">
    <circle cx="16" cy="16" r="9"/>
    <circle cx="16" cy="16" r="3.9"/>
    <path d="M16 3.5v3.4M16 25.1v3.4"/>
  </g>
</svg>`;

writeFileSync('public/favicon.svg', mark('#0e4f3c', '#ffffff', 32));
writeFileSync('public/logo.svg', mark('#0e4f3c', '#ffffff', 96));

writeFileSync(
  'public/site.webmanifest',
  JSON.stringify(
    {
      name: 'Evently BD',
      short_name: 'Evently BD',
      description: 'Catering and event services marketplace for Bangladesh.',
      start_url: '/',
      display: 'standalone',
      background_color: '#fbf9f5',
      theme_color: '#0e4f3c',
      icons: [{ src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    null,
    2,
  ),
);

console.log(`✓ generated ${Object.keys(PALETTES).length} artwork files + icons in public/`);
