# Qwirkle Multiplayer Web Clone – Architecture Design

This document specifies the complete architecture for a multiplayer web-based Qwirkle implementation.

**Tech Stack:**
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + Socket.IO
- Database: PostgreSQL (Supabase)
- Game Engine: Pure TypeScript (from README.md specification)

---

## 1. Folder Structure

```
quirkle-web/
├── packages/
│   ├── common/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── tile.ts
│   │   │   │   ├── board.ts
│   │   │   │   ├── game.ts
│   │   │   │   ├── socket-events.ts
│   │   │   │   └── api.ts
│   │   │   ├── constants/
│   │   │   │   ├── colors.ts
│   │   │   │   ├── shapes.ts
│   │   │   │   └── tile-set.ts
│   │   │   └── utils/
│   │   │       ├── coordinate.ts
│   │   │       └── validation.ts
│   │   └── package.json
│   │
│   ├── engine/
│   │   ├── src/
│   │   │   ├── tile/
│   │   │   │   ├── TileType.ts
│   │   │   │   ├── TileInstance.ts
│   │   │   │   └── TileSet.ts
│   │   │   ├── board/
│   │   │   │   ├── Board.ts
│   │   │   │   ├── LineValidator.ts
│   │   │   │   └── MoveValidator.ts
│   │   │   ├── scoring/
│   │   │   │   ├── Scorer.ts
│   │   │   │   └── LineScorer.ts
│   │   │   ├── turn/
│   │   │   │   ├── TurnDraft.ts
│   │   │   │   └── TurnProcessor.ts
│   │   │   ├── game/
│   │   │   │   ├── GameEngine.ts
│   │   │   │   ├── GameState.ts
│   │   │   │   └── StateMachine.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── board.test.ts
│   │   │   ├── line-validation.test.ts
│   │   │   ├── move-validation.test.ts
│   │   │   ├── scoring.test.ts
│   │   │   ├── end-game.test.ts
│   │   │   └── integration.test.ts
│   │   └── package.json
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── supabase.ts
│   │   │   │   ├── migrations/
│   │   │   │   │   ├── 001_init_schema.sql
│   │   │   │   │   ├── 002_add_game_events.sql
│   │   │   │   │   └── 003_add_indexes.sql
│   │   │   │   └── schema.ts
│   │   │   ├── services/
│   │   │   │   ├── GameService.ts
│   │   │   │   ├── LobbyService.ts
│   │   │   │   ├── PlayerService.ts
│   │   │   │   ├── SessionService.ts
│   │   │   │   └── NotificationService.ts
│   │   │   ├── socket/
│   │   │   │   ├── SocketManager.ts
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── LobbyHandlers.ts
│   │   │   │   │   ├── GameHandlers.ts
│   │   │   │   │   ├── DisconnectionHandlers.ts
│   │   │   │   │   └── SyncHandlers.ts
│   │   │   │   └── middleware/
│   │   │   │       ├── AuthMiddleware.ts
│   │   │   │       └── RateLimitMiddleware.ts
│   │   │   ├── api/
│   │   │   │   ├── routes/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── lobby.ts
│   │   │   │   │   ├── game.ts
│   │   │   │   │   ├── player.ts
│   │   │   │   │   └── health.ts
│   │   │   │   └── middleware/
│   │   │   │       ├── errorHandler.ts
│   │   │   │       └── requestLogger.ts
│   │   │   ├── config/
│   │   │   │   ├── environment.ts
│   │   │   │   └── constants.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── errors.ts
│   │   │   │   └── code-generator.ts
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── __tests__/
│   │   │   ├── integration/
│   │   │   └── unit/
│   │   └── package.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Header.tsx
│       │   │   │   ├── Footer.tsx
│       │   │   │   └── MainLayout.tsx
│       │   │   ├── lobby/
│       │   │   │   ├── LobbyView.tsx
│       │   │   │   ├── CreateLobbyModal.tsx
│       │   │   │   ├── JoinLobbyModal.tsx
│       │   │   │   ├── LobbyWaitingRoom.tsx
│       │   │   │   └── LobbyPlayerList.tsx
│       │   │   ├── game/
│       │   │   │   ├── GameView.tsx
│       │   │   │   ├── Board.tsx
│       │   │   │   ├── Rack.tsx
│       │   │   │   ├── TurnDraftPreview.tsx
│       │   │   │   ├── TilePreview.tsx
│       │   │   │   ├── ActionPanel.tsx
│       │   │   │   ├── TurnIndicator.tsx
│       │   │   │   ├── ScoreBoard.tsx
│       │   │   │   └── GameOver.tsx
│       │   │   ├── common/
│       │   │   │   ├── Tile.tsx
│       │   │   │   ├── Modal.tsx
│       │   │   │   ├── Button.tsx
│       │   │   │   ├── Toast.tsx
│       │   │   │   └── LoadingSpinner.tsx
│       │   ├── hooks/
│       │   │   ├── useSocket.ts
│       │   │   ├── useGame.ts
│       │   │   ├── usePlayerState.ts
│       │   │   ├── useLocalStorage.ts
│       │   │   └── useTurnDraft.ts
│       │   ├── context/
│       │   │   ├── SocketContext.tsx
│       │   │   ├── GameContext.tsx
│       │   │   ├── AuthContext.tsx
│       │   │   └── NotificationContext.tsx
│       │   ├── services/
│       │   │   ├── api.ts
│       │   │   ├── socket-client.ts
│       │   │   └── game-client.ts
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   ├── Game.tsx
│       │   │   ├── Reconnect.tsx
│       │   │   └── NotFound.tsx
│       │   ├── styles/
│       │   │   ├── globals.css
│       │   │   ├── variables.css
│       │   │   └── utilities.css
│       │   ├── types/
│       │   │   ├── ui.ts
│       │   │   └── state.ts
│       │   ├── utils/
│       │   │   ├── colors.ts
│       │   │   ├── coordinate-to-pixel.ts
│       │   │   └── format.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       │   └── index.html
│       ├── tailwind.config.js
│       └── package.json
│
├── docker-compose.yml
├── .env.example
├── README.md
├── DESIGN.md
├── ARCHITECTURE.md (this file)
└── package.json (monorepo root)
```

