import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  COMPUTER_WALLPAPER_IMAGE,
  getSeasonByIndex,
  getSeasonInfo,
  type Season,
} from '../data/seasons';

export type { Season } from '../data/seasons';

interface CardCollection {
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
}

interface WallpaperCollection {
  spring: boolean;
  summer: boolean;
  autumn: boolean;
  winter: boolean;
}

export interface UserProfile {
  id: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpinHistoryEntry {
  id: string;
  mode: 'card';
  season: Season;
  label: string;
  rewardStatus: 'none' | 'wallpaper' | 'ultimate';
  createdAt: string;
}

export interface SaveArchive {
  id: string;
  name: string;
  userProfile: UserProfile;
  cardCollection: CardCollection;
  wallpaperCollection: WallpaperCollection;
  totalSpins: number;
  cardSpins: number;
  spinHistory: SpinHistoryEntry[];
  lastSpin: SpinHistoryEntry | null;
  createdAt: string;
  updatedAt: string;
}

export type RewardGoal = 'wallpaper' | 'ultimate';

export type RewardResult = {
  isMatch: boolean;
  isNewWallpaper: boolean;
  isUltimate: boolean;
  season: Season;
  seasonName: string;
  cardLabel: string;
  cardImage: string;
  wallpaperLabel: string;
  currentCount: number;
  goal: RewardGoal;
  remaining: number;
};

export type GameReward =
  | {
      type: 'wallpaper';
      season: Season;
      seasonName: string;
      sourceCardLabel: string;
      wallpaperImage: string;
      wallpaperLabel: string;
    }
  | {
      type: 'ultimate';
      season: Season;
      seasonName: string;
      sourceCardLabel: string;
      wallpaperImage: string;
      wallpaperLabel: string;
      computerWallpaper: string;
    };

interface GameState {
  currentArchiveId: string;
  archiveSlots: SaveArchive[];
  userProfile: UserProfile;
  cardCollection: CardCollection;
  wallpaperCollection: WallpaperCollection;
  totalSpins: number;
  cardSpins: number;
  spinHistory: SpinHistoryEntry[];
  lastSpin: SpinHistoryEntry | null;
  pendingReward: GameReward | null;
  showVideoReward: boolean;

