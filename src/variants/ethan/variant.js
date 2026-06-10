// ethan — Ethan's birthday edition. Same engine as the base game; adds the two SHARED celebration
// scenes (no decorative dino — celebrationShowDino=false in this variant's gametext). Ethan's text
// lives in variants/ethan/gametext.txt; Ethan's 3 hero sprites in variants/ethan/custom-art/.
import { BirthdayScene } from '../shared/scenes/BirthdayScene.js';
import { BirthdayEndScene } from '../shared/scenes/BirthdayEndScene.js';

export default {
  id: 'ethan',
  scenes: [BirthdayScene, BirthdayEndScene],
  routes: {
    newGame: 'BirthdayScene',
    gameWon: 'BirthdayEndScene',
  },
};
