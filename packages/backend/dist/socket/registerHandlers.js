import { checkRateLimit } from './middleware/rateLimit.js';
import { emitLobby, emitServerError, emitStateToLobby, toClientState } from './emitters.js';
import { config } from '../config.js';
import { createLobbySchema, drawTilesSchema, lobbyIdSchema, submitMoveSchema, } from './validators.js';
export function registerHandlers(io, socket, lobbyManager, sessionManager, socketsByUser, persistence) {
    socketsByUser.set(socket.data.user.userId, socket.id);
    const guard = (fn) => {
        if (!checkRateLimit(socket, config.maxEventsPerSecond)) {
            emitServerError(socket, 'RATE_LIMIT', 'Too many events. Slow down.');
            return;
        }
        Promise.resolve(fn()).catch((error) => {
            const message = error instanceof Error ? error.message : 'Unexpected server error';
            emitServerError(socket, 'BAD_REQUEST', message);
        });
    };
    socket.on('createLobby', (payload, ack) => guard(async () => {
        const parsed = createLobbySchema.parse(payload ?? {});
        const lobby = lobbyManager.createLobby({
            userId: socket.data.user.userId,
            socketId: socket.id,
            name: parsed.name?.trim() || socket.data.user.name,
            joinedAt: Date.now(),
            connected: true,
        });
        socket.join(lobby.id);
        emitLobby(io, lobby);
        ack?.({ lobbyId: lobby.id });
    }));
    socket.on('joinLobby', (payload, ack) => guard(() => {
        const parsed = lobbyIdSchema.parse(payload);
        const lobby = lobbyManager.joinLobby(parsed.lobbyId, {
            userId: socket.data.user.userId,
            socketId: socket.id,
            name: socket.data.user.name,
            joinedAt: Date.now(),
            connected: true,
        });
        socket.join(lobby.id);
        emitLobby(io, lobby);
        const session = sessionManager.getSession(parsed.lobbyId);
        if (session) {
            const rawState = session.engine.getGameState();
            const playerNumber = session.playerNumberByUserId.get(socket.data.user.userId);
            socket.emit('gameUpdate', {
                lobbyId: parsed.lobbyId,
                state: toClientState(rawState, playerNumber),
                message: 'Reconnected to game',
            });
        }
        ack?.({ ok: true });
    }));
    socket.on('leaveLobby', (payload, ack) => guard(() => {
        const parsed = lobbyIdSchema.parse(payload);
        socket.leave(parsed.lobbyId);
        const result = lobbyManager.leaveLobby(parsed.lobbyId, socket.data.user.userId);
        if (result.lobby) {
            emitLobby(io, result.lobby);
        }
        else if (result.deleted) {
            sessionManager.deleteSession(parsed.lobbyId);
        }
        ack?.({ ok: true });
    }));
    socket.on('startGame', (payload, ack) => guard(async () => {
        const parsed = lobbyIdSchema.parse(payload);
        const lobby = lobbyManager.getLobby(parsed.lobbyId);
        if (!lobby)
            throw new Error('Lobby not found');
        if (lobby.hostUserId !== socket.data.user.userId)
            throw new Error('Only host can start game');
        const session = sessionManager.createSession(lobby);
        if (persistence) {
            await persistence.onGameStarted(session, lobby);
        }
        lobbyManager.setGameStarted(parsed.lobbyId, true);
        emitLobby(io, { ...lobby, gameStarted: true });
        const rawState = session.engine.getGameState();
        emitStateToLobby(io, socketsByUser, lobby.id, rawState, session.playerNumberByUserId, 'Game started');
        ack?.({ ok: true });
    }));
    socket.on('submitMove', (payload, ack) => guard(async () => {
        const parsed = submitMoveSchema.parse(payload);
        const session = sessionManager.getSession(parsed.lobbyId);
        if (!session)
            throw new Error('Game session not found');
        const playerNumber = session.playerNumberByUserId.get(socket.data.user.userId);
        if (!playerNumber)
            throw new Error('You are not part of this game');
        const stateBefore = session.engine.getGameState();
        if (stateBefore.currentPlayerNumber !== playerNumber) {
            throw new Error('Not your turn');
        }
        let result;
        if (parsed.kind === 'pass') {
            result = session.engine.pass();
        }
        else {
            const placements = parsed.placements ?? [];
            if (placements.length === 0) {
                throw new Error('Place move requires at least one placement');
            }
            clearDraft(session.engine);
            for (const placement of placements) {
                session.engine.addTileToDraft(placement.tileId, placement.coordinate);
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
        emitStateToLobby(io, socketsByUser, parsed.lobbyId, stateAfter, session.playerNumberByUserId, parsed.kind === 'pass' ? 'Turn passed' : `Move accepted (+${result.score ?? 0})`);
        if (stateAfter.isGameOver) {
            const activeLobby = lobbyManager.getLobby(parsed.lobbyId);
            if (persistence && activeLobby) {
                await persistence.completeGame(session, activeLobby, stateAfter);
            }
            emitGameOver(io, socketsByUser, parsed.lobbyId, stateAfter, session.playerNumberByUserId);
        }
        ack?.({ ok: true });
    }));
    socket.on('drawTiles', (payload, ack) => guard(async () => {
        const parsed = drawTilesSchema.parse(payload);
        const session = sessionManager.getSession(parsed.lobbyId);
        if (!session)
            throw new Error('Game session not found');
        const playerNumber = session.playerNumberByUserId.get(socket.data.user.userId);
        if (!playerNumber)
            throw new Error('You are not part of this game');
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
        emitStateToLobby(io, socketsByUser, parsed.lobbyId, stateAfter, session.playerNumberByUserId, 'Tiles exchanged');
        if (stateAfter.isGameOver) {
            const activeLobby = lobbyManager.getLobby(parsed.lobbyId);
            if (persistence && activeLobby) {
                await persistence.completeGame(session, activeLobby, stateAfter);
            }
            emitGameOver(io, socketsByUser, parsed.lobbyId, stateAfter, session.playerNumberByUserId);
        }
        ack?.({ ok: true });
    }));
    socket.on('disconnect', () => {
        socketsByUser.delete(socket.data.user.userId);
        const touched = lobbyManager.markDisconnected(socket.data.user.userId);
        for (const lobby of touched) {
            emitLobby(io, lobby);
        }
    });
}
function clearDraft(engine) {
    while ((engine.getGameState().turnDraft?.placements.length ?? 0) > 0) {
        const undone = engine.undoLastPlacement();
        if (!undone)
            break;
    }
}
function emitGameOver(io, socketsByUser, lobbyId, state, playerNumberByUserId) {
    for (const [userId, playerNumber] of playerNumberByUserId) {
        const socketId = socketsByUser.get(userId);
        if (!socketId)
            continue;
        const view = toClientState(state, playerNumber);
        io.to(socketId).emit('gameOver', { lobbyId, state: view });
    }
}
