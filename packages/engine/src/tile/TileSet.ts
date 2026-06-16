/**
 * TileSet: Factory and repository for all 108 tiles in the game.
 *
 * There are 6 colors × 6 shapes = 36 tile types.
 * Each tile type exists exactly 3 times.
 * Total: 36 × 3 = 108 tiles.
 */

import { Color, Shape, TileType, TileInstance } from '../types.js';

export class TileSet {
  private static readonly COLORS = [
    Color.Red,
    Color.Orange,
    Color.Yellow,
    Color.Green,
    Color.Blue,
    Color.Purple,
  ];

  private static readonly SHAPES = [
    Shape.Circle,
    Shape.Square,
    Shape.Diamond,
    Shape.Star,
    Shape.Clover,
    Shape.Cross,
  ];

  private static readonly COPIES_PER_TYPE = 3;
  private static readonly TOTAL_TILES = 108;

  /**
   * Get all 36 canonical tile types.
   */
  static getAllTileTypes(): TileType[] {
    const types: TileType[] = [];
    for (const color of this.COLORS) {
      for (const shape of this.SHAPES) {
        types.push({ color, shape });
      }
    }
    return types;
  }

  /**
   * Generate the full tile set of 108 instances.
   * Each instance gets a unique ID from 1 to 108.
   */
  static generateFullTileSet(): TileInstance[] {
    const tiles: TileInstance[] = [];
    let id = 1;

    for (const color of this.COLORS) {
      for (const shape of this.SHAPES) {
        for (let copy = 0; copy < this.COPIES_PER_TYPE; copy++) {
          tiles.push({
            id,
            type: { color, shape },
          });
          id++;
        }
      }
    }

    return tiles;
  }

  /**
   * Create a tile instance by ID (1-108).
   * Deterministic: same ID always produces same tile.
   */
  static getTileById(id: number): TileInstance {
    if (id < 1 || id > this.TOTAL_TILES) {
      throw new Error(`Invalid tile ID: ${id}. Must be between 1 and ${this.TOTAL_TILES}.`);
    }

    // Calculate which type and copy this ID corresponds to
    const typeIndex = Math.floor((id - 1) / this.COPIES_PER_TYPE);
    const colorIndex = Math.floor(typeIndex / this.SHAPES.length);
    const shapeIndex = typeIndex % this.SHAPES.length;

    const color = this.COLORS[colorIndex];
    const shape = this.SHAPES[shapeIndex];
    if (color === undefined || shape === undefined) {
      throw new Error(`Failed to resolve tile type for ID: ${id}`);
    }

    return {
      id,
      type: { color, shape },
    };
  }

  /**
   * Check if a tile ID is valid (1-108).
   */
  static isValidTileId(id: number): boolean {
    return Number.isInteger(id) && id >= 1 && id <= this.TOTAL_TILES;
  }

  /**
   * Get the total number of tiles.
   */
  static getTotalTileCount(): number {
    return this.TOTAL_TILES;
  }

  /**
   * Check if two tile types are equal.
   */
  static areTileTypesEqual(type1: TileType, type2: TileType): boolean {
    return type1.color === type2.color && type1.shape === type2.shape;
  }

  /**
   * Check if two tile instances are equal.
   */
  static areTileInstancesEqual(tile1: TileInstance, tile2: TileInstance): boolean {
    return tile1.id === tile2.id;
  }
}

export default TileSet;
