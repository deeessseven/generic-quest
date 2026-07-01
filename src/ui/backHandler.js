/**
 * Android hardware Back button handling.
 *
 * A single global listener (registered from main.js) routes every Back press to
 * the top-most active scene. The rules are context-sensitive so Back never
 * instantly kills the app mid-game:
 *   1. If the top scene has an open in-scene modal (a dialog drawn inside the
 *      scene, e.g. the quit confirm or the title difficulty panel), close it.
 *   2. Otherwise, call that scene's handleBackButton() if it defines one.
 *   3. Otherwise do nothing — Back is a no-op rather than an app exit.
 *
 * Only fires on Android (the @capacitor/app backButton event). On the web build
 * the event never fires, so browser/desktop behavior is unchanged.
 */
import { App } from '@capacitor/app';

/** Register an in-scene modal so the next Back press closes it first. */
export function pushBackModal(scene, closeFn) {
  (scene._backModals || (scene._backModals = [])).push(closeFn);
}

/** Remove a modal's close-fn from the stack (when it was closed some other way). */
export function popBackModal(scene, closeFn) {
  if (!scene._backModals) return;
  scene._backModals = scene._backModals.filter((fn) => fn !== closeFn);
}

export function registerBackButton(game) {
  App.addListener('backButton', () => {
    const active = game.scene.getScenes(true);
    if (!active.length) return;
    // getScenes(true) is ordered by the scene list; the last active one renders
    // on top (launched overlays like MenuScene / BattleScene come after their
    // parent in main.js's scene array), so it owns the Back press.
    const scene = active[active.length - 1];

    const modals = scene._backModals;
    if (modals && modals.length) {
      const closeFn = modals.pop();
      try { closeFn(); } catch (e) { /* modal already gone */ }
      return;
    }

    if (typeof scene.handleBackButton === 'function') {
      scene.handleBackButton();
    }
  });
}