---

## 2. Database Schema

### PostgreSQL Schema (Supabase)

```sql
-- Accounts and Authentication
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (for reconnection and anonymous play)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW()
);

-- Lobbies (rooms waiting for players to join)
CREATE TABLE lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_code VARCHAR(8) UNIQUE NOT NULL, -- 6-8 char alphanumeric
    creator_id UUID NOT NULL REFERENCES sessions(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, started, closed
    max_players INT DEFAULT 4,
    is_private BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    closed_at TIMESTAMP,
    UNIQUE(lobby_code, status)
);

-- Lobby Memberships
CREATE TABLE lobby_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    ready BOOLEAN DEFAULT FALSE,
    UNIQUE(lobby_id, session_id)
);

-- Games (individual game instances)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'starting', -- starting, in_progress, finished
    current_player_id UUID,
    first_player_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    winner_id UUID,
    is_tied BOOLEAN DEFAULT FALSE,
    UNIQUE(lobby_id) -- one active game per lobby
);

-- Game Players (roster for a specific game)
CREATE TABLE game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_number INT NOT NULL, -- 1, 2, 3, or 4
    seat_order INT NOT NULL,
    score INT DEFAULT 0,
    rack JSONB NOT NULL, -- Array of TileInstance IDs
    is_active BOOLEAN DEFAULT TRUE,
    disconnected_at TIMESTAMP,
    reconnected_at TIMESTAMP,
    UNIQUE(game_id, player_number),
    UNIQUE(game_id, session_id)
);

-- Game State Snapshots (persisted after each move)
CREATE TABLE game_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    turn_number INT NOT NULL,
    current_player_number INT NOT NULL,
    board_state JSONB NOT NULL, -- Sparse coordinate map
    bag_count INT NOT NULL,
    scores JSONB NOT NULL, -- { playerNumber: score }
    consecutive_passes INT DEFAULT 0,
    stalemate_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(game_id, turn_number)
);

-- Game Moves (log of all actions)
CREATE TABLE game_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    turn_number INT NOT NULL,
    player_number INT NOT NULL,
    move_type VARCHAR(20) NOT NULL, -- place, exchange, pass
    move_data JSONB, -- Placement coordinates, exchanged tiles, etc.
    score_change INT DEFAULT 0,
    valid BOOLEAN NOT NULL,
    rejection_reason VARCHAR(255), -- if invalid
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lobbies_code ON lobbies(lobby_code);
CREATE INDEX idx_lobbies_status ON lobbies(status);
CREATE INDEX idx_lobbies_creator ON lobbies(creator_id);
CREATE INDEX idx_lobby_members_lobby ON lobby_members(lobby_id);
CREATE INDEX idx_lobby_members_session ON lobby_members(session_id);
CREATE INDEX idx_games_lobby ON games(lobby_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_session ON game_players(session_id);
CREATE INDEX idx_game_snapshots_game ON game_snapshots(game_id);
CREATE INDEX idx_game_snapshots_turn ON game_snapshots(game_id, turn_number);
CREATE INDEX idx_game_moves_game ON game_moves(game_id);
CREATE INDEX idx_game_moves_turn ON game_moves(game_id, turn_number);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**Key Design Decisions:**
- `lobbies` uses short alphanumeric codes (6-8 chars) for easy sharing
- `game_snapshots` stores board state as JSONB for quick recovery and replay
- `game_moves` log all actions for audit and debugging
- Session-based authentication (not just account-based) to support anonymous play
- Soft deletes via status flags rather than hard deletes for audit trail

---

## 3. Socket.IO Event Design

### Event Categories

#### 3.1 Lobby Events

**Client → Server:**
```
lobby:create
  Input: { playerName: string, maxPlayers: 2 | 3 | 4 }
  Response: { lobbyCode: string, lobbyId: UUID }

