# Qwirkle Engineering Specification

This README is the canonical software specification for a multiplayer web-based Qwirkle engine.

If a printed rulebook, fan site, or third-party implementation differs from this document, this document wins for software behavior.

## 0. Canonical Design Decisions

These decisions resolve common ambiguities in published Qwirkle descriptions:

- The game supports exactly 2 to 4 active players.
- The board is an unbounded integer grid with no physical edge.
- The server is authoritative for tile ownership, board state, turn order, scoring, and bag order.
- First player is chosen by server-side random selection among seated players after the initial deal.
- A player may pass on any turn.
- A player may exchange tiles only if the bag contains at least as many tiles as the player wants to exchange.
- A move may create multiple valid lines, and every formed line scores independently.
- A line of 6 tiles earns the Qwirkle bonus once per line.
- A tie at game end is allowed unless a higher-level product requirement adds an external tiebreak.
- A game may end by rack depletion or by stalemate after the bag is empty and no legal move remains for any player.

## 1. Vocabulary and Notation

- Tile type means the color-shape combination.
- Tile instance means one physical copy of a tile type.
- Rack means the hidden hand of a player.
- Bag means the draw pile.
- Board means the set of placed tiles indexed by coordinate.
- A line means a maximal contiguous run of tiles on one row or one column.
- Orthogonal adjacency means Manhattan distance 1.

Example notation used in this file:

- Colors: `R` red, `O` orange, `Y` yellow, `G` green, `B` blue, `P` purple.
- Shapes: `C` circle, `S` square, `D` diamond, `T` star, `L` clover, `X` cross.
- Tile notation: `R-C` means red circle, `B-S` means blue square.
- Coordinate notation: `(x,y)` where `x` increases to the right and `y` increases upward.

## 2. Tile System

### 2.1 Tile Set

Inputs:

- The fixed enumeration of colors and shapes.

Outputs:

- 36 tile types.
- 108 total tile instances.

Validation criteria:

- Only the six canonical colors are allowed.
- Only the six canonical shapes are allowed.
- Each color-shape combination exists exactly 3 times.

Edge cases:

- Different tile instances may have identical color and shape.
- Two tiles with the same color and shape are distinct only by instance identity.

Examples:

- `R-C`, `R-S`, `R-D`, `R-T`, `R-L`, `R-X`.
- `B-C`, `O-X`, `P-T`.

### 2.2 Colors

The six colors are:

- Red
- Orange
- Yellow
- Green
- Blue
- Purple

Validation criteria:

- Color values must be exact enumerations; no synonyms, aliases, or free-form strings.

Edge cases:

- UI may render color names differently, but the engine must store the canonical enum.

### 2.3 Shapes

The six shapes are:

- Circle
- Square
- Diamond
- Star
- Clover
- Cross

Validation criteria:

- Shape values must be exact enumerations; no synonyms, aliases, or free-form strings.

### 2.4 Counts

Each of the 36 tile types appears exactly 3 times.

Calculation:

$$6 \text{ colors} \times 6 \text{ shapes} \times 3 \text{ copies} = 108 \text{ tiles}$$

Validation criteria:

- The bag plus all racks plus the board must always contain exactly 108 total tile instances during a fresh game.
- After any move or draw, the total number of live tile instances must remain conserved.

### 2.5 Software Representation

Recommended canonical model:

- `TileType`: `{ color, shape }`
- `TileInstance`: `{ id, type }`

Recommended fields:

- `id`: stable unique identifier from 1 to 108.
- `type.color`: one of the six color enums.
- `type.shape`: one of the six shape enums.

Validation criteria:

- `id` must be unique across all live tiles.
- `type` must be immutable after creation.

Edge cases:

- The engine must not infer identity from color-shape alone.
- Search, filtering, and rendering may group by type, but state mutation must track instances.

Examples:

- Three red circles can exist as `id=1`, `id=37`, and `id=73` if the implementation assigns IDs that way.

## 3. Game Setup

### 3.1 Supported Player Counts

Inputs:

- Number of seated active players.

Outputs:

- A started game when player count is 2, 3, or 4.

Validation criteria:

- Fewer than 2 active players cannot start a standard game.
- More than 4 active players cannot join as active participants.

Edge cases:

- Spectators may exist, but they are not active players.

Examples:

- Valid: 2-player game.
- Valid: 4-player game.
- Invalid: 1-player active game.
- Invalid: 5-player active game.

### 3.2 Initial Tile Distribution

Inputs:

- A shuffled bag of 108 tile instances.
- N seated players, where N is 2 to 4.

Outputs:

- Each player receives 6 tiles.
- The bag loses `6N` tiles.

Validation criteria:

- Every dealt tile must come from the bag.
- No player may begin with more or fewer than 6 tiles.

Edge cases:

- If the bag is malfunctioning or incomplete, the game must fail setup rather than start with an invalid tile count.

### 3.3 Determining First Player

Inputs:

- The list of seated active players.

Outputs:

- Exactly one first player.

Canonical rule:

- Select the first player uniformly at random on the server after the initial deal.

Validation criteria:

- The chosen player must be one of the seated active players.
- The selection must be recorded in the authoritative game state before turn 1 begins.

Edge cases:

- If a player disconnects during setup, the game must either replace them before start or cancel setup, depending on product policy.

### 3.4 Initial Board State

Inputs:

- Empty board.

Outputs:

- No placed tiles.
- No occupied coordinates.

Validation criteria:

- The board map is empty at game start.
- No hidden pending placements exist at setup completion.

Examples:

- The coordinate `(0,0)` is empty before the first move.

## 4. Board Model

### 4.1 Coordinate System

Inputs:

- Integer coordinates.

Outputs:

- A sparse mapping from coordinates to tile instances.

Canonical rule:

- The board is an infinite 2D integer lattice.
- `x` is horizontal and increases to the right.
- `y` is vertical and increases upward.

Validation criteria:

- All occupied board positions must use integer coordinates.
- No coordinate may contain more than one tile.

Edge cases:

- Negative coordinates are legal.
- The board origin is arbitrary and has no special gameplay meaning.

### 4.2 Board Boundaries

Inputs:

- Placement coordinates.

Outputs:

- No hard boundary rejection based on coordinate magnitude alone.

Validation criteria:

