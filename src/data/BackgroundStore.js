import { makeImageStore } from './ImageStore.js';
import { SAVE_SCOPE } from '../saveScope.js';

export const BackgroundStore = makeImageStore(`genericQuest_${SAVE_SCOPE}bg_`);
