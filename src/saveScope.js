// Per-game localStorage scope, injected at build time by vite.config.js's `define`.
//
// It equals '<variantId>_' for WEB variant builds (so each Pages variant keeps its own saves and
// custom-art uploads) and '' for the base web build and ALL native app builds. With '' the keys are
// byte-for-byte the originals, so existing base-web and native saves/uploads keep working with no
// migration. The `typeof` guard is a harmless fallback if the define is ever absent (e.g. a tool
// that doesn't apply it) — referencing an undeclared name under `typeof` is safe (yields 'undefined').
export const SAVE_SCOPE = (typeof __SAVE_SCOPE__ !== 'undefined' && __SAVE_SCOPE__) || '';
