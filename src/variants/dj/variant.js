// dj — identical to the ethan variant (same gametext + hero sprites), exposed under its own
// variant id. Adds the two SHARED celebration scenes (no decorative dino — celebrationShowDino is
// false in this variant's gametext). dj's text lives in variants/dj/gametext.txt and dj's 3 hero
// sprites in variants/dj/custom-art/ (both copied verbatim from ethan).
import { BirthdayScene } from '../shared/scenes/BirthdayScene.js';
import { BirthdayEndScene } from '../shared/scenes/BirthdayEndScene.js';

export default {
  id: 'dj',
  scenes: [BirthdayScene, BirthdayEndScene],
  routes: {
    newGame: 'BirthdayScene',
    gameWon: 'BirthdayEndScene',
  },
};
