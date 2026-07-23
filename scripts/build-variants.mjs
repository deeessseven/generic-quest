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
// Per-variant Home Screen / install icon + title (derived):
//   - icon          : built from the variant's title.png (or base) → docs/<id>/icon-180/192/512.png
//                     (see scripts/make-icons.mjs).
//   - install label : the variant's gametext `gameTitle` baked into manifest name/short_name (the
//                     Android install label). The web tab + iOS label come from gametext at runtime
//                     (BootScene sets document.title), so they update without a rebuild; the Android
//                     install name is baked here and only changes on a rebuild.
//
// Usage:  npm run build:variants

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHeroIcon, ICON_BG_SHIFT, ICON_HERO_SCALE } from './make-icons.mjs';
import { overlayVariantContent } from './variantOverlay.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const PUBLIC = join(ROOT, 'public');
const SRC_VARIANTS = join(ROOT, 'src', 'variants');
const CONTENT_OVERRIDES = join(ROOT, 'variants'); // optional per-variant text/art overrides
const SW_VERSION = String(Date.now()); // stamped into each deployed sw.js → a redeploy purges old caches
// This site's GitHub Pages base path, used as each app's manifest `id` (origin-relative). Gives
// base + every variant a DISTINCT PWA identity — otherwise, with no explicit id, the base app's
// scope (/generic-quest/) swallows the variants' nested paths and installs get conflated. Each id
// equals the path the browser already derives from start_url, so existing correct installs are NOT
// orphaned.
const REPO_BASE = '/generic-quest/';

// Stamp the build version into a folder's service worker (replaces the __SW_VERSION__ placeholder).
function stampSW(dir) {
  const p = join(dir, 'sw.js');
  if (existsSync(p)) writeFileSync(p, readFileSync(p, 'utf8').replace(/__SW_VERSION__/g, SW_VERSION));
}

// Read `gameTitle` from a gametext.txt, collapsing any \n two-line marker to one line.
function readGameTitle(gametextPath) {
  if (!existsSync(gametextPath)) return null;
  const m = readFileSync(gametextPath, 'utf8').match(/^\s*gameTitle\s*=\s*(.+?)\s*$/m);
  return m ? m[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() : null;
}

// Bake the install label (name/short_name) and a stable per-app `id` into docs<...>/manifest.json.
// `title` may be null (then only `id` is set).
function patchManifestName(docsDir, title, appId) {
  const p = join(docsDir, 'manifest.json');
  if (!existsSync(p)) return;
  const m = JSON.parse(readFileSync(p, 'utf8'));
  if (title) { m.name = title; m.short_name = title; }
  if (appId) m.id = appId;
  writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
}

// The icon source for a variant: its own title.png override if present, else the base title.png.
function titlePngFor(id) {
  const override = join(CONTENT_OVERRIDES, id, 'custom-art', 'title.png');
  return existsSync(override) ? override : join(PUBLIC, 'custom-art', 'title.png');
}

// Per-hero art for a variant's icon: its own hero<N>.png override if present, else the base one.
// Variants commonly override the hero portraits (personalized party) without touching title.png,
// so this resolves independently per file rather than all-or-nothing like titlePngFor above.
function heroPngFor(id, name) {
  const override = join(CONTENT_OVERRIDES, id, 'custom-art', `${name}.png`);
  return existsSync(override) ? override : join(PUBLIC, 'custom-art', `${name}.png`);
}

// 1. Base build → docs/ (emptyOutDir true clears any stale variant subfolders first).
console.log('▶ base → docs/');
execSync('npm run build', { stdio: 'inherit', cwd: ROOT });
// Regenerate base icons from current source (so a base-art change can't leave a stale base icon),
// then bake the base title into the manifest. Every variant below gets the same hero-composite
// treatment (background + party row), each using its own hero art where it overrides any.
makeHeroIcon(join(PUBLIC, 'custom-art', 'title.png'), join(PUBLIC, 'custom-art'), DOCS, ICON_BG_SHIFT, ICON_HERO_SCALE);
stampSW(DOCS);
const baseTitle = readGameTitle(join(PUBLIC, 'gametext.txt'));
patchManifestName(DOCS, baseTitle, REPO_BASE);

// 2. Every variant under src/variants/ that has a variant.js → docs/<id>/ (emptyOutDir false leaves
//    docs/). Excludes base and helper folders like shared/ (which hold only reusable scenes).
const ids = readdirSync(SRC_VARIANTS).filter(
  (id) =>
    id !== 'base' &&
    statSync(join(SRC_VARIANTS, id)).isDirectory() &&
    existsSync(join(SRC_VARIANTS, id, 'variant.js')),
);

// makeHeroIcon() output is a pure function of its source title.png + 3 hero PNGs (5 fixed output
// filenames — see make-icons.mjs). Variants that don't override any of those 4 files produce byte-
// identical output to a previous variant (or the base) — cache by the resolved set of source paths
// and copy the already-generated files instead of recomputing. 2026-07-23: variants now get the
// same hero-composite icon as the base app (previously a plain title.png crop, before any variant
// was found to have its own hero art — see git history for the old makeIcons()-based version).
const ICON_FILES = ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'];
const iconCacheBySource = new Map(); // "title.png|hero1.png|hero2.png|hero3.png" -> docs dir it was first computed into

for (const id of ids) {
  console.log(`▶ variant ${id} → docs/${id}/`);
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT, env: { ...process.env, VITE_VARIANT: id } });

  // The variant's gametext.txt is a complete file — REPLACE the base gametext vite copied into
  // docs/<id>/ — plus overlay its custom-art PNGs (vite copies public/custom-art/, the BASE art,
  // into every variant folder; at runtime BootScene fetches custom-art/<file>.png and swaps it in
  // over the inlined art — without this overlay the variant would show the base heroes).
  overlayVariantContent(CONTENT_OVERRIDES, id, join(DOCS, id));
  const gametext = join(CONTENT_OVERRIDES, id, 'gametext.txt'); // re-read below for its title

  // Home Screen / install icon: this variant's title.png + hero1/2/3.png, each falling back to
  // the base art independently — reuse a prior variant's output if its FULL resolved source set
  // (title + all 3 heroes) matches exactly.
  const iconSrc = titlePngFor(id);
  const heroSrcs = { hero1: heroPngFor(id, 'hero1'), hero2: heroPngFor(id, 'hero2'), hero3: heroPngFor(id, 'hero3') };
  const cacheKey = [iconSrc, heroSrcs.hero1, heroSrcs.hero2, heroSrcs.hero3].join('|');
  const cachedDir = iconCacheBySource.get(cacheKey);
  if (cachedDir) {
    for (const f of ICON_FILES) cpSync(join(cachedDir, f), join(DOCS, id, f));
  } else {
    makeHeroIcon(iconSrc, (name) => heroSrcs[name], join(DOCS, id), ICON_BG_SHIFT, ICON_HERO_SCALE);
    iconCacheBySource.set(cacheKey, join(DOCS, id));
  }
  stampSW(join(DOCS, id));
  // Android install label = this variant's gameTitle (falls back to base).
  const title = readGameTitle(gametext) || baseTitle;
  patchManifestName(join(DOCS, id), title, REPO_BASE + id + '/');

  console.log(`✓ ${id}`);
}

console.log(`\nDone. base + ${ids.length} variant(s): ${ids.join(', ') || '(none)'}`);
