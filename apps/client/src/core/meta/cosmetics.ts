export type CosmeticType = 'skin' | 'trail' | 'aura' | 'badge';

export type CosmeticItem = {
  id: string;
  type: CosmeticType;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  previewColor?: string;
};

export type CosmeticLoadout = {
  skin?: string;
  trail?: string;
  aura?: string;
  badge?: string;
};

export const COSMETIC_CATALOG: CosmeticItem[] = [
  { id: 'skin_default', type: 'skin', name: 'Default', rarity: 'common' },
  { id: 'skin_onyx', type: 'skin', name: 'Onyx Shell', rarity: 'rare', previewColor: '#0f172a' },
  {
    id: 'trail_ember',
    type: 'trail',
    name: 'Ember Trail',
    rarity: 'epic',
    previewColor: '#f97316',
  },
  { id: 'aura_jade', type: 'aura', name: 'Jade Aura', rarity: 'epic', previewColor: '#10b981' },
  { id: 'badge_boss', type: 'badge', name: 'Boss Slayer', rarity: 'legendary' },
];

export const getDefaultLoadout = (): CosmeticLoadout => ({
  skin: 'skin_default',
});

export const isCosmeticOwned = (owned: string[], cosmeticId: string): boolean =>
  owned.includes(cosmeticId);

export const applyCosmeticLoadout = (
  owned: string[],
  loadout: CosmeticLoadout
): CosmeticLoadout => {
  const safe: CosmeticLoadout = {};
  if (loadout.skin && isCosmeticOwned(owned, loadout.skin)) safe.skin = loadout.skin;
  if (loadout.trail && isCosmeticOwned(owned, loadout.trail)) safe.trail = loadout.trail;
  if (loadout.aura && isCosmeticOwned(owned, loadout.aura)) safe.aura = loadout.aura;
  if (loadout.badge && isCosmeticOwned(owned, loadout.badge)) safe.badge = loadout.badge;
  return safe;
};
