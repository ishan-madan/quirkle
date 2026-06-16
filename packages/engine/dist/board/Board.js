/**
 * Board: Sparse coordinate map representation of placed tiles.
 *
 * The board is an infinite 2D integer grid represented as a sparse map.
 * Only occupied coordinates are stored.
 */
import CoordinateUtil from './Coordinate.js';
export class Board {
    tiles;
    constructor(initialTiles) {
        this.tiles = initialTiles ? new Map(initialTiles) : new Map();
    }
    /**
     * Check if a coordinate is occupied.
     */
    isOccupied(coordinate) {
        return this.tiles.has(coordinate);
    }
    /**
     * Get the tile at a coordinate, or undefined if empty.
     */
    getTile(coordinate) {
        return this.tiles.get(coordinate);
    }
    /**
     * Place a tile at a coordinate.
     * Throws if the coordinate is already occupied.
     */
    placeTile(coordinate, tile) {
        if (this.isOccupied(coordinate)) {
            throw new Error(`Coordinate ${coordinate} is already occupied`);
        }
        this.tiles.set(coordinate, tile);
    }
    /**
     * Remove a tile from the board.
     * Used for undo operations.
     */
    removeTile(coordinate) {
        this.tiles.delete(coordinate);
    }
    /**
     * Check if the board is empty.
     */
    isEmpty() {
        return this.tiles.size === 0;
    }
    /**
     * Get the number of tiles on the board.
     */
    getTileCount() {
        return this.tiles.size;
    }
    /**
     * Get all occupied coordinates.
     */
    getOccupiedCoordinates() {
        return Array.from(this.tiles.keys());
    }
    /**
     * Get all tiles on the board.
     */
    getAllTiles() {
        return Array.from(this.tiles.values());
    }
    /**
     * Get a maximal line through a coordinate (row or column).
     * Returns all tiles in the continuous line through that coordinate.
     */
    getMaximalLine(coordinate, axis) {
        const pos = CoordinateUtil.deserialize(coordinate);
        if (!this.isOccupied(coordinate)) {
            return [];
        }
        const line = [];
        if (axis === 'horizontal') {
            // Go left
            for (let x = pos.x; x >= Number.MIN_SAFE_INTEGER; x--) {
                const coord = CoordinateUtil.serialize(x, pos.y);
                if (this.isOccupied(coord)) {
                    line.unshift(coord);
                }
                else {
                    break;
                }
            }
            // Go right (starting from pos.x + 1 to avoid duplicating)
            for (let x = pos.x + 1; x <= Number.MAX_SAFE_INTEGER; x++) {
                const coord = CoordinateUtil.serialize(x, pos.y);
                if (this.isOccupied(coord)) {
                    line.push(coord);
                }
                else {
                    break;
                }
            }
        }
        else {
            // axis === 'vertical'
            // Go down
            for (let y = pos.y; y >= Number.MIN_SAFE_INTEGER; y--) {
                const coord = CoordinateUtil.serialize(pos.x, y);
                if (this.isOccupied(coord)) {
                    line.unshift(coord);
                }
                else {
                    break;
                }
            }
            // Go up
            for (let y = pos.y + 1; y <= Number.MAX_SAFE_INTEGER; y++) {
                const coord = CoordinateUtil.serialize(pos.x, y);
                if (this.isOccupied(coord)) {
                    line.push(coord);
                }
                else {
                    break;
                }
            }
        }
        return line;
    }
    /**
     * Get all lines affected by a set of placements.
     * Each placement may create a primary line and perpendicular lines.
     */
    getAffectedLines(placements, primaryAxis) {
        // Build working board with placements
        const workingBoard = new Map(this.tiles);
        for (const placement of placements) {
            workingBoard.set(placement.coordinate, placement.tile);
        }
        // Primary line (along the placement axis)
        let primary = [];
        if (placements.length > 0) {
            const firstCoord = placements[0].coordinate;
            primary = this.getMaximalLineFromBoard(workingBoard, firstCoord, primaryAxis);
        }
        // Perpendicular lines (one per placement, if length > 1)
        const perpendicularAxis = primaryAxis === 'horizontal' ? 'vertical' : 'horizontal';
        const perpendicular = [];
        for (const placement of placements) {
            const perpLine = this.getMaximalLineFromBoard(workingBoard, placement.coordinate, perpendicularAxis);
            if (perpLine.length > 1) {
                perpendicular.push(perpLine);
            }
        }
        return { primary, perpendicular };
    }
    /**
     * Get a maximal line from a given board state (for working board).
     */
    getMaximalLineFromBoard(board, coordinate, axis) {
        const pos = CoordinateUtil.deserialize(coordinate);
        const line = [];
        if (axis === 'horizontal') {
            for (let x = pos.x; x >= Number.MIN_SAFE_INTEGER; x--) {
                const coord = CoordinateUtil.serialize(x, pos.y);
                if (board.has(coord)) {
                    line.unshift(coord);
                }
                else {
                    break;
                }
            }
            for (let x = pos.x + 1; x <= Number.MAX_SAFE_INTEGER; x++) {
                const coord = CoordinateUtil.serialize(x, pos.y);
                if (board.has(coord)) {
                    line.push(coord);
                }
                else {
                    break;
                }
            }
        }
        else {
            for (let y = pos.y; y >= Number.MIN_SAFE_INTEGER; y--) {
                const coord = CoordinateUtil.serialize(pos.x, y);
                if (board.has(coord)) {
                    line.unshift(coord);
                }
                else {
                    break;
                }
            }
            for (let y = pos.y + 1; y <= Number.MAX_SAFE_INTEGER; y++) {
                const coord = CoordinateUtil.serialize(pos.x, y);
                if (board.has(coord)) {
                    line.push(coord);
                }
                else {
                    break;
                }
            }
        }
        return line;
    }
    /**
     * Get neighbors of a coordinate on the board.
     */
    getNeighbors(coordinate) {
        const neighbors = [];
        for (const neighbor of CoordinateUtil.getNeighbors(coordinate)) {
            const tile = this.getTile(neighbor);
            if (tile) {
                neighbors.push(tile);
            }
        }
        return neighbors;
    }
    /**
     * Check if a coordinate is adjacent to any occupied tile.
     */
    hasAdjacentTile(coordinate) {
        for (const neighbor of CoordinateUtil.getNeighbors(coordinate)) {
            if (this.isOccupied(neighbor)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Create a deep copy of the board.
     */
    clone() {
        return new Board(new Map(this.tiles));
    }
    /**
     * Get tiles in a specific line (row or column).
     * Returns coordinates and tiles along that line, sorted by position.
     */
    getLineWithTiles(coordinates) {
        return coordinates
            .map((coord) => ({
            coordinate: coord,
            tile: this.getTile(coord),
        }))
            .filter((item) => item.tile !== undefined);
    }
}
export default Board;
//# sourceMappingURL=Board.js.map