lobby:join
  Input: { lobbyCode: string, playerName: string }
  Response: { success: boolean, lobbyId: UUID, error?: string }

lobby:leave
  Input: { lobbyId: UUID }
  Response: { success: boolean }

lobby:ready
  Input: { lobbyId: UUID }
  Response: { success: boolean }

lobby:start
  Input: { lobbyId: UUID } (creator only)
  Response: { success: boolean, gameId: UUID, error?: string }

lobby:list-members
  Input: { lobbyId: UUID }
  Response: { members: LobbyMember[] }
```

**Server → Client (Broadcast to lobby):**
```
lobby:member-joined
  { member: LobbyMember, count: number }

lobby:member-left
  { memberId: UUID, count: number }

lobby:member-ready
  { memberId: UUID, allReady: boolean }

lobby:member-disconnected
  { memberId: UUID, timeout: number }

lobby:starting
  { gameId: UUID, firstPlayerId: UUID, players: GamePlayer[] }

lobby:error
  { code: string, message: string }
```

#### 3.2 Game Events

**Client → Server:**
```
game:place-tiles
  Input: { gameId: UUID, placements: Placement[] }
  Response: { success: boolean, score?: number, error?: string }

game:exchange-tiles
  Input: { gameId: UUID, tileIds: number[] }
  Response: { success: boolean, newTiles?: TileInstance[], error?: string }

game:pass
  Input: { gameId: UUID }
  Response: { success: boolean, error?: string }

game:undo-placement
  Input: { gameId: UUID }
  Response: { success: boolean, error?: string }

game:confirm-move
  Input: { gameId: UUID }
  Response: { success: boolean, nextPlayerId: UUID, error?: string }

game:request-state
  Input: { gameId: UUID }
  Response: { gameState: GameState }

game:resign
  Input: { gameId: UUID }
  Response: { success: boolean }
```

**Server → Client (Broadcast to game):**
```
game:state-updated
  { gameState: GameState, updatedAt: timestamp }

game:move-applied
  { playerId: UUID, moveType: string, score: number, boardDelta: object }

game:turn-changed
  { currentPlayerId: UUID, playerName: string }

game:game-over
  { winner: UUID, scores: { playerId: score }, isTied: boolean }