- A coordinate is legal if and only if it satisfies all move rules and is unoccupied.

Edge cases:

- The engine may impose implementation limits for storage or rendering, but those are not game rules.

### 4.3 Tile Placement Representation

Recommended canonical model:

- Board state is a dictionary or map from `(x,y)` to `TileInstance`.

Validation criteria:

- A placement target coordinate must not already be occupied.

Edge cases:

- A move that references the same target coordinate more than once is invalid.

### 4.4 Adjacency Rules

Inputs:

- A candidate placed tile and the current board.

Outputs:

- Whether the tile is orthogonally adjacent to at least one existing tile.

Validation criteria:

- Diagonal adjacency does not count.
- Orthogonal adjacency counts if the Manhattan distance is exactly 1.

Examples:

- `(1,0)` is adjacent to `(0,0)`.
- `(1,1)` is not adjacent to `(0,0)`.

### 4.5 Canonical Board Representation

The board shall be represented as a sparse coordinate map.

Recommended TypeScript representation:

```typescript
type Coordinate = `${number},${number}`;

interface TileInstance {
    id: number;
    type: {
        color: string;
        shape: string;
    };
}

interface Board {
    tiles: Map<Coordinate, TileInstance>;
}
```

Validation criteria:

- Each `Coordinate` string must represent a valid integer pair `x,y`.
- The `Map` keys must be unique.
- No two `TileInstance` objects may occupy the same coordinate.
- This sparse representation allows efficient storage and retrieval of board state on an infinite lattice.

Sparse Representation Requirements:

- Only occupied coordinates are stored in the board map.
- Empty coordinates are not represented at all.
- Board dimensions are effectively unbounded.
- Board expansion occurs naturally as new coordinates are added to the map.
- All move validation and scoring logic must operate against the sparse representation.

Example Storage Structure:

Occupied board:

(0,0) -> Red Circle
(1,0) -> Red Square
(2,0) -> Red Diamond

Underlying storage:

```typescript
{
    "0,0": { id: 42, type: { color: "Red", shape: "Circle" } },
    "1,0": { id: 15, type: { color: "Red", shape: "Square" } },
    "2,0": { id: 89, type: { color: "Red", shape: "Diamond" } }
}
```

No empty spaces are stored.

Rationale:

- Eliminates arbitrary board size limits.
- Simplifies coordinate management and iteration.
- Improves memory efficiency by avoiding storage of empty cells.
- Aligns naturally with Qwirkle's expanding board topology.
- Reduces computational overhead for algorithms operating on frontier coordinates.

### 4.6 Coordinate Serialization

All coordinates must be serialized to a canonical string format for board storage, lookup, and computation.

Canonical serialization:

```typescript
function coordinateKey(x: number, y: number): string {
    return `${x},${y}`;
}
```

Requirements:

- All board lookups, line validation, and scoring algorithms must use this canonical coordinate serialization format.
- Coordinate pairs must be serialized before use as map keys.
- Deserialization must parse the string back to integer components if needed for geometric calculations.

Examples:

- `(0, 0)` → `"0,0"`
- `(3, -2)` → `"3,-2"`
- `(-5, 10)` → `"-5,10"`

Rationale:

- Prevents subtle bugs from inconsistent coordinate formatting.
- Ensures deterministic map key generation.
- Simplifies debugging by using a human-readable string representation.
- Allows safe use of Map-based storage with string keys.

## 5. Legal Move Rules

The engine recognizes exactly three turn actions:

- Place tiles.
- Exchange tiles.
- Pass.

### 5.1 Single-Tile Placement

Inputs:

- One tile instance from the current player's rack.
- One empty board coordinate.

Outputs:

- A legal placement if all placement rules are satisfied.

Validation criteria:

- On the first move, a single tile may be placed anywhere on the empty board.
- On later moves, the tile must be orthogonally adjacent to at least one existing tile.
- The tile must not overlap an occupied coordinate.
- The resulting line(s) must be valid.

Edge cases:

- A single tile on the first move creates a one-tile board and scores 1 point.
- A single tile on a non-empty board that does not touch existing tiles is invalid.

### 5.2 Multi-Tile Placement

Inputs:

- Two or more tile instances from the current player's rack.
- Two or more empty board coordinates.

Outputs:

- A legal placement only if all tiles form one straight contiguous line.

Validation criteria:

- All placed tiles must lie on the same row or the same column.
- All target coordinates must be distinct.
- The occupied span of the move must be contiguous with no gaps.
- The move must not branch or form a T or plus shape.

Edge cases:

- A move may span through already occupied cells only if every intermediate cell is occupied by either an existing tile or one of the newly placed tiles.
- Two tiles separated by an empty cell are illegal unless the empty cell is already occupied by an existing tile.

### 5.3 Placement Direction Requirements

Inputs:

- The coordinates of all tiles being placed in the turn.

Outputs:

- A single axis direction: horizontal or vertical.

Validation criteria:

- Mixed-axis placement is invalid.
- The move must not change direction mid-turn.

Examples:

- Legal: `(0,0)`, `(1,0)`, `(2,0)`.
- Illegal: `(0,0)`, `(1,0)`, `(1,1)`.

### 5.4 Connectivity Requirements

Inputs:

- The current board and a candidate placement.

Outputs:

- Whether the move connects to the existing board.

Validation criteria:

- On the first move, connectivity is not required because the board is empty.
- On later moves, at least one newly placed tile must be orthogonally adjacent to at least one existing tile.
- The move must not create a disconnected island.

Edge cases:

- A move that is internally contiguous but floating away from the existing board is invalid.

### 5.5 Restrictions on Gaps

Inputs:

- The ordered coordinates of a candidate line.

Outputs:

- Whether every intervening cell is occupied.

Validation criteria:

- No empty cell may exist between the extreme endpoints of the move unless that cell already contains an existing tile.

Edge cases:

- Gaps caused by skipped coordinates are illegal even if the end tiles are valid relative to each other.

### 5.6 Restrictions on Branching

Inputs:

- The set of newly placed tile coordinates.

Outputs:

- Whether the move forms exactly one primary straight line.

Validation criteria:

- New tiles may not create more than one independent primary line in the move.
- New tiles may not form a shape that requires the player to place tiles in two directions at once.

Edge cases:

- A single placed tile may later participate in a perpendicular cross-line formed with existing tiles, but the placed tiles themselves must still be a single straight line.

### 5.7 Restrictions on Disconnected Placements

Inputs:

- All newly placed tiles in the turn.

Outputs:

- Whether the placements are all part of one connected move.

Validation criteria:

- Every newly placed tile must belong to the same connected placement set along the chosen axis.
- Separate tile clusters on the same turn are illegal.

Examples:

- Illegal: placing one tile at `(0,0)` and another at `(3,0)` with empty cells in between.

## 6. Line Validation Rules

### 6.1 What Constitutes a Valid Line

Inputs:

- A maximal contiguous run of tiles on one row or one column.

Outputs:

- Valid or invalid.

Canonical rule:

- A valid line has length 1 through 6.
- If length is greater than 1, then every tile in the line must satisfy exactly one of these two patterns:
	- Same color, all different shapes.
	- Same shape, all different colors.

Validation criteria:

- A line may not mix both rule families.
- A line may not contain duplicate tile types.
- A line may not exceed length 6.

Edge cases:

- A one-tile line is legal only on the first move.
- A line of 6 is legal and earns a bonus.

### 6.2 Same Color / Different Shape Rule

Inputs:

- A line candidate with all tiles sharing one color.

Outputs:

- Valid if and only if all shapes are distinct.

Validation criteria:

- Color must be identical across all tiles.
- Shape must be unique for each tile in the line.

Examples:

- Valid: `R-C`, `R-S`, `R-D`.
- Invalid: `R-C`, `R-S`, `R-C`.

### 6.3 Same Shape / Different Color Rule

Inputs:

- A line candidate with all tiles sharing one shape.

Outputs:

- Valid if and only if all colors are distinct.

Validation criteria:

- Shape must be identical across all tiles.
- Color must be unique for each tile in the line.

Examples:

- Valid: `R-X`, `B-X`, `G-X`.
- Invalid: `R-X`, `B-X`, `R-X`.

### 6.4 Duplicate Prevention

Inputs:

- All tiles in a candidate line.

Outputs:

- Whether any tile type appears more than once.

Validation criteria:

- A line cannot contain two tiles with the same color and same shape.

Important nuance:

- The three physical copies of a tile type are distinct instances, but they are still the same tile type for line-validation purposes.

### 6.5 Maximum Line Length

Inputs:

- The tile count of a candidate line.

Outputs:

- Valid if length is at most 6.

Validation criteria:

- A line of 7 or more tiles is always invalid.

### 6.6 Invalid Line Examples

- `R-C`, `R-S`, `R-C` is invalid because `R-C` repeats.
- `R-C`, `B-S`, `R-D` is invalid because it mixes color and shape families.
- `R-X`, `B-X`, `G-X`, `P-X`, `O-X`, `Y-X`, `R-X` is invalid because it is length 7 and repeats a type.

### 6.7 Valid Line Examples

- `R-C`, `R-S`.
- `B-X`, `G-X`, `P-X`.
- `O-L`, `O-X`, `O-T`, `O-D`, `O-S`, `O-C`.

### 6.8 Formal Line Validation Algorithm

Inputs:

- `line`: an ordered list of occupied coordinates and tile instances that all lie on the same row or the same column.

Outputs:

- `ValidationResult { valid, reason, ruleFamily }`.

Pseudocode:

```text
function validateLine(line):
	length = line.tiles.length

	if length == 0:
		return invalid("empty line")

	if length > 6:
		return invalid("line too long")

	if length == 1:
		return valid(ruleFamily = "single")

	colors = distinct colors in line.tiles
	shapes = distinct shapes in line.tiles
	typeKeys = distinct (color, shape) pairs in line.tiles

	if typeKeys.count != length:
		return invalid("duplicate tile type")

	sameColor = colors.count == 1
	sameShape = shapes.count == 1

	if sameColor and shapes.count == length:
		return valid(ruleFamily = "sameColorDifferentShape")

	if sameShape and colors.count == length:
		return valid(ruleFamily = "sameShapeDifferentColor")

	return invalid("mixed rule family")
```

Validation notes:

- A line is invalid if it mixes same-color and same-shape constraints.
- Duplicate tile types are rejected before rule-family selection succeeds.
- A one-tile line is only valid in the first-move context or as an isolated line produced by the board topology.

## 7. Scoring System

### 7.1 Scoring Rule

Inputs:

- The set of all valid lines formed or extended by the current move.

Outputs:

- The total score for the turn.

Canonical rule:

- Score each distinct line created by the move as the number of tiles in that line after the move.
- Add 6 bonus points to any line that contains exactly 6 tiles.
- Sum all scored lines to obtain the turn total.

Validation criteria:

- A line is scored once per move.
- If a tile participates in multiple lines, it contributes to each line separately.
- Pass and exchange score 0.

### 7.2 Primary and Perpendicular Line Definitions

Primary line:

- The line aligned with the placement axis of the current move draft.
- If the move contains exactly one placed tile and both horizontal and vertical lines are formed, horizontal is the canonical primary-line tie-break for scoring only.

Perpendicular line:

- Any additional valid line formed by a newly placed tile that is orthogonal to the primary line.

Counting rules:

- The primary line is counted once if it is valid and contains at least one newly placed tile.
- Every perpendicular line is counted once if it is valid and contains at least one newly placed tile.
- Do not count any line that contains no newly placed tiles.
- Do not count the same canonical line more than once, even if more than one placed tile touches it.

Edge cases:

- A one-tile first move scores a single primary line of length 1.
- A single tile that bridges two perpendicular existing runs may create two scored lines.
- A move that forms one valid line and one invalid perpendicular line is entirely invalid.

### 7.3 Formal Scoring Algorithm

Inputs:

- `move`: the current player's committed draft placements.
- `board`: the committed board state before the move.

Outputs:

- `MoveScore { total, lineScores, qwirkleBonuses }`.

Pseudocode:

```text
function scoreMove(move, board):
	workingBoard = applyPlacements(board, move.placements)
	scoredLineKeys = empty set
	lineScores = empty list
	total = 0

	primaryLine = determinePrimaryLine(move, workingBoard)
	if primaryLine exists:
		validateResult = validateLine(primaryLine)
		if not validateResult.valid:
			return invalid("primary line invalid")
		score = primaryLine.length
		qwirkleBonus = 6 if primaryLine.length == 6 else 0
		scoredLineKeys.add(primaryLine.key)
		lineScores.append({ key: primaryLine.key, length: primaryLine.length, score: score + qwirkleBonus })
		total += score + qwirkleBonus

	for each placedTile in move.placements:
		for each axis in perpendicularAxes(primaryLine.axis):
			candidateLine = buildMaximalLineThrough(workingBoard, placedTile.coordinate, axis)
			if candidateLine.length <= 1:
				continue
			if not candidateLine.containsAny(move.placements):
				continue
			if candidateLine.key in scoredLineKeys:
				continue
			validateResult = validateLine(candidateLine)
			if not validateResult.valid:
				return invalid("perpendicular line invalid")
			score = candidateLine.length
			qwirkleBonus = 6 if candidateLine.length == 6 else 0
			scoredLineKeys.add(candidateLine.key)
			lineScores.append({ key: candidateLine.key, length: candidateLine.length, score: score + qwirkleBonus })
			total += score + qwirkleBonus

	return valid({ total, lineScores, qwirkleBonuses: sum bonuses in lineScores })
```

Algorithm notes:

- `applyPlacements` is a logical overlay and must not mutate committed board state until the move is accepted.
- `determinePrimaryLine` uses the locked draft axis when present; for a one-tile move that forms both axes, horizontal wins the tie-break.
- `buildMaximalLineThrough` returns the full contiguous row or column through the placed tile after applying the draft.
- `scoredLineKeys` prevents duplicate scoring when more than one newly placed tile touches the same canonical line.
- A move is invalid if any line it creates fails validation.
- Qwirkle bonus is applied per six-tile line and is included in that line's score.

### 7.3.1 Primary Line Tie-Break Clarification

For a single-tile placement that extends both a horizontal and vertical line:

- The engine may designate one line as the "primary line" for internal processing convenience.
- If a tie-break is required, horizontal may be selected as primary.

**IMPORTANT:**

The primary-line designation exists only for implementation convenience. It **MUST NOT** affect scoring.

Final score calculation must be identical regardless of whether horizontal or vertical is chosen as the primary line.

Scoring behavior is determined solely by the completed lines created by the move, not by any internal tie-break designation.

### 7.4 Single Tile Scoring

Inputs:

- A move that places one tile and forms exactly one line of length `n`.

Outputs:

- Score `n`, plus 6 if `n = 6`.

Examples:

- Extending a 2-tile row to 3 tiles scores 3.
- Completing a 6-tile row scores 12.

### 7.5 Multi-Tile Scoring

Inputs:

- A move that places multiple tiles and forms one primary line, possibly plus perpendicular lines.

Outputs:

- The sum of all line scores.

Examples:

- A move that forms a 4-tile horizontal line and a 2-tile vertical cross-line scores 6 total.

### 7.6 Multiple Line Scoring

Inputs:

- A move that completes more than one line.

Outputs:

- Each line is scored independently.

Edge cases:

- The same newly placed tile can be counted in several lines.

### 7.7 Qwirkle Bonus Scoring

Inputs:

- Any line of exactly 6 tiles.

Outputs:

- An additional 6-point bonus for that line.

Validation criteria:

- The bonus is awarded once per six-tile line.
- If a move completes two separate six-tile lines, both bonuses apply.

### 7.8 Scoring Diagrams

Diagram notation:

- `.` means empty space.
- Coordinates are shown for the relevant row or column only.

Example A: Extend a line to 4 tiles.

```text
Before move
x: 0   1   2   3
y=0 R-C R-S R-D  .

Move: place R-T at (3,0)

After move
x: 0   1   2   3
y=0 R-C R-S R-D R-T

Score: 4
```

Example B: Complete a Qwirkle.

```text
Before move
x: 0   1   2   3   4   5
y=0 G-X B-X P-X O-X Y-X  .

Move: place R-X at (5,0)

After move
x: 0   1   2   3   4   5
y=0 G-X B-X P-X O-X Y-X R-X

Score: 6 + 6 bonus = 12
```

Example C: One move creates two lines.

```text
Before move
          y=1      .
          y=0    B-S
x:        -1   0   1   2
y=0      R-C  .   G-C  .
y=-1     .    .   .    .

Move: place R-S at (1,0) and R-D at (1,1)

After move
Vertical line at x=1: R-S, R-D, B-S  -> score 3
Horizontal line at y=0: R-C, R-S, G-C -> score 3
Total score: 6
```

## 8. Tile Exchange Rules

### 8.1 When a Player May Exchange Tiles

Inputs:

- Current player turn.
- Selected tiles from the player's rack.
- Current bag size.

Outputs:

- A legal exchange or an invalid action.

Canonical rule:

- A player may exchange any non-empty subset of rack tiles instead of placing tiles.
- The bag must contain at least as many tiles as are being exchanged.

Validation criteria:

- Exchange is only legal on the player's own turn.
- Selected tiles must all belong to the player's rack.
- The selection must be non-empty.
- The bag must have enough tiles to replace the selection exactly.

Edge cases:

- Exchanging all 6 rack tiles is legal if the bag has at least 6 tiles.
- If the bag has fewer tiles than the selection, exchange is invalid.

### 8.2 How Exchanges Work

Inputs:

- Selected rack tiles.

Outputs:

- The same number of replacement tiles drawn from the bag.

Canonical rule:

- Remove selected tiles from the rack.
- Return them to the bag.
- Shuffle the bag.
- Draw the same number of replacement tiles.
- Shuffle before drawing replacements.
- If the returned tiles exactly satisfy the draw requirement, the exchange succeeds and the bag may become empty.

Validation criteria:

- The rack size after the exchange must still be 6, unless the bag runs out while a later draw elsewhere is being resolved; exchange itself must preserve count.

### 8.3 Exchange Edge Cases

- A selection containing duplicate instance IDs is invalid.
- A selection containing tiles not currently in the rack is invalid.
- Exchange is not a scoring action.
- Exchange ends the turn immediately after the replacements are drawn.

## 9. Turn System

### 9.1 Turn Order

Inputs:

- Seated player order.
- First-player selection.

Outputs:

