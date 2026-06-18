# Quirkle Multiplayer Backend

Server-authoritative multiplayer backend built with Node.js, Express, Socket.IO, and PostgreSQL.

## What This Service Owns

- Lobby lifecycle (create, join, leave, host start).
- Authoritative in-memory game sessions per lobby.
- Move submission and validation via @quirkle/engine.
- Hidden-information transport (players only receive their own rack).
- Reconnection support with per-player rejoin tokens.
- Optional persistence for users, games, history, and leaderboard stats.

## Project Structure

```text
packages/backend/
  src/
    index.ts                     # Express + Socket.IO server bootstrap
    config.ts                    # Environment configuration
    api/persistenceRoutes.ts     # REST endpoints for persisted data
    db/
      client.ts                  # pg Pool creation
      migrate.ts                 # SQL migration runner
      types.ts                   # Persistence-layer row types
      repositories/
        UserRepository.ts
        GameRepository.ts
        StatsRepository.ts
    game/GameSessionManager.ts   # Active game session orchestration
    lobby/LobbyManager.ts        # In-memory lobby management
    persistence/PersistenceService.ts
    socket/
      registerHandlers.ts        # Socket event handlers
      emitters.ts                # Filtered per-player emits
      validators.ts              # zod payload validation
      middleware/
        authenticateSocket.ts
        rateLimit.ts
    types/
      domain.ts
      socket.ts
    utils/id.ts
  db/
    schema.sql
    migrations/
      001_initial_schema.sql
```

## Runtime Behavior

- First player is selected server-side at random when a game session starts.
- Moves are accepted only from the active player.
- Pass is supported as an explicit turn action.
- Tile exchange is allowed only when the bag contains at least as many tiles as requested.
- Rate limiting is enforced per socket event window.

## Socket Events

Client -> server:

- createLobby: payload { name?: string }
- joinLobby: payload { lobbyId: string, rejoinToken?: string }
- leaveLobby: payload { lobbyId: string }
- startGame: payload { lobbyId: string }
- submitMove: payload { lobbyId: string, kind: 'place' | 'pass', placements?: [{ tileId, coordinate }] }
- drawTiles: payload { lobbyId: string, tileIds: number[] }

Server -> client:

- lobbyUpdated: full lobby snapshot
- gameUpdate: filtered player view + optional status message
- gameOver: filtered final state
- serverError: structured error payload { code, message }

## REST Endpoints (Persistence)

- GET /health
- GET /api/users/:externalUserId/stats
- GET /api/games/:gameId
- GET /api/leaderboard?limit=50

When persistence is disabled or no database URL is configured, /api/* persistence routes return 503.

## Database and Migrations

- Canonical schema: db/schema.sql
- Migration files: db/migrations/*.sql
- Migration command: npm run db:migrate

Primary tables:

- users
- games
- game_players
- game_history
- match_results
- player_statistics

## Environment Variables

- DATABASE_URL: Postgres connection string.
- SUPABASE_DB_URL: fallback if DATABASE_URL is unset.
- ENABLE_PERSISTENCE: defaults to true; set false to run without DB writes.
- PORT: defaults to 4000.
- CORS_ORIGIN: defaults to http://localhost:5173.
- MAX_EVENTS_PER_SECOND: defaults to 20.

## Scripts

- npm run dev: start with tsx watch.
- npm run build: compile TypeScript.
- npm start: run built output from dist.
- npm run db:migrate: apply pending SQL migrations.

## Local Development

```bash
cd packages/backend
npm install
npm run db:migrate
npm run dev
```

For production-style execution:

```bash
npm run build
npm start
```
