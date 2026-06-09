// vals — Val's birthday edition. Same engine + art + gametext as the base game; adds two
// celebration scenes. All their text lives in this variant's gametext.txt
// (variants/vals/gametext.txt), appended onto the base gametext at build time. Drop Val's 3 hero
// sprites into variants/vals/custom-art/ to override art. The base game registers none of this.
import { BirthdayScene } from './scenes/BirthdayScene.js';
import { BirthdayEndScene } from './scenes/BirthdayEndScene.js';

export default {
  id: 'vals',
  scenes: [BirthdayScene, BirthdayEndScene],
  routes: {
    // Title NEW GAME → opening birthday celebration → tap → difficulty menu → the game.
    newGame: 'BirthdayScene',
    // After the final boss / EndingScene finale → victory birthday celebration → tap → title.
    gameWon: 'BirthdayEndScene',
  },
};
