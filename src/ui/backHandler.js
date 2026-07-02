/**
 * Android hardware Back button handling.
 *
 * One global listener routes every Back press to the top-most active scene:
 *   1. If that scene has an open in-scene modal (a dialog drawn inside the scene,
 *      e.g. the quit confirm or the title difficulty panel), close it.
 *   2. Otherwise call that scene's handleBackButton() if it defines one.
 *
 * The gameplay scenes' handleBackButton() calls openPause() below, which freezes
 * the scene + audio and shows the shared PauseScene. On PauseScene, Back resumes.
 *
 * Native (Capacitor) uses the @capacitor/app backButton event. On the web / installed
 * PWA there is no such event, so we trap the browser Back gesture via history state —
 * that both makes Back work on the web build and lets us test in the PWA.
 */
import { App } from '@capacitor/app';
import { MusicSystem } from '../audio/MusicSystem.js';

/** Register an in-scene modal so the next Back press closes it first. */
export function pushBackModal(scene, closeFn) {
  (scene._backModals || (scene._backModals = [])).push(closeFn);
}

/** Remove a modal's close-fn from the stack (when it was closed some other way). */
export function popBackModal(scene, closeFn) {
  if (!scene._backModals) return;
  scene._backModals = scene._backModals.filter((fn) => fn !== closeFn);
}

/** Freeze a gameplay scene + audio and show the Game Paused overlay. */
export function openPause(scene) {
  const key = scene.scene.key;
  MusicSystem.pause();
  scene.scene.pause(key);
  scene.scene.launch('PauseScene', { pausedKey: key });
  scene.scene.bringToTop('PauseScene');
}

function dispatchBack(game) {
  const active = game.scene.getScenes(true);
  if (!active.length) return;
  // Last active scene renders on top (launched overlays come after their parent
  // in main.js's scene list), so it owns the Back press.
  const scene = active[active.length - 1];

  const modals = scene._backModals;
  if (modals && modals.length) {
    const closeFn = modals.pop();
    try { closeFn(); } catch (e) { /* already gone */ }
    return;
  }

  if (typeof scene.handleBackButton === 'function') {
    try { scene.handleBackButton(); } catch (e) { /* never let a handler error escape */ }
  }
  // Scenes with no handler (e.g. cutscenes) intentionally ignore Back.
}

export function registerBackButton(game) {
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (isNative) {
    App.addListener('backButton', () => dispatchBack(game));
  } else {
    // Web / PWA: keep one dummy history entry to pop so the Back gesture fires
    // popstate instead of leaving the game. Re-arm the trap FIRST (before dispatch)
    // so a Back press can never escape the app even if dispatch does nothing or
    // throws — which was letting a second Back tap exit during cutscenes.
    history.pushState(null, '', location.href);
    window.addEventListener('popstate', () => {
      history.pushState(null, '', location.href);
      dispatchBack(game);
    });
  }
}
