export const ITEM_DEFS = {
  potion: {
    id: 'potion', name: 'Potion',
    buyPrice: 50, sellPrice: 25,
    type: 'heal', hp: 100,
    description: 'Restores 100 HP to one ally',
    target: 'single_ally', usableInBattle: true
  },
  hiPotion: {
    id: 'hiPotion', name: 'Hi-Potion',
    buyPrice: 75, sellPrice: 37,
    type: 'heal', hp: 200,
    description: 'Restores 200 HP to one ally',
    target: 'single_ally', usableInBattle: true
  },
  ether: {
    id: 'ether', name: 'Ether',
    buyPrice: 100, sellPrice: 50,
    type: 'mp', mp: 50,
    description: 'Restores 50 MP to one ally',
    target: 'single_ally', usableInBattle: true
  },
  revivalDrop: {
    id: 'revivalDrop', name: 'Revival Drop',
    buyPrice: 200, sellPrice: 100,
    type: 'revive', healPercent: 0.25, mpRestorePercent: 0.25,
    description: 'Revives a knocked out (KO\'d) ally with 25% HP & MP',
    target: 'single_ally', usableInBattle: true
  },
  antidote: {
    id: 'antidote', name: 'Antidote',
    buyPrice: 40, sellPrice: 20,
    type: 'cure_status', cures: ['poison'],
    description: 'Cures Poison',
    target: 'single_ally', usableInBattle: true
  },
};

export const SHOP_STOCK = {
  town: ['potion', 'hiPotion', 'ether', 'revivalDrop', 'antidote']
};

// Which lock (if any) currently prevents `item` from being used against the WHOLE party right
// now — checked in this fixed order: revive, heal, mp, cure_status (poison only, matching the
// only cure_status item that exists today). null = usable. Shared by MenuScene's item-list toast
// gate and BattleScene's disabled-row check — both independently reimplemented these same four
// conditions before this was extracted; keep them in sync here instead of at each call site.
export function itemPartyLockReason(item, party) {
  const alive = party.filter(h => h.status !== 'dead');
  if (item.type === 'revive' && !party.some(h => h.status === 'dead')) return 'revive';
  if (item.type === 'heal' && alive.every(h => h.hp >= h.maxHp)) return 'heal';
  if (item.type === 'mp' && alive.every(h => h.mp >= h.maxMp)) return 'mp';
  if (item.type === 'cure_status' && item.cures?.includes('poison') && !alive.some(h => h.status === 'poison')) return 'status';
  return null;
}

// Can `item` be used on this SPECIFIC hero right now? Used by MenuScene's per-hero target picker.
export function canUseItemOnHero(item, hero) {
  const isDead = hero.status === 'dead';
  if (item.type === 'revive') return isDead;
  if (isDead) return false;
  if (item.type === 'heal' && hero.hp >= hero.maxHp) return false;
  if (item.type === 'mp' && hero.mp >= hero.maxMp) return false;
  if (item.type === 'cure_status' && !item.cures?.includes(hero.status)) return false;
  return true;
}

export function useItem(item, target) {
  const result = { message: '', healed: 0 };
  if (item.type === 'heal') {
    const actual = Math.min(item.hp, target.maxHp - target.hp);
    target.hp += actual;
    result.healed = actual;
    result.message = `${target.name} restored ${actual} HP!`;
  } else if (item.type === 'mp') {
    const actual = Math.min(item.mp, target.maxMp - target.mp);
    target.mp += actual;
    result.message = `${target.name} restored ${actual} MP!`;
  } else if (item.type === 'revive') {
    if (target.status === 'dead') {
      target.hp = Math.floor(target.maxHp * item.healPercent);
      if (item.mpRestorePercent) target.mp = Math.floor(target.maxMp * item.mpRestorePercent);
      target.status = 'normal';
      result.message = `${target.name} was revived!`;
    }
  } else if (item.type === 'cure_status') {
    if (item.cures.includes(target.status)) {
      const cured = target.status;
      target.status = 'normal';
      result.message = `${target.name}'s ${cured} was cured!`;
    } else {
      result.message = `${target.name} isn't affected by that.`;
    }
  }
  return result;
}
