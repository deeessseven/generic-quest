// Share the game (title-screen Share button): system share sheet with a message + link — the
// gametext `shareUrl` (the Play Store listing for the base game) or the page's own URL for
// variants that don't set one. Where no share sheet exists (desktop), copy the message instead.
// Ported from generic-split-trip's shareGame() (src/shareClip.js) 2026-07-22.

import { GT, resolveStory } from './data/GameText.js';

function isCancel(e) {
  const s = `${e?.name || ''} ${e?.message || ''}`.toLowerCase();
  return s.includes('abort') || s.includes('cancel') || s.includes('dismiss');
}

// Returns 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareGame() {
  const title = resolveStory(GT.gameTitle).replace(/\s*\n\s*/g, ' ').trim();
  const url = String(GT.shareUrl || '').trim()
    || (typeof location !== 'undefined' ? location.href : '');
  const text = `Play ${title}!`;

  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if (isCancel(e)) return 'cancelled';
      // fall through to the web paths
    }
  }

  try {
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
  } catch (e) {
    if (isCancel(e)) return 'cancelled';
    // fall through to clipboard
  }

  try { await navigator.clipboard.writeText(`${text} ${url}`); return 'copied'; } catch { /* */ }
  return 'failed';
}
