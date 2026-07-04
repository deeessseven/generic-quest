import Phaser from 'phaser';
import { BootScene }    from './scenes/BootScene.js';
import { TitleScene }   from './scenes/TitleScene.js';
import { WorldScene }   from './scenes/WorldScene.js';
import { TownScene }    from './scenes/TownScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { BattleScene }  from './scenes/BattleScene.js';
import { MenuScene }      from './scenes/MenuScene.js';
import { EndingScene }    from './scenes/EndingScene.js';
import { SaveLoadScene }  from './scenes/SaveLoadScene.js';
import { NameInputScene }  from './scenes/NameInputScene.js';
import { DifficultyScene }  from './scenes/DifficultyScene.js';
import { HeroIntroScene }  from './scenes/HeroIntroScene.js';
import { BootcampScene }  from './scenes/BootcampScene.js';
import { PauseScene }     from './scenes/PauseScene.js';
import { variant }      from './variants/registry.js';
import { GameState }    from './GameState.js';
import { MusicSystem }  from './audio/MusicSystem.js';
import { enableIOSAudioThroughMuteSwitch } from './iosAudioUnmute.js';
import { registerBackButton } from './ui/backHandler.js';
import './registerSW.js';

// Initialize game state on load
GameState.init();

// iOS: set the Web Audio "playback" session so sound plays through the hardware mute (orange ring)
// switch — no media element, so no Now Playing / Dynamic Island indicator. Pass the live context so
// it can be resumed on gesture/return. No-op on Android/desktop. See iosAudioUnmute.js.
enableIOSAudioThroughMuteSwitch(() => MusicSystem._ctx || null);

// Match the game's aspect ratio to the device so Phaser FIT fills the screen with no
// letterbox — WITHOUT cropping. We keep the 480-wide design (every horizontal position
// and edge button stays exactly where it was) and only stretch the HEIGHT to the device
// aspect. Clamped to [854, 1120] so ultra-tall phones don't leave huge vertical gaps and
// wide screens (tablets) never squeeze the vertical layout below its 854 design height.
const BASE_W = 480, DESIGN_H = 854;
// Reserve a band at the top (status bar / camera cutout) and bottom (home-swipe
// gesture area). The native app needs both (its webview draws edge-to-edge under the
// system bars); the web/PWA browser already keeps the page clear of the status bar,
// so it only gets the small bottom band. Applied as body padding here at runtime —
// index.html ships none — so the canvas fills the remaining area with no letterbox.
// NOTE: the Capacitor global exists on the WEB too once any @capacitor/* plugin is
// bundled (backHandler imports @capacitor/app), so its mere presence is not a native
// signal — must ask isNativePlatform() (same check backHandler.js uses).
const IS_NATIVE_APP = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const TOP_SAFE = IS_NATIVE_APP ? 20 : 0;
const BOTTOM_SAFE = IS_NATIVE_APP ? 20 : 10;
// The production bundle is a plain <script> in <head>, so document.body doesn't
// exist yet at module-eval time — defer the style write until the DOM is ready.
// (Phaser itself already waits for DOM ready before creating the canvas.)
const applyBands = () => {
  const b = document.body.style;
  if (IS_NATIVE_APP) {
    b.paddingTop = TOP_SAFE + 'px';
    b.paddingBottom = BOTTOM_SAFE + 'px';
  } else {
    // Browser: safe-area insets are 0 → 0 top / 10px bottom as before. Installed PWAs
    // on newer Android draw edge-to-edge UNDER the gesture-nav bar and report it via
    // env(safe-area-inset-bottom) (~24px) — the band must ABSORB that inset (max),
    // not stack on top of it, or the bottom gap balloons to ~40px.
    b.paddingTop = 'env(safe-area-inset-top, 0px)';
    b.paddingBottom = 'max(' + BOTTOM_SAFE + 'px, env(safe-area-inset-bottom, 0px))';
  }
};
if (document.body) applyBands();
else document.addEventListener('DOMContentLoaded', applyBands);
const _vw = window.innerWidth  || BASE_W;
const _vh = (window.innerHeight || DESIGN_H) - TOP_SAFE - BOTTOM_SAFE;
const GAME_H = Math.min(1120, Math.max(DESIGN_H, Math.round(BASE_W * _vh / _vw)));

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    // NO_CENTER: the CSS flexbox on <body> centers the canvas. Using Phaser's
    // CENTER_BOTH *as well* stacked two centerings and pushed the canvas down-right
    // (a fat top gap + a thin left bar). Let flexbox do it alone.
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 480,
    height: GAME_H,
    min: { width: 320, height: 568 },
    max: { width: 1080, height: 1920 }
  },
  scene: [
    BootScene,
    TitleScene,
    WorldScene,
    TownScene,
    DungeonScene,
    BattleScene,
    MenuScene,
    EndingScene,
    SaveLoadScene,
    NameInputScene,
    DifficultyScene,
    HeroIntroScene,
    BootcampScene,
    PauseScene,
    ...variant.scenes
  ],
  input: {
    activePointers: 2
  },
  render: {
    antialias: true,
    pixelArt: false
  }
};

const game = new Phaser.Game(config);

// Android hardware Back button → context-sensitive handling (see ui/backHandler.js)
registerBackButton(game);

// Lock to portrait so tilting to landscape and back doesn't resize the game
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('portrait').catch(() => {});
}
// Re-fit on every viewport change. The mobile viewport (URL/nav bar showing or
// hiding) often settles a beat AFTER load, so the very first fit can be stale —
// re-fit a few times early so the canvas isn't stuck mis-sized until the user
// happens to trigger a resize.
// While the loading screen (BootScene) is still up we additionally RE-DERIVE the game
// height from the live viewport: GAME_H frozen from a stale (too-tall) innerHeight
// makes FIT fit by height forever → permanent thin side letterbox bars. Measuring the
// body's computed paddings also picks up the env(safe-area-inset-*) values that the
// initial numeric estimate can't know. After boot, only refresh() — scenes lay out
// once at create and must not have the game resized under them.
const refit = () => {
  try {
    if (game.scene.isActive('BootScene')) {
      const cs = getComputedStyle(document.body);
      const availH = document.body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const availW = document.body.clientWidth || BASE_W;
      const ideal = Math.min(1120, Math.max(DESIGN_H, Math.round(BASE_W * availH / availW)));
      if (availH > 0 && Math.abs(ideal - game.scale.gameSize.height) > 4) {
        game.scale.setGameSize(BASE_W, ideal);
      }
    }
  } catch { /* fall through to plain refresh */ }
  game.scale.refresh();
};
window.addEventListener('resize', refit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);
[60, 200, 500, 1000].forEach((t) => setTimeout(refit, t));
