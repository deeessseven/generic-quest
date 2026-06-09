// ethans — Ethan's birthday edition. Same engine as the base game; adds the two SHARED celebration
// scenes (no decorative dino — celebrationShowDino=false in this variant's gametext). Ethan's text
// lives in variants/ethans/gametext.txt; Ethan's 3 hero sprites in variants/ethans/custom-art/.
import { BirthdayScene } from '../shared/scenes/BirthdayScene.js';
import { BirthdayEndScene } from '../shared/scenes/BirthdayEndScene.js';

export default {
  id: 'ethans',
  scenes: [BirthdayScene, BirthdayEndScene],
  routes: {
    newGame: 'BirthdayScene',
    gameWon: 'BirthdayEndScene',
  },
};
