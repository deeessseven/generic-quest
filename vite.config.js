import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for the app version shown on the title screen: package.json's "version".
// Bump it there and every build — base AND variants — picks it up.
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

// Build-time variant selection. With no VITE_VARIANT (the normal `npm run build`), this is the base
// game: outDir 'docs', emptyOutDir true. With VITE_VARIANT=<id> (used by scripts/build-variants.mjs),
// it builds that variant into docs/<id>/ WITHOUT emptying docs/. The '@active-variant' alias resolves
// to ONLY the selected variant's manifest, so the base bundle contains zero variant code.
const VARIANT = process.env.VITE_VARIANT || '';
// APP_BUILD=1 (set by scripts/build-app.mjs) → lean single-variant build into a gitignored www/
// for the Capacitor native store apps. Unset → the GitHub Pages output (docs/, docs/<id>/) exactly
// as before. This flag ONLY affects outDir/emptyOutDir below; everything else is shared.
const APP_BUILD = process.env.APP_BUILD === '1';
const activeVariant = path.resolve(
  __dirname,
  VARIANT ? `src/variants/${VARIANT}/variant.js` : 'src/variants/base/variant.js',
);

function removeModuleType() {
  return {
    name: 'remove-module-type',
    transformIndexHtml(html) {
      return html.replace(/<script type="module" crossorigin/g, '<script');
    }
  };
}

// Inlines public/custom-art/*.png as base64. When building a variant, files in
// variants/<id>/custom-art/ overlay the base art (same filename wins) — so a variant can override
// just its hero sprites while inheriting everything else.
function customArtPlugin() {
  const baseDir = path.resolve(__dirname, 'public/custom-art');
  const variantDir = VARIANT ? path.resolve(__dirname, `variants/${VARIANT}/custom-art`) : null;
  const virtualId = 'virtual:custom-art';
  const resolvedId = '\0' + virtualId;

  return {
    name: 'custom-art',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      const entries = {};
      const readDir = (dir) => {
        if (!dir || !fs.existsSync(dir)) return;
        for (const f of fs.readdirSync(dir)) {
          if (!f.endsWith('.png')) continue;
          const data = fs.readFileSync(path.join(dir, f));
          entries[f] = `data:image/png;base64,${data.toString('base64')}`;
        }
      };
      readDir(baseDir);     // base art
      readDir(variantDir);  // variant overrides (same filename replaces base)
      return `export default ${JSON.stringify(entries)};`;
    }
  };
}

export default defineConfig({
  plugins: [customArtPlugin(), removeModuleType()],
  // Per-game localStorage scope, baked in at build time. localStorage is shared across same-origin
  // paths, so base + every Pages variant (served from one github.io origin) would otherwise share
  // one save/upload pool. Web variant builds get a '<id>_' scope so each is isolated; the base WEB
  // build and ALL native app builds (APP_BUILD — already sandboxed per app) keep '' = the original
  // un-prefixed keys, so their existing saves/uploads need no migration.
  define: {
    __SAVE_SCOPE__: JSON.stringify(APP_BUILD ? '' : (VARIANT ? VARIANT + '_' : '')),
    // Replaced inline at build time; referenced as the global __APP_VERSION__ in app code.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: './',
  resolve: {
    alias: {
      '@active-variant': activeVariant,
    },
  },
  build: {
    outDir: APP_BUILD ? 'www' : (VARIANT ? `docs/${VARIANT}` : 'docs'),
    emptyOutDir: APP_BUILD ? true : !VARIANT,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'GenericQuest',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  },
  server: {
    port: 3000
  }
});
