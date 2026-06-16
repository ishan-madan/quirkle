/**
 * Board: Sparse coordinate map representation of placed tiles.
 *
 * The board is an infinite 2D integer grid represented as a sparse map.
 * Only occupied coordinates are stored.
 */
import { Coordinate, TileInstance } from '../types.js';
export declare class Board {
    private tiles;
    constructor(initialTiles?: Map<Coordinate, TileInstance>);
    /**
     * Check if a coordinate is occupied.
     */
    isOccupied(coordinate: Coordinate): boolean;
    /**
     * Get the tile at a coordinate, or undefined if empty.
     */
    getTile(coordinate: Coordinate): TileInstance | undefined;
    /**
     * Place a tile at a coordinate.
     * Throws if the coordinate is already occupied.
     */
    placeTile(coordinate: Coordinate, tile: TileInstance): void;
    /**
     * Remove a tile from the board.
     * Used for undo operations.
     */
    removeTile(coordinate: Coordinate): void;
    /**
     * Check if the board is empty.
     */
    isEmpty(): boolean;
    /**
     * Get the number of tiles on the board.
     */
    getTileCount(): number;
    /**
     * Get all occupied coordinates.
     */
    getOccupiedCoordinates(): Coordinate[];
    /**
     * Get all tiles on the board.
     */
    getAllTiles(): TileInstance[];
    /**
     * Get a maximal line through a coordinate (row or column).
     * Returns all tiles in the continuous line through that coordinate.
     */
    getMaximalLine(coordinate: Coordinate, axis: 'horizontal' | 'vertical'): Coordinate[];
    /**
     * Get all lines affected by a set of placements.
     * Each placement may create a primary line and perpendicular lines.
     */
    getAffectedLines(placements: Array<{
        coordinate: Coordinate;
        tile: TileInstance;
    }>, primaryAxis: 'horizontal' | 'vertical'): {
        primary: Coordinate[];
        perpendicular: Coordinate[][];
    };
    /**
     * Get a maximal line from a given board state (for working board).
     */
    private getMaximalLineFromBoard;
    /**
     * Get neighbors of a coordinate on the board.
     */
    getNeighbors(coordinate: Coordinate): TileInstance[];
    /**
     * Check if a coordinate is adjacent to any occupied tile.
     */
    hasAdjacentTile(coordinate: Coordinate): boolean;
    /**
     * Create a deep copy of the board.
     */
    clone(): Board;
    /**
     * Get tiles in a specific line (row or column).
     * Returns coordinates and tiles along that line, sorted by position.
     */
    getLineWithTiles(coordinates: Coordinate[]): Array<{
        coordinate: Coordinate;
        tile: TileInstance;
    }>;
}
export default Board;
