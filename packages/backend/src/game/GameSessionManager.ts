import { GameEngine } from '@qwirkle/engine';
import type { GameSession, Lobby, LobbyId, UserId } from '../types/domain.js';

export class GameSessionManager {
  private readonly sessions = new Map<LobbyId, GameSession>();

  createSession(lobby: Lobby): GameSession {
    if (lobby.players.length < 2) {
      throw new Error('At least 2 players are required to start a game');
    }

    const playerNames = lobby.players.map((p) => p.name);
    const playerCount = lobby.players.length as 2 | 3 | 4;

    const engine = new GameEngine({
      gameId: lobby.id,
      playerCount,
      playerNames,
    });
    engine.startGame(1);

    const playerNumberByUserId = new Map<UserId, number>();
    lobby.players.forEach((player, index) => {
      playerNumberByUserId.set(player.userId, index + 1);
    });

    const session: GameSession = {
      lobbyId: lobby.id,
      engine,
      playerNumberByUserId,
      createdAt: Date.now(),
      history: [],
    };

    this.sessions.set(lobby.id, session);
    return session;
  }

  getSession(lobbyId: LobbyId): GameSession | undefined {
    return this.sessions.get(lobbyId);
  }

  deleteSession(lobbyId: LobbyId): void {
    this.sessions.delete(lobbyId);
  }
}
