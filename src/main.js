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
import { HeroIntroScene }  from './scenes/HeroIntroScene.js';
import { BootcampScene }  from './scenes/BootcampScene.js';
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
const _vw = window.innerWidth  || BASE_W;
const _vh = window.innerHeight || DESIGN_H;
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
    HeroIntroScene,
    BootcampScene,
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
const refit = () => game.scale.refresh();
window.addEventListener('resize', refit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);
[60, 200, 500, 1000].forEach((t) => setTimeout(refit, t));
