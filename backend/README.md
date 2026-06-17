# Qwirkle Multiplayer Backend

Node.js + Express + Socket.IO backend for multiplayer Qwirkle.

Now includes Supabase/PostgreSQL persistence for users, games, game history, player stats, and match results.

## Folder Structure

```text
packages/backend/
  src/
    config.ts
    index.ts
    api/
      persistenceRoutes.ts
    db/
      client.ts
      migrate.ts
      types.ts
      repositories/
        GameRepository.ts
        StatsRepository.ts
        UserRepository.ts
    game/
      GameSessionManager.ts
    lobby/
      LobbyManager.ts
    persistence/
      PersistenceService.ts
    socket/
      emitters.ts
      registerHandlers.ts
      middleware/
        authenticateSocket.ts
        rateLimit.ts
    types/
      domain.ts
      socket.ts
    utils/
      id.ts
  package.json
  tsconfig.json
  db/
    schema.sql
    migrations/
      001_initial_schema.sql
```

## Socket Events

Client -> Server:
- `createLobby`
- `joinLobby`
- `leaveLobby`
- `startGame`
- `submitMove`
- `drawTiles`

Server -> Client:
- `lobbyUpdated`
- `gameUpdate`
- `gameOver`
- `serverError`

## SQL Schema + Migrations

- Canonical schema: `db/schema.sql`
- Migration entrypoint: `db/migrations/001_initial_schema.sql`
- Migration runner: `npm run db:migrate`

Tables:
- `users`
- `games`
- `game_players`
- `game_history`
- `match_results`
- `player_statistics`

Indexes are included for:
- Recent/completed game queries
- Ranked history queries
- Per-player game lookups
- Turn-ordered history retrieval
- MMR leaderboard queries

## Architecture Notes

- Server authoritative state via in-memory `GameSessionManager`.
- Every move validated by `@qwirkle/engine` before commit.
- Per-player filtered state views prevent rack leakage.
- Socket middleware includes identity assignment + event rate limiting.
- Active games are in memory for low-latency play; completed games are persisted.
- Persistence is repository-based and fully typed in TypeScript.
- Completed games are saved automatically at `gameOver`.
- Move history is stored incrementally as `game_history` events.
- Player statistics are updated transactionally on game completion.
- Schema is prepared for future ranked matchmaking (`is_ranked`, `match_results`, MMR fields).

## REST API Integration

- `GET /api/users/:externalUserId/stats`
- `GET /api/games/:gameId`
- `GET /api/leaderboard?limit=50`

These routes read from PostgreSQL and return typed persistence-backed results.

## Environment

- `DATABASE_URL` or `SUPABASE_DB_URL` (required for persistence)
- `ENABLE_PERSISTENCE` (`true` by default)
- `PORT`
- `CORS_ORIGIN`
- `MAX_EVENTS_PER_SECOND`

## Run

```bash
cd packages/backend
npm install
npm run db:migrate
npm run dev
```

Build:

```bash
npm run build
npm start
```