- A clockwise or seat-order cycle beginning at the first player.

Validation criteria:

- Exactly one player is active per turn.
- The active player must match the authoritative turn pointer.

### 9.2 Passing

Inputs:

- A pass action from the current player.

Outputs:

- The turn ends with no score change and no tile movement.

Validation criteria:

- Pass is allowed only on the current player's turn.
- Pass does not require board validation.

Edge cases:

- Pass is always allowed.
- A pass increments consecutivePasses when the bag is empty.
- A successful placement or exchange resets consecutivePasses to 0.

### 9.3 Exchanges

Inputs:

- A valid exchange request.

Outputs:

- Turn ends after exchange and redraw.

### 9.4 End-of-Turn Processing

Inputs:

- The action outcome.

Outputs:

- Updated board, rack, bag, score, turn pointer, and game state.

Canonical order:

1. Validate the action.
2. Commit board changes or exchange changes.
3. Compute score, if any.
4. Draw replacement tiles after a successful placement until the rack contains 6 or the bag is empty.
5. Check end-game conditions.
6. Advance to the next player if the game is not over.

Edge cases:

- Draws after placement are from the bag only and never from another player.
- If the bag has fewer than the needed replacements, draw as many as are available.

### 9.5 Turn Draft Model

TurnDraft:

- `placements`: ordered list of draft placements, each containing `tileId` and `coordinate`.
- `lockedAxis`: `null`, `horizontal`, or `vertical`.

Draft rules:

- A turn draft exists only during the current player's turn.
- The first placement sets `placements.length = 1` and leaves `lockedAxis = null`.
- The second placement must define the axis; if the two placements share a row, the locked axis is horizontal; if they share a column, the locked axis is vertical.
- All additional placements in the same turn must remain collinear with the locked axis.
- Undoing a placement recomputes `lockedAxis` from the remaining placements.
- If fewer than 2 placements remain, `lockedAxis` returns to `null`.

Draft validation:

- Draft placements may not reuse the same tile instance.
- Draft placements may not target the same coordinate twice.
- Draft placements may not overlap committed board tiles.
- Draft placements must remain contiguous with no gaps once the axis is known.

Commit rules:

- Final commit must revalidate the full draft against the committed board.
- If the board changed while the draft was open, the draft is invalid and must be rejected or rebuilt.

Undo behavior:

- Undo removes the most recently added draft placement by default.
- After undo, `lockedAxis` is recomputed from the remaining draft placements.
- Undo is a local draft operation and does not change the committed board.

## 10. End Game Rules

### 10.1 How the Game Ends

Inputs:

- A finished turn.

Outputs:

- Transition to game over.

Canonical rule:

- The game ends immediately when a successful placement leaves the bag empty and the active player with no tiles in their rack after all draw/refill processing.
- The game also ends by stalemate when the bag is empty and no player can make a legal placement on their turn, and all players have effectively exhausted legal turn options.

Validation criteria:

- Game over must be irreversible in the core game engine.

Edge cases:

- If the bag is empty and the active player passes, the engine should track stalemate progression rather than silently looping forever.

### 10.5 Endgame Rule

The game ends when:

1. A player empties their rack and the tile bag is empty.
   - Award the standard endgame bonus.
   - Calculate final scores.
   - End the game.

OR

2. The tile bag is empty and every player passes consecutively.
   - Track a `consecutivePasses` counter (integer, initialized to 0).
   - Any successful placement resets `consecutivePasses` to 0.
   - Any tile exchange resets `consecutivePasses` to 0.
   - When `consecutivePasses == playerCount`, the game ends.

Rationale:

- Avoids implementing `hasAnyLegalMove(player)`.
- Matches behavior used by many digital board-game implementations.
- Simpler and more performant for MVP.
- Deterministic and reproducible across servers.

Future enhancement:

- A future version may implement explicit legal-move detection to enforce that pass is only legal when no placement is possible.

### 10.2 Final Scoring

Inputs:

- Final board score.
- Remaining rack tiles.

Outputs:

- Final score totals.

Canonical rule:

- If a player ends the game by emptying their rack, that player receives a bonus equal to the total number of tiles remaining in all opponents' racks.
- If the game ends by stalemate, no rack-emptying bonus is awarded.

Validation criteria:

- Only the player who caused rack depletion receives the rack-remaining bonus.
- The bonus is based on remaining tiles, not on rack face values.

### 10.3 Bonus Points

Inputs:

- Qwirkle bonuses already earned during normal turns.

Outputs:

- Final scores including all in-game bonuses.

Validation criteria:

- Qwirkle bonuses are not re-awarded at game end.

### 10.4 Tie Handling

Inputs:

- Final scores after all bonuses.

Outputs:

- A ranked result set that may contain ties.

Canonical rule:

- If multiple players finish with the same final score, the game result is a tie among those players.
- Any external tournament or matchmaking system may apply its own tie-breaks outside the core engine.

## 11. Multiplayer Considerations

### 11.1 Hidden Information

Should remain hidden from other players:

- The exact contents of each opponent rack.
- The exact order of the bag.
- The tiles a player is considering before they commit an action.
- Any server-side shuffle seed.

### 11.2 Visible Information

Should be visible to all players:

- Board state.
- Score totals.
- Turn order.
- Current active player.
- Bag count, but not bag order.
- Public action history if the product exposes it.

### 11.3 State Synchronization

Must be synchronized server-to-client:

- Board tile placements.
- Rack counts for all players, and full rack contents for the owning player only.
- Bag count.
- Scores.
- Current turn owner.
- Game state.
- Last resolved action.

Validation criteria:

- Clients must never be authoritative for placement validity or tile ownership.

Edge cases:

- A reconnecting player must receive the current authoritative state plus their hidden rack only.

### 11.4 Multiplayer Reconnection Behavior

Authoritative state:

- The server owns the committed board, racks, bag, scores, turn order, current player, game phase, and current TurnDraft.

Persisted state:

- Committed game state must be persisted durably after every accepted action.
- The current TurnDraft should be persisted when crash recovery is required.
- Public event history should be persisted if replay or audit is needed.

Discardable state:

- Hover previews, client-side suggestions, and other UI hints may be discarded at any time.
- A non-committed draft may be discarded only if the turn is explicitly canceled, the match is aborted, or the server cannot recover the draft after a restart.

Disconnect rules:

- If a player disconnects during their turn, the committed game state remains unchanged and the draft remains authoritative on the server.
- If the same player reconnects, they resume the same turn and receive their own rack plus the current draft.
- If a player disconnects between turns, no game state changes.
- If the host disconnects during a live match, the game continues; host authority is only relevant in lobby or rematch control flows.

Server restart behavior:

- If the server restarts and the draft was persisted, restore the draft and continue the same turn.
- If the server restarts and the draft was not persisted, restore the last committed game state and reopen the same player's turn with an empty draft.
- No partial placement may survive a restart unless it was already committed.

## 12. State Machine Design

### 12.1 Lobby

Allowed actions:

- Create game.
- Join as player.
- Join as spectator.
- Leave lobby.
- Configure seat order if the product supports it.

Invalid actions:

- Place tiles.
- Exchange tiles.
- Pass.

State transitions:

- Lobby -> Waiting for players when a game is created but not enough active players are seated.
- Lobby -> Game starting when the minimum player count is satisfied and the host starts the game.

### 12.2 Waiting for Players

Allowed actions:

- Join.
- Leave.
- Ready up.

Invalid actions:

- Place, exchange, or pass.

State transitions:

- Waiting for players -> Game starting when enough active players are ready and the host initiates start.
- Waiting for players -> Lobby if the game is cancelled.

### 12.3 Game Starting

Allowed actions:

- No player gameplay actions.

Internal processing:

- Shuffle bag.
- Deal 6 tiles to each active player.
- Select first player.
- Initialize scores.
- Initialize turn pointer.

State transitions:

- Game starting -> Player turn once setup is complete.

### 12.4 Player Turn

Allowed actions:

- Place tiles.
- Begin exchange.
- Pass.

Invalid actions:

- Actions from any non-active player.
- Moves that violate placement or exchange rules.

State transitions:

- Player turn -> Player turn for the next player after a successful placement, exchange, or pass, unless the game ends.
- Player turn -> Tile exchange when the current player opens an exchange workflow.
- Player turn -> Game over when end conditions are met.

### 12.5 Tile Exchange

Allowed actions:

- Confirm exchange.
- Cancel exchange.

Invalid actions:

- Board placement.
- Passing without closing the exchange workflow.

State transitions:

- Tile exchange -> Player turn after cancel.
- Tile exchange -> Next player turn after a successful exchange.

### 12.6 Game Over

Allowed actions:

- View final results.
- Start rematch if product supports it.

Invalid actions:

- Place tiles.
- Exchange tiles.
- Pass.

State transitions:

- Game over -> Lobby or Game starting only if a new match is created.

## 13. Software Validation Rules

This section orders validation from cheapest to most expensive.

Draft mutations and final commits are validated separately.

### 13.1 Draft Placement Validation Order

1. Verify the game is in Player turn state.
2. Verify the requester is the current active player.
3. Verify the draft action is not blocked by an exchange-confirmation state.
4. Verify the selected tile instance belongs to the current player's rack.
5. Verify the target coordinate is not already used by another draft placement.
6. Verify the target coordinate is unoccupied on the committed board.
7. Verify the draft remains collinear with the current locked axis, if any.
8. Verify the draft remains contiguous with no gaps once two or more placements exist.
9. Verify the draft does not create an illegal branch shape.
10. Recompute `lockedAxis` after add or undo.

Why these checks exist:

- Steps 1-4 reject unauthorized or impossible draft mutations cheaply.
- Steps 5-8 prevent an invalid draft from accumulating.
- Steps 9-10 keep turn-draft state coherent before final commit.

### 13.2 Placement Move Validation Order

1. Verify the game is in Player turn state.
2. Verify the requester is the current active player.
3. Verify the action type is `place`.
4. Verify the selected tile instances belong to the player's rack.
5. Verify the selection is non-empty.
6. Verify the selected tile instances are distinct.
7. Verify all target coordinates are distinct.
8. Verify each target coordinate is unoccupied on the committed board and not duplicated in the draft.
9. Verify the placement is straight and matches the locked axis, if any.
10. Verify the placement is contiguous: no gaps in the span unless occupied by existing tiles.
11. Verify the move connects to the existing board, unless the board is empty.
12. Build every affected line from the committed board plus the draft overlay.
13. Validate each affected line against the line rules.
14. Verify no line exceeds length 6.
15. Verify the move does not create disconnected islands or branching geometry.
16. Commit the move and compute score.

Why these checks exist:

- Steps 1-5 reject obviously impossible actions with cheap state and ownership checks.
- Steps 6-10 reject structural errors before walking the board.
- Steps 11-15 require board traversal and line construction, so they are more expensive.
- Step 16 is processing, not rejection.

### 13.3 Exchange Move Validation Order

1. Verify the game is in Player turn state.
2. Verify the requester is the current active player.
3. Verify the action type is `exchange`.
4. Verify the selected tile instances belong to the player's rack.
5. Verify the selection is non-empty.
6. Verify the selected tile instances are distinct.
7. Verify the bag contains at least as many tiles as are being exchanged.
8. Commit the exchange and redraw.

Why these checks exist:

- Ownership and turn checks are cheap.
- Bag capacity matters only after the selected subset is known.

### 13.4 Pass Move Validation Order

1. Verify the game is in Player turn state.
2. Verify the requester is the current active player.
3. Verify the action type is `pass`.
4. Commit the pass and advance the turn.

Why these checks exist:

- Pass has no board or rack geometry to validate.

## 14. Rule Ambiguities and Recommended Interpretations

The following areas are known to vary across rule summaries or digital implementations.

### 14.1 First Player Selection

Possible interpretations:

- Random seat order.
- Youngest player.
- Draw of tiles.

Canonical recommendation:

- Use server-side random selection among seated players.

### 14.2 Passing

Possible interpretations:

- Pass is always allowed.
- Pass is allowed only when no legal move exists.

Canonical recommendation:

- Allow pass on any turn to keep the engine simple and deterministic.

### 14.3 Exchange Cost Constraint

Possible interpretations:

- Exchange requires at least as many tiles in the bag as are being exchanged.
- Exchange requires the bag to have at least 7 tiles.

Canonical recommendation:

- Require the bag to have at least as many tiles as are being exchanged.

