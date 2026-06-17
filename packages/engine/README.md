# @qwirkle/engine

Pure TypeScript Qwirkle rules engine shared by frontend and backend.

## Scope

- No UI, DOM, HTTP, Socket.IO, or persistence concerns.
- Deterministic behavior when initialized with the same seed and actions.
- Strongly typed game state and move results.

## Core Modules

- tile/
  - TileSet: canonical tile generation and lookup.
  - TileBag: draw, return, and shuffle behavior.
- board/
  - Board: sparse coordinate map representation.
  - Coordinate: coordinate parsing and helpers.
  - LineValidator: line rule checks.
  - MoveValidator: full placement validation ordering.
- scoring/
  - Scorer: line scoring and Qwirkle bonuses.
- turn/
  - TurnDraft: temporary placement state and undo.
- game/
  - GameEngine: orchestration of turns, scores, racks, and endgame.

## Installation

This package is consumed via workspace linking in this monorepo.

## Usage

```typescript
import { GameEngine } from '@qwirkle/engine';

const engine = new GameEngine({
  gameId: 'game-001',
  playerCount: 2,
  playerNames: ['Alice', 'Bob'],
  randomSeed: 42,
});

// Caller chooses first player (backend picks this server-side).
engine.startGame(1);

const current = engine.getCurrentPlayer();
engine.addTileToDraft(current.rack[0].id, '0,0');

const result = engine.commitMove();
if (!result.success) {
  console.error(result.error);
}
```

## Main Rules Enforced

- 108-tile set integrity through bag/rack/board flow.
- 2 to 4 players.
- Placement legality (alignment, adjacency, contiguity, line validity, max line length).
- Tile exchange constraints based on available bag count.
- Pass action on player turn.
- Scoring for primary and perpendicular lines with Qwirkle bonus handling.
- Endgame by rack depletion or bag-empty stalemate pass cycle.

## Exposed State

GameEngine.getGameState returns:

- board as Map<Coordinate, TileInstance>
- players as Map<number, GamePlayer>
- current player number
- turn number
- bag count
- pass/stalemate tracking
- winner/tie markers when game over

## Testing

```bash
npm test
npm run test:coverage
```

Current test suites in __tests__:

- board.test.ts
- game-engine.test.ts
- line-validation.test.ts
- move-validation.test.ts
- scoring.test.ts
- tile.test.ts

## Scripts

- npm run build
- npm run dev
- npm test
- npm run test:coverage

## License

MIT
