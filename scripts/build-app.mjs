// Build ONE app target (base game or a single variant) into a lean, gitignored www/ for the
// Capacitor native store apps. Each store app wraps exactly one variant — NOT the full docs/
// tree (which is 100+ MB with every variant inlined). GitHub Pages still uses docs/ (see
// build-variants.mjs); this is only for the iOS/Android app bundles.
//
// It mirrors the docs/<id> overlay used for Pages: after Vite inlines the variant's art and
// emits www/, it copies the variant's complete gametext.txt + custom-art PNGs over www/ so the
// packaged app's text/art match its bundle.
//
// Usage:
//   node scripts/build-app.mjs            → base game            → www/
//   node scripts/build-app.mjs <variant>  → that variant (e.g. val, ethan, van, fifi) → www/

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { overlayVariantContent } from './variantOverlay.mjs';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const WWW      = join(ROOT, 'www');
const CONTENT  = join(ROOT, 'variants'); // repo-root per-variant text/art overrides

const variant = (process.argv[2] || '').trim(); // '' = base game

// Guard: a named variant must actually exist, so a typo fails loudly instead of silently
// building the base game under the wrong assumption.
if (variant) {
  const manifest = join(ROOT, 'src', 'variants', variant, 'variant.js');
  if (!existsSync(manifest)) {
    console.error(`✖ Unknown variant "${variant}" — no src/variants/${variant}/variant.js`);
    process.exit(1);
  }
}

const env = { ...process.env, APP_BUILD: '1' };
if (variant) env.VITE_VARIANT = variant;

console.log(`▶ app build (${variant || 'base'}) → www/`);
execSync('npm run build', { stdio: 'inherit', cwd: ROOT, env });

// Overlay the variant's complete gametext + custom-art (same as the docs/<id> overlay), so the
// runtime custom-art fetch and gametext match the variant's inlined bundle. Base needs no overlay
// (Vite already copied public/gametext.txt + public/custom-art into www/).
if (variant) {
  overlayVariantContent(CONTENT, variant, WWW);
}

console.log(`✓ www/ ready (${variant || 'base'}) — run "npx cap sync" next`);