game:player-disconnected
  { playerId: UUID, reconnectTimeout: number }

game:player-reconnected
  { playerId: UUID, draft: TurnDraft | null }

game:sync-required
  { reason: string } (client should request full state)

game:error
  { code: string, message: string }
```

#### 3.3 Sync & Reconnection Events

**Client → Server:**
```
sync:request-full-state
  Input: { gameId: UUID }
  Response: { gameState: GameState }

sync:acknowledge
  Input: { gameId: UUID, lastEventId: UUID }
  Response: { acknowledged: boolean }

reconnect:rejoin-lobby
  Input: { lobbyCode: string, sessionToken: string }
  Response: { success: boolean, lobbyId: UUID, lobbyState: LobbyState }

reconnect:rejoin-game
  Input: { gameId: UUID, sessionToken: string }
  Response: { success: boolean, gameState: GameState, yourPlayerId: UUID }
```

**Server → Client:**
```
sync:state-snapshot
  { gameState: GameState, snapshotId: UUID, timestamp: timestamp }

reconnect:welcome-back
  { previouslyConnected: boolean, draft: TurnDraft | null }
```

---

## 4. TypeScript Interfaces

### Common Types (packages/common/src/types)

```typescript
// tile.ts
export enum Color {
  Red = 'red',
  Orange = 'orange',
  Yellow = 'yellow',
  Green = 'green',
  Blue = 'blue',
  Purple = 'purple',
}

export enum Shape {
  Circle = 'circle',
  Square = 'square',
  Diamond = 'diamond',
  Star = 'star',
  Clover = 'clover',
  Cross = 'cross',
}

export interface TileType {
  color: Color;
  shape: Shape;
}

export interface TileInstance {
  id: number; // 1-108
  type: TileType;
}

// board.ts
export type Coordinate = `${number},${number}`;

export interface Board {
  tiles: Map<Coordinate, TileInstance>;
}

export interface Position {
  x: number;
  y: number;
}

// game.ts
export enum GameState {
  Lobby = 'lobby',
  WaitingForPlayers = 'waiting_for_players',
  Starting = 'starting',
  PlayerTurn = 'player_turn',
  TileExchange = 'tile_exchange',
  GameOver = 'game_over',
}

export interface GamePlayer {
  id: UUID;
  sessionId: UUID;
  playerNumber: number;
  name: string;
  score: number;
  rack: TileInstance[];
  isActive: boolean;
  isConnected: boolean;
}

export interface TurnDraft {
  placements: Placement[];
  lockedAxis: 'horizontal' | 'vertical' | null;
}

export interface Placement {
  tileId: number;
  coordinate: Coordinate;
}

export interface GameStateSnapshot {
  gameId: UUID;
  status: GameState;
  board: Board;
  players: GamePlayer[];
  currentPlayerNumber: number;
  bagCount: number;
  turnNumber: number;
  turnDraft: TurnDraft | null; // Only for current player
  consecutivePasses: number;
  stalemateMode: boolean;
}

export interface MoveResult {
  success: boolean;
  score?: number;
  scoreBreakdown?: { line: TileInstance[], points: number }[];
  error?: string;
  rejectionCode?: string;
}

// socket-events.ts
export interface SocketEventPayload<T> {
  type: string;
  data: T;
  timestamp: number;
  userId: UUID;
}

// api.ts
export interface CreateLobbyRequest {
  playerName: string;
  maxPlayers: 2 | 3 | 4;
}

export interface JoinLobbyRequest {
  lobbyCode: string;
  playerName: string;
}

export interface AuthResponse {
  sessionToken: string;
  sessionId: UUID;
  expiresIn: number;
}
```

---

## 5. Game State Representation

### Backend Game State Service

```typescript
// Backend maintains the authoritative game state
interface AuthoritativeGameState {
  gameId: UUID;
  status: GameState;
  
  // Committed board (immutable between turns)
  board: Board;
  
  // Players in this game
  players: Map<number, GamePlayer>; // playerNumber -> player
  
  // Current turn info
  currentPlayerNumber: number;
  turnNumber: number;
  
