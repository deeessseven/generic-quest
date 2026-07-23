// Generate square home-screen / bookmark icons from the title art (public/custom-art/title.png).
//
// iOS "Add to Home Screen" and browser bookmarks need a SQUARE PNG (apple-touch-icon); the title
// art is 480×854 portrait, so we center-crop a 480×480 square around the boba cup (the focal
// point) and downscale to the standard icon sizes. Pure Node + built-in zlib — no image deps.
//
// Usage:  node scripts/make-icons.mjs   (run from repo root; also invoked by build-variants)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'public', 'custom-art', 'title.png');
const OUT_SIZES = [180, 192, 512]; // 180 = apple-touch-icon; 192/512 = PWA manifest

// ── CRC32 (PNG chunk checksums) ──────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

// ── Decode an 8-bit, non-interlaced PNG → { width, height, rgba } ────────────
function decodePNG(buf) {
  let pos = 8, width = 0, height = 0, bitDepth = 8, colorType = 0, interlace = 0;
  let palette = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'PLTE') palette = Buffer.from(data);   // RGB triples, indexed by pixel value
    else if (type === 'tRNS') trns = Buffer.from(data);        // per-palette-index alpha (colorType 3)
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (interlace) throw new Error('interlaced PNG not supported');
  if (bitDepth !== 8) throw new Error('unsupported bit depth ' + bitDepth); // decoder assumes 8-bit samples
  // Palette (colorType 3) stores one index byte per pixel; RGBA is looked up from PLTE/tRNS below.
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : colorType === 3 ? 1 : 0;
  if (!channels) throw new Error('unsupported colorType ' + colorType);
  if (colorType === 3 && !palette) throw new Error('palette PNG missing PLTE chunk');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    for (let x = 0; x < stride; x++) {
      const rb = raw[p++];
      const a = x >= channels ? px[y * stride + x - channels] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? px[(y - 1) * stride + x - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = rb; break;
        case 1: v = rb + a; break;
        case 2: v = rb + b; break;
        case 3: v = rb + ((a + b) >> 1); break;
        case 4: v = rb + paeth(a, b, c); break;
        default: throw new Error('bad filter ' + filter);
      }
      px[y * stride + x] = v & 0xff;
    }
  }
  // Expand to RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    let r, g, b, a = 255;
    if (colorType === 6) { r = px[s]; g = px[s + 1]; b = px[s + 2]; a = px[s + 3]; }
    else if (colorType === 2) { r = px[s]; g = px[s + 1]; b = px[s + 2]; }
    else if (colorType === 3) { const idx = px[s]; r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2]; a = trns && idx < trns.length ? trns[idx] : 255; }
    else { r = g = b = px[s]; if (colorType === 4) a = px[s + 1]; }
    const d = i * 4;
    rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b; rgba[d + 3] = a;
  }
  return { width, height, rgba };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function cropSquare(rgba, sw, sh, x, y, side) {
  const dst = Buffer.alloc(side * side * 4);
  for (let j = 0; j < side; j++) {
    const srcStart = ((y + j) * sw + x) * 4;
    rgba.copy(dst, j * side * 4, srcStart, srcStart + side * 4);
  }
  return dst;
}

