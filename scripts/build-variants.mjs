// Build the base game, then build each variant into its own self-contained docs/<id>/ folder.
//
// A variant is the SAME engine + content as the base game, differing only by the extra scenes /
// route overrides declared in its manifest (src/variants/<id>/variant.js). Selection is build-time
// via the VITE_VARIANT env var, which vite.config.js turns into a per-variant outDir and the
// '@active-variant' alias — so each build contains only its own variant's code, and the base build
// is left byte-for-byte the current game.
//
// Optional content overrides under variants/<id>/ (repo root):
//   - gametext.txt   : a COMPLETE gametext (full base copy + the variant's additions). If present it
//                      REPLACES the base gametext.txt in docs/<id>/, so the variant has one fully-
//                      editable file (hero names, story, celebration text — everything).
//   - custom-art/*.png : overlaid at build time by vite.config.js's customArtPlugin (same filename
//                      wins). Nothing to copy here — the art is inlined into the variant's bundle.
//
// Usage:  npm run build:variants

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const SRC_VARIANTS = join(ROOT, 'src', 'variants');
const CONTENT_OVERRIDES = join(ROOT, 'variants'); // optional per-variant text/art overrides

// 1. Base build → docs/ (emptyOutDir true clears any stale variant subfolders first).
console.log('▶ base → docs/');
execSync('npm run build', { stdio: 'inherit', cwd: ROOT });

// 2. Every variant under src/variants/ that has a variant.js → docs/<id>/ (emptyOutDir false leaves
//    docs/). Excludes base and helper folders like shared/ (which hold only reusable scenes).
const ids = readdirSync(SRC_VARIANTS).filter(
  (id) =>
    id !== 'base' &&
    statSync(join(SRC_VARIANTS, id)).isDirectory() &&
    existsSync(join(SRC_VARIANTS, id, 'variant.js')),
);

for (const id of ids) {
  console.log(`▶ variant ${id} → docs/${id}/`);
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT, env: { ...process.env, VITE_VARIANT: id } });

  // The variant's gametext.txt is a complete file — REPLACE the base gametext vite copied into docs/<id>/.
  const gametext = join(CONTENT_OVERRIDES, id, 'gametext.txt');
  if (existsSync(gametext)) {
    cpSync(gametext, join(DOCS, id, 'gametext.txt'));
  }
  console.log(`✓ ${id}`);
}

console.log(`\nDone. base + ${ids.length} variant(s): ${ids.join(', ') || '(none)'}`);
