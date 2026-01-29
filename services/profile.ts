import { PlayerProfile } from '../types';
// import { TattooId } from './cjr/cjrTypes'; // Keep if needed

// EIDOLON-V: In-Memory Cache
let cachedProfile: PlayerProfile | null = null;
let saveTimeout: any = null;

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

// EIDOLON-V: Load once, then reuse
export const loadProfile = (): PlayerProfile => {
  if (cachedProfile) return cachedProfile;

  if (typeof window === 'undefined') return getEmptyProfile();

  try {
    const data = localStorage.getItem('cjr_profile');
    if (data) {
      const parsed = JSON.parse(data) as PlayerProfile;
      // Merge with empty to ensure schema migration
      cachedProfile = { ...getEmptyProfile(), ...parsed };
    } else {
      cachedProfile = getEmptyProfile();
    }
  } catch (e) {
    console.error("Profile Load Error", e);
    cachedProfile = getEmptyProfile();
  }

  return cachedProfile!;
};

// EIDOLON-V: Non-blocking Save (Debounced)
export const saveProfile = (profile: PlayerProfile, forceImmediate = false) => {
  cachedProfile = profile; // Update cache immediately

  if (forceImmediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    localStorage.setItem('cjr_profile', JSON.stringify(profile));
    return;
  }

  // Debounce save to avoid disk trashing
  if (!saveTimeout) {
    saveTimeout = setTimeout(() => {
      localStorage.setItem('cjr_profile', JSON.stringify(profile));
      saveTimeout = null;
    }, 1000); // Save at most once per second
  }
};

export const unlockSkin = (skinId: string) => {
  const profile = loadProfile();
  // Safe access
  if (!profile.cosmetics) profile.cosmetics = { ownedSkins: [], ownedTrails: [], ownedAuras: [], ownedBadges: [], active: {} };

  if (!profile.cosmetics.ownedSkins.includes(skinId)) {
    profile.cosmetics.ownedSkins.push(skinId);
    saveProfile(profile);
    // TODO: Event Bus notification
  }
};

export const unlockBadge = (badgeId: string) => {
  const profile = loadProfile();
  // Safe access
  if (!profile.cosmetics) profile.cosmetics = { ownedSkins: [], ownedTrails: [], ownedAuras: [], ownedBadges: [], active: {} };

  if (!profile.cosmetics.ownedBadges.includes(badgeId)) {
    profile.cosmetics.ownedBadges.push(badgeId);
    saveProfile(profile);
  }
};

export const updateProfileStats = (stats: { kills: number; score: number }) => {
  const profile = loadProfile();
  profile.totalKills += stats.kills;
  profile.highScore = Math.max(profile.highScore, stats.score);
  profile.gamesPlayed += 1;
  // Don't force immediate save here, let debounce handle it
  saveProfile(profile);
};
