/**
 * TileSet: Factory and repository for all 108 tiles in the game.
 *
 * There are 6 colors × 6 shapes = 36 tile types.
 * Each tile type exists exactly 3 times.
 * Total: 36 × 3 = 108 tiles.
 */
import { TileType, TileInstance } from '../types.js';
export declare class TileSet {
    private static readonly COLORS;
    private static readonly SHAPES;
    private static readonly COPIES_PER_TYPE;
    private static readonly TOTAL_TILES;
    /**
     * Get all 36 canonical tile types.
     */
    static getAllTileTypes(): TileType[];
    /**
     * Generate the full tile set of 108 instances.
     * Each instance gets a unique ID from 1 to 108.
     */
    static generateFullTileSet(): TileInstance[];
    /**
     * Create a tile instance by ID (1-108).
     * Deterministic: same ID always produces same tile.
     */
    static getTileById(id: number): TileInstance;
    /**
     * Check if a tile ID is valid (1-108).
     */
    static isValidTileId(id: number): boolean;
    /**
     * Get the total number of tiles.
     */
    static getTotalTileCount(): number;
    /**
     * Check if two tile types are equal.
     */
    static areTileTypesEqual(type1: TileType, type2: TileType): boolean;
    /**
     * Check if two tile instances are equal.
     */
    static areTileInstancesEqual(tile1: TileInstance, tile2: TileInstance): boolean;
}
export default TileSet;
