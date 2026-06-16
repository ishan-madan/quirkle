import type { GameEngine } from '@qwirkle/engine';

export type LobbyId = string;
export type UserId = string;

export interface LobbyPlayer {
  userId: UserId;
  socketId: string;
  name: string;
  joinedAt: number;
  connected: boolean;
}

export interface Lobby {
  id: LobbyId;
  hostUserId: UserId;
  players: LobbyPlayer[];
  createdAt: number;
  gameStarted: boolean;
}

export interface GameSession {
  lobbyId: LobbyId;
  engine: GameEngine;
  playerNumberByUserId: Map<UserId, number>;
  createdAt: number;
  persistedGameId?: string;
  dbUserIdByExternalUserId?: Map<UserId, string>;
  history: Array<{
    turnNumber: number;
    actorUserId: UserId | null;
    eventType: 'move_place' | 'move_pass' | 'draw_tiles' | 'system';
    payload: Record<string, unknown>;
    at: number;
  }>;
}