  // Bag (hidden from clients)
  bag: TileInstance[];
  
  // Endgame tracking
  consecutivePasses: number;
  stalemateMode: boolean;
  
  // Active turn draft (for current player only)
  currentDraft: TurnDraft | null;
}

// Per-client filtered state (what to send to clients)
interface ClientGameState {
  gameId: UUID;
  status: GameState;
  board: Board;
  
  // All players (names, scores, rack counts)
  players: ClientGamePlayer[];
  
  // Your own rack (full details)
  // Other players' racks (only count, not contents)
  
  currentPlayerNumber: number;
  currentPlayerName: string;
  yourPlayerNumber: number;
  
  turnNumber: number;
  bagCount: number; // Not exact count, but whether bag is empty
  
  // Your turn draft (not visible to others)
  yourDraft: TurnDraft | null;
  
  consecutivePasses: number;
  stalemateMode: boolean;
}
```

### Frontend State Management (React Context + Hooks)

```typescript
// Context for shared state
interface GameContextState {
  gameState: ClientGameState | null;
  isLoading: boolean;
  error: string | null;
  
  localDraft: TurnDraft | null; // Client-side preview
  draftValidationErrors: string[];
}

// Custom hooks
// useGame() – subscribes to game state updates
// useTurnDraft() – manages local draft state
// useSocket() – Socket.IO connection management
// usePlayerState() – tracks current player's information
```

---

## 6. API Endpoints

### REST API (Express)

#### Authentication
```
POST /api/auth/login
  { username: string, password: string }
  → { sessionToken, sessionId, expiresIn }

POST /api/auth/register
  { username: string, email: string, password: string }
  → { sessionToken, sessionId, expiresIn }

POST /api/auth/anonymous
  {}
  → { sessionToken, sessionId, expiresIn }

POST /api/auth/logout
  { sessionToken: string }
  → { success: boolean }
```

#### Lobby Management
```
GET /api/lobbies
  (Query: ?status=waiting)
  → { lobbies: Lobby[] }

POST /api/lobbies
  { playerName: string, maxPlayers: 2 | 3 | 4 }
  → { lobbyCode: string, lobbyId: UUID }

GET /api/lobbies/:code
  → { lobby: Lobby, members: LobbyMember[] }

POST /api/lobbies/:code/join
  { playerName: string }
  → { lobbyId: UUID, success: boolean }

POST /api/lobbies/:code/leave
  → { success: boolean }

POST /api/lobbies/:code/ready
  → { success: boolean }

POST /api/lobbies/:code/start (creator only)
  → { gameId: UUID, success: boolean }
```

#### Game Management
```
GET /api/games/:gameId
  → { gameState: GameState }

GET /api/games/:gameId/history
  → { moves: GameMove[] }

GET /api/games/:gameId/replay
  → { snapshots: GameSnapshot[] }

POST /api/games/:gameId/stats
  → { stats: GameStats }
```

#### Player Profile
```
GET /api/players/me
  → { player: PlayerProfile }

GET /api/players/:playerId/stats
  → { stats: PlayerStats }

PUT /api/players/me
  { name?: string, preferences?: object }
  → { player: PlayerProfile }
```

#### Health & Status
```
GET /api/health
  → { status: 'ok', uptime: number }

GET /api/status
  → { database: 'ok' | 'error', redis: 'ok' | 'error', ... }
