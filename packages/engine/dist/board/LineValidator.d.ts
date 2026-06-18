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
import { TileInstance, LineValidationResult } from '../types.js';
export declare class LineValidator {
    /**
     * Validate a line of tiles.
     * A line must consist of coordinates with tiles from a board/placement.
     */
    static validateLine(tiles: TileInstance[]): LineValidationResult;
    /**
     * Check if a tile can be added to an existing line.
     * Used for move validation to ensure placed tiles extend existing lines.
     */
    static canExtendLine(lineTiles: TileInstance[], newTile: TileInstance): boolean;
    /**
     * Check if tiles form a valid same-color line.
     */
    static isSameColorLine(tiles: TileInstance[]): boolean;
    /**
     * Check if tiles form a valid same-shape line.
     */
    static isSameShapeLine(tiles: TileInstance[]): boolean;
}
export default LineValidator;
