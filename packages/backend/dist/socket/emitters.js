import { Board, MoveValidator } from '@quirkle/engine';
export function toClientState(raw, userPlayerNumber) {
    const players = Array.from(raw.players.values()).map((player) => {
        const isSelf = userPlayerNumber !== undefined && userPlayerNumber === player.playerNumber;
        return {
            playerNumber: player.playerNumber,
            name: player.name,
            score: player.score,
            rackCount: player.rack.length,
            rack: isSelf ? player.rack.map((tile) => ({ id: tile.id, type: tile.type })) : [],
            isCurrent: player.playerNumber === raw.currentPlayerNumber,
            connected: true,
        };
    });
    const validTargets = computeValidTargets(raw, userPlayerNumber);
    return {
        gameId: raw.gameId,
        phase: raw.phase,
        board: raw.board,
        boardEntries: Array.from(raw.board.entries()).map(([coord, tile]) => [
            coord,
            { id: tile.id, type: { color: tile.type.color, shape: tile.type.shape } },
        ]),
        currentPlayerNumber: raw.currentPlayerNumber,
        turnNumber: raw.turnNumber,
        bagCount: raw.bagCount,
        consecutivePasses: raw.consecutivePasses,
        stalemateMode: raw.stalemateMode,
        turnDraft: raw.turnDraft,
        isGameOver: raw.isGameOver,
        ...(raw.winner !== undefined ? { winner: raw.winner } : {}),
        ...(raw.isTied !== undefined ? { isTied: raw.isTied } : {}),
        players,
        validTargets,
    };
}
function computeValidTargets(raw, userPlayerNumber) {
    if (userPlayerNumber === undefined || userPlayerNumber !== raw.currentPlayerNumber) {
        return [];
    }
    const currentPlayer = raw.players.get(userPlayerNumber);
    if (!currentPlayer)
        return [];
    const placements = raw.turnDraft?.placements ?? [];
    const placedIds = new Set(placements.map((p) => p.tileId));
    const availableTiles = currentPlayer.rack.filter((tile) => !placedIds.has(tile.id));
    if (availableTiles.length === 0)
        return [];
    const board = new Board(raw.board);
    const occupied = new Set(raw.board.keys());
    for (const placement of placements)
        occupied.add(placement.coordinate);
    const candidates = new Set();
    if (occupied.size === 0) {
        candidates.add('0,0');
    }
    else {
        for (const coord of occupied) {
            const [xPart, yPart] = coord.split(',');
            const x = Number(xPart);
            const y = Number(yPart);
            candidates.add(`${x + 1},${y}`);
            candidates.add(`${x - 1},${y}`);
            candidates.add(`${x},${y + 1}`);
            candidates.add(`${x},${y - 1}`);
        }
    }
    const valid = [];
    for (const candidate of candidates) {
        if (occupied.has(candidate))
            continue;
        let canPlace = false;
        for (const tile of availableTiles) {
            const tentative = [...placements, { tileId: tile.id, coordinate: candidate }];
            const error = MoveValidator.validatePlacement(tentative, currentPlayer.rack, board, raw.board.size === 0);
            if (!error) {
                canPlace = true;
                break;
            }
        }
        if (canPlace)
            valid.push(candidate);
    }
    return valid;
}
export function emitLobby(io, lobby) {
    io.to(lobby.id).emit('lobbyUpdated', toClientLobby(lobby));
}
function toClientLobby(lobby) {
    return {
        id: lobby.id,
        hostUserId: lobby.hostUserId,
        createdAt: lobby.createdAt,
        gameStarted: lobby.gameStarted,
        players: lobby.players.map((player) => ({
            userId: player.userId,
            socketId: player.socketId,
            name: player.name,
            joinedAt: player.joinedAt,
            connected: player.connected,
        })),
    };
}
export function emitStateToLobby(io, lobbyId, state, playerNumberByUserId, message) {
    return io
        .in(lobbyId)
        .fetchSockets()
        .then((roomSockets) => {
        // eslint-disable-next-line no-console
        console.log(`[socket] gameUpdate emit lobby=${lobbyId} sockets=${roomSockets.length} turn=${state.turnNumber}`);
        for (const roomSocket of roomSockets) {
            const userId = roomSocket.data.user.userId;
            const userPlayerNumber = playerNumberByUserId.get(userId);
            if (!userPlayerNumber)
                continue;
            const view = toClientState(state, userPlayerNumber);
            io.to(roomSocket.id).emit('gameUpdate', {
                lobbyId,
                state: view,
                ...(message !== undefined ? { message } : {}),
            });
        }
    });
}
export function emitServerError(socket, code, message) {
    socket.emit('serverError', { code, message });
}
