/**
 * LineValidator: Validates lines according to Quirkle rules.
 *
 * A valid line must:
 * - Have length 1-6
 * - If length > 1, satisfy one of two rules:
 *   1. Same color, all different shapes
 *   2. Same shape, all different colors
 * - Contain no duplicate tile types
 */
import { RuleFamily } from '../types.js';
export class LineValidator {
    /**
     * Validate a line of tiles.
     * A line must consist of coordinates with tiles from a board/placement.
     */
    static validateLine(tiles) {
        const length = tiles.length;
        // Empty line
        if (length === 0) {
            return {
                valid: false,
                reason: 'empty line',
            };
        }
        // Too long
        if (length > 6) {
            return {
                valid: false,
                reason: 'line too long (> 6 tiles)',
            };
        }
        // Single tile is always valid
        if (length === 1) {
            return {
                valid: true,
                ruleFamily: RuleFamily.Single,
            };
        }
        // Check for duplicate tile types
        const typeSet = new Set();
        for (const tile of tiles) {
            const key = `${tile.type.color}-${tile.type.shape}`;
            if (typeSet.has(key)) {
                return {
                    valid: false,
                    reason: 'duplicate tile type in line',
                };
            }
            typeSet.add(key);
        }
        // Extract colors and shapes
        const colors = new Set(tiles.map((t) => t.type.color));
        const shapes = new Set(tiles.map((t) => t.type.shape));
        const sameColor = colors.size === 1;
        const sameShape = shapes.size === 1;
        // Same color, all different shapes
        if (sameColor && shapes.size === length) {
            return {
                valid: true,
                ruleFamily: RuleFamily.SameColorDifferentShape,
            };
        }
        // Same shape, all different colors
        if (sameShape && colors.size === length) {
            return {
                valid: true,
                ruleFamily: RuleFamily.SameShapeDifferentColor,
            };
        }
        // Mixed rules (invalid)
        return {
            valid: false,
            reason: 'mixed rule family (neither same color nor same shape)',
        };
    }
    /**
     * Check if a tile can be added to an existing line.
     * Used for move validation to ensure placed tiles extend existing lines.
     */
    static canExtendLine(lineTiles, newTile) {
        if (lineTiles.length === 0) {
            return true; // Can always start a new line
        }
        const allTiles = [...lineTiles, newTile];
        const result = this.validateLine(allTiles);
        return result.valid;
    }
    /**
     * Check if tiles form a valid same-color line.
     */
    static isSameColorLine(tiles) {
        if (tiles.length <= 1)
            return true;
        const firstColor = tiles[0].type.color;
        return tiles.every((t) => t.type.color === firstColor);
    }
    /**
     * Check if tiles form a valid same-shape line.
     */
    static isSameShapeLine(tiles) {
        if (tiles.length <= 1)
            return true;
        const firstShape = tiles[0].type.shape;
        return tiles.every((t) => t.type.shape === firstShape);
    }
}
export default LineValidator;
//# sourceMappingURL=LineValidator.js.map