-- Quirkle backend schema for Supabase Postgres
-- Designed for multiplayer persistence, analytics, and future ranked matchmaking.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  external_user_id text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  lobby_id text not null,
  engine_game_id text not null,
  status text not null check (status in ('in_progress', 'completed', 'abandoned')),
  is_ranked boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  winner_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists games_engine_game_id_uq on games(engine_game_id);
create index if not exists games_completed_at_idx on games(completed_at desc);
create index if not exists games_ranked_completed_idx on games(is_ranked, completed_at desc);

create table if not exists game_players (
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references users(id) on delete restrict,
  player_number smallint not null,
  final_score integer not null default 0,
  placement smallint,
  mmr_before integer,
  mmr_after integer,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id),
  unique (game_id, player_number)
);

create index if not exists game_players_user_idx on game_players(user_id, game_id);

create table if not exists game_history (
  id bigserial primary key,
  game_id uuid not null references games(id) on delete cascade,
  turn_number integer not null,
  actor_user_id uuid references users(id),
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists game_history_game_turn_idx on game_history(game_id, turn_number, id);

create table if not exists match_results (
  game_id uuid primary key references games(id) on delete cascade,
  is_ranked boolean not null default false,
  result_type text not null check (result_type in ('win', 'tie', 'abandoned')),
  winner_user_id uuid references users(id),
  ended_at timestamptz not null default now()
);

create index if not exists match_results_ranked_idx on match_results(is_ranked, ended_at desc);

create table if not exists player_statistics (
  user_id uuid primary key references users(id) on delete cascade,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  ties integer not null default 0,
  total_score bigint not null default 0,
  average_score numeric(10,2) not null default 0,
  ranked_games integer not null default 0,
  ranked_wins integer not null default 0,
  current_mmr integer not null default 1200,
  highest_mmr integer not null default 1200,
  updated_at timestamptz not null default now()
);

create index if not exists player_statistics_mmr_idx on player_statistics(current_mmr desc);