function resize(src, sw, sh, dw, dh) {
  const dst = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = (y + 0.5) * sh / dh - 0.5;
    const y0 = clamp(Math.floor(sy), 0, sh - 1), y1 = clamp(y0 + 1, 0, sh - 1), fy = clamp(sy - Math.floor(sy), 0, 1);
    for (let x = 0; x < dw; x++) {
      const sx = (x + 0.5) * sw / dw - 0.5;
      const x0 = clamp(Math.floor(sx), 0, sw - 1), x1 = clamp(x0 + 1, 0, sw - 1), fx = clamp(sx - Math.floor(sx), 0, 1);
      for (let c = 0; c < 4; c++) {
        const p00 = src[(y0 * sw + x0) * 4 + c], p10 = src[(y0 * sw + x1) * 4 + c];
        const p01 = src[(y1 * sw + x0) * 4 + c], p11 = src[(y1 * sw + x1) * 4 + c];
        const top = p00 + (p10 - p00) * fx, bot = p01 + (p11 - p01) * fx;
        dst[(y * dw + x) * 4 + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return dst;
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

// Build a maskable variant: the icon scaled into the center safe zone (~80%) on a solid
// background, so Android's adaptive-icon crop only eats the padding, never the artwork.
function padToMaskable(square, side, bg, scale = 0.8) {
  const inner = Math.max(1, Math.round(side * scale));
  const innerImg = resize(square, side, side, inner, inner);
  const out = Buffer.alloc(side * side * 4);
  for (let i = 0; i < side * side; i++) { const d = i * 4; out[d] = bg[0]; out[d + 1] = bg[1]; out[d + 2] = bg[2]; out[d + 3] = 255; }
  const off = Math.floor((side - inner) / 2);
  for (let yy = 0; yy < inner; yy++) for (let xx = 0; xx < inner; xx++) {
    const s = (yy * inner + xx) * 4, a = innerImg[s + 3] / 255;
    const d = ((off + yy) * side + (off + xx)) * 4;
    out[d]     = Math.round(innerImg[s]     * a + bg[0] * (1 - a));
    out[d + 1] = Math.round(innerImg[s + 1] * a + bg[1] * (1 - a));
    out[d + 2] = Math.round(innerImg[s + 2] * a + bg[2] * (1 - a));
    out[d + 3] = 255;
  }
  return out;
}

// ── API ───────────────────────────────────────────────────────────────────────
// Crop title.png to a square (focal ~38% down) and write icon-180/192/512.png plus maskable
// variants (icon-maskable-192/512.png) into outDir.
export function makeIcons(srcTitlePng, outDir) {
  const { width, height, rgba } = decodePNG(readFileSync(srcTitlePng));
  const side = Math.min(width, height);
  const x = Math.floor((width - side) / 2);
  const y = clamp(Math.round(height * 0.38 - side / 2), 0, height - side);
  const square = cropSquare(rgba, width, height, x, y, side);
  for (const size of OUT_SIZES) {
    writeFileSync(join(outDir, `icon-${size}.png`), encodePNG(size, size, resize(square, side, side, size, size)));
  }
  // Maskable (Android adaptive icon): artwork at ~80% on the dark theme background (#000011).
  const mask = padToMaskable(square, side, [0x00, 0x00, 0x11]);
  for (const size of [192, 512]) {
    writeFileSync(join(outDir, `icon-maskable-${size}.png`), encodePNG(size, size, resize(mask, side, side, size, size)));
  }
  return { side, y };
}

// ── Base-game icon: title.png background + the 3 party heroes, outlined, bottom-anchored ──────
// The base app icon (unlike variants) also shows the party heroes standing in front of the boba
// cup — added by hand once (commit b9cf45a/ed47101, 2026-07-13) with no generating script, so this
// reconstructs it from scratch: the per-hero scale/position below was reverse-engineered via
// template-matching against that shipped icon (measured 2026-07-22, verified by re-rendering and
// confirming an exact visual match before trusting the numbers). Do not hand-tune these without
// re-verifying the same way — the fit is sensitive (this is hand-painted art, not a formula).
// 2026-07-23: all three feet fell past the 480×480 icon canvas bottom edge (e.g. hero2's
// bottom = 225 + 502*0.528 = 490 > 480) — the composite blit clips anything past the canvas,
// so feet were silently cut off. Fix: shift every hero's oy up by the same amount (uy below)
// so the group translates as a block — each hero's bottom edge relative to the OTHERS is
// unchanged, only the whole trio moves up. Shift = 33% of the tallest hero's rendered opaque
// height at ICON_HERO_SCALE (hero2: 300px opaque height in its own 512 canvas × 0.528 baseline
// scale × 1.2 heroScale ≈ 190px on the icon canvas; 33% of that ≈ 63px).
const HERO_UP_SHIFT = 63;
const HERO_BASELINE = {
  // s = scale of the raw 512×512 hero canvas; ox/oy = placement of that (un-padded) canvas's
  // top-left corner in the 480×480 icon; bmaxY = the hero's own opaque bbox bottom (its "feet"),
  // measured within its own 512 canvas — used to anchor growth by the VISIBLE sprite, not the
  // transparent canvas padding around it.
  hero1: { s: 0.524, ox: 2,   oy: 225 - HERO_UP_SHIFT, bx: 97,  bw: 273, bmaxY: 492 },
  hero2: { s: 0.528, ox: 121, oy: 225 - HERO_UP_SHIFT, bx: 162, bw: 226, bmaxY: 502 },
  hero3: { s: 0.540, ox: 239, oy: 219 - HERO_UP_SHIFT, bx: 114, bw: 282, bmaxY: 508 },
};
const OUTLINE_R = 8; // matches TitleScene.js's titleHeroTexture() outline radius, same source art

// Base app-icon tuning (David 2026-07-22): background panned up 10% of the icon side (reveals more
// foreground/path, mascot sits higher) + party heroes scaled 20% bigger, anchored so each hero's
// own bottom edge + horizontal center stay put (grows upward/outward only). Exported so both the
// CLI below and scripts/build-variants.mjs use the same numbers.
export const ICON_BG_SHIFT = 0.10;
export const ICON_HERO_SCALE = 1.2;

// White silhouette (RGB forced white, alpha kept) stamped at 16 angles around radius R, then the
// original sprite drawn on top — an R-px outline hugging the silhouette. Mirrors TitleScene.js's
// titleHeroTexture() (browser Canvas globalCompositeOperation) as plain pixel ops. Output canvas
// is S+2R square so the outline is never clipped.
function addOutline(rgba, S, R) {
  const silhouette = Buffer.alloc(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const d = i * 4;
    silhouette[d] = silhouette[d + 1] = silhouette[d + 2] = 255;
    silhouette[d + 3] = rgba[d + 3];
  }
  const side = S + 2 * R;
  const canvas = Buffer.alloc(side * side * 4);
  for (let a = 0; a < 16; a++) {
    const dx = R + Math.round(Math.cos(a * Math.PI / 8) * R);
    const dy = R + Math.round(Math.sin(a * Math.PI / 8) * R);
    blitAlpha(canvas, side, side, silhouette, S, S, dx, dy);
  }
  blitAlpha(canvas, side, side, rgba, S, S, R, R);
  return { rgba: canvas, side };
}

// Alpha-blend src onto an opaque canvas at (dx,dy), clipping to canvas bounds.
function blitAlpha(canvas, cw, ch, src, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++) {
    const cy = dy + y; if (cy < 0 || cy >= ch) continue;
    for (let x = 0; x < sw; x++) {
      const cx = dx + x; if (cx < 0 || cx >= cw) continue;
      const s = (y * sw + x) * 4, a = src[s + 3] / 255; if (a <= 0) continue;
      const d = (cy * cw + cx) * 4;
      canvas[d]     = Math.round(src[s]     * a + canvas[d]     * (1 - a));
      canvas[d + 1] = Math.round(src[s + 1] * a + canvas[d + 1] * (1 - a));
      canvas[d + 2] = Math.round(src[s + 2] * a + canvas[d + 2] * (1 - a));
      canvas[d + 3] = 255;
    }
  }
}

// Crop title.png (background) + composite the 3 heroes on top of HERO_BASELINE, adjusted by
// bgShiftFrac (fraction of icon side to pan the crop; positive = background appears to shift UP,
// revealing more foreground at the bottom) and heroScale (multiplies each hero's baseline scale,
// anchored so its OWN bottom-edge pixel + horizontal center stay fixed — i.e. it grows upward/
// outward only, never shifting position). Writes the same output set as makeIcons().
export function makeHeroIcon(srcTitlePng, heroDir, outDir, bgShiftFrac = 0, heroScale = 1) {
  const { width, height, rgba } = decodePNG(readFileSync(srcTitlePng));
  const side = Math.min(width, height);
  const x = Math.floor((width - side) / 2);
  const y = clamp(Math.round(height * 0.38 - side / 2) + Math.round(side * bgShiftFrac), 0, height - side);
  const square = cropSquare(rgba, width, height, x, y, side);

  for (const [name, b] of Object.entries(HERO_BASELINE)) {
    const hero = decodePNG(readFileSync(join(heroDir, `${name}.png`)));
    const { rgba: outlined, side: oSide } = addOutline(hero.rgba, hero.width, OUTLINE_R);
    const newS = b.s * heroScale;
    const oldBottom = b.oy + b.bmaxY * b.s;
    const oldCenterX = b.ox + (b.bx + b.bw / 2) * b.s;
    const newOy = oldBottom - b.bmaxY * newS;
    const newOx = oldCenterX - (b.bx + b.bw / 2) * newS;
    const dSide = Math.round(oSide * newS);
    const resized = resize(outlined, oSide, oSide, dSide, dSide);
    // newOx/newOy target the un-padded 512 canvas; shift by -OUTLINE_R*newS so the CHARACTER (not
    // the outline canvas) lands at the intended spot — the outline then extends outward from it.
    blitAlpha(square, side, side, resized, dSide, dSide,
      Math.round(newOx - OUTLINE_R * newS), Math.round(newOy - OUTLINE_R * newS));
  }

  for (const size of OUT_SIZES) {
    writeFileSync(join(outDir, `icon-${size}.png`), encodePNG(size, size, resize(square, side, side, size, size)));
  }
  const mask = padToMaskable(square, side, [0x00, 0x00, 0x11]);
  for (const size of [192, 512]) {
    writeFileSync(join(outDir, `icon-maskable-${size}.png`), encodePNG(size, size, resize(mask, side, side, size, size)));
  }
  return { side, y };
}

// ── CLI:  node scripts/make-icons.mjs [srcTitlePng] [outDir] ──────────────────
// Defaults to the base game's title → public/ (vite then copies these into docs/ and each variant;
// build-variants.mjs also regenerates docs/ directly — this CLI keeps public/'s dev-preview copies
// in sync). Base uses the hero-composite icon (see makeHeroIcon); pass a THIRD arg pointing outside
// public/custom-art to fall back to a plain crop (e.g. for testing a variant's title.png).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('make-icons.mjs')) {
  const src = process.argv[2] || SRC;
  const outDir = process.argv[3] || join(ROOT, 'public');
  const heroDir = process.argv[4] || join(ROOT, 'public', 'custom-art');
  if (!existsSync(src)) { console.error('missing', src); process.exit(1); }
  const { side, y } = src === SRC
    ? makeHeroIcon(src, heroDir, outDir, ICON_BG_SHIFT, ICON_HERO_SCALE)
    : makeIcons(src, outDir);
  console.log(`✓ icons (${side}×${side} crop @ y=${y}) → ${outDir}`);
}
