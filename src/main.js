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

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 854,
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
window.addEventListener('resize', () => { game.scale.refresh(); });
