# @qwirkle/engine

A pure, deterministic TypeScript implementation of the Qwirkle board game engine.

## Features

- ✅ **Deterministic**: Identical input always produces identical output. No randomness in core logic.
- ✅ **Pure**: No side effects. All functions are stateless or have clear side effects.
- ✅ **UI-Agnostic**: No React, DOM, or rendering code. Pure game logic only.
- ✅ **Networking-Agnostic**: No Socket.IO, HTTP, or database code.
- ✅ **Fully Testable**: Comprehensive unit tests covering all game scenarios.
- ✅ **TypeScript**: Full type safety with strict TypeScript configuration.
- ✅ **Reusable**: Can be used by both frontend (React) and backend (Node.js).
- ✅ **Specification-Compliant**: Implements the full Qwirkle specification from README.md.

## Architecture

The engine is organized into logical modules:

### `tile/`
- `TileSet`: Factory and repository for all 108 tiles.
- `TileBag`: Manages the draw pile with shuffle and draw operations.

### `board/`
- `Board`: Sparse coordinate map representation of placed tiles.
- `Coordinate`: Utilities for coordinate serialization, validation, and geometry.
- `LineValidator`: Validates lines according to Qwirkle rules.
- `MoveValidator`: Implements the 16-step move validation ordering.

### `scoring/`
- `Scorer`: Calculates move scores with Qwirkle bonus handling.

### `turn/`
- `TurnDraft`: Manages draft state during a player's turn (placements, axis locking, undo).

### `game/`
- `GameEngine`: Main orchestrator that coordinates all components.

## Usage

### Basic Game Flow

```typescript
import { GameEngine, Color, Shape } from '@qwirkle/engine';

// Create a new game
const engine = new GameEngine({
  gameId: 'game-001',
  playerCount: 2,
  playerNames: ['Alice', 'Bob'],
  randomSeed: 42, // Optional: for deterministic testing
});

// Start the game
engine.startGame(1); // First player is player 1

// Place tiles
engine.addTileToDraft(1, '0,0');
engine.addTileToDraft(2, '1,0');

// Commit the move
const result = engine.commitMove();
console.log(`Placed tiles, scored ${result.score} points`);

// Get current game state
const state = engine.getGameState();
console.log(`Current player: ${state.currentPlayerNumber}`);
console.log(`Board size: ${state.board.size}`);
console.log(`Bag count: ${state.bagCount}`);

// Alternative actions: exchange or pass
// engine.exchangeTiles([1, 2, 3]);
// engine.pass();
```

### Deterministic Testing

Use a fixed random seed to make games reproducible:

```typescript
const engine1 = new GameEngine({
  gameId: 'game-1',
  playerCount: 2,
  playerNames: ['Alice', 'Bob'],
  randomSeed: 12345,
});

const engine2 = new GameEngine({
  gameId: 'game-2',
  playerCount: 2,
  playerNames: ['Alice', 'Bob'],
  randomSeed: 12345,
});

engine1.startGame(1);
engine2.startGame(1);

// Both games will have identical initial tile distributions
```

### Standalone Tile Set

```typescript
import { TileSet, Color, Shape } from '@qwirkle/engine';

// Get all 36 tile types
const types = TileSet.getAllTileTypes();

// Generate all 108 tiles
const tiles = TileSet.generateFullTileSet();

// Create a specific tile
const tile = TileSet.getTileById(42);
console.log(tile.type.color); // e.g., Color.Red
console.log(tile.type.shape); // e.g., Shape.Circle
```

### Standalone Board

```typescript
import { Board, CoordinateUtil } from '@qwirkle/engine';

const board = new Board();

// Place tiles
board.placeTile('0,0', tile1);
board.placeTile('1,0', tile2);

// Query the board
console.log(board.isOccupied('0,0')); // true
console.log(board.getTile('0,0')); // tile1
console.log(board.getTileCount()); // 2

// Get lines
const line = board.getMaximalLine('0,0', 'horizontal');
console.log(line); // ['0,0', '1,0']

// Get neighbors
const neighbors = board.getNeighbors('0,0');
```

### Standalone Validation

```typescript
import { LineValidator, MoveValidator } from '@qwirkle/engine';

// Validate a line
const tiles = [redCircle, redSquare, redDiamond];
const result = LineValidator.validateLine(tiles);
console.log(result.valid); // true
console.log(result.ruleFamily); // 'sameColorDifferentShape'

// Validate a move (16-step checking)
const placements = [
  { tileId: 1, coordinate: '0,0' },
  { tileId: 2, coordinate: '1,0' },
];

const error = MoveValidator.validatePlacement(
  placements,
  playerRack,
  board,
  isFirstMove
);

if (error) {
  console.log(`Move invalid: ${error.message} (step ${error.stepNumber})`);
}
```

## Game State

The engine exposes game state via `getGameState()`:

```typescript
interface GameState {
  gameId: string;
  phase: GamePhase; // Lobby, PlayerTurn, GameOver, etc.
  board: Map<Coordinate, TileInstance>;
  players: Map<number, GamePlayer>;
  currentPlayerNumber: number;
  turnNumber: number;
  bagCount: number;
  consecutivePasses: number;
  stalemateMode: boolean;
  turnDraft: TurnDraft | null;
  isGameOver: boolean;
  winner?: number;
  isTied?: boolean;
}
```

