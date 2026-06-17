import type { Lobby, LobbyId, LobbyPlayer, UserId } from '../types/domain.js';
import { makeLobbyId, makeRejoinToken } from '../utils/id.js';

export class LobbyManager {
  private readonly lobbies = new Map<LobbyId, Lobby>();

  createLobby(host: LobbyPlayer): Lobby {
    const lobby: Lobby = {
      id: makeLobbyId(),
      hostUserId: host.userId,
      players: [host],
      createdAt: Date.now(),
      gameStarted: false,
    };
    this.lobbies.set(lobby.id, lobby);
    return lobby;
  }

  getLobby(lobbyId: LobbyId): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  listLobbies(): Lobby[] {
    return Array.from(this.lobbies.values());
  }

  joinLobby(
    lobbyId: LobbyId,
    player: Omit<LobbyPlayer, 'rejoinToken'>,
    rejoinToken?: string
  ): { lobby: Lobby; rejoinToken: string; reclaimedUserId?: UserId } {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) throw new Error('Lobby not found');

    const existing = lobby.players.find((p) => p.userId === player.userId);
    if (existing) {
      existing.socketId = player.socketId;
      existing.name = player.name;
      existing.connected = true;
      return { lobby, rejoinToken: existing.rejoinToken };
    }

    const reclaimable = rejoinToken
      ? lobby.players.find(
          (existingPlayer) => !existingPlayer.connected && existingPlayer.rejoinToken === rejoinToken
        )
      : undefined;
    if (reclaimable) {
      const previousUserId = reclaimable.userId;
      reclaimable.userId = player.userId;
      reclaimable.socketId = player.socketId;
      reclaimable.name = player.name;
      reclaimable.connected = true;

      if (lobby.hostUserId === previousUserId) {
        lobby.hostUserId = player.userId;
      }

      return { lobby, rejoinToken: reclaimable.rejoinToken, reclaimedUserId: previousUserId };
    }

    if (lobby.gameStarted) throw new Error('Game already started');
    if (lobby.players.length >= 4) throw new Error('Lobby is full');

    const nextPlayer: LobbyPlayer = {
      ...player,
      rejoinToken: rejoinToken ?? makeRejoinToken(),
    };

    lobby.players.push(nextPlayer);
    return { lobby, rejoinToken: nextPlayer.rejoinToken };
  }

  markDisconnected(userId: UserId): Lobby[] {
    const touched: Lobby[] = [];
    for (const lobby of this.lobbies.values()) {
      const player = lobby.players.find((p) => p.userId === userId);
      if (!player) continue;
      player.connected = false;
      player.socketId = '';
      touched.push(lobby);
    }
    return touched;
  }

  leaveLobby(lobbyId: LobbyId, userId: UserId): { deleted: boolean; lobby?: Lobby } {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { deleted: false };

    lobby.players = lobby.players.filter((p) => p.userId !== userId);

    if (lobby.players.length === 0) {
      this.lobbies.delete(lobbyId);
      return { deleted: true };
    }

    if (lobby.hostUserId === userId) {
      lobby.hostUserId = lobby.players[0]!.userId;
    }

    return { deleted: false, lobby };
  }

  disconnectPlayer(lobbyId: LobbyId, userId: UserId): Lobby | undefined {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    const player = lobby.players.find((entry) => entry.userId === userId);
    if (!player) return lobby;

    player.connected = false;
    player.socketId = '';
    return lobby;
  }

  setGameStarted(lobbyId: LobbyId, gameStarted: boolean): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) throw new Error('Lobby not found');
    lobby.gameStarted = gameStarted;
  }
}
