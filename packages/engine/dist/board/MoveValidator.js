/**
 * MoveValidator: Validates placements according to the 16-step ordering.
 *
 * This class implements the validation ordering from the README specification,
 * ordered from cheapest (state checks) to most expensive (board traversal).
 */
import CoordinateUtil from './Coordinate.js';
import LineValidator from './LineValidator.js';
export class MoveValidator {
    /**
     * Validate a placement move (16-step ordering).
     *
     * Returns null if valid, or a ValidationError if invalid.
     */
    static validatePlacement(placements, playerRack, board, isFirstMove) {
        // Step 1: Verify selection is non-empty
        if (placements.length === 0) {
            return {
                code: 'EMPTY_PLACEMENT',
                message: 'Must place at least one tile',
                stepNumber: 1,
            };
        }
        // Step 2: Verify all tiles belong to player's rack
        const rackIds = new Set(playerRack.map((t) => t.id));
        for (const placement of placements) {
            if (!rackIds.has(placement.tileId)) {
                return {
                    code: 'TILE_NOT_IN_RACK',
                    message: `Tile ${placement.tileId} not in player's rack`,
                    stepNumber: 2,
                };
            }
        }
        // Step 3: Verify tiles are distinct (no duplicate IDs)
        const placementIds = new Set(placements.map((p) => p.tileId));
        if (placementIds.size !== placements.length) {
            return {
                code: 'DUPLICATE_TILE_ID',
                message: 'Cannot place the same tile instance twice',
                stepNumber: 3,
            };
        }
        // Step 4: Verify all coordinates are distinct
        const coordSet = new Set(placements.map((p) => p.coordinate));
        if (coordSet.size !== placements.length) {
            return {
                code: 'DUPLICATE_COORDINATE',
                message: 'Cannot target the same coordinate twice',
                stepNumber: 4,
            };
        }
        // Step 5: Verify each coordinate is unoccupied on the board
        for (const placement of placements) {
            if (board.isOccupied(placement.coordinate)) {
                return {
                    code: 'COORDINATE_OCCUPIED',
                    message: `Coordinate ${placement.coordinate} is already occupied`,
                    stepNumber: 5,
                };
            }
        }
        // Step 6: Verify all coordinates are valid (parseable)
        for (const placement of placements) {
            if (!CoordinateUtil.isValid(placement.coordinate)) {
                return {
                    code: 'INVALID_COORDINATE',
                    message: `Invalid coordinate format: ${placement.coordinate}`,
                    stepNumber: 6,
                };
            }
        }
        // Step 7: Verify all placements align on the same axis
        const coords = placements.map((p) => p.coordinate);
        const axis = coords.length === 1 ? 'horizontal' : CoordinateUtil.getAxis(coords);
        if (axis === null) {
            return {
                code: 'NOT_COLLINEAR',
                message: 'All placements must be on the same row or column',
                stepNumber: 7,
            };
        }
        // Step 8: Verify placements are contiguous (no gaps)
        if (coords.length > 1) {
            const sorted = CoordinateUtil.sortByAxis(coords, axis);
            const span = CoordinateUtil.getSpan(sorted);
            for (const spanCoord of span.allCoordinates) {
                const isPlacement = coords.includes(spanCoord);
                const isExistingTile = board.isOccupied(spanCoord);
                if (!isPlacement && !isExistingTile) {
                    return {
                        code: 'GAP_IN_PLACEMENT',
                        message: `Gap at ${spanCoord} with no existing tile`,
                        stepNumber: 8,
                    };
                }
            }
        }
        // Step 9: Verify move connects to the board (unless first move)
        if (!isFirstMove && !board.isEmpty()) {
            let hasAdjacent = false;
            for (const placement of placements) {
                if (board.hasAdjacentTile(placement.coordinate)) {
                    hasAdjacent = true;
                    break;
                }
            }
            if (!hasAdjacent) {
                return {
                    code: 'NOT_ADJACENT',
                    message: 'Placement must be adjacent to at least one existing tile',
                    stepNumber: 9,
                };
            }
        }
        // Step 10: Verify first move constraint
        if (isFirstMove && !board.isEmpty()) {
            return {
                code: 'FIRST_MOVE_NOT_EMPTY',
                message: 'First move must be on an empty board',
                stepNumber: 10,
            };
        }
        // Steps 11-15: Build affected lines and validate them
        const placementMap = new Map();
        const workingBoard = board.clone();
        for (const placement of placements) {
            const tile = playerRack.find((t) => t.id === placement.tileId);
            if (tile) {
                placementMap.set(placement.coordinate, tile);
                workingBoard.placeTile(placement.coordinate, tile);
            }
        }
        // Get all affected lines (primary + perpendicular)
        const primaryAxis = axis;
        const affectedLines = this.getAffectedLines(workingBoard, placementMap, primaryAxis);
        // Validate primary line
        if (affectedLines.primary.length > 0) {
            const tiles = affectedLines.primary.map((coord) => {
                const placement = placementMap.get(coord);
                if (placement)
                    return placement;
                const existing = board.getTile(coord);
                if (existing)
                    return existing;
                throw new Error(`Tile not found at ${coord}`);
            });
            const lineResult = LineValidator.validateLine(tiles);
            if (!lineResult.valid) {
                return {
                    code: 'INVALID_PRIMARY_LINE',
                    message: `Primary line invalid: ${lineResult.reason}`,
                    stepNumber: 11,
                };
            }
            // Check line length
            if (tiles.length > 6) {
                return {
                    code: 'LINE_TOO_LONG',
                    message: 'Line exceeds 6 tiles',
                    stepNumber: 12,
                };
            }
        }
        // Validate perpendicular lines
        for (const perpLine of affectedLines.perpendicular) {
            const tiles = perpLine.map((coord) => {
                const placement = placementMap.get(coord);
                if (placement)
                    return placement;
                const existing = board.getTile(coord);
                if (existing)
                    return existing;
                throw new Error(`Tile not found at ${coord}`);
            });
            const lineResult = LineValidator.validateLine(tiles);
            if (!lineResult.valid) {
                return {
                    code: 'INVALID_PERPENDICULAR_LINE',
                    message: `Perpendicular line invalid: ${lineResult.reason}`,
                    stepNumber: 13,
                };
            }
            // Check line length
            if (tiles.length > 6) {
                return {
                    code: 'LINE_TOO_LONG',
                    message: 'Line exceeds 6 tiles',
                    stepNumber: 12,
                };
            }
        }
        // All checks passed
        return null;
    }
    /**
     * Get all lines affected by a placement.
     */
    static getAffectedLines(board, placements, primaryAxis) {
        const firstPlacement = placements.keys().next();
        const primary = firstPlacement.done
            ? []
            : board.getMaximalLine(firstPlacement.value, primaryAxis);
        const perpLines = new Map();
        for (const [coord, tile] of placements) {
            // Perpendicular line through this coordinate
            const perpAxis = primaryAxis === 'horizontal' ? 'vertical' : 'horizontal';
            const perp = board.getMaximalLine(coord, perpAxis);
            if (perp.length > 1) {
                perpLines.set(perp.join('|'), perp);
            }
        }
        const perpendicular = Array.from(perpLines.values());
        return { primary, perpendicular };
    }
}
export default MoveValidator;
//# sourceMappingURL=MoveValidator.js.map