## Move Validation

The engine implements the 16-step validation ordering from the specification:

1. Game in Player Turn state
2. Requester is current active player
3. Tiles are non-empty
4. Tiles belong to player's rack
5. Tiles are distinct
6. Coordinates are distinct
7. Coordinates are valid format
8. Placements align on same axis (collinear)
9. Placements are contiguous (no gaps)
10. Move connects to existing board (except first move)
11. Primary line is valid
12. Primary line ≤ 6 tiles
13. All perpendicular lines are valid
14. All perpendicular lines ≤ 6 tiles
15. Move doesn't create disconnected islands or branching
16. Commit move and compute score

## Scoring

The scoring algorithm:

- Each line scores its length (1-6 points)
- A 6-tile line (Qwirkle) earns +6 bonus points (total 12)
- Primary and perpendicular lines both score independently
- Lines are deduplicated (same line not scored twice)

Example:
```
Before:  R-C R-S
After:   R-C R-S R-D R-T
Score:   4 points (2 original + 2 new)

Before:  R-C R-S R-D R-T R-L
After:   R-C R-S R-D R-T R-L R-X (Qwirkle!)
Score:   12 points (6 for line length + 6 bonus)
```

## Endgame

The engine detects endgame conditions automatically:

1. **Rack Depletion**: When a player empties their rack and the bag is empty, the game ends. That player receives a bonus equal to all tiles remaining in opponents' racks.

2. **Stalemate**: When the bag is empty, the engine enters stalemate mode. Each pass increments a counter. When the counter equals the player count, the game ends (no rack-empty bonus in this case).

## Testing

The engine includes comprehensive unit tests:

```bash
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
```

Test files:
- `tile.test.ts`: TileSet and tile generation
- `board.test.ts`: Board and Coordinate utilities
- `line-validation.test.ts`: Line validation rules
- `game-engine.test.ts`: Full game scenarios
- `move-validation.test.ts`: 16-step validation
- `scoring.test.ts`: Scoring algorithm
- `end-game.test.ts`: Endgame detection

## Example: Full Game Loop

```typescript
import { GameEngine } from '@qwirkle/engine';

const engine = new GameEngine({
  gameId: 'demo-game',
  playerCount: 2,
  playerNames: ['Alice', 'Bob'],
});

engine.startGame(1);

// Turn 1: Alice places 3 tiles
let player = engine.getCurrentPlayer();
engine.addTileToDraft(player.rack[0].id, '0,0');
engine.addTileToDraft(player.rack[1].id, '1,0');
engine.addTileToDraft(player.rack[2].id, '2,0');

let result = engine.commitMove();
console.log(`Alice scored ${result.score} points`);

// Turn 2: Bob extends the line
player = engine.getCurrentPlayer();
engine.addTileToDraft(player.rack[0].id, '3,0');

result = engine.commitMove();
console.log(`Bob scored ${result.score} points`);

// Turn 3: Alice passes
result = engine.pass();
console.log('Alice passed');

// Turn 4: Bob passes
result = engine.pass();
console.log('Bob passed');

// Check final state
const state = engine.getGameState();
console.log(`Game over: ${state.isGameOver}`);
console.log(`Winner: Player ${state.winner}`);
console.log(`Tied: ${state.isTied}`);
```

## Design Principles

1. **Determinism**: No randomness in core logic. Randomness is controlled via seeded RNG and happens at game initialization only.

2. **Purity**: Functions don't have hidden state or side effects. GameEngine encapsulates mutable state intentionally.

3. **Separation of Concerns**: Each module has a single responsibility (tiles, board, validation, scoring, turn management).

4. **Type Safety**: Comprehensive TypeScript types prevent accidental misuse.

5. **Testability**: All modules can be tested in isolation without mocks or fixtures.

6. **Performance**: Sparse coordinate maps instead of dense grids. O(n) operations instead of O(n²).

## Integration with Frontend/Backend

### Frontend (React)

```typescript
import { GameEngine } from '@qwirkle/engine';

function GameComponent() {
  const [engine] = useState(() => new GameEngine(...));
  const [state, setState] = useState(engine.getGameState());

  const handlePlaceTile = (tileId: number, coord: string) => {
    engine.addTileToDraft(tileId, coord);
    setState(engine.getGameState());
  };

  // ... render UI
}
```

### Backend (Node.js)

```typescript
import { GameEngine } from '@qwirkle/engine';
import { Server } from 'socket.io';

io.on('connection', (socket) => {
  const engine = new GameEngine(...);

  socket.on('place-tiles', (placements) => {
    placements.forEach(p => engine.addTileToDraft(p.tileId, p.coordinate));
    const result = engine.commitMove();
    io.emit('move-result', result);
    io.emit('game-state', engine.getGameState());
  });
});
```

## Building

```bash
npm run build       # Compile TypeScript to dist/
npm run dev         # Watch mode
```

## License

MIT
