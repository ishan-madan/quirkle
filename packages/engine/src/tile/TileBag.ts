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
import TileSet from './TileSet.js';

export class TileBag {
  private tiles: TileInstance[];

  constructor(initialTiles?: TileInstance[]) {
    if (initialTiles) {
      this.tiles = [...initialTiles];
    } else {
      this.tiles = TileSet.generateFullTileSet();
    }
  }

  /**
   * Get the number of tiles remaining in the bag.
   */
  getCount(): number {
    return this.tiles.length;
  }

  /**
   * Check if the bag is empty.
   */
  isEmpty(): boolean {
    return this.tiles.length === 0;
  }

  /**
   * Draw a single tile from the bag (removes it from bag).
   * Draws from the end of the array (O(1) operation).
   */
  drawTile(): TileInstance | undefined {
    return this.tiles.pop();
  }

  /**
   * Draw multiple tiles from the bag.
   * Returns fewer tiles if the bag has fewer than requested.
   */
  drawTiles(count: number): TileInstance[] {
    const drawn: TileInstance[] = [];
    for (let i = 0; i < count && this.tiles.length > 0; i++) {
      const tile = this.tiles.pop();
      if (tile) {
        drawn.push(tile);
      }
    }
    return drawn;
  }

  /**
   * Return tiles to the bag (from an exchange).
   * These tiles are added to the end (not reshuffled into position).
   */
  returnTiles(tiles: TileInstance[]): void {
    for (const tile of tiles) {
      if (!TileSet.isValidTileId(tile.id)) {
        throw new Error(`Invalid tile ID in return: ${tile.id}`);
      }
      this.tiles.push(tile);
    }
  }

  /**
   * Shuffle the bag in place.
   * Uses Fisher-Yates shuffle with a seeded RNG for determinism.
   *
   * @param seed - Optional seed for deterministic shuffling (for testing/replay).
   *               If not provided, uses non-deterministic Math.random().
   */
  shuffle(seed?: number): void {
    let rng = seed !== undefined ? new SeededRandom(seed) : Math.random;

    // Fisher-Yates shuffle
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(typeof rng === 'function' ? rng() : rng.next()) * (i + 1);
      const current = this.tiles[i];
      const selected = this.tiles[j];
      if (!current || !selected) {
        continue;
      }
      this.tiles[i] = selected;
      this.tiles[j] = current;
    }
  }

  /**
   * Get a copy of the bag contents (for testing only).
   * Do not use this in production to avoid exposing bag order to clients.
   */
  getTiles(): TileInstance[] {
    return [...this.tiles];
  }

  /**
   * Peek at the next tile without drawing it (for testing).
   */
  peekNextTile(): TileInstance | undefined {
    return this.tiles[this.tiles.length - 1];
  }
}

/**
 * Simple seeded RNG for deterministic shuffling.
 * Uses linear congruential generator.
 */
class SeededRandom {
  private seed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = 2 ** 32;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return (this.seed >>> 0) / this.m;
  }
}

export default TileBag;