  createArchive: (name?: string) => string;
  switchArchive: (archiveId: string) => boolean;
  saveCurrentArchive: () => void;
  deleteArchive: (archiveId: string) => boolean;
  setNickname: (nickname: string) => void;
  addCard: (season: Season) => RewardResult;
  claimWallpaper: (season: Season) => void;
  claimUltimateReward: () => void;
  resetGame: () => void;
  getSeasonName: (season: Season) => string;
  getSeasonFromIndex: (index: number) => Season;
}

type PersistedGameState = Partial<GameState> & {
  archiveSlots?: SaveArchive[];
  currentArchiveId?: string;
};

const MAX_HISTORY = 30;
const EMPTY_CARD_COLLECTION: CardCollection = {
  spring: 0,
  summer: 0,
  autumn: 0,
  winter: 0,
};
const EMPTY_WALLPAPER_COLLECTION: WallpaperCollection = {
  spring: false,
  summer: false,
  autumn: false,
  winter: false,
};

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultUserProfile(name?: string): UserProfile {
  const now = new Date().toISOString();
  const id = createId('user');

  return {
    id,
    nickname: name?.trim().slice(0, 20) || `玩家${id.slice(-4).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
  };
}

function createEmptyArchive(name?: string): SaveArchive {
  const now = new Date().toISOString();
  const userProfile = createDefaultUserProfile(name);

  return {
    id: createId('archive'),
    name: userProfile.nickname,
    userProfile,
    cardCollection: { ...EMPTY_CARD_COLLECTION },
    wallpaperCollection: { ...EMPTY_WALLPAPER_COLLECTION },
    totalSpins: 0,
    cardSpins: 0,
    spinHistory: [],
    lastSpin: null,
    createdAt: now,
    updatedAt: now,
  };
}

function appendHistory(history: SpinHistoryEntry[], entry: SpinHistoryEntry): SpinHistoryEntry[] {
  return [entry, ...history].slice(0, MAX_HISTORY);
}

function snapshotArchive(state: GameState, existing?: SaveArchive): SaveArchive {
  const now = new Date().toISOString();

  return {
    id: state.currentArchiveId,
    name: state.userProfile.nickname || existing?.name || '未命名存档',
    userProfile: state.userProfile,
    cardCollection: state.cardCollection,
    wallpaperCollection: state.wallpaperCollection,
    totalSpins: state.totalSpins,
    cardSpins: state.cardSpins,
    spinHistory: state.spinHistory,
    lastSpin: state.lastSpin,
    createdAt: existing?.createdAt ?? state.userProfile.createdAt ?? now,
    updatedAt: now,
  };
}

function upsertCurrentArchive(state: GameState): SaveArchive[] {
  const archiveIndex = state.archiveSlots.findIndex((archive) => archive.id === state.currentArchiveId);
  const nextArchive = snapshotArchive(state, state.archiveSlots[archiveIndex]);

  if (archiveIndex === -1) {
    return [...state.archiveSlots, nextArchive];
  }

  return state.archiveSlots.map((archive, index) => (index === archiveIndex ? nextArchive : archive));
}

function buildArchiveState(archive: SaveArchive) {
  return {
    currentArchiveId: archive.id,
    userProfile: archive.userProfile,
    cardCollection: archive.cardCollection,
    wallpaperCollection: archive.wallpaperCollection,
    totalSpins: archive.totalSpins,
    cardSpins: archive.cardSpins,
    spinHistory: archive.spinHistory,
    lastSpin: archive.lastSpin,
    pendingReward: null,
    showVideoReward: false,
  };
}

function createInitialStateArchive(): SaveArchive {
  return createEmptyArchive('存档 1');
}

function normalizePersistedState(value: unknown): Partial<GameState> {
  const persistedState = value && typeof value === 'object' ? (value as PersistedGameState) : {};

  if (Array.isArray(persistedState.archiveSlots) && persistedState.archiveSlots.length > 0) {
    const currentArchiveId = persistedState.currentArchiveId ?? persistedState.archiveSlots[0].id;
    const currentArchive =
      persistedState.archiveSlots.find((archive: SaveArchive) => archive.id === currentArchiveId) ??
      persistedState.archiveSlots[0];

    return {
      ...persistedState,
      archiveSlots: persistedState.archiveSlots,
      ...buildArchiveState(currentArchive),
    };
  }

  const now = new Date().toISOString();
  const userProfile = persistedState?.userProfile ?? createDefaultUserProfile('存档 1');
  const archive: SaveArchive = {
    id: createId('archive'),
    name: userProfile.nickname || '存档 1',
    userProfile,
    cardCollection: persistedState?.cardCollection ?? { ...EMPTY_CARD_COLLECTION },
    wallpaperCollection: persistedState?.wallpaperCollection ?? { ...EMPTY_WALLPAPER_COLLECTION },
    totalSpins: persistedState?.totalSpins ?? 0,
    cardSpins: persistedState?.cardSpins ?? 0,
    spinHistory: persistedState?.spinHistory ?? [],
    lastSpin: persistedState?.lastSpin ?? null,
    createdAt: userProfile.createdAt ?? now,
    updatedAt: now,
  };

  return {
    archiveSlots: [archive],
    ...buildArchiveState(archive),
  };
}

export function getSeasonFromWheelIndex(index: number): Season {
  return getSeasonByIndex(index).season;
}

const initialArchive = createInitialStateArchive();

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      archiveSlots: [initialArchive],
      ...buildArchiveState(initialArchive),

      createArchive: (name?: string) => {
        const state = get();
        const archive = createEmptyArchive(name || `存档 ${state.archiveSlots.length + 1}`);
        const savedArchiveSlots = upsertCurrentArchive(state);

        set({
          archiveSlots: [...savedArchiveSlots, archive],
          ...buildArchiveState(archive),
        });

        return archive.id;
      },

      switchArchive: (archiveId: string) => {
        const state = get();
        const savedArchiveSlots = upsertCurrentArchive(state);
        const targetArchive = savedArchiveSlots.find((archive) => archive.id === archiveId);

        if (!targetArchive) {
          return false;
        }

        set({
          archiveSlots: savedArchiveSlots,
          ...buildArchiveState(targetArchive),
        });

        return true;
      },

      saveCurrentArchive: () => {
        const state = get();
        set({
          archiveSlots: upsertCurrentArchive(state),
        });
      },

      deleteArchive: (archiveId: string) => {
        const state = get();
        const savedArchiveSlots = upsertCurrentArchive(state);

        if (savedArchiveSlots.length <= 1) {
          return false;
        }

        const nextArchiveSlots = savedArchiveSlots.filter((archive) => archive.id !== archiveId);
        const nextArchive =
          archiveId === state.currentArchiveId
            ? nextArchiveSlots[0]
            : nextArchiveSlots.find((archive) => archive.id === state.currentArchiveId) ?? nextArchiveSlots[0];

        set({
          archiveSlots: nextArchiveSlots,
          ...buildArchiveState(nextArchive),
        });

        return true;
      },

      setNickname: (nickname: string) => {
        const state = get();
        const nextNickname = nickname.trim().slice(0, 20) || '未命名玩家';
        const nextUserProfile = {
          ...state.userProfile,
          nickname: nextNickname,
          updatedAt: new Date().toISOString(),
        };
        const nextState = {
          ...state,
          userProfile: nextUserProfile,
        };

        set({
          userProfile: nextUserProfile,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      addCard: (season: Season) => {
        const state = get();
        const info = getSeasonInfo(season);
        const newCollection = { ...state.cardCollection };
        newCollection[season] += 1;

        const hasWallpaper = state.wallpaperCollection[season];
        const goal: RewardGoal = hasWallpaper ? 'ultimate' : 'wallpaper';
        const currentCount = Math.min(newCollection[season], 2);
        const remaining = Math.max(2 - currentCount, 0);
        let isMatch = false;
        let isNewWallpaper = false;
        let isUltimate = false;
        let pendingReward: GameReward | null = null;

        if (newCollection[season] >= 2) {
          isMatch = true;

          if (!hasWallpaper) {
            isNewWallpaper = true;
            pendingReward = {
              type: 'wallpaper',
              season,
              seasonName: info.name,
              sourceCardLabel: info.cardLabel,
              wallpaperImage: info.wallpaperImage,
              wallpaperLabel: info.wallpaperLabel,
            };
          } else {
            isUltimate = true;
            pendingReward = {
              type: 'ultimate',
              season,
              seasonName: info.name,
              sourceCardLabel: info.cardLabel,
              wallpaperImage: info.wallpaperImage,
              wallpaperLabel: info.wallpaperLabel,
              computerWallpaper: COMPUTER_WALLPAPER_IMAGE,
            };
          }
        }

        const entry: SpinHistoryEntry = {
          id: createId('spin'),
          mode: 'card',
          season,
          label: info.cardLabel,
          rewardStatus: isUltimate ? 'ultimate' : isNewWallpaper ? 'wallpaper' : 'none',
          createdAt: new Date().toISOString(),
        };
        const nextState = {
          ...state,
          cardCollection: newCollection,
          totalSpins: state.totalSpins + 1,
          cardSpins: state.cardSpins + 1,
          spinHistory: appendHistory(state.spinHistory, entry),
          lastSpin: entry,
          pendingReward,
          showVideoReward: isUltimate,
        };

        set({
          cardCollection: nextState.cardCollection,
          totalSpins: nextState.totalSpins,
          cardSpins: nextState.cardSpins,
          spinHistory: nextState.spinHistory,
          lastSpin: nextState.lastSpin,
          pendingReward: nextState.pendingReward,
          showVideoReward: nextState.showVideoReward,
          archiveSlots: upsertCurrentArchive(nextState),
        });

        return {
          isMatch,
          isNewWallpaper,
          isUltimate,
          season,
          seasonName: info.name,
          cardLabel: info.cardLabel,
          cardImage: info.cardImage,
          wallpaperLabel: info.wallpaperLabel,
          currentCount,
          goal,
          remaining,
        };
      },

      claimWallpaper: (season: Season) => {
        const state = get();
        const nextState = {
          ...state,
          cardCollection: {
            ...state.cardCollection,
            [season]: 0,
          },
          wallpaperCollection: {
            ...state.wallpaperCollection,
            [season]: true,
          },
          pendingReward: null,
        };

        set({
          cardCollection: nextState.cardCollection,
          wallpaperCollection: nextState.wallpaperCollection,
          pendingReward: null,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      claimUltimateReward: () => {
        const state = get();
        const season = state.pendingReward?.season;
        const nextState = {
          ...state,
          cardCollection: season
            ? {
                ...state.cardCollection,
                [season]: 0,
              }
            : state.cardCollection,
          showVideoReward: false,
          pendingReward: null,
        };

        set({
          cardCollection: nextState.cardCollection,
          showVideoReward: false,
          pendingReward: null,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      resetGame: () => {
        const state = get();
        const nextState = {
          ...state,
          cardCollection: { ...EMPTY_CARD_COLLECTION },
          wallpaperCollection: { ...EMPTY_WALLPAPER_COLLECTION },
          totalSpins: 0,
          cardSpins: 0,
          spinHistory: [],
          lastSpin: null,
          pendingReward: null,
          showVideoReward: false,
        };

        set({
          cardCollection: nextState.cardCollection,
          wallpaperCollection: nextState.wallpaperCollection,
          totalSpins: 0,
          cardSpins: 0,
          spinHistory: [],
          lastSpin: null,
          pendingReward: null,
          showVideoReward: false,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      getSeasonName: (season: Season) => getSeasonInfo(season).name,

      getSeasonFromIndex: (index: number) => getSeasonFromWheelIndex(index),
    }),
    {
      name: 'season-wheel-game-state',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => normalizePersistedState(persistedState),
      partialize: (state) => ({
        currentArchiveId: state.currentArchiveId,
        archiveSlots: upsertCurrentArchive(state),
        userProfile: state.userProfile,
        cardCollection: state.cardCollection,
        wallpaperCollection: state.wallpaperCollection,
        totalSpins: state.totalSpins,
        cardSpins: state.cardSpins,
        spinHistory: state.spinHistory,
        lastSpin: state.lastSpin,
        pendingReward: state.pendingReward,
        showVideoReward: state.showVideoReward,
      }),
    }
  )
);
