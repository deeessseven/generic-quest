import { makeImageStore } from './ImageStore.js';
import { SAVE_SCOPE } from '../saveScope.js';

export const AvatarStore = makeImageStore(`genericQuest_${SAVE_SCOPE}avatar_`);
