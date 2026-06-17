export interface DbUser {
  id: string;
  external_user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface DbGame {
  id: string;
  lobby_id: string;
  engine_game_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  is_ranked: boolean;
  started_at: string;
  completed_at: string | null;
  winner_user_id: string | null;
  created_at: string;
}

export interface DbGamePlayer {
  game_id: string;
  user_id: string;
  player_number: number;
  final_score: number;
  placement: number | null;
  mmr_before: number | null;
  mmr_after: number | null;
  created_at: string;
}

export interface DbGameHistory {
  id: number;
  game_id: string;
  turn_number: number;
  actor_user_id: string | null;
  event_type: string;
  payload: unknown;
  created_at: string;
}

export interface DbPlayerStatistics {
  user_id: string;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  total_score: string;
  average_score: string;
  ranked_games: number;
  ranked_wins: number;
  current_mmr: number;
  highest_mmr: number;
  updated_at: string;
}

export interface CompletedPlayerResult {
  externalUserId: string;
  playerNumber: number;
  score: number;
  didWin: boolean;
  didTie: boolean;
}

export interface PersistedGameSummary {
  game: DbGame;
  players: DbGamePlayer[];
  history: DbGameHistory[];
}
