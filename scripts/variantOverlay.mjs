// Copy a variant's COMPLETE gametext.txt (replacing whatever vite copied) + its custom-art PNGs
// over an already-built output directory. No-ops if the variant has no repo-root override
// (repo-root variants/<id>/ — see build-variants.mjs's header comment for the override format).
// Shared by build-variants.mjs (docs/<id>/) and build-app.mjs (www/) — both used to independently
// duplicate this exact copy logic.
import { existsSync, readdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';

export function overlayVariantContent(contentOverridesDir, variantId, outDir) {
  const gametext = join(contentOverridesDir, variantId, 'gametext.txt');
  if (existsSync(gametext)) cpSync(gametext, join(outDir, 'gametext.txt'));

  const artDir = join(contentOverridesDir, variantId, 'custom-art');
  if (existsSync(artDir)) {
    for (const f of readdirSync(artDir)) {
      if (f.endsWith('.png')) cpSync(join(artDir, f), join(outDir, 'custom-art', f));
    }
  }
}
