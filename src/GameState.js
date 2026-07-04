import { createHero, levelUp } from './data/characters.js';
import { ITEM_DEFS } from './data/items.js';
import { GT } from './data/GameText.js';
import { SAVE_SCOPE } from './saveScope.js';

// SAVE_SCOPE is '' for base-web/native (→ the original key) and '<id>_' for each web variant.
const SLOT_PREFIX     = `genericQuest_${SAVE_SCOPE}save_slot_`;
export const SLOT_COUNT = 10;

function defaultState() {
  return {
    party: [
      createHero('hero1Role'),
      createHero('hero2Role'),
      createHero('hero3Role')
    ],
    inventory: { potion: 1, hiPotion: 1, ether: 1, revivalDrop: 1, antidote: 1 },
    // Weapons the player has purchased (base weapons are free and pre-owned)
    ownedWeapons: ['hero1Weapon1', 'hero3Weapon1', 'hero2Weapon1'],
    gold: 200,
    progress: {
      boss1Defeated: false,  // true when Boss 1 is defeated
      boss2Defeated: false,  // true when Boss 2 is defeated
      boss3Defeated: false,  // true when final Boss 3 is defeated
      worldIntroSeen: false,
      l1TutorialSeen: false,
      l1GoFurtherHintSeen: false,
      l4TutorialSeen: false,
      l5TutorialSeen: false,
      l6TutorialSeen: false,
      floorsCleared: {}     // win counts per floor index
    },
    enemyMult: 1.5,        // damage multiplier for all enemy attacks (Easy=0.85, Normal=1.5, Hard/Insane=2.0)
    // Explicit difficulty identity. Hard and Insane share enemyMult 2.0, so the mult alone
    // can't distinguish them; old saves lack this field and fall back to mult thresholds.
    difficultyId: 'normal' // 'easy' | 'normal' | 'hard' | 'insane'
  };
}

