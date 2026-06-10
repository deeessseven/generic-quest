// val — Val's birthday edition. Same engine + art + gametext as the base game; adds the two
// SHARED celebration scenes. All their text lives in this variant's gametext.txt
// (variants/val/gametext.txt). Val keeps the decorative dino via `celebrationShowDino = true`.
// Drop Val's 3 hero sprites into variants/val/custom-art/ to override art.
import { BirthdayScene } from '../shared/scenes/BirthdayScene.js';
import { BirthdayEndScene } from '../shared/scenes/BirthdayEndScene.js';

export default {
  id: 'val',
  scenes: [BirthdayScene, BirthdayEndScene],
  routes: {
    // Title NEW GAME → opening birthday celebration → tap → difficulty menu → the game.
    newGame: 'BirthdayScene',
    // After the final boss / EndingScene finale → victory birthday celebration → tap → title.
    gameWon: 'BirthdayEndScene',
  },
};
