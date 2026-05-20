import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ActiveEffect,
  BoardEventType,
  BoardPosition,
  EventTarget,
  GameState,
  MonopolyArchive,
  MonopolyLogEntry,
  PlayerState,
} from '../types/monopoly';

const BOARD_SIZE = 28;
const MAX_MONOPOLY_LOGS = 600;

export const BOARD_SLOTS: Array<{ x: number; y: number; width: number; height: number }> = [
  { x: 11.24, y: 12.80, width: 12.76, height: 12.52 },
  { x: 23.92, y: 12.88, width: 8.77, height: 11.08 },
  { x: 33.69, y: 12.88, width: 8.53, height: 11.08 },
  { x: 44.02, y: 12.88, width: 10.05, height: 11.24 },
  { x: 55.42, y: 12.84, width: 9.41, height: 11.16 },
  { x: 65.71, y: 12.80, width: 8.93, height: 11.24 },
  { x: 75.64, y: 12.92, width: 8.85, height: 11.16 },
  { x: 88.72, y: 12.80, width: 12.84, height: 12.36 },
  { x: 88.76, y: 25.00, width: 10.21, height: 8.37 },
  { x: 88.48, y: 34.45, width: 10.29, height: 8.61 },
  { x: 88.52, y: 43.78, width: 10.21, height: 8.45 },
  { x: 88.56, y: 54.82, width: 10.13, height: 8.53 },
  { x: 88.56, y: 64.27, width: 10.13, height: 8.77 },
  { x: 88.72, y: 73.72, width: 10.45, height: 8.53 },
  { x: 88.68, y: 86.08, width: 12.76, height: 12.36 },
  { x: 75.72, y: 85.81, width: 9.33, height: 11.64 },
  { x: 65.83, y: 85.93, width: 9.01, height: 11.24 },
  { x: 55.54, y: 85.93, width: 9.81, height: 11.56 },
  { x: 43.90, y: 85.93, width: 10.13, height: 11.24 },
  { x: 33.61, y: 85.81, width: 8.85, height: 11.64 },
  { x: 23.92, y: 85.89, width: 9.09, height: 11.48 },
  { x: 11.20, y: 86.00, width: 12.68, height: 12.52 },
  { x: 11.28, y: 73.52, width: 9.81, height: 8.29 },
  { x: 11.28, y: 64.23, width: 9.81, height: 8.21 },
  { x: 11.44, y: 54.94, width: 10.13, height: 8.29 },
  { x: 11.40, y: 43.66, width: 10.05, height: 8.53 },
  { x: 11.28, y: 34.33, width: 9.81, height: 8.05 },
  { x: 11.40, y: 24.92, width: 10.05, height: 8.37 },
];

export const EVENT_CONFIGS: Record<
  BoardEventType,
  {
    name: string;
    icon: string;
    color: string;
    target: EventTarget;
    positions: number[];
    summary: string;
  }
> = {
  lottery: {
    name: '积分抽奖轮盘',
    icon: '卡',
    color: '#F59E0B',
    target: 'audience',
    positions: [0, 7, 14, 21],
    summary: '积分卡收集与配对奖励',
  },
  misfortune: {
    name: '厄运事件轮盘',
    icon: '厄',
    color: '#B91C1C',
    target: 'audience',
    positions: [1, 8, 15, 22],
    summary: '观众完成挑战，无奖励',
  },
  adventure: {
    name: '冒险事件轮盘',
    icon: '冒',
    color: '#EA580C',
    target: 'streamer',
    positions: [2, 9, 16, 23],
    summary: '主播即兴表演或扮演',
  },
  truth: {
    name: '真心话事件轮盘',
    icon: '真',
    color: '#DB2777',
    target: 'audience',
    positions: [3, 10, 17, 24],
    summary: '观众回答真心话',
  },
  special: {
    name: '特殊效果变化轮盘',
    icon: '效',
    color: '#0891B2',
    target: 'audience',
    positions: [4, 11, 18, 25],
    summary: '获得增益或移动效果',
  },
  figure: {
    name: '实体周边抽取轮盘',
    icon: '周',
    color: '#7C3AED',
    target: 'audience',
    positions: [5, 12, 19, 26],
    summary: '活动海报、双面折扇、双面抱枕三抽一',
  },
  chaos: {
    name: '混乱轮盘',
    icon: '混',
    color: '#4338CA',
    target: 'both',
    positions: [6, 13, 20, 27],
    summary: '从所有事件中随机抽取',
  },
};