export const GameState = {
  data: null,

  init() {
    this.data = defaultState();
    this._currentScene = 'WorldScene';
    this._currentFloor = undefined;
  },

  // ── Multi-slot save / load ────────────────────────────────────────────

  saveToSlot(n) {
    try {
      const floorNames = [GT.floorB1Name, GT.floorB2Name, GT.floorB3Name, GT.floorB4Name, GT.floorB5Name, GT.floorB6Name];
      const locationLabel =
        this._currentScene === 'DungeonScene' ? (floorNames[this._currentFloor] || GT.placeDungeon) :
        this._currentScene === 'TownScene'    ? GT.placeTown : GT.placeWorldMap;
      const payload = {
        ...this.data,
        _savedAt: Date.now(),
        _location: locationLabel,
        _savedAtScene: this._currentScene || 'WorldScene',
        _savedAtFloor: this._currentFloor
      };
      localStorage.setItem(`${SLOT_PREFIX}${n}`, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  },

  loadFromSlot(n) {
    try {
      const raw = localStorage.getItem(`${SLOT_PREFIX}${n}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // Capture return destination before stripping meta fields
      this._loadScene = parsed._savedAtScene || 'WorldScene';
      this._loadFloor = parsed._savedAtFloor;
      delete parsed._savedAt;
      delete parsed._location;
      delete parsed._savedAtScene;
      delete parsed._savedAtFloor;
      if (parsed.progress?.bossDefeated !== undefined && parsed.progress.boss3Defeated === undefined) {
        parsed.progress.boss3Defeated = parsed.progress.bossDefeated;
        delete parsed.progress.bossDefeated;
      }
      // Merge the save over fresh defaults so saves from older versions automatically gain
      // any top-level / progress fields added since (no more per-field fallbacks scattered
      // around). The save's own values always win. EXCEPTION — difficultyId must NOT fall
      // back to the default 'normal': old saves lack the field and must derive it from
      // their enemyMult (an old Hard save is 2.0; defaulting would relabel it Normal).
      const defaults = defaultState();
      this.data = {
        ...defaults,
        ...parsed,
        progress: { ...defaults.progress, ...(parsed.progress || {}) },
        difficultyId: parsed.difficultyId || this._idFromMult(parsed.enemyMult ?? 1.5),
      };
      return true;
    } catch {
      return false;
    }
  },

  getSlotInfo(n) {
    try {
      const raw = localStorage.getItem(`${SLOT_PREFIX}${n}`);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return {
        slot:       n,
        party:      d.party.map(h => ({ name: h.name, level: h.level })),
        gold:       d.gold,
        location:   d._location || 'World Map',
        scene:      d._savedAtScene || 'WorldScene',
        floor:      d._savedAtFloor,
        savedAt:    d._savedAt || 0,
        difficulty: d.enemyMult ?? 1.5,
        difficultyId: d.difficultyId    // undefined on old saves → label falls back to mult
      };
    } catch {
      return null;
    }
  },

  hasSave() {
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (localStorage.getItem(`${SLOT_PREFIX}${i}`)) return true;
    }
    return false;
  },

  get party() { return this.data.party; },
  get inventory() { return this.data.inventory; },
  get gold() { return this.data.gold; },
  get progress() { return this.data.progress; },
  get enemyMult() { return this.data.enemyMult ?? 1.5; },
  _idFromMult(m) { return m <= 1.0 ? 'easy' : m <= 1.5 ? 'normal' : 'hard'; },
  get difficultyId() { return this.data.difficultyId || this._idFromMult(this.enemyMult); },
  setDifficulty(mult, id) {
    this.data.enemyMult = mult;
    this.data.difficultyId = id || this._idFromMult(mult);
  },
  // Both take an optional (mult, id) pair for save-slot display; with no args they read the
  // live state. id wins when present; old saves have no id and resolve from the mult.
  getDifficultyLabel(mult, id) {
    const did = id ?? (mult === undefined ? this.difficultyId : this._idFromMult(mult));
    return { easy: 'Easy', normal: 'Normal', hard: 'Hard', insane: 'Insane' }[did] || 'Normal';
  },
  getDifficultyColor(mult, id) {
    const did = id ?? (mult === undefined ? this.difficultyId : this._idFromMult(mult));
    return { easy: '#88ff88', normal: '#aaddff', hard: '#ffaaaa', insane: '#ff66ff' }[did] || '#aaddff';
  },

  // Insane difficulty's EXP gate: heroes gain no EXP at/above the recommended level of the
  // earliest UNDEFEATED boss (they must beat each boss at or below its recommended level).
  // Caps mirror DungeonScene's displayed levelRec values (boss1=8, boss2=9, boss3=10).
  // Every other difficulty is uncapped.
  expLevelCap() {
    if (this.difficultyId !== 'insane') return Infinity;
    const p = this.progress;
    if (!p.boss1Defeated) return 8;
    if (!p.boss2Defeated) return 9;
    if (!p.boss3Defeated) return 10;
    return Infinity;
  },

  addGold(amount) {
    this.data.gold = Math.max(0, this.data.gold + amount);
  },

  addItem(id, qty = 1) {
    this.data.inventory[id] = (this.data.inventory[id] || 0) + qty;
  },

  removeItem(id, qty = 1) {
    if (!this.data.inventory[id]) return false;
    this.data.inventory[id] -= qty;
    if (this.data.inventory[id] <= 0) delete this.data.inventory[id];
    return true;
  },

  getItemList() {
    return Object.entries(this.data.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ item: ITEM_DEFS[id], qty }));
  },

  healParty() {
    for (const hero of this.data.party) {
      hero.hp = hero.maxHp;
      hero.mp = hero.maxMp;
      hero.status = 'normal';
    }
  },

  reviveParty() {
    for (const hero of this.data.party) {
      if (hero.status === 'dead') hero.status = 'normal';
    }
  },

  isPartyAlive() {
    return this.data.party.some(h => h.status !== 'dead');
  },

  // ── Weapon ownership ─────────────────────────────────────────────────
  hasWeapon(id) {
    return (this.data.ownedWeapons || []).includes(id);
  },

  addWeapon(id) {
    if (!this.data.ownedWeapons) this.data.ownedWeapons = [];
    if (!this.data.ownedWeapons.includes(id)) this.data.ownedWeapons.push(id);
  },

  // Equip a weapon on a party member, adjusting its bonus stat in-place.
  // INVARIANT: every weapon a given hero can equip boosts the SAME stat (see weapons.js — hero1's
  // are all 'atk', hero2/hero3's all 'mag'), so subtracting the previous bonus from weaponDef.stat
  // is always correct. If a hero ever gets weapons on DIFFERENT stats, track the stat the bonus was
  // applied to and subtract from THAT — otherwise this corrupts the new stat (and a `weaponStat`
  // field must default safely for pre-existing saves, which lack it).
  equipWeapon(heroIdx, weaponDef) {
    const hero = this.data.party[heroIdx];
    const oldBonus = hero.weaponBonus || 0;
    hero[weaponDef.stat] = hero[weaponDef.stat] - oldBonus + weaponDef.bonus;
    hero.weaponId    = weaponDef.id;
    hero.weaponBonus = weaponDef.bonus;
  },

  awardExp(expAmount, goldAmount) {
    const results = [];
    this.addGold(goldAmount);
    // Insane EXP gate (expLevelCap is Infinity elsewhere): at/above the cap a hero gains
    // nothing; below it EXP applies normally but leveling stops AT the cap and overflow is
    // discarded, not banked. Gold is never gated. The secret +1-level cheat zones bypass
    // this entirely (they call levelUp() directly, not awardExp).
    const cap = this.expLevelCap();
    for (const hero of this.data.party) {
      if (hero.status === 'dead') continue;
      if (hero.level >= cap) { hero.exp = 0; continue; }
      hero.exp += expAmount;
      let leveled = false;
      while (hero.exp >= hero.expNext) {
        if (hero.level >= 99) { hero.exp = 0; break; }
        hero.exp -= hero.expNext;
        levelUp(hero);
        leveled = true;
        if (hero.level >= cap) { hero.exp = 0; break; }
      }
      if (leveled) results.push({ hero, leveledUp: true });
    }
    return results;
  }
};
