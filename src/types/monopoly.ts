export type BoardEventType =
  | 'misfortune'
  | 'adventure'
  | 'truth'
  | 'lottery'
  | 'special'
  | 'figure'
  | 'chaos';

export type EventTarget = 'audience' | 'streamer' | 'both';

export interface BoardPosition {
  id: number;
  index: number;
  type: BoardEventType;
  name: string;
  icon: string;
  description: string;
  target: EventTarget;
  coordinates: { x: number; y: number };
  bounds: { x: number; y: number; width: number; height: number };
}

export interface PlayerState {
  id: string;
  name: string;
  position: number;
  diceCount: number;
  moveDirection: 1 | -1;
  isMoving: boolean;
  activeEffects: ActiveEffect[];
}

export interface ActiveEffect {
  type: 'extra_dice' | 'auto_lottery' | 'reroll' | 'misfortune_immunity' | 'choose_direction';
  remainingUses: number;
  description: string;
}

export interface MonopolyLogEntry {
  id: string;
  type:
    | 'archive'
    | 'player'
    | 'dice'
    | 'move'
    | 'event'
    | 'effect'
    | 'turn'
    | 'reset';
  archiveId: string;
  archiveName: string;
  playerId?: string;
  playerName?: string;
  details: string;
  createdAt: string;
}

export interface MonopolyArchive {
  id: string;
  name: string;
  players: PlayerState[];
  currentPlayerIndex: number;
  currentTurn: number;
  logs: MonopolyLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface GameState {
  currentArchiveId: string;
  archiveSlots: MonopolyArchive[];
  currentPlayerIndex: number;
  players: PlayerState[];
  currentTurn: number;
  isRollingDice: boolean;
  lastDiceResult: number | null;
  lastDiceValues: number[];
  rollingDiceValues: number[];
  pendingEvent: PendingEvent | null;
  lastEffectMessage: string;
  logs: MonopolyLogEntry[];
  gamePhase: 'waiting' | 'rolling' | 'moving' | 'event' | 'completed';
}

export interface PendingEvent {
  position: BoardPosition;
  playerIndex: number;
}
