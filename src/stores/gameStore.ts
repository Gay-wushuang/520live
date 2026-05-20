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

export interface GiftAuditLogEntry {
  id: string;
  type: 'card_spin' | 'reward_unlocked' | 'reward_claimed' | 'archive' | 'reset';
  archiveId: string;
  archiveName: string;
  playerId: string;
  playerName: string;
  season?: Season;
  seasonName?: string;
  cardLabel?: string;
  rewardLabel?: string;
  rewardStatus?: 'none' | 'wallpaper' | 'ultimate';
  cardCount?: number;
  note: string;
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
  auditLogs: GiftAuditLogEntry[];
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
  auditLogs: GiftAuditLogEntry[];
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
const MAX_AUDIT_LOGS = 500;
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
    auditLogs: [],
    createdAt: now,
    updatedAt: now,
  };
}

function appendHistory(history: SpinHistoryEntry[], entry: SpinHistoryEntry): SpinHistoryEntry[] {
  return [entry, ...history].slice(0, MAX_HISTORY);
}

function appendAuditLogs(logs: GiftAuditLogEntry[], entries: GiftAuditLogEntry[]): GiftAuditLogEntry[] {
  return [...entries, ...logs].slice(0, MAX_AUDIT_LOGS);
}

function createGiftAuditLog(
  state: GameState,
  type: GiftAuditLogEntry['type'],
  note: string,
  details: Partial<Omit<GiftAuditLogEntry, 'id' | 'type' | 'archiveId' | 'archiveName' | 'playerId' | 'playerName' | 'note' | 'createdAt'>> = {}
): GiftAuditLogEntry {
  return {
    id: createId('gift-log'),
    type,
    archiveId: state.currentArchiveId,
    archiveName: state.userProfile.nickname || '未命名存档',
    playerId: state.userProfile.id,
    playerName: state.userProfile.nickname,
    note,
    createdAt: new Date().toISOString(),
    ...details,
  };
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
    auditLogs: state.auditLogs,
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
    auditLogs: archive.auditLogs ?? [],
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
    auditLogs: persistedState?.auditLogs ?? [],
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
        const log = createGiftAuditLog(state, 'archive', `保存积分卡存档：${state.userProfile.nickname}`);
        const nextState = {
          ...state,
          auditLogs: appendAuditLogs(state.auditLogs, [log]),
        };

        set({
          auditLogs: nextState.auditLogs,
          archiveSlots: upsertCurrentArchive(nextState),
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
        const log = createGiftAuditLog(nextState, 'archive', `玩家名称更新为 ${nextNickname}`);
        const nextStateWithLog = {
          ...nextState,
          auditLogs: appendAuditLogs(state.auditLogs, [log]),
        };

        set({
          userProfile: nextUserProfile,
          auditLogs: nextStateWithLog.auditLogs,
          archiveSlots: upsertCurrentArchive(nextStateWithLog),
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
        const auditEntries: GiftAuditLogEntry[] = [
          createGiftAuditLog(state, 'card_spin', `抽中 ${info.cardLabel}，当前进度 ${currentCount}/2`, {
            season,
            seasonName: info.name,
            cardLabel: info.cardLabel,
            rewardLabel: pendingReward?.wallpaperLabel,
            rewardStatus: entry.rewardStatus,
            cardCount: currentCount,
          }),
        ];

        if (pendingReward) {
          auditEntries.unshift(
            createGiftAuditLog(
              state,
              'reward_unlocked',
              pendingReward.type === 'ultimate'
                ? `解锁终极奖励：3个Q版3D模型、夏秋双面折扇、Wallpaper动态壁纸`
                : `解锁壁纸奖励：${pendingReward.wallpaperLabel}`,
              {
                season,
                seasonName: info.name,
                cardLabel: info.cardLabel,
                rewardLabel: pendingReward.type === 'ultimate' ? `${info.name}终极奖励` : pendingReward.wallpaperLabel,
                rewardStatus: pendingReward.type,
                cardCount: currentCount,
              }
            )
          );
        }

        const nextState = {
          ...state,
          cardCollection: newCollection,
          totalSpins: state.totalSpins + 1,
          cardSpins: state.cardSpins + 1,
          spinHistory: appendHistory(state.spinHistory, entry),
          lastSpin: entry,
          auditLogs: appendAuditLogs(state.auditLogs, auditEntries),
          pendingReward,
          showVideoReward: isUltimate,
        };

        set({
          cardCollection: nextState.cardCollection,
          totalSpins: nextState.totalSpins,
          cardSpins: nextState.cardSpins,
          spinHistory: nextState.spinHistory,
          lastSpin: nextState.lastSpin,
          auditLogs: nextState.auditLogs,
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
        const info = getSeasonInfo(season);
        const rewardLabel = state.pendingReward?.type === 'wallpaper' ? state.pendingReward.wallpaperLabel : info.wallpaperLabel;
        const log = createGiftAuditLog(state, 'reward_claimed', `已领取壁纸奖励：${rewardLabel}`, {
          season,
          seasonName: info.name,
          cardLabel: info.cardLabel,
          rewardLabel,
          rewardStatus: 'wallpaper',
        });
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
          auditLogs: appendAuditLogs(state.auditLogs, [log]),
        };

        set({
          cardCollection: nextState.cardCollection,
          wallpaperCollection: nextState.wallpaperCollection,
          pendingReward: null,
          auditLogs: nextState.auditLogs,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      claimUltimateReward: () => {
        const state = get();
        const season = state.pendingReward?.season;
        const info = season ? getSeasonInfo(season) : null;
        const log = createGiftAuditLog(state, 'reward_claimed', '已领取终极奖励：3个Q版3D模型、夏秋双面折扇、Wallpaper动态壁纸', {
          season,
          seasonName: info?.name,
          cardLabel: info?.cardLabel,
          rewardLabel: info ? `${info.name}终极奖励` : '终极奖励',
          rewardStatus: 'ultimate',
        });
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
          auditLogs: appendAuditLogs(state.auditLogs, [log]),
        };

        set({
          cardCollection: nextState.cardCollection,
          showVideoReward: false,
          pendingReward: null,
          auditLogs: nextState.auditLogs,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      resetGame: () => {
        const state = get();
        const log = createGiftAuditLog(state, 'reset', '积分卡收集进度已重置');
        const nextState = {
          ...state,
          cardCollection: { ...EMPTY_CARD_COLLECTION },
          wallpaperCollection: { ...EMPTY_WALLPAPER_COLLECTION },
          totalSpins: 0,
          cardSpins: 0,
          spinHistory: [],
          lastSpin: null,
          auditLogs: appendAuditLogs(state.auditLogs, [log]),
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
          auditLogs: nextState.auditLogs,
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
        auditLogs: state.auditLogs,
        pendingReward: state.pendingReward,
        showVideoReward: state.showVideoReward,
      }),
    }
  )
);
