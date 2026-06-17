import type { Pool, PoolClient } from 'pg';
import type { DbGame, DbGameHistory, DbGamePlayer, PersistedGameSummary } from '../types.js';

export class GameRepository {
  constructor(private readonly pool: Pool) {}

  async createGame(
    input: {
      lobbyId: string;
      engineGameId: string;
      isRanked: boolean;
      players: Array<{ userId: string; playerNumber: number }>;
    },
    client?: PoolClient
  ): Promise<DbGame> {
    const executor = client ?? this.pool;

    const gameInsert = await executor.query<DbGame>(
      `
      insert into games (lobby_id, engine_game_id, status, is_ranked)
      values ($1, $2, 'in_progress', $3)
      returning *
      `,
      [input.lobbyId, input.engineGameId, input.isRanked]
    );

    const game = gameInsert.rows[0]!;

    for (const player of input.players) {
      await executor.query(
        `
        insert into game_players (game_id, user_id, player_number)
        values ($1, $2, $3)
        `,
        [game.id, player.userId, player.playerNumber]
      );
    }

    return game;
  }

  async appendHistory(
    gameId: string,
    event: {
      turnNumber: number;
      actorUserId: string | null;
      eventType: string;
      payload: Record<string, unknown>;
    },
    client?: PoolClient
  ): Promise<void> {
    const executor = client ?? this.pool;
    await executor.query(
      `
      insert into game_history (game_id, turn_number, actor_user_id, event_type, payload)
      values ($1, $2, $3, $4, $5::jsonb)
      `,
      [gameId, event.turnNumber, event.actorUserId, event.eventType, JSON.stringify(event.payload)]
    );
  }

  async completeGame(
    input: {
      gameId: string;
      isRanked: boolean;
      winnerUserId: string | null;
      isTie: boolean;
      playerResults: Array<{ userId: string; score: number; placement: number | null }>;
    },
    client?: PoolClient
  ): Promise<void> {
    const executor = client ?? this.pool;

    await executor.query(
      `
      update games
      set status = 'completed',
          completed_at = now(),
          winner_user_id = $2
      where id = $1
      `,
      [input.gameId, input.winnerUserId]
    );

    await executor.query(
      `
      insert into match_results (game_id, is_ranked, result_type, winner_user_id)
      values ($1, $2, $3, $4)
      on conflict (game_id)
      do update set
        is_ranked = excluded.is_ranked,
        result_type = excluded.result_type,
        winner_user_id = excluded.winner_user_id,
        ended_at = now()
      `,
      [input.gameId, input.isRanked, input.isTie ? 'tie' : 'win', input.winnerUserId]
    );

    for (const player of input.playerResults) {
      await executor.query(
        `
        update game_players
        set final_score = $3,
            placement = $4
        where game_id = $1 and user_id = $2
        `,
        [input.gameId, player.userId, player.score, player.placement]
      );
    }
  }

  async getGameSummary(gameId: string): Promise<PersistedGameSummary | null> {
    const gameRows = await this.pool.query<DbGame>('select * from games where id = $1', [gameId]);
    if (gameRows.rowCount === 0) return null;

    const playersRows = await this.pool.query<DbGamePlayer>(
      'select * from game_players where game_id = $1 order by player_number asc',
      [gameId]
    );

    const historyRows = await this.pool.query<DbGameHistory>(
      'select * from game_history where game_id = $1 order by turn_number asc, id asc',
      [gameId]
    );

    return {
      game: gameRows.rows[0]!,
      players: playersRows.rows,
      history: historyRows.rows,
    };
  }
}
