import type { Server, Socket } from 'socket.io';
import type { GameState } from '@quirkle/engine';
import type { Coordinate } from '@quirkle/engine';
import type {
  ClientToServerEvents,
  DrawTilesPayload,
  ServerToClientEvents,
  SocketData,
  StartGamePayload,
  SubmitMovePayload,
} from '../types/socket.js';
import type { InterServerEvents } from '../types/socket.js';
import { LobbyManager } from '../lobby/LobbyManager.js';
import { GameSessionManager } from '../game/GameSessionManager.js';
import { checkRateLimit } from './middleware/rateLimit.js';
import { emitLobby, emitServerError, emitStateToLobby, toClientState } from './emitters.js';
import { config } from '../config.js';
import type { PersistenceService } from '../persistence/PersistenceService.js';
import { makeRejoinToken } from '../utils/id.js';
import {
  createLobbySchema,
  drawTilesSchema,
  joinLobbySchema,
  lobbyIdSchema,
  submitMoveSchema,
} from './validators.js';

export function registerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  lobbyManager: LobbyManager,
  sessionManager: GameSessionManager,
  persistence: PersistenceService | null
): void {
  const guard = (fn: () => void | Promise<void>) => {
    if (!checkRateLimit(socket, config.maxEventsPerSecond)) {
      emitServerError(socket, 'RATE_LIMIT', 'Too many events. Slow down.');
      return;
    }

    Promise.resolve()
      .then(fn)
      .catch((error) => {
      const message = error instanceof Error ? error.message : 'Unexpected server error';
      emitServerError(socket, 'BAD_REQUEST', message);
      });
  };

  socket.on('createLobby', (payload, ack) =>
    guard(async () => {
      const parsed = createLobbySchema.parse(payload ?? {});
      const rejoinToken = makeRejoinToken();
      const lobby = lobbyManager.createLobby({
        userId: socket.data.user.userId,
        socketId: socket.id,
        name: parsed.name?.trim() || socket.data.user.name,
        joinedAt: Date.now(),
        connected: true,
        rejoinToken,
      });

      socket.join(lobby.id);
      emitLobby(io, lobby);
      ack?.({ lobbyId: lobby.id, rejoinToken });
    })
  );

  socket.on('joinLobby', (payload, ack) =>
    guard(() => {
      const parsed = joinLobbySchema.parse(payload);
      const lobbyId = parsed.lobbyId.toUpperCase();
      const { lobby, reclaimedUserId, rejoinToken } = lobbyManager.joinLobby(lobbyId, {
        userId: socket.data.user.userId,
        socketId: socket.id,
        name: socket.data.user.name,
        joinedAt: Date.now(),
        connected: true,
      }, parsed.rejoinToken);

      if (reclaimedUserId) {
        sessionManager.reassignPlayerUserId(lobbyId, reclaimedUserId, socket.data.user.userId);
      }

      socket.join(lobby.id);
      emitLobby(io, lobby);

      const session = sessionManager.getSession(lobbyId);
      if (session) {
        const rawState = session.engine.getGameState();
        const playerNumber = session.playerNumberByUserId.get(socket.data.user.userId);
        socket.emit('gameUpdate', {
          lobbyId,
          state: toClientState(rawState, playerNumber),
          message: 'Reconnected to game',
        });
      }

      ack?.({ ok: true, rejoinToken });
    })
  );

  socket.on('leaveLobby', (payload, ack) =>
    guard(() => {
      const parsed = lobbyIdSchema.parse(payload);
      const lobbyId = parsed.lobbyId.toUpperCase();
      socket.leave(lobbyId);

      const activeSession = sessionManager.getSession(lobbyId);
      if (activeSession) {
        const lobby = lobbyManager.disconnectPlayer(lobbyId, socket.data.user.userId);
        if (lobby) {
          emitLobby(io, lobby);
        }
        ack?.({ ok: true });
        return;
      }

      const result = lobbyManager.leaveLobby(lobbyId, socket.data.user.userId);
      if (result.lobby) {
        emitLobby(io, result.lobby);
      } else if (result.deleted) {
        sessionManager.deleteSession(lobbyId);
      }
      ack?.({ ok: true });
    })
  );

  socket.on('startGame', (payload: StartGamePayload, ack) =>
    guard(async () => {
      const parsed = lobbyIdSchema.parse(payload);
      const lobbyId = parsed.lobbyId.toUpperCase();
      const lobby = lobbyManager.getLobby(lobbyId);
      if (!lobby) throw new Error('Lobby not found');
      if (lobby.hostUserId !== socket.data.user.userId) throw new Error('Only host can start game');

      const session = sessionManager.createSession(lobby);
      if (persistence) {
        await persistence.onGameStarted(session, lobby);
      }
      lobbyManager.setGameStarted(lobbyId, true);
      emitLobby(io, { ...lobby, gameStarted: true });

      const rawState = session.engine.getGameState();
      await emitStateToLobby(
        io,
        lobby.id,
        rawState,
        session.playerNumberByUserId,
        'Game started'
      );

      ack?.({ ok: true });
    })
  );

  socket.on('submitMove', (payload: SubmitMovePayload, ack) =>
    guard(async () => {
      const parsed = submitMoveSchema.parse(payload);
      const lobbyId = parsed.lobbyId.toUpperCase();
      const session = sessionManager.getSession(lobbyId);
      if (!session) throw new Error('Game session not found');

      const playerNumber = session.playerNumberByUserId.get(socket.data.user.userId);
      if (!playerNumber) throw new Error('You are not part of this game');

      const stateBefore = session.engine.getGameState();
      if (stateBefore.currentPlayerNumber !== playerNumber) {
        throw new Error('Not your turn');
      }

      // eslint-disable-next-line no-console
      console.log(
        `[socket] submitMove lobby=${lobbyId} user=${socket.data.user.userId} player=${playerNumber} kind=${parsed.kind}`
      );

      let result;
      if (parsed.kind === 'pass') {
        result = session.engine.pass();
      } else {
        const placements = parsed.placements ?? [];
        if (placements.length === 0) {
          throw new Error('Place move requires at least one placement');
        }

        clearDraft(session.engine);
        for (const placement of placements) {
          session.engine.addTileToDraft(placement.tileId, placement.coordinate as Coordinate);
        }
        result = session.engine.commitMove();
      }

      if (!result.success) {
        clearDraft(session.engine);
        throw new Error(result.error ?? 'Move rejected');
      }

      session.history.push({
        turnNumber: stateBefore.turnNumber + 1,
        actorUserId: socket.data.user.userId,
        eventType: parsed.kind === 'pass' ? 'move_pass' : 'move_place',
        payload: parsed.kind === 'pass' ? { kind: 'pass' } : { placements: parsed.placements ?? [] },
        at: Date.now(),
      });

      if (persistence) {
        await persistence.appendSessionEvents(session);
      }

      const stateAfter = session.engine.getGameState();
      await emitStateToLobby(
        io,
        lobbyId,
        stateAfter,
        session.playerNumberByUserId,
        parsed.kind === 'pass' ? 'Turn passed' : `Move accepted (+${result.score ?? 0})`
      );

      if (stateAfter.isGameOver) {
        const activeLobby = lobbyManager.getLobby(lobbyId);
        if (persistence && activeLobby) {
          await persistence.completeGame(session, activeLobby, stateAfter);
        }
        emitGameOver(io, lobbyId, stateAfter, session.playerNumberByUserId);
      }

      ack?.({ ok: true });
    })
  );

  socket.on('drawTiles', (payload: DrawTilesPayload, ack) =>
    guard(async () => {
      const parsed = drawTilesSchema.parse(payload);
      const lobbyId = parsed.lobbyId.toUpperCase();
      const session = sessionManager.getSession(lobbyId);
      if (!session) throw new Error('Game session not found');

      const playerNumber = session.playerNumberByUserId.get(socket.data.user.userId);
      if (!playerNumber) throw new Error('You are not part of this game');

      const stateBefore = session.engine.getGameState();
      if (stateBefore.currentPlayerNumber !== playerNumber) {
        throw new Error('Not your turn');
      }

      const result = session.engine.exchangeTiles(parsed.tileIds);
      if (!result.success) {
        throw new Error(result.error ?? 'Could not draw/exchange tiles');
      }

      session.history.push({
        turnNumber: stateBefore.turnNumber + 1,
        actorUserId: socket.data.user.userId,
        eventType: 'draw_tiles',
        payload: { tileIds: parsed.tileIds },
        at: Date.now(),
      });

      if (persistence) {
        await persistence.appendSessionEvents(session);
      }

      const stateAfter = session.engine.getGameState();
      await emitStateToLobby(
        io,
        lobbyId,
        stateAfter,
        session.playerNumberByUserId,
        'Tiles exchanged'
      );

      if (stateAfter.isGameOver) {
        const activeLobby = lobbyManager.getLobby(lobbyId);
        if (persistence && activeLobby) {
          await persistence.completeGame(session, activeLobby, stateAfter);
        }
        emitGameOver(io, lobbyId, stateAfter, session.playerNumberByUserId);
      }

      ack?.({ ok: true });
    })
  );

  socket.on('disconnect', () => {
    const touched = lobbyManager.markDisconnected(socket.data.user.userId, socket.id);
    for (const lobby of touched) {
      emitLobby(io, lobby);
    }
  });
}

function clearDraft(engine: { getGameState: () => GameState; undoLastPlacement: () => boolean }): void {
  while ((engine.getGameState().turnDraft?.placements.length ?? 0) > 0) {
    const undone = engine.undoLastPlacement();
    if (!undone) break;
  }
}

function emitGameOver(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  lobbyId: string,
  state: GameState,
  playerNumberByUserId: Map<string, number>
): void {
  void io
    .in(lobbyId)
    .fetchSockets()
    .then((roomSockets) => {
      // eslint-disable-next-line no-console
      console.log(`[socket] gameOver emit lobby=${lobbyId} sockets=${roomSockets.length}`);

      for (const roomSocket of roomSockets) {
        const playerNumber = playerNumberByUserId.get(roomSocket.data.user.userId);
        if (!playerNumber) continue;

        const view = toClientState(state, playerNumber);
        io.to(roomSocket.id).emit('gameOver', { lobbyId, state: view });
      }
    });
}
