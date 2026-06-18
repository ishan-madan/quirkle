import type { Pool } from 'pg';
import type { GameState } from '@quirkle/engine';
import type { GameSession, Lobby } from '../types/domain.js';
import { UserRepository } from '../db/repositories/UserRepository.js';
import { GameRepository } from '../db/repositories/GameRepository.js';
import { StatsRepository } from '../db/repositories/StatsRepository.js';

export class PersistenceService {
  private readonly users: UserRepository;
  private readonly games: GameRepository;
  private readonly stats: StatsRepository;

  constructor(private readonly pool: Pool) {
    this.users = new UserRepository(pool);
    this.games = new GameRepository(pool);
    this.stats = new StatsRepository(pool);
  }

  async onGameStarted(session: GameSession, lobby: Lobby): Promise<void> {
    if (session.persistedGameId) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('begin');

      const userIdByExternal = new Map<string, string>();
      for (const player of lobby.players) {
        const user = await this.users.upsertByExternalId(player.userId, player.name, client);
        userIdByExternal.set(player.userId, user.id);
      }

      const players = lobby.players.map((player, index) => {
        const dbUserId = userIdByExternal.get(player.userId);
        if (!dbUserId) {
          throw new Error(`Missing database user mapping for ${player.userId}`);
        }
        return {
          userId: dbUserId,
          playerNumber: index + 1,
        };
      });

      const game = await this.games.createGame(
        {
          lobbyId: lobby.id,
          engineGameId: session.engine.getGameState().gameId,
          isRanked: false,
          players,
        },
        client
      );

      session.persistedGameId = game.id;
      session.dbUserIdByExternalUserId = userIdByExternal;

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async appendSessionEvents(session: GameSession): Promise<void> {
    if (!session.persistedGameId || session.history.length === 0) {
      return;
    }

    const pending = [...session.history];
    session.history = [];

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      for (const entry of pending) {
        const actorDbUserId = entry.actorUserId
          ? (session.dbUserIdByExternalUserId?.get(entry.actorUserId) ?? null)
          : null;
        await this.games.appendHistory(
          session.persistedGameId,
          {
            turnNumber: entry.turnNumber,
            actorUserId: actorDbUserId,
            eventType: entry.eventType,
            payload: entry.payload,
          },
          client
        );
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      session.history.unshift(...pending);
      throw error;
    } finally {
      client.release();
    }
  }

  async completeGame(session: GameSession, lobby: Lobby, state: GameState): Promise<void> {
    if (!session.persistedGameId) {
      return;
    }

    await this.appendSessionEvents(session);

    const client = await this.pool.connect();
    try {
      await client.query('begin');

      const dbUserByExternal = new Map<string, string>();
      for (const lobbyPlayer of lobby.players) {
        const user = await this.users.upsertByExternalId(lobbyPlayer.userId, lobbyPlayer.name, client);
        dbUserByExternal.set(lobbyPlayer.userId, user.id);
      }
      session.dbUserIdByExternalUserId = dbUserByExternal;

      const externalByPlayerNumber = new Map<number, string>();
      for (const [externalUserId, playerNumber] of session.playerNumberByUserId) {
        externalByPlayerNumber.set(playerNumber, externalUserId);
      }

      const winnerExternal = state.winner ? externalByPlayerNumber.get(state.winner) ?? null : null;
      const winnerDb = winnerExternal ? dbUserByExternal.get(winnerExternal) ?? null : null;

      const sortedPlayers = [...state.players.values()].sort((a, b) => b.score - a.score);
      const placementByPlayerNumber = new Map<number, number>();
      sortedPlayers.forEach((player, index) => {
        placementByPlayerNumber.set(player.playerNumber, index + 1);
      });

      const results = [...state.players.values()].map((player) => {
        const externalUserId = externalByPlayerNumber.get(player.playerNumber);
        if (!externalUserId) {
          throw new Error(`Missing external user for player number ${player.playerNumber}`);
        }

        const dbUserId = dbUserByExternal.get(externalUserId);
        if (!dbUserId) {
          throw new Error(`Missing db user mapping for ${externalUserId}`);
        }

        const didWin = !state.isTied && state.winner === player.playerNumber;
        const didTie = Boolean(state.isTied);

        return {
          externalUserId,
          userId: dbUserId,
          playerNumber: player.playerNumber,
          score: player.score,
          didWin,
          didTie,
          placement: placementByPlayerNumber.get(player.playerNumber) ?? null,
        };
      });

      await this.games.completeGame(
        {
          gameId: session.persistedGameId,
          isRanked: false,
          winnerUserId: winnerDb,
          isTie: Boolean(state.isTied),
          playerResults: results.map((r) => ({
            userId: r.userId,
            score: r.score,
            placement: r.placement,
          })),
        },
        client
      );

      await this.stats.applyCompletedGameStats(
        {
          isRanked: false,
          playerResults: results.map((r) => ({
            userId: r.userId,
            score: r.score,
            didWin: r.didWin,
            didTie: r.didTie,
          })),
        },
        client
      );

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserStatsByExternalUserId(externalUserId: string) {
    const user = await this.users.getByExternalId(externalUserId);
    if (!user) return null;
    const stats = await this.stats.getByUserId(user.id);
    return { user, stats };
  }

  async getLeaderboard(limit = 50) {
    return this.stats.getLeaderboard(limit);
  }

  async getGameSummary(gameId: string) {
    return this.games.getGameSummary(gameId);
  }

}