```

### WebSocket (Socket.IO) Events

[See Section 3 above]

---

## 7. Game State Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ CREATE LOBBY (Optional)                                 │
│ - Create room, get lobbyCode                            │
│ - Generate 6-8 char alphanumeric code                   │
│ - Set max_players, creator_id                           │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ JOIN LOBBY                                              │
│ - Players join using lobbyCode                          │
│ - Socket.IO rooms group players                         │
│ - Real-time member list broadcast                       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ WAITING ROOM                                            │
│ - Minimum 2 players to start                            │
│ - Players click "ready"                                 │
│ - Creator clicks "start" when ready                     │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ GAME INITIALIZATION                                     │
│ - Shuffle bag, deal 6 tiles to each player             │
│ - Select first player (random)                          │
│ - Initialize board (empty)                              │
│ - Set all scores to 0                                   │
│ - Snapshot turn 0                                       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ PLAYER TURN (Repeat until game over)                    │
│                                                         │
│ 1. DRAFT PHASE (Client-side preview)                   │
│    - Player drags tiles onto board                      │
│    - Client validates locally (no server call yet)      │
│    - TurnDraft state accumulated                        │
│                                                         │
│ 2. COMMIT PHASE                                         │
│    - Player clicks "confirm move"                       │
│    - Placements sent to server                          │
│    - Server authoritative validation (16-step)          │
│    - Score computed                                     │
│    - Board updated                                      │
│    - Rack refilled from bag                             │
│                                                         │
│ 3. END-OF-TURN PROCESSING                              │
│    - Check game-over conditions:                        │
│      a) Rack empty + bag empty → END GAME              │
│      b) Pass + bag empty:                              │
│         - consecutivePasses++                           │
│         - If consecutivePasses == playerCount: END     │
│      c) Exchange: reset consecutivePasses              │
│      d) Place: reset consecutivePasses                 │
│    - Advance to next player                             │
│    - Snapshot turn N                                    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ GAME OVER                                               │
│ - Calculate final scores                                │
│ - Award rack-empty bonus (if applicable)                │
│ - Determine winner or tie                               │
│ - Show results view                                     │
│ - Option to rematch or return to lobby                  │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Recommended Implementation Order

### Phase 1: Foundation (Weeks 1-2)

1. **Setup Monorepo**
   - Initialize pnpm workspaces
   - Configure TypeScript
   - Set up build pipeline

2. **Implement Core Game Engine** (`packages/engine`)
   - Tile definitions and constants
   - Board representation (sparse coordinate map)
   - Line validation algorithm
   - Move validation (16-step)
   - Scoring engine
   - TurnDraft system
   - Full unit test coverage (100 test cases from README)

3. **Database Schema & Migrations**
   - Set up Supabase project
   - Run migrations
   - Create indexes

### Phase 2: Backend Services (Weeks 3-4)

4. **Game Service Layer**
   - GameService (orchestration)
   - LobbyService (room management)
   - PlayerService (session management)
   - SessionService (auth tokens)

5. **Express API**
   - Auth endpoints (login, register, anonymous)
   - Lobby endpoints (create, join, list, start)
   - Health check endpoint
   - Error handling middleware

6. **Socket.IO Integration**
   - SocketManager setup
   - Lobby event handlers
   - Authentication middleware
   - Connection/disconnection logic

### Phase 3: Game Server Logic (Weeks 5-6)

7. **Game Event Handlers**
   - Place tiles handler
   - Exchange tiles handler
   - Pass handler
   - Undo placement handler
   - Confirm move handler

8. **State Synchronization**
   - State filtering (what clients see)
   - Broadcast logic
   - Reconnection recovery
   - Conflict resolution

9. **Persistence**
   - Game snapshots (after each turn)
   - Move logging
   - State recovery from DB

### Phase 4: Frontend UI (Weeks 7-9)

10. **React Setup & Infrastructure**
    - Create React app
    - Tailwind CSS setup
    - Context API setup
    - Custom hooks

11. **Lobby UI**
    - Create lobby modal
    - Join lobby modal
    - Waiting room
    - Member list
    - Ready button
    - Start game button

12. **Game Board & UI**
    - Board visualization
    - Tile rendering
    - Rack display
    - Drag-and-drop for tiles
    - Turn indicator
    - Score board

13. **Game Interactions**
    - Place tiles flow
    - Exchange flow
    - Pass action
    - Undo draft
    - Confirm move

14. **Responsive Design**
    - Mobile-first approach
    - Touch support
    - Breakpoints (sm, md, lg, xl)

### Phase 5: Polish & Deployment (Weeks 10-11)

15. **Error Handling & UX**
    - Toast notifications
    - Error messages
    - Loading states
    - Reconnection UI

16. **Testing**
    - Integration tests (API + Socket)
    - End-to-end tests
    - Performance testing

17. **Deployment**
    - Docker containerization
    - GitHub Actions CI/CD
    - Deploy to staging
    - Deploy to production

### Phase 6: Future Extensions (Post-MVP)

18. **Accounts & Profiles**
    - User registration
    - Player profiles
    - Match history
    - Stats tracking

19. **Ranked Matchmaking**
    - ELO rating system
    - Skill-based matching
    - Leaderboards

20. **Admin Panel**
    - Monitor active games
    - Debug tools
    - Analytics

---

## 9. Key Architecture Decisions & Rationales

### 1. Server-Authoritative Game State
**Decision:** All game logic executes on the server. Clients send actions; server validates and broadcasts results.

**Rationale:**
- Prevents cheating (impossible for client to modify board state)
- Single source of truth for game state
- Easier to audit and replay games
- Matches README.md specification design

### 2. Socket.IO for Real-Time Multiplayer
**Decision:** Use Socket.IO for bidirectional, low-latency communication.

**Rationale:**
- Real-time turn-based gameplay requires instant feedback
- Automatic reconnection handling
- Room-based broadcasting (all players in a lobby/game)
- Works across proxies and firewalls

### 3. Sparse Board Representation
**Decision:** Board stored as `Map<Coordinate, TileInstance>` (only occupied cells).

**Rationale:**
- Infinite unbounded board (no artificial limits)
- Memory efficient
- Natural fit for coordinate system
- Matches README.md specification

### 4. Session-Based Authentication (Not Just Accounts)
**Decision:** Support both registered users and anonymous sessions.

**Rationale:**
- Lower barrier to entry (play immediately as anonymous)
- Supports future account linking
- Tracks reconnection via session tokens
- Enables multiple tabs/browsers to play different games

### 5. Game Snapshots After Each Turn
**Decision:** Store full board state + metadata after each committed move.

**Rationale:**
- Fast reconnection (send latest snapshot, not full replay)
- Replay/audit capability
- Debugging and dispute resolution
- Quick "rewind" for admin functions

### 6. Monorepo with Shared Types
**Decision:** `packages/common` exports types used by backend and frontend.

**Rationale:**
- Single source of truth for interfaces
- Prevents type drift between client and server
- Easier refactoring
- Type-safe API contracts

### 7. Separate Game Engine from Services
**Decision:** `packages/engine` contains pure game logic; `packages/backend` orchestrates.

**Rationale:**
- Engine is fully testable without network/database
- Engine is UI-agnostic and networking-agnostic
- Reusable (could be exported to npm)
- Follows single responsibility principle

### 8. React Context + Hooks
**Decision:** Use React Context for game state; custom hooks for side effects.

**Rationale:**
- Lightweight state management (no Redux/Zustand needed for MVP)
- Easy to understand and maintain
- Enables incremental adoption
- Sufficient for small number of concurrent games per client

### 9. Tailwind CSS for Styling
**Decision:** Utility-first CSS framework.

**Rationale:**
- Rapid development
- Responsive design built-in
- Easy theming
- Small bundle size

### 10. PostgreSQL (Supabase) for Persistence
**Decision:** Relational database with Supabase managed hosting.

**Rationale:**
- JSONB support for complex nested data (board state, moves)
- Excellent for transactional consistency
- Supabase provides realtime subscriptions (future enhancement)
- Easy backups and disaster recovery

---

## 10. Deployment Architecture

```
┌─────────────────────────────────────────┐
│        Vercel (Frontend)                │
│ - React + Tailwind + Socket.IO client   │
│ - Auto-deployed from GitHub             │
│ - CDN globally distributed              │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS + WSS
               │
