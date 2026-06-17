import type { Coordinate } from '@engine/types';

export interface LobbyPlayer {
  userId: string;
  socketId: string;
  name: string;
  joinedAt: number;
  connected: boolean;
}

export interface Lobby {
  id: string;
  hostUserId: string;
  players: LobbyPlayer[];
  createdAt: number;
  gameStarted: boolean;
}

export interface ServerPlayerState {
  playerNumber: number;
  name: string;
  score: number;
  rackCount: number;
  rack: Array<{ id: number; type: { color: string; shape: string } }>;
  isCurrent: boolean;
  connected: boolean;
}

export interface ServerStateView {
  gameId: string;
  phase: string;
  boardEntries: Array<[Coordinate, { id: number; type: { color: string; shape: string } }]>;
  currentPlayerNumber: number;
  turnNumber: number;
  bagCount: number;
  consecutivePasses: number;
  stalemateMode: boolean;
  turnDraft: {
    placements: Array<{ tileId: number; coordinate: Coordinate }>;
    lockedAxis: 'horizontal' | 'vertical' | null;
  } | null;
  isGameOver: boolean;
  winner?: number;
  isTied?: boolean;
  players: ServerPlayerState[];
  validTargets: Coordinate[];
}

export interface ServerError {
  code: string;
  message: string;
}
