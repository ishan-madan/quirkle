/**
 * MoveValidator: Validates placements according to the 16-step ordering.
 *
 * This class implements the validation ordering from the README specification,
 * ordered from cheapest (state checks) to most expensive (board traversal).
 */
import { Placement, TileInstance, ValidationError } from '../types.js';
import Board from './Board.js';
export declare class MoveValidator {
    /**
     * Validate a placement move (16-step ordering).
     *
     * Returns null if valid, or a ValidationError if invalid.
     */
    static validatePlacement(placements: Placement[], playerRack: TileInstance[], board: Board, isFirstMove: boolean): ValidationError | null;
    /**
     * Get all lines affected by a placement.
     */
    private static getAffectedLines;
}
export default MoveValidator;
