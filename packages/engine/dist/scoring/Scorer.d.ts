/**
 * Scorer: Implements the formal scoring algorithm from the README.
 *
 * Scoring rules:
 * - Each line scores its length (1-6 points)
 * - A 6-tile line (Qwirkle) earns +6 bonus points (total 12)
 * - Primary and perpendicular lines both score
 * - Lines are deduplicated (same line not scored twice)
 */
import { TileInstance, MoveScoreResult, Placement } from '../types.js';
import Board from '../board/Board.js';
export declare class Scorer {
    private static readonly QWIRKLE_BONUS;
    private static readonly MAX_LINE_LENGTH;
    /**
     * Score a move given the placements and current board state.
     */
    static scoreMove(placements: Placement[], board: Board, playerRack: TileInstance[]): MoveScoreResult;
    /**
     * Score a single line.
     */
    private static scoreLine;
    /**
     * Get the primary line through a set of placements.
     */
    private static getPrimaryLine;
    /**
     * Get a perpendicular line through a specific coordinate.
     */
    private static getPerpendicularLine;
}
export default Scorer;
