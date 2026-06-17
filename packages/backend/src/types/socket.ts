import type { Coordinate, GameState } from '@qwirkle/engine';
import type { LobbyId, UserId } from './domain.js';

export interface SocketUser {
  userId: UserId;
  name: string;
}

export interface CreateLobbyPayload {
  name?: string;
}

export interface JoinLobbyPayload {
  lobbyId: LobbyId;
  rejoinToken?: string;
}

export interface LeaveLobbyPayload {
  lobbyId: LobbyId;
}

export interface StartGamePayload {
  lobbyId: LobbyId;
}

export interface SubmitMovePayload {
  lobbyId: LobbyId;
  kind: 'place' | 'pass';
  placements?: Array<{ tileId: number; coordinate: Coordinate }>;
}

export interface DrawTilesPayload {
  lobbyId: LobbyId;
  tileIds: number[];
}

export interface ClientLobbyPlayer {
  userId: UserId;
  socketId: string;
  name: string;
  joinedAt: number;
  connected: boolean;
}

export interface ClientLobby {
  id: LobbyId;
  hostUserId: UserId;
  players: ClientLobbyPlayer[];
  createdAt: number;
  gameStarted: boolean;
}

export interface ServerStateView extends Omit<GameState, 'players'> {
  boardEntries: Array<[Coordinate, { id: number; type: { color: string; shape: string } }]>;
  players: Array<{
    playerNumber: number;
    name: string;
    score: number;
    rackCount: number;
    rack: Array<{ id: number; type: { color: string; shape: string } }>;
    isCurrent: boolean;
    connected: boolean;
  }>;
  validTargets: Coordinate[];
}

export interface ServerToClientEvents {
  lobbyUpdated: (lobby: ClientLobby) => void;
  gameUpdate: (payload: { lobbyId: LobbyId; state: ServerStateView; message?: string }) => void;
  gameOver: (payload: { lobbyId: LobbyId; state: ServerStateView }) => void;
  serverError: (payload: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  createLobby: (payload: CreateLobbyPayload, ack?: (response: { lobbyId: LobbyId; rejoinToken: string }) => void) => void;
  joinLobby: (payload: JoinLobbyPayload, ack?: (response: { ok: true; rejoinToken: string }) => void) => void;
  leaveLobby: (payload: LeaveLobbyPayload, ack?: (response: { ok: true }) => void) => void;
  startGame: (payload: StartGamePayload, ack?: (response: { ok: true }) => void) => void;
  submitMove: (payload: SubmitMovePayload, ack?: (response: { ok: true }) => void) => void;
  drawTiles: (payload: DrawTilesPayload, ack?: (response: { ok: true }) => void) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user: SocketUser;
  rateState: {
    windowStartMs: number;
    count: number;
  };
}