function generateBoardPositions(): BoardPosition[] {
  const positions: BoardPosition[] = [];

  Object.entries(EVENT_CONFIGS).forEach(([type, config]) => {
    config.positions.forEach((positionIndex, eventIndex) => {
      const slot = BOARD_SLOTS[positionIndex];

      positions.push({
        id: positionIndex,
        index: positionIndex,
        type: type as BoardEventType,
        name: config.name,
        icon: config.icon,
        description: `${config.name} ${eventIndex + 1}/4`,
        target: config.target,
        coordinates: { x: slot.x, y: slot.y },
        bounds: {
          x: slot.x - slot.width / 2,
          y: slot.y - slot.height / 2,
          width: slot.width,
          height: slot.height,
        },
      });
    });
  });

  return positions.sort((a, b) => a.index - b.index);
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeBoardIndex(index: number): number {
  return ((Math.trunc(index) % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
}

function sanitizePlayer(player: Partial<PlayerState>, index: number): PlayerState {
  return {
    id: player.id || createId('player'),
    name: player.name?.trim() || `观众 ${index + 1}`,
    position: normalizeBoardIndex(player.position ?? 0),
    diceCount: Math.max(1, Math.min(player.diceCount ?? 1, 4)),
    moveDirection: player.moveDirection === -1 ? -1 : 1,
    isMoving: false,
    activeEffects: Array.isArray(player.activeEffects) ? player.activeEffects : [],
  };
}

function createPlayer(name: string, index = 0): PlayerState {
  return sanitizePlayer(
    {
      id: createId('player'),
      name: name.trim() || `观众 ${index + 1}`,
      position: 0,
      diceCount: 1,
      moveDirection: 1,
      activeEffects: [],
    },
    index
  );
}

function createDefaultPlayer(): PlayerState {
  return createPlayer('观众', 0);
}

function createArchive(name = '观众档案 1', players: PlayerState[] = [createDefaultPlayer()]): MonopolyArchive {
  const now = new Date().toISOString();
  const sanitizedPlayers = players.length > 0 ? players.map(sanitizePlayer) : [createDefaultPlayer()];

  return {
    id: createId('monopoly-archive'),
    name,
    players: sanitizedPlayers,
    currentPlayerIndex: 0,
    currentTurn: 0,
    logs: [],
    createdAt: now,
    updatedAt: now,
  };
}

function sanitizeArchive(archive: Partial<MonopolyArchive>, fallbackName = '观众档案'): MonopolyArchive {
  const now = new Date().toISOString();
  const players = Array.isArray(archive.players) && archive.players.length > 0
    ? archive.players.map(sanitizePlayer)
    : [createDefaultPlayer()];

  return {
    id: archive.id || createId('monopoly-archive'),
    name: archive.name?.trim() || fallbackName,
    players,
    currentPlayerIndex: Math.min(Math.max(archive.currentPlayerIndex ?? 0, 0), players.length - 1),
    currentTurn: Math.max(archive.currentTurn ?? 0, 0),
    logs: Array.isArray(archive.logs) ? archive.logs : [],
    createdAt: archive.createdAt || now,
    updatedAt: archive.updatedAt || now,
  };
}

function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function consumeEffect(effects: ActiveEffect[], type: ActiveEffect['type']): ActiveEffect[] {
  let consumed = false;

  return effects
    .map((effect) => {
      if (effect.type !== type || consumed) {
        return effect;
      }

      consumed = true;
      return { ...effect, remainingUses: effect.remainingUses - 1 };
    })
    .filter((effect) => effect.remainingUses > 0);
}

function appendMonopolyLogs(logs: MonopolyLogEntry[], entries: MonopolyLogEntry[]): MonopolyLogEntry[] {
  return [...entries, ...logs].slice(0, MAX_MONOPOLY_LOGS);
}

function createMonopolyLog(
  state: GameState,
  type: MonopolyLogEntry['type'],
  details: string,
  player = state.players[state.currentPlayerIndex]
): MonopolyLogEntry {
  const archive = state.archiveSlots.find((item) => item.id === state.currentArchiveId);

  return {
    id: createId('monopoly-log'),
    type,
    archiveId: state.currentArchiveId,
    archiveName: archive?.name || '观众档案',
    playerId: player?.id,
    playerName: player?.name,
    details,
    createdAt: new Date().toISOString(),
  };
}

function snapshotArchive(state: GameState, existing?: MonopolyArchive): MonopolyArchive {
  const now = new Date().toISOString();
  const players = state.players.length > 0 ? state.players.map(sanitizePlayer) : [createDefaultPlayer()];

  return {
    id: state.currentArchiveId,
    name: existing?.name || players[0]?.name || '观众档案',
    players,
    currentPlayerIndex: Math.min(Math.max(state.currentPlayerIndex, 0), players.length - 1),
    currentTurn: Math.max(state.currentTurn, 0),
    logs: state.logs,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function upsertCurrentArchive(state: GameState): MonopolyArchive[] {
  const archiveIndex = state.archiveSlots.findIndex((archive) => archive.id === state.currentArchiveId);
  const nextArchive = snapshotArchive(state, state.archiveSlots[archiveIndex]);

  if (archiveIndex === -1) {
    return [...state.archiveSlots, nextArchive];
  }

  return state.archiveSlots.map((archive, index) => (index === archiveIndex ? nextArchive : archive));
}

function buildArchiveState(archive: MonopolyArchive): Pick<
  GameState,
  | 'currentArchiveId'
  | 'archiveSlots'
  | 'currentPlayerIndex'
  | 'players'
  | 'currentTurn'
  | 'isRollingDice'
  | 'lastDiceResult'
  | 'lastDiceValues'
  | 'rollingDiceValues'
  | 'pendingEvent'
  | 'lastEffectMessage'
  | 'logs'
  | 'gamePhase'
> {
  return {
    currentArchiveId: archive.id,
    archiveSlots: [],
    currentPlayerIndex: Math.min(Math.max(archive.currentPlayerIndex, 0), archive.players.length - 1),
    players: archive.players.map(sanitizePlayer),
    currentTurn: archive.currentTurn,
    isRollingDice: false,
    lastDiceResult: null,
    lastDiceValues: [],
    rollingDiceValues: [],
    pendingEvent: null,
    lastEffectMessage: '',
    logs: archive.logs ?? [],
    gamePhase: 'waiting',
  };
}

function normalizePersistedState(value: unknown): Partial<MonopolyStore> {
  const persisted = value && typeof value === 'object' ? (value as Partial<MonopolyStore>) : {};

  if (Array.isArray(persisted.archiveSlots) && persisted.archiveSlots.length > 0) {
    const archiveSlots = persisted.archiveSlots.map((archive, index) =>
      sanitizeArchive(archive, `观众档案 ${index + 1}`)
    );
    const currentArchiveId = persisted.currentArchiveId || archiveSlots[0].id;
    const currentArchive = archiveSlots.find((archive) => archive.id === currentArchiveId) || archiveSlots[0];

    return {
      ...buildArchiveState(currentArchive),
      archiveSlots,
    };
  }

  if (Array.isArray(persisted.players) && persisted.players.length > 0) {
    const archive = createArchive('观众档案 1', persisted.players.map(sanitizePlayer));

    return {
      ...buildArchiveState(archive),
      archiveSlots: [archive],
    };
  }

  const archive = createArchive();

  return {
    ...buildArchiveState(archive),
    archiveSlots: [archive],
  };
}

function getMovementPath(start: number, steps: number): number[] {
  const absSteps = Math.abs(Math.trunc(steps));
  const direction = steps >= 0 ? 1 : -1;

  return Array.from({ length: absSteps }, (_, offset) => normalizeBoardIndex(start + (offset + 1) * direction));
}

interface MonopolyStore extends GameState {
  boardPositions: BoardPosition[];

  rollDice: () => Promise<number>;
  movePlayer: (steps: number) => void;
  movePlayerByEffect: (steps: number) => void;
  triggerEvent: (position: BoardPosition) => void;
  addPlayer: (name: string) => void;
  renamePlayer: (playerId: string, name: string) => void;
  removePlayer: (playerId: string) => void;
  setCurrentPlayer: (playerIndex: number) => void;
  importPlayers: (names: string[]) => void;
  createArchive: (name?: string) => string;
  switchArchive: (archiveId: string) => boolean;
  saveCurrentArchive: () => void;
  applyEffect: (effect: ActiveEffect) => void;
  setMoveDirection: (direction: 1 | -1) => void;
  continueCurrentTurn: () => void;
  nextTurn: () => void;
  resetGame: () => void;
  getPositionByIndex: (index: number) => BoardPosition | undefined;
}

const initialArchive = createArchive();

export const useMonopolyStore = create<MonopolyStore>()(
  persist(
    (set, get) => ({
      ...buildArchiveState(initialArchive),
      archiveSlots: [initialArchive],
      boardPositions: generateBoardPositions(),

      rollDice: async () => {
        const state = get();
        const player = state.players[state.currentPlayerIndex];
        const diceCount = Math.max(1, Math.min(player?.diceCount ?? 1, 4));
        const diceValues = Array.from({ length: diceCount }, rollSingleDie);
        const total = diceValues.reduce((sum, value) => sum + value, 0);

        set({
          isRollingDice: true,
          gamePhase: 'rolling',
          pendingEvent: null,
          lastDiceResult: null,
          lastEffectMessage: '',
          rollingDiceValues: diceValues,
        });

        await new Promise((resolve) => window.setTimeout(resolve, 1600));

        set((currentState) => {
          const currentPlayer = currentState.players[currentState.currentPlayerIndex];
          const nextPlayers = currentState.players.map((player, index) =>
            index === currentState.currentPlayerIndex
              ? {
                  ...player,
                  diceCount: 1,
                  moveDirection: 1 as const,
                  activeEffects: consumeEffect(
                    consumeEffect(player.activeEffects, 'extra_dice'),
                    'choose_direction'
                  ),
                }
              : player
          );
          const log = createMonopolyLog(
            currentState,
            'dice',
            `掷骰 ${diceValues.join(' + ')} = ${total}，移动方向：${currentPlayer?.moveDirection === -1 ? '后退' : '前进'}`,
            currentPlayer
          );
          const nextState = {
            ...currentState,
            isRollingDice: false,
            lastDiceResult: total,
            lastDiceValues: diceValues,
            rollingDiceValues: [],
            players: nextPlayers,
            logs: appendMonopolyLogs(currentState.logs, [log]),
          };

          return {
            isRollingDice: false,
            lastDiceResult: total,
            lastDiceValues: diceValues,
            rollingDiceValues: [],
            players: nextPlayers,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });

        return total;
      },

      movePlayer: (steps: number) => {
        const state = get();
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer) return;

        const playerId = currentPlayer.id;
        const oldPosition = currentPlayer.position;
        const traversedIndexes = getMovementPath(oldPosition, steps);
        const newPosition = traversedIndexes.at(-1) ?? oldPosition;
        const hasAutoLottery = currentPlayer.activeEffects.some((effect) => effect.type === 'auto_lottery');
        const autoLotteryPosition = hasAutoLottery
          ? traversedIndexes.map((index) => state.boardPositions[index]).find((position) => position?.type === 'lottery')
          : undefined;

        set({
          gamePhase: 'moving',
          players: state.players.map((player) => (player.id === playerId ? { ...player, isMoving: true } : player)),
        });

        traversedIndexes.forEach((positionIndex, stepIndex) => {
          window.setTimeout(() => {
            set((currentState) => ({
              players: currentState.players.map((player) =>
                player.id === playerId ? { ...player, position: positionIndex, isMoving: true } : player
              ),
            }));
          }, stepIndex * 260);
        });

        window.setTimeout(() => {
          set((currentState) => {
            const movedPlayer = currentState.players.find((player) => player.id === playerId);
            const nextPlayers = currentState.players.map((player) =>
              player.id === playerId
                ? {
                    ...player,
                    position: newPosition,
                    isMoving: false,
                    activeEffects: autoLotteryPosition
                      ? consumeEffect(player.activeEffects, 'auto_lottery')
                      : player.activeEffects,
                  }
                : player
            );
            const log = createMonopolyLog(
              currentState,
              'move',
              `从第 ${oldPosition + 1} 格移动到第 ${newPosition + 1} 格${autoLotteryPosition ? `，途经积分格第 ${autoLotteryPosition.index + 1} 格` : ''}`,
              movedPlayer
            );
            const nextState = {
              ...currentState,
              players: nextPlayers,
              logs: appendMonopolyLogs(currentState.logs, [log]),
            };

            return {
              players: nextPlayers,
              logs: nextState.logs,
              archiveSlots: upsertCurrentArchive(nextState),
            };
          });

          const targetPosition = autoLotteryPosition ?? get().boardPositions[newPosition];

          if (targetPosition) {
            get().triggerEvent(targetPosition);
          }
        }, Math.max(traversedIndexes.length, 1) * 260 + 180);
      },

      movePlayerByEffect: (steps: number) => {
        const state = get();
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer) return;

        const playerId = currentPlayer.id;
        const oldPosition = currentPlayer.position;
        const traversedIndexes = getMovementPath(oldPosition, steps);
        const newPosition = traversedIndexes.at(-1) ?? oldPosition;

        const effectMessage = `${currentPlayer.name} 触发效果：${steps > 0 ? `前进 ${steps} 格` : `后退 ${Math.abs(steps)} 格`}`;
        const nextPlayers = state.players.map((player) => (player.id === playerId ? { ...player, isMoving: true } : player));
        const effectMoveLog = createMonopolyLog(
          state,
          'effect',
          `${effectMessage}，第 ${oldPosition + 1} 格到第 ${newPosition + 1} 格`,
          currentPlayer
        );
        const nextState = {
          ...state,
          lastEffectMessage: effectMessage,
          players: nextPlayers,
          logs: appendMonopolyLogs(state.logs, [effectMoveLog]),
        };

        set({
          lastEffectMessage: nextState.lastEffectMessage,
          players: nextPlayers,
          logs: nextState.logs,
          archiveSlots: upsertCurrentArchive(nextState),
        });

        traversedIndexes.forEach((positionIndex, stepIndex) => {
          window.setTimeout(() => {
            set((currentState) => ({
              players: currentState.players.map((player) =>
                player.id === playerId ? { ...player, position: positionIndex, isMoving: true } : player
              ),
            }));
          }, stepIndex * 260);
        });

        window.setTimeout(() => {
          set((currentState) => {
            const finalPlayers = currentState.players.map((player) =>
              player.id === playerId ? { ...player, position: newPosition, isMoving: false } : player
            );
            const finalState = { ...currentState, players: finalPlayers };

            return {
              players: finalPlayers,
              archiveSlots: upsertCurrentArchive(finalState),
            };
          });
        }, Math.max(traversedIndexes.length, 1) * 260 + 180);
      },

      triggerEvent: (position: BoardPosition) => {
        const state = get();
        const currentPlayer = state.players[state.currentPlayerIndex];
        const hasMisfortuneImmunity =
          position.type === 'misfortune' &&
          currentPlayer?.activeEffects.some((effect) => effect.type === 'misfortune_immunity');

        if (hasMisfortuneImmunity && currentPlayer) {
          const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
          const nextPlayers = state.players.map((player) =>
            player.id === currentPlayer.id
              ? {
                  ...player,
                  isMoving: false,
                  activeEffects: consumeEffect(player.activeEffects, 'misfortune_immunity'),
                }
              : player
          );
          const log = createMonopolyLog(state, 'effect', `免疫厄运事件：${position.name}，回合结束`, currentPlayer);
          const nextState = {
            ...state,
            currentPlayerIndex: nextIndex,
            currentTurn: state.currentTurn + 1,
            pendingEvent: null,
            gamePhase: 'waiting' as const,
            lastEffectMessage: `${currentPlayer.name} 免疫了本次厄运事件，回合结束`,
            players: nextPlayers,
            logs: appendMonopolyLogs(state.logs, [log]),
          };

          set({
            currentPlayerIndex: nextIndex,
            currentTurn: state.currentTurn + 1,
            pendingEvent: null,
            gamePhase: 'waiting',
            lastEffectMessage: nextState.lastEffectMessage,
            players: nextPlayers,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          });
          return;
        }

        set((currentState) => {
          const eventPlayer = currentState.players[currentState.currentPlayerIndex];
          const nextPlayers = currentState.players.map((player, index) =>
            index === currentState.currentPlayerIndex ? { ...player, isMoving: false } : player
          );
          const log = createMonopolyLog(currentState, 'event', `触发事件：${position.name}（第 ${position.index + 1} 格）`, eventPlayer);
          const nextState = {
            ...currentState,
            gamePhase: 'event' as const,
            pendingEvent: {
              position,
              playerIndex: currentState.currentPlayerIndex,
            },
            players: nextPlayers,
            logs: appendMonopolyLogs(currentState.logs, [log]),
          };

          return {
            gamePhase: 'event',
            pendingEvent: nextState.pendingEvent,
            players: nextPlayers,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      addPlayer: (name: string) => {
        set((state) => {
          const nextPlayers = [...state.players, createPlayer(name, state.players.length)];
          const newPlayer = nextPlayers.at(-1);
          const log = createMonopolyLog(state, 'player', `添加观众：${newPlayer?.name ?? '新观众'}`, newPlayer);
          const nextState = {
            ...state,
            players: nextPlayers,
            lastEffectMessage: `已添加观众：${newPlayer?.name ?? '新观众'}`,
            logs: appendMonopolyLogs(state.logs, [log]),
          };

          return {
            players: nextPlayers,
            lastEffectMessage: nextState.lastEffectMessage,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      renamePlayer: (playerId: string, name: string) => {
        const nextName = name.trim().slice(0, 24);
        if (!nextName) return;

        set((state) => {
          const nextPlayers = state.players.map((player) =>
            player.id === playerId ? { ...player, name: nextName } : player
          );
          const renamedPlayer = nextPlayers.find((player) => player.id === playerId);
          const log = createMonopolyLog(state, 'player', `观众改名为：${nextName}`, renamedPlayer);
          const nextState = {
            ...state,
            players: nextPlayers,
            logs: appendMonopolyLogs(state.logs, [log]),
          };

          return {
            players: nextPlayers,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      removePlayer: (playerId: string) => {
        set((state) => {
          if (state.players.length <= 1) {
            return { lastEffectMessage: '至少需要保留一位观众' };
          }

          const nextPlayers = state.players.filter((player) => player.id !== playerId);
          const nextPlayerIndex = Math.min(state.currentPlayerIndex, nextPlayers.length - 1);
          const removedPlayer = state.players.find((player) => player.id === playerId);
          const log = createMonopolyLog(state, 'player', `删除观众：${removedPlayer?.name ?? playerId}`, removedPlayer);
          const nextState = {
            ...state,
            players: nextPlayers,
            currentPlayerIndex: nextPlayerIndex,
            pendingEvent: null,
            gamePhase: 'waiting' as const,
            logs: appendMonopolyLogs(state.logs, [log]),
          };

          return {
            players: nextPlayers,
            currentPlayerIndex: nextPlayerIndex,
            pendingEvent: null,
            gamePhase: 'waiting',
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      setCurrentPlayer: (playerIndex: number) => {
        set((state) => {
          const nextIndex = Math.min(Math.max(playerIndex, 0), state.players.length - 1);
          const nextState = {
            ...state,
            currentPlayerIndex: nextIndex,
            pendingEvent: null,
            gamePhase: 'waiting' as const,
            logs: appendMonopolyLogs(state.logs, [
              createMonopolyLog(state, 'turn', `切换当前观众：${state.players[nextIndex]?.name ?? nextIndex}`, state.players[nextIndex]),
            ]),
          };

          return {
            currentPlayerIndex: nextIndex,
            pendingEvent: null,
            gamePhase: 'waiting',
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      importPlayers: (names: string[]) => {
        const uniqueNames = Array.from(
          new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))
        ).slice(0, 24);

        if (uniqueNames.length === 0) return;

        set((state) => {
          const nextPlayers = uniqueNames.map((name, index) => createPlayer(name, index));
          const log = createMonopolyLog(state, 'player', `批量导入 ${nextPlayers.length} 位观众`);
          const nextState = {
            ...state,
            players: nextPlayers,
            currentPlayerIndex: 0,
            currentTurn: 0,
            pendingEvent: null,
            gamePhase: 'waiting' as const,
            lastEffectMessage: `已导入 ${nextPlayers.length} 位观众`,
            logs: appendMonopolyLogs(state.logs, [log]),
          };

          return {
            players: nextPlayers,
            currentPlayerIndex: 0,
            currentTurn: 0,
            pendingEvent: null,
            gamePhase: 'waiting',
            lastEffectMessage: nextState.lastEffectMessage,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      createArchive: (name?: string) => {
        const state = get();
        const savedArchiveSlots = upsertCurrentArchive(state);
        const archiveName = name?.trim() || `观众档案 ${savedArchiveSlots.length + 1}`;
        const archive = createArchive(archiveName, [createPlayer('观众', 0)]);
        archive.logs = [
          {
            id: createId('monopoly-log'),
            type: 'archive',
            archiveId: archive.id,
            archiveName,
            details: `新建观众档案：${archiveName}`,
            createdAt: new Date().toISOString(),
          },
        ];

        set({
          ...buildArchiveState(archive),
          archiveSlots: [...savedArchiveSlots, archive],
          boardPositions: state.boardPositions,
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
          ...buildArchiveState(targetArchive),
          archiveSlots: savedArchiveSlots,
          boardPositions: state.boardPositions,
        });

        return true;
      },

      saveCurrentArchive: () => {
        const state = get();
        const log = createMonopolyLog(state, 'archive', `保存观众档案：${state.archiveSlots.find((archive) => archive.id === state.currentArchiveId)?.name ?? '当前观众档案'}`);
        const nextState = {
          ...state,
          logs: appendMonopolyLogs(state.logs, [log]),
        };

        set({
          archiveSlots: upsertCurrentArchive(nextState),
          logs: nextState.logs,
          lastEffectMessage: `已保存 ${state.archiveSlots.find((archive) => archive.id === state.currentArchiveId)?.name ?? '当前观众档案'}`,
        });
      },

      applyEffect: (effect) => {
        set((state) => {
          const currentPlayer = state.players[state.currentPlayerIndex];
          const nextPlayers = state.players.map((player, index) => {
            if (index !== state.currentPlayerIndex) {
              return player;
            }

            const nextEffects =
              effect.type === 'extra_dice'
                ? [...player.activeEffects, effect]
                : [
                    ...player.activeEffects.filter((activeEffect) => activeEffect.type !== effect.type),
                    effect,
                  ];

            return {
              ...player,
              diceCount: effect.type === 'extra_dice' ? Math.min(player.diceCount + 1, 4) : player.diceCount,
              activeEffects: nextEffects,
            };
          });
          const nextState = {
            ...state,
            players: nextPlayers,
            lastEffectMessage: currentPlayer ? `${currentPlayer.name} 获得效果：${effect.description}` : effect.description,
            logs: appendMonopolyLogs(state.logs, [
              createMonopolyLog(state, 'effect', `获得效果：${effect.description}`, currentPlayer),
            ]),
          };

          return {
            players: nextPlayers,
            lastEffectMessage: nextState.lastEffectMessage,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      setMoveDirection: (direction) => {
        set((state) => {
          const nextPlayers = state.players.map((player, index) =>
            index === state.currentPlayerIndex ? { ...player, moveDirection: direction } : player
          );
          const currentPlayer = nextPlayers[state.currentPlayerIndex];
          const nextState = {
            ...state,
            players: nextPlayers,
            lastEffectMessage: `${currentPlayer?.name ?? '当前观众'} 下次移动方向：${direction === 1 ? '前进' : '后退'}`,
            logs: appendMonopolyLogs(state.logs, [
              createMonopolyLog(state, 'effect', `选择移动方向：${direction === 1 ? '前进' : '后退'}`, currentPlayer),
            ]),
          };

          return {
            players: nextPlayers,
            lastEffectMessage: nextState.lastEffectMessage,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      continueCurrentTurn: () => {
        set((state) => {
          const nextPlayers = state.players.map((player, index) =>
            index === state.currentPlayerIndex
              ? { ...player, activeEffects: consumeEffect(player.activeEffects, 'reroll') }
              : player
          );
          const currentPlayer = nextPlayers[state.currentPlayerIndex];
          const nextState = {
            ...state,
            players: nextPlayers,
            pendingEvent: null,
            gamePhase: 'waiting' as const,
            lastEffectMessage: `${currentPlayer?.name ?? '当前观众'} 获得再掷一次机会`,
            logs: appendMonopolyLogs(state.logs, [
              createMonopolyLog(state, 'effect', '再掷一次效果已执行，当前观众继续行动', currentPlayer),
            ]),
          };

          return {
            players: nextPlayers,
            pendingEvent: null,
            gamePhase: 'waiting',
            lastEffectMessage: nextState.lastEffectMessage,
            logs: nextState.logs,
            archiveSlots: upsertCurrentArchive(nextState),
          };
        });
      },

      nextTurn: () => {
        const state = get();
        const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
        const currentPlayer = state.players[state.currentPlayerIndex];
        const nextState = {
          ...state,
          currentPlayerIndex: nextIndex,
          currentTurn: state.currentTurn + 1,
          pendingEvent: null,
          gamePhase: 'waiting' as const,
          logs: appendMonopolyLogs(state.logs, [
            createMonopolyLog(state, 'turn', `结束回合，下一位：${state.players[nextIndex]?.name ?? nextIndex}`, currentPlayer),
          ]),
        };

        set({
          currentPlayerIndex: nextIndex,
          currentTurn: state.currentTurn + 1,
          pendingEvent: null,
          gamePhase: 'waiting',
          logs: nextState.logs,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      resetGame: () => {
        const state = get();
        const resetPlayers = state.players.length > 0
          ? state.players.map((player, index) => ({
              ...sanitizePlayer(player, index),
              position: 0,
              diceCount: 1,
              moveDirection: 1 as const,
              isMoving: false,
              activeEffects: [],
            }))
          : [createDefaultPlayer()];
        const nextState = {
          ...state,
          currentPlayerIndex: 0,
          players: resetPlayers,
          currentTurn: 0,
          isRollingDice: false,
          lastDiceResult: null,
          lastDiceValues: [],
          rollingDiceValues: [],
          pendingEvent: null,
          lastEffectMessage: '棋局已重置，观众名单已保留',
          gamePhase: 'waiting' as const,
          logs: appendMonopolyLogs(state.logs, [
            createMonopolyLog(state, 'reset', '棋局已重置，观众名单已保留'),
          ]),
        };

        set({
          currentPlayerIndex: 0,
          players: resetPlayers,
          currentTurn: 0,
          isRollingDice: false,
          lastDiceResult: null,
          lastDiceValues: [],
          rollingDiceValues: [],
          pendingEvent: null,
          lastEffectMessage: nextState.lastEffectMessage,
          gamePhase: 'waiting',
          logs: nextState.logs,
          archiveSlots: upsertCurrentArchive(nextState),
        });
      },

      getPositionByIndex: (index: number) => {
        return get().boardPositions.find((position) => position.index === normalizeBoardIndex(index));
      },
    }),
    {
      name: 'monopoly-audience-state',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => normalizePersistedState(persistedState),
      partialize: (state) => ({
        currentArchiveId: state.currentArchiveId,
        archiveSlots: upsertCurrentArchive(state),
        players: state.players,
        currentPlayerIndex: state.currentPlayerIndex,
        currentTurn: state.currentTurn,
        logs: state.logs,
      }),
    }
  )
);