┌──────────────▼──────────────────────────┐
│    Docker Container (Backend)           │
│  Deployed on AWS ECS / Railway / Fly    │
│  - Node.js + Express + Socket.IO server │
│  - Auto-scaling based on connections   │
│  - Load balancer for multiple instances │
└──────────────┬──────────────────────────┘
               │
               │ PostgreSQL driver
               │
┌──────────────▼──────────────────────────┐
│  Supabase (PostgreSQL Database)         │
│  - Managed PostgreSQL instance          │
│  - Automated backups                    │
│  - Connection pooling                   │
│  - Realtime subscriptions (future)      │
└─────────────────────────────────────────┘
```

---

## 11. Security Considerations

1. **Authentication**
   - Session tokens (JWT) with expiration
   - HTTPS/WSS enforced
   - CORS properly configured

2. **Authorization**
   - Verify player belongs to game before accepting moves
   - Creator-only actions (start lobby, etc.)
   - Rate limiting on API endpoints

3. **Input Validation**
   - All moves validated by server
   - Tile IDs verified against player's rack
   - Coordinates validated
   - Move counts limited to prevent spam

4. **Hidden Information**
   - Bag order never sent to clients
   - Opponent racks never sent to clients
   - Session tokens private (not logged)

5. **Data Persistence**
   - All moves logged (audit trail)
   - Game snapshots for replay
   - Graceful error handling (no data loss)

---

## 12. Performance Optimization Strategies

1. **Socket.IO**
   - Broadcast only to relevant rooms
   - Compress messages
   - Use binary transport for large updates
   - Lazy-load past games/history

2. **Database**
   - Indexes on frequently queried fields
   - Connection pooling
   - Query pagination for history
   - Archive old games to separate table

3. **Frontend**
   - Code splitting by route
   - Lazy component loading
   - Memoize expensive renders
   - Virtualize large lists

4. **Board Rendering**
   - Canvas for large board (many tiles)
   - Zoom/pan controls
   - Only render visible tiles

---

## 13. Error Recovery & Failover

1. **Player Disconnection**
   - Server waits 30-60 seconds for reconnection
   - If timeout, mark player as disconnected
   - Other players can continue or abandon
   - On reconnect, resend full game state

2. **Server Crashes**
   - Health check endpoint
   - Automatic restart via Docker/orchestrator
   - Game state persisted (can resume from last snapshot)
   - Load balancer routes to healthy instances

3. **Database Failures**
   - Supabase provides failover replicas
   - Transactions ensure consistency
   - Retry logic with exponential backoff

---

## 14. Future Enhancements

1. **Accounts & Profiles**
   - User registration / email verification
   - Player stats tracking
   - Match history
   - Achievements / badges

2. **Ranked Matchmaking**
   - ELO rating system
   - Skill-based opponent pairing
   - Leaderboards (global, monthly, etc.)
   - Ranking tiers

3. **Social Features**
   - Friend lists
   - Direct messaging
   - Spectator mode
   - Replay sharing

4. **Analytics & Telemetry**
   - Track player actions
   - Win rates by tile combinations
   - Heatmaps of popular board positions
   - Performance metrics

5. **Admin Tools**
   - Moderation dashboard
   - Ban/suspend users
   - Dispute resolution
   - Game replay viewer

6. **Mobile App**
   - Native iOS/Android
   - Offline support (sync when online)
   - Push notifications

---

End of Architecture Design Document

## 15. Current Implementation Status (June 17, 2026)

This design document contains target-state architecture and planning details. The repository has since converged on a leaner implementation shape.

Current implemented package layout:

- packages/engine: shared deterministic rules engine.
- packages/backend: Express + Socket.IO authoritative multiplayer service with optional Postgres persistence.
- packages/frontend: React + Tailwind multiplayer client.

Alignment highlights:

- Server-authoritative game state is implemented.
- Socket.IO realtime lobby/game event flow is implemented.
- Sparse coordinate board model is implemented in engine and transport views.
- Session-based identity with reconnect handling is implemented.
- PostgreSQL schema, migrations, and persistence-backed stats/leaderboard endpoints are implemented.

Differences from original target design sections:

- The proposed packages/common module was not introduced; shared domain contracts are currently maintained per package where needed.
- The broader REST surface in Section 6 was narrowed to persistence/analytics routes plus health.
- Some planned service layering and file naming from Section 1 was simplified.

Design direction remains valid, but Sections 1 through 14 should be interpreted as architectural intent plus rationale, not an exact file-for-file mirror of current repository contents.
