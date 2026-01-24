
import { PlayerProfile, TattooId } from '../types';

export const getEmptyProfile = (): PlayerProfile => ({
  gamesPlayed: 0,
  totalKills: 0,
  highScore: 0,
  unlockedSkins: [],
  unlockedTattoos: [],
  cosmetics: {
    ownedSkins: [],
    ownedTrails: [],
    ownedAuras: [],
    ownedBadges: [],
    active: {}
  },
  quests: {
    daily: {},
    weekly: {},
    lastReset: Date.now()
  },
  guildId: null,
  lastUpdated: Date.now()
});

export const saveProfile = (profile: PlayerProfile) => {
  localStorage.setItem('cjr_profile', JSON.stringify(profile));
};

export const loadProfile = (): PlayerProfile => {
  const data = localStorage.getItem('cjr_profile');
  if (data) {
    const parsed = JSON.parse(data) as PlayerProfile;
    return { ...getEmptyProfile(), ...parsed };
  }
  return getEmptyProfile();
};
