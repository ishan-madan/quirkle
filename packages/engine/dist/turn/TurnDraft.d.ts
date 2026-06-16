/**
 * TurnDraft: Manages the draft state during a player's turn.
 *
 * Responsibilities:
 * - Accumulate placements
 * - Lock axis after second placement
 * - Support undo (remove last placement)
 * - Recompute locked axis after undo
 * - Expose draft state for UI
 */
import { Placement, TurnDraft as TurnDraftType } from '../types.js';
export declare class TurnDraft {
    private placements;
    private lockedAxis;
    /**
     * Add a placement to the draft.
     */
    addPlacement(placement: Placement): void;
    /**
     * Remove the last placement from the draft (undo).
     */
    undo(): boolean;
    /**
     * Clear all placements in the draft.
     */
    clear(): void;
    /**
     * Get the current draft state.
     */
    getDraft(): TurnDraftType;
    /**
     * Get all placements in the draft.
     */
    getPlacements(): Placement[];
    /**
     * Get the locked axis (null if not yet determined).
     */
    getLockedAxis(): 'horizontal' | 'vertical' | null;
    /**
     * Check if the draft is empty.
     */
    isEmpty(): boolean;
    /**
     * Get the number of placements in the draft.
     */
    getPlacementCount(): number;
    /**
     * Check if a placement would be valid to add (doesn't break collinearity).
     */
    canAddPlacement(placement: Placement): boolean;
    /**
     * Determine the locked axis from the first two placements.
     */
    private updateLockedAxis;
    /**
     * Recompute locked axis from current placements (used after undo).
     */
    private recomputeLockedAxis;
    /**
     * Create a deep copy of the draft.
     */
    clone(): TurnDraft;
}
export default TurnDraft;
