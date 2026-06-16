/**
 * Scorer: Implements the formal scoring algorithm from the README.
 *
 * Scoring rules:
 * - Each line scores its length (1-6 points)
 * - A 6-tile line (Qwirkle) earns +6 bonus points (total 12)
 * - Primary and perpendicular lines both score
 * - Lines are deduplicated (same line not scored twice)
 */
import CoordinateUtil from '../board/Coordinate.js';
import LineValidator from '../board/LineValidator.js';
export class Scorer {
    static QWIRKLE_BONUS = 6;
    static MAX_LINE_LENGTH = 6;
    /**
     * Score a move given the placements and current board state.
     */
    static scoreMove(placements, board, playerRack) {
        // Build placement map
        const placementMap = new Map();
        for (const placement of placements) {
            const tile = playerRack.find((t) => t.id === placement.tileId);
            if (!tile) {
                return {
                    success: false,
                    total: 0,
                    lineScores: [],
                    error: `Tile ${placement.tileId} not found in rack`,
                };
            }
            placementMap.set(placement.coordinate, tile);
        }
        // Determine primary axis
        const coords = placements.map((p) => p.coordinate);
        const primaryAxis = coords.length === 1 ? 'horizontal' : CoordinateUtil.getAxis(coords);
        if (!primaryAxis) {
            return {
                success: false,
                total: 0,
                lineScores: [],
                error: 'Placements not collinear',
            };
        }
        // Build a working board that includes this move's placements.
        const workingBoard = board.clone();
        for (const [coord, tile] of placementMap) {
            if (!workingBoard.isOccupied(coord)) {
                workingBoard.placeTile(coord, tile);
            }
        }
        // Get affected lines
        const lineScores = [];
        const scoredLineKeys = new Set();
        let total = 0;
        // Primary line
        const primaryLine = this.getPrimaryLine(placements, workingBoard, primaryAxis);
        if (primaryLine.length > 0) {
            const result = this.scoreLine(primaryLine, workingBoard);
            if (!result) {
                return {
                    success: false,
                    total: 0,
                    lineScores: [],
                    error: 'Invalid primary line',
                };
            }
            const key = primaryLine.join('|');
            if (!scoredLineKeys.has(key)) {
                scoredLineKeys.add(key);
                lineScores.push(result);
                total += result.points;
            }
        }
        // Perpendicular lines
        const perpendicularAxis = primaryAxis === 'horizontal' ? 'vertical' : 'horizontal';
        for (const placement of placements) {
            const perpLine = this.getPerpendicularLine(placement.coordinate, workingBoard, perpendicularAxis);
            if (perpLine.length > 1) {
                const result = this.scoreLine(perpLine, workingBoard);
                if (!result) {
                    return {
                        success: false,
                        total: 0,
                        lineScores: [],
                        error: 'Invalid perpendicular line',
                    };
                }
                const key = perpLine.join('|');
                if (!scoredLineKeys.has(key)) {
                    scoredLineKeys.add(key);
                    lineScores.push(result);
                    total += result.points;
                }
            }
        }
        return {
            success: true,
            total,
            lineScores,
        };
    }
    /**
     * Score a single line.
     */
    static scoreLine(coordinates, board) {
        const tiles = coordinates.map((coord) => {
            const tile = board.getTile(coord);
            if (!tile) {
                throw new Error(`Tile not found at ${coord}`);
            }
            return tile;
        });
        // Validate line
        const lineResult = LineValidator.validateLine(tiles);
        if (!lineResult.valid) {
            return null;
        }
        const baseScore = tiles.length;
        const isQwirkle = tiles.length === this.MAX_LINE_LENGTH;
        const bonus = isQwirkle ? this.QWIRKLE_BONUS : 0;
        const points = baseScore + bonus;
        return {
            line: tiles,
            points,
            isQwirkle,
        };
    }
    /**
     * Get the primary line through a set of placements.
     */
    static getPrimaryLine(placements, board, axis) {
        if (placements.length === 0) {
            return [];
        }
        // Get maximal line through first placement
        const firstCoord = placements[0].coordinate;
        return board.getMaximalLine(firstCoord, axis);
    }
    /**
     * Get a perpendicular line through a specific coordinate.
     */
    static getPerpendicularLine(coordinate, board, axis) {
        return board.getMaximalLine(coordinate, axis);
    }
}
export default Scorer;
//# sourceMappingURL=Scorer.js.map