### 14.4 End-Game Trigger

Possible interpretations:

- Game ends only when a player empties their rack.
- Game ends when no legal moves remain.

Canonical recommendation:

- Support both rack-depletion ending and stalemate ending.

### 14.5 Tie Handling

Possible interpretations:

- Exact ties are allowed.
- A separate tiebreak is used.

Canonical recommendation:

- Exact ties remain ties in the core rules.

## 15. Test Cases

Notation for the examples below:

- `A` means the active player.
- `B`, `C`, `D` are other players.
- `Rack(A)` means the current player's rack.
- Board snapshots show only the local area needed for the example.

### 15.1 Valid Move Examples

1. Empty board; A places `R-C` at `(0,0)`.
2. Empty board; A places `R-C` at `(0,0)` and `R-S` at `(1,0)`.
3. Empty board; A places `R-C`, `R-S`, `R-D` at `(0,0)`, `(1,0)`, `(2,0)`.
4. Empty board; A places `B-X`, `G-X`, `P-X`, `O-X`, `Y-X`, `R-X` in a vertical line of 6.
5. Existing board has `R-C` at `(0,0)`; A places `R-S` at `(1,0)`.
6. Existing board has `R-C`, `R-S`; A places `R-D` at `(2,0)`.
7. Existing board has `B-X`; A places `G-X` and `P-X` vertically to extend to 3.
8. Existing board has `O-L`, `O-X`; A places `O-T` at the end to form a 3-tile same-color line.
9. Existing board has `Y-S`, `B-S`, `P-S`; A places `G-S` to extend same-shape line.
10. Existing board has a 5-tile line `R-C`, `R-S`, `R-D`, `R-T`, `R-L`; A places `R-X` to complete a Qwirkle.
11. Existing board has `G-C` at `(0,0)` and `G-S` at `(1,0)`; A places `G-D` at `(2,0)`.
12. Existing board has `B-D`, `G-D`, `P-D`; A places `O-D` on the same row.
13. Existing board has `R-X` at `(0,0)` and `B-X` at `(0,1)`; A places `G-X` at `(0,2)`.
14. Existing board has `R-C` at `(0,0)` and `R-S` at `(0,1)`; A places `R-D` at `(0,2)`.
15. Existing board has `O-T`, `O-L`; A places `O-X` to extend the line.
16. Existing board has `Y-C`, `B-C`, `G-C`; A places `P-C` to make 4 same-shape tiles.
17. Existing board has `R-D`, `B-D`, `G-D`, `P-D`, `O-D`; A places `Y-D` to complete 6.
18. Existing board has `R-T`, `R-L`, `R-X`; A places `R-D` to extend same-color line to 4.
19. Existing board has `B-S`, `G-S`, `P-S`, `O-S`; A places `Y-S` to extend same-shape line to 5.
20. Existing board has `R-C` at `(0,1)`, `R-D` at `(2,1)`, and `B-S` at `(1,0)`; A places `R-S` at `(1,1)`, creating a valid horizontal same-color line and a valid vertical same-shape line.
21. Existing board has `G-C` at `(0,0)`, `G-D` at `(0,2)`, and `B-S` at `(1,1)`; A places `G-S` at `(0,1)`, creating a valid vertical same-color line and a valid horizontal same-shape line.
22. Existing board has `R-C` at `(0,0)` and `B-C` at `(2,0)`; A fills `(1,0)` with `G-C` to make a 3-tile shape line.
23. Existing board has `O-X` at `(0,0)` and `O-T` at `(1,0)`; A places `O-L` at `(2,0)`.
24. Existing board has `P-S`, `B-S`; A places `G-S` to extend a same-shape line while touching another existing line perpendicularly.
25. Existing board has `R-C`, `R-S`, `R-D`; A places `R-T` to reach 4 and then draws back up.
26. A exchanges one tile while the bag has many tiles remaining.
27. A exchanges three tiles while the bag has at least three tiles available.
28. A exchanges all six rack tiles while the bag has six or more tiles remaining.
29. A passes on their turn even though a legal placement exists.
30. A passes because they cannot or do not want to place tiles.
31. A places `R-C` as the first move and the bag is later used for refill.
32. Existing board has `R-C` at `(0,0)`; A places `R-S` at `(-1,0)` and `R-D` at `(1,0)`, creating a valid horizontal same-color line that passes through the existing tile at the middle coordinate.
33. A places one tile that connects two existing tiles into a valid same-color line of 3.
34. A places one tile that completes a vertical same-shape line and a horizontal same-color line simultaneously.
35. A places tiles on negative coordinates that are otherwise valid.
36. A completes a 6-tile line and earns the 6-point Qwirkle bonus.
37. Existing board has `R-C` at `(-2,0)`, `R-S` at `(-1,0)`, `R-D` at `(1,0)`, `R-T` at `(2,0)`, `R-L` at `(3,0)`, `B-X` at `(0,-2)`, `G-X` at `(0,-1)`, `P-X` at `(0,1)`, `O-X` at `(0,2)`, and `Y-X` at `(0,3)`; A places `R-X` at `(0,0)` to complete two different 6-tile lines and earn two Qwirkle bonuses.
38. A places a tile adjacent only to one end of a long line, extending it by 1.
39. A places a tile adjacent to an existing tile and also to a perpendicular existing line, creating a valid cross.
40. A places a single tile on an otherwise empty board at `(100,-20)`.
41. A places a legal line using three tiles from `Rack(A)` and leaves more tiles in hand.
42. A places a legal line using five tiles from `Rack(A)` and draws one replacement tile.
43. A places the last tile in `Rack(A)` when the bag is empty, ending the game.
44. A places the last tile in `Rack(A)` when the bag is not empty, then draws back up and continues.
45. A completes a move that makes a line of 2 and a perpendicular line of 3, both valid.
46. An exchange action is accepted because the bag count exactly equals the number of exchanged tiles.
47. An exchange action is accepted after the selected tiles are removed, returned to the bag, shuffled, and redrawn.
48. A pass action is accepted immediately after a previous player completed a turn.
49. A legal placement on the first turn uses only one tile, which is allowed in this specification.
50. A legal placement uses two tiles of the same color with different shapes and no other constraints are violated.

### 15.2 Invalid Move Examples

1. Non-active player attempts to place tiles.
2. Active player tries to place a tile not in their rack.
3. Active player selects zero tiles for a placement.
4. Active player selects the same tile instance twice.
5. Active player targets an occupied coordinate.
6. Active player places tiles in two different rows on the same turn.
7. Active player places tiles in two different columns on the same turn.
8. Active player places tiles in an L shape.
9. Active player places tiles with a gap and no existing tile in the gap.
10. Active player places a disconnected tile cluster on the same turn.
11. Active player places a tile diagonally adjacent only.
12. Active player places a tile that does not touch the existing board after the first move.
13. Active player creates a line with mixed color and mixed shape rules.
14. Active player creates a line with duplicate same type tiles.
15. Active player creates a line of 7 tiles.
16. Active player creates a line of 8 tiles.
17. Active player creates one valid line but an additional perpendicular line is invalid.
18. Active player tries to branch a move into a plus shape with newly placed tiles.
19. Active player tries to cross an empty coordinate in the main placement line.
20. Active player places a tile that would create a line with two `R-C` tiles in the same line.
21. Active player places a tile that would make a same-shape line with duplicate colors.
22. Active player tries to place a tile on the board boundary in a system that wrongly imposes one.
23. Active player attempts exchange with zero selected tiles.
24. Active player attempts exchange with a tile not in their rack.
25. Active player attempts exchange with duplicate instance IDs in the selection.
26. Active player attempts exchange when the bag has fewer tiles than are being exchanged.
27. Active player attempts exchange while it is not their turn.
28. Active player attempts to exchange after already placing tiles in the same turn.
29. Active player attempts to pass while the game is in Game over state.
30. Active player attempts to place tiles while the game is in Waiting for players state.
31. Active player attempts to place tiles while the game is in Lobby state.
32. Active player attempts to join with a fifth active seat.
33. Setup tries to start a 1-player active game.
34. Setup deals 7 tiles to a player instead of 6.
35. Setup leaves the bag with an impossible tile count because a tile was duplicated or lost.
36. A move references the same target coordinate twice in one placement.
37. Existing board has `B-S` at `(0,1)`, `G-S` at `(2,1)`, `R-C` at `(1,0)`, and `Y-D` at `(1,2)`; A places `R-S` at `(1,1)`, which makes the horizontal line valid but the vertical line invalid because it mixes colors and shapes.
38. A move uses legal tiles from the rack but fails because the line length is 0 after normalization.
39. A move is otherwise legal but the player is not the server-authoritative current player.
40. A move tries to place a tile and then retroactively change the board in the same turn.
41. A player passes when pass is disabled by a higher-level product policy, if such a policy exists outside this spec.
42. A player exchanges tiles when the bag count is exactly one less than the selection size.
43. A player selects tiles from another player's rack.
44. A move attempts to score the same canonical line twice in the same turn.
45. A move tries to use a tile instance that has already been placed on the board.
46. A move tries to place tiles in a disconnected island after the bag is empty.
47. A move tries to create a line with more than one duplicate color-shape pair.
48. A move forms a valid line in one direction but an invalid line in the perpendicular direction.
49. A move places tiles but fails to commit them before the turn is advanced.
50. A move attempts to draw replacements before committing the board placement.

## 16. Implementation Notes

Recommended architecture:

Game engine layer:

- Own the committed board, bag, racks, scores, validation, and scoring.
- Treat tile instances as the atomic unit of identity.
- Validate moves only against authoritative server state.
- Compute line validation and scoring from a committed board plus a draft overlay.

Turn management layer:

- Own the current TurnDraft, locked axis, undo stack, and placement ordering.
- Prevent the UI from committing a move directly to the board without server validation.
- Recompute draft axis after every add or undo.

UI hint layer:

- May suggest playable squares, valid tile placements, and hover previews.
- Must never be the source of truth for legality.
- Must never be allowed to bypass engine validation.

Operational notes:

- Treat the server as the only source of truth.
- Persist full event history if replay, auditing, or reconnect support is needed.
- Keep hidden racks private at the transport layer, not just the UI layer.
- Validate against tile instances, not just tile types.
- Normalize move validation to deterministic server-side checks before mutating state.

### 16.1 Recommended Implementation Order

The project should be implemented in the following order to establish a solid foundation and enable incremental testing:

1. Tile definitions: Enums and data structures for colors, shapes, tile types, and tile instances.
2. Board representation: Sparse coordinate map with tile storage and lookup.
3. Line validation: The validateLine() algorithm and line rule enforcement.
4. Move validation: The 16-step validation ordering for placement, exchange, and pass.
5. Scoring engine: The scoreMove() algorithm with line scoring and Qwirkle bonuses.
6. TurnDraft system: Draft placements, axis locking, undo, and commit mechanics.
7. Game state management: State machine, turn order, player racks, bag management, endgame logic.
8. Unit tests: Comprehensive test suite covering all 100 test cases from Section 15.
9. Multiplayer networking: Server-authoritative synchronization, reconnection, hidden information.
10. Frontend UI: UI components, visualization, player interaction, preview hints.

Engine Design Principles:

The game engine must remain:

- Deterministic: Identical input always produces identical output. No randomness in the engine itself; randomness is seeded and controlled externally.
- Pure: Engine functions have no side effects; they accept input and return output without mutating global state.
- UI-agnostic: The engine contains no rendering, DOM manipulation, or display logic.
- Networking-agnostic: The engine contains no network calls, socket communication, or protocol handling.

Testing and Deployment:

- The engine should be fully testable without React, Socket.IO, databases, or browser APIs.
- All frontend validation and multiplayer synchronization must ultimately defer to the authoritative game engine.
- The engine may be tested in isolation with plain JavaScript unit tests (Jest, Mocha, etc.).
- Frontend and networking layers wrap the engine and enforce transport-layer constraints (e.g., hidden racks at the network boundary).

## 17. Minimal Acceptance Criteria

An engine that satisfies this README must:

- Enforce the 108-tile distribution.
- Enforce 2 to 4 players.
- Enforce line rules, placement rules, exchange rules, scoring, and end-game rules exactly as specified above.
- Preserve hidden-information constraints in multiplayer mode.
- Reject every invalid example in Section 15.2.
- Accept every valid example in Section 15.1.