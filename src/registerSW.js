// Register the offline service worker for the GitHub Pages web build.
//   • Web only: skipped inside the Capacitor NATIVE app. NOTE: the Capacitor global
//     exists on the web too once any @capacitor/* plugin is bundled (backHandler
//     imports @capacitor/app), so we must ask isNativePlatform() — checking mere
//     presence of window.Capacitor silently disabled the SW on web from v1.0.10.
//     Checked inside the load handler so plugin init order can't matter.
//   • Relative 'sw.js' → the worker is scoped to THIS folder, so each variant gets its own copy.
//   • updateViaCache:'none' → the browser always re-checks sw.js, so a redeployed version is
//     picked up promptly (each deploy stamps a new VERSION; activating it purges the old cache).
//   • Fully guarded: where service workers are unavailable (some in-app browsers) this just no-ops.
if (typeof window !== 'undefined' && typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    if (isNative) return;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
}
