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
import CoordinateUtil from '../board/Coordinate.js';
export class TurnDraft {
    placements = [];
    lockedAxis = null;
    /**
     * Add a placement to the draft.
     */
    addPlacement(placement) {
        // Check for duplicate coordinate
        if (this.placements.some((p) => p.coordinate === placement.coordinate)) {
            throw new Error(`Duplicate coordinate in draft: ${placement.coordinate}`);
        }
        // Check for duplicate tile ID
        if (this.placements.some((p) => p.tileId === placement.tileId)) {
            throw new Error(`Duplicate tile ID in draft: ${placement.tileId}`);
        }
        this.placements.push(placement);
        // Update locked axis after second placement
        if (this.placements.length === 2) {
            this.updateLockedAxis();
        }
    }
    /**
     * Remove the last placement from the draft (undo).
     */
    undo() {
        if (this.placements.length === 0) {
            return false;
        }
        this.placements.pop();
        this.recomputeLockedAxis();
        return true;
    }
    /**
     * Clear all placements in the draft.
     */
    clear() {
        this.placements = [];
        this.lockedAxis = null;
    }
    /**
     * Get the current draft state.
     */
    getDraft() {
        return {
            placements: [...this.placements],
            lockedAxis: this.lockedAxis,
        };
    }
    /**
     * Get all placements in the draft.
     */
    getPlacements() {
        return [...this.placements];
    }
    /**
     * Get the locked axis (null if not yet determined).
     */
    getLockedAxis() {
        return this.lockedAxis;
    }
    /**
     * Check if the draft is empty.
     */
    isEmpty() {
        return this.placements.length === 0;
    }
    /**
     * Get the number of placements in the draft.
     */
    getPlacementCount() {
        return this.placements.length;
    }
    /**
     * Check if a placement would be valid to add (doesn't break collinearity).
     */
    canAddPlacement(placement) {
        // Can always add first placement
        if (this.placements.length === 0) {
            return true;
        }
        // Can always add second placement (it will lock the axis)
        if (this.placements.length === 1) {
            return true;
        }
        // Check collinearity with locked axis
        if (this.lockedAxis === null) {
            // Should not happen, but allow it
            return true;
        }
        const allCoords = [...this.placements.map((p) => p.coordinate), placement.coordinate];
        const axis = CoordinateUtil.getAxis(allCoords);
        return axis === this.lockedAxis;
    }
    /**
     * Determine the locked axis from the first two placements.
     */
    updateLockedAxis() {
        if (this.placements.length < 2) {
            return;
        }
        const pos1 = CoordinateUtil.deserialize(this.placements[0].coordinate);
        const pos2 = CoordinateUtil.deserialize(this.placements[1].coordinate);
        if (pos1.y === pos2.y) {
            this.lockedAxis = 'horizontal';
        }
        else if (pos1.x === pos2.x) {
            this.lockedAxis = 'vertical';
        }
        else {
            throw new Error('Second placement is not collinear with first');
        }
    }
    /**
     * Recompute locked axis from current placements (used after undo).
     */
    recomputeLockedAxis() {
        if (this.placements.length < 2) {
            this.lockedAxis = null;
            return;
        }
        this.updateLockedAxis();
    }
    /**
     * Create a deep copy of the draft.
     */
    clone() {
        const copy = new TurnDraft();
        copy.placements = [...this.placements];
        copy.lockedAxis = this.lockedAxis;
        return copy;
    }
}
export default TurnDraft;
//# sourceMappingURL=TurnDraft.js.map