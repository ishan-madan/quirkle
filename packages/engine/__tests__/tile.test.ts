/**
 * Unit tests for TileSet
 */

import { describe, it, expect } from 'vitest';
import { TileSet, Color, Shape } from '../src/index.js';

describe('TileSet', () => {
  it('should generate all 36 tile types', () => {
    const types = TileSet.getAllTileTypes();
    expect(types).toHaveLength(36);

    // Should have 6 × 6 combinations
    const uniqueTypes = new Set(types.map((t) => `${t.color}-${t.shape}`));
    expect(uniqueTypes.size).toBe(36);
  });

  it('should generate full set of 108 tiles', () => {
    const tiles = TileSet.generateFullTileSet();
    expect(tiles).toHaveLength(108);

    // All IDs should be unique and in range 1-108
    const ids = tiles.map((t) => t.id);
    expect(new Set(ids).size).toBe(108);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(108);
  });

  it('should deterministically generate tiles by ID', () => {
    const tile1 = TileSet.getTileById(1);
    const tile1_2 = TileSet.getTileById(1);

    expect(tile1.id).toBe(tile1_2.id);
    expect(tile1.type.color).toBe(tile1_2.type.color);
    expect(tile1.type.shape).toBe(tile1_2.type.shape);
  });

  it('should throw on invalid tile IDs', () => {
    expect(() => TileSet.getTileById(0)).toThrow();
    expect(() => TileSet.getTileById(109)).toThrow();
    expect(() => TileSet.getTileById(-1)).toThrow();
  });

  it('should validate tile IDs correctly', () => {
    expect(TileSet.isValidTileId(1)).toBe(true);
    expect(TileSet.isValidTileId(108)).toBe(true);
    expect(TileSet.isValidTileId(0)).toBe(false);
    expect(TileSet.isValidTileId(109)).toBe(false);
    expect(TileSet.isValidTileId(1.5)).toBe(false);
  });

  it('should compare tile types correctly', () => {
    const redCircle1 = { color: Color.Red, shape: Shape.Circle };
    const redCircle2 = { color: Color.Red, shape: Shape.Circle };
    const blueCircle = { color: Color.Blue, shape: Shape.Circle };

    expect(TileSet.areTileTypesEqual(redCircle1, redCircle2)).toBe(true);
    expect(TileSet.areTileTypesEqual(redCircle1, blueCircle)).toBe(false);
  });

  it('should have 3 copies of each tile type', () => {
    const tiles = TileSet.generateFullTileSet();

    // Count tile types
    const typeCounts = new Map<string, number>();
    for (const tile of tiles) {
      const key = `${tile.type.color}-${tile.type.shape}`;
      typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
    }

    // Each type should appear exactly 3 times
    for (const count of typeCounts.values()) {
      expect(count).toBe(3);
    }
  });
});
