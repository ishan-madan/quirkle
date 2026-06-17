import type { Pool, PoolClient } from 'pg';
import type { DbPlayerStatistics } from '../types.js';

export class StatsRepository {
  constructor(private readonly pool: Pool) {}

  async applyCompletedGameStats(
    input: {
      isRanked: boolean;
      playerResults: Array<{ userId: string; score: number; didWin: boolean; didTie: boolean }>;
    },
    client?: PoolClient
  ): Promise<void> {
    const executor = client ?? this.pool;

    for (const result of input.playerResults) {
      const wins = result.didWin ? 1 : 0;
      const ties = result.didTie ? 1 : 0;
      const losses = result.didWin || result.didTie ? 0 : 1;
      const rankedGames = input.isRanked ? 1 : 0;
      const rankedWins = input.isRanked && result.didWin ? 1 : 0;

      await executor.query(
        `
        insert into player_statistics (
          user_id, games_played, wins, losses, ties, total_score, average_score, ranked_games, ranked_wins, updated_at
        )
        values ($1, 1, $2, $3, $4, $5, $5, $6, $7, now())
        on conflict (user_id)
        do update set
          games_played = player_statistics.games_played + 1,
          wins = player_statistics.wins + $2,
          losses = player_statistics.losses + $3,
          ties = player_statistics.ties + $4,
          total_score = player_statistics.total_score + $5,
          average_score = round(((player_statistics.total_score + $5)::numeric / (player_statistics.games_played + 1)), 2),
          ranked_games = player_statistics.ranked_games + $6,
          ranked_wins = player_statistics.ranked_wins + $7,
          updated_at = now()
        `,
        [result.userId, wins, losses, ties, result.score, rankedGames, rankedWins]
      );
    }
  }

  async getByUserId(userId: string): Promise<DbPlayerStatistics | null> {
    const { rows } = await this.pool.query<DbPlayerStatistics>(
      'select * from player_statistics where user_id = $1',
      [userId]
    );
    return rows[0] ?? null;
  }

  async getLeaderboard(limit = 50): Promise<DbPlayerStatistics[]> {
    const { rows } = await this.pool.query<DbPlayerStatistics>(
      `select * from player_statistics order by current_mmr desc, wins desc, games_played desc limit $1`,
      [limit]
    );
    return rows;
  }
}
