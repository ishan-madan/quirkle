/**
 * TileBag: Manages the draw pile for the game.
 *
 * Responsibilities:
 * - Hold 108 tiles initially (all tiles).
 * - Support drawing tiles (random or deterministic).
 * - Support returning tiles (from exchanges).
 * - Support shuffling.
 * - Expose tile count for endgame detection.
 */
import { TileInstance } from '../types.js';
export declare class TileBag {
    private tiles;
    constructor(initialTiles?: TileInstance[]);
    /**
     * Get the number of tiles remaining in the bag.
     */
    getCount(): number;
    /**
     * Check if the bag is empty.
     */
    isEmpty(): boolean;
    /**
     * Draw a single tile from the bag (removes it from bag).
     * Draws from the end of the array (O(1) operation).
     */
    drawTile(): TileInstance | undefined;
    /**
     * Draw multiple tiles from the bag.
     * Returns fewer tiles if the bag has fewer than requested.
     */
    drawTiles(count: number): TileInstance[];
    /**
     * Return tiles to the bag (from an exchange).
     * These tiles are added to the end (not reshuffled into position).
     */
    returnTiles(tiles: TileInstance[]): void;
    /**
     * Shuffle the bag in place.
     * Uses Fisher-Yates shuffle with a seeded RNG for determinism.
     *
     * @param seed - Optional seed for deterministic shuffling (for testing/replay).
     *               If not provided, uses non-deterministic Math.random().
     */
    shuffle(seed?: number): void;
    /**
     * Get a copy of the bag contents (for testing only).
     * Do not use this in production to avoid exposing bag order to clients.
     */
    getTiles(): TileInstance[];
    /**
     * Peek at the next tile without drawing it (for testing).
     */
    peekNextTile(): TileInstance | undefined;
}
export default TileBag;
