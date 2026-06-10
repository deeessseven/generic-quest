// van — Van's birthday edition. Same engine as the base game; adds the two SHARED celebration
// scenes (dino off by default — celebrationShowDino in variants/van/gametext.txt). Van's text lives
// in variants/van/gametext.txt; Van's 3 hero sprites in variants/van/custom-art/.
import { BirthdayScene } from '../shared/scenes/BirthdayScene.js';
import { BirthdayEndScene } from '../shared/scenes/BirthdayEndScene.js';

export default {
  id: 'van',
  scenes: [BirthdayScene, BirthdayEndScene],
  routes: {
    newGame: 'BirthdayScene',
    gameWon: 'BirthdayEndScene',
  },
};
