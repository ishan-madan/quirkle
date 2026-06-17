import { io, type Socket } from 'socket.io-client';
import type { Lobby, ServerError, ServerStateView } from '../types/multiplayer';

type ServerToClientEvents = {
  lobbyUpdated: (lobby: Lobby) => void;
  gameUpdate: (payload: { lobbyId: string; state: ServerStateView; message?: string }) => void;
  gameOver: (payload: { lobbyId: string; state: ServerStateView }) => void;
  serverError: (payload: ServerError) => void;
};

type ClientToServerEvents = {
  createLobby: (payload: { name?: string }, ack?: (response: { lobbyId: string; rejoinToken: string }) => void) => void;
  joinLobby: (payload: { lobbyId: string; rejoinToken?: string }, ack?: (response: { ok: true; rejoinToken: string }) => void) => void;
  leaveLobby: (payload: { lobbyId: string }, ack?: (response: { ok: true }) => void) => void;
  startGame: (payload: { lobbyId: string }, ack?: (response: { ok: true }) => void) => void;
  submitMove: (
    payload:
      | { lobbyId: string; kind: 'pass' }
      | { lobbyId: string; kind: 'place'; placements: Array<{ tileId: number; coordinate: string }> },
    ack?: (response: { ok: true }) => void
  ) => void;
  drawTiles: (payload: { lobbyId: string; tileIds: number[] }, ack?: (response: { ok: true }) => void) => void;
};

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function connectGameSocket({
  backendUrl,
  name,
  userId,
}: {
  backendUrl: string;
  name: string;
  userId: string;
}): GameSocket {
  return io(backendUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: { name, userId },
  });
}
