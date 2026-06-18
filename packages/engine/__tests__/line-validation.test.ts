/**
 * Unit tests for line validation
 */

import { describe, it, expect } from 'vitest';
import { LineValidator, TileSet, Color, Shape, RuleFamily } from '../src/index.js';

function getTile(color: Color, shape: Shape) {
  const tile = TileSet.generateFullTileSet().find(
    (t) => t.type.color === color && t.type.shape === shape
  );
  if (!tile) {
    throw new Error(`Tile not found for ${color}-${shape}`);
  }
  return tile;
}

describe('LineValidator', () => {
  it('should reject empty lines', () => {
    const result = LineValidator.validateLine([]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('empty line');
  });

  it('should reject lines longer than 6', () => {
    const tiles = [];
    for (let i = 1; i <= 7; i++) {
      tiles.push(TileSet.getTileById(i));
    }
    const result = LineValidator.validateLine(tiles);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too long');
  });

  it('should accept single tiles', () => {
    const tile = TileSet.getTileById(1);
    const result = LineValidator.validateLine([tile]);
    expect(result.valid).toBe(true);
    expect(result.ruleFamily).toBe(RuleFamily.Single);
  });

  it('should reject duplicate tile types', () => {
    const tile1 = TileSet.getTileById(1); // Red Circle
    const tile2 = TileSet.getTileById(4); // Red Square
    const tile3 = TileSet.getTileById(1); // Red Circle (duplicate)

    const result = LineValidator.validateLine([tile1, tile2, tile3]);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('duplicate');
  });

  it('should accept same-color different-shape lines', () => {
    // All red tiles with different shapes
    const tile1 = TileSet.getTileById(1); // Red Circle
    const tile2 = TileSet.getTileById(4); // Red Square
    const tile3 = TileSet.getTileById(7); // Red Diamond

    const result = LineValidator.validateLine([tile1, tile2, tile3]);
    expect(result.valid).toBe(true);
    expect(result.ruleFamily).toBe(RuleFamily.SameColorDifferentShape);
  });

  it('should accept same-shape different-color lines', () => {
    // IDs: 1 (Red Circle), 37 (Orange Circle), 73 (Yellow Circle)
    const tile1 = TileSet.getTileById(1);
    const tile2 = TileSet.getTileById(37);
    const tile3 = TileSet.getTileById(73);

    const result = LineValidator.validateLine([tile1, tile2, tile3]);
    expect(result.valid).toBe(true);
    expect(result.ruleFamily).toBe(RuleFamily.SameShapeDifferentColor);
  });

  it('should reject mixed rule families', () => {
    // Red Circle, Red Square, Blue Square (mixed)
    const tile1 = TileSet.getTileById(1); // Red Circle
    const tile2 = TileSet.getTileById(4); // Red Square
    const tile3 = TileSet.getTileById(39); // Blue Square

    const result = LineValidator.validateLine([tile1, tile2, tile3]);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('mixed');
  });

  it('should accept Quirkle (all 6 shapes same color)', () => {
    // Red tiles with all 6 different shapes
    const tiles = [
      getTile(Color.Red, Shape.Circle),
      getTile(Color.Red, Shape.Square),
      getTile(Color.Red, Shape.Diamond),
      getTile(Color.Red, Shape.Star),
      getTile(Color.Red, Shape.Clover),
      getTile(Color.Red, Shape.Cross),
    ];

    const result = LineValidator.validateLine(tiles);
    expect(result.valid).toBe(true);
    expect(result.ruleFamily).toBe(RuleFamily.SameColorDifferentShape);
  });

  it('should accept maximum valid line (6 tiles)', () => {
    const tiles = [
      getTile(Color.Red, Shape.Circle),
      getTile(Color.Orange, Shape.Circle),
      getTile(Color.Yellow, Shape.Circle),
      getTile(Color.Green, Shape.Circle),
      getTile(Color.Blue, Shape.Circle),
      getTile(Color.Purple, Shape.Circle),
    ];

    const result = LineValidator.validateLine(tiles);
    expect(result.valid).toBe(true);
  });

  it('should correctly identify same-color lines', () => {
    const tile1 = TileSet.getTileById(1); // Red
    const tile2 = TileSet.getTileById(4); // Red
    const tile3 = TileSet.getTileById(7); // Red

    expect(LineValidator.isSameColorLine([tile1, tile2, tile3])).toBe(true);
    expect(LineValidator.isSameColorLine([tile1, TileSet.getTileById(37)])).toBe(false);
  });

  it('should correctly identify same-shape lines', () => {
    const tile1 = TileSet.getTileById(1); // Circle
    const tile2 = TileSet.getTileById(37); // Circle
    const tile3 = TileSet.getTileById(73); // Circle
    const nonMatchingShape = TileSet.getTileById(4); // Square

    expect(LineValidator.isSameShapeLine([tile1, tile2, tile3])).toBe(true);
    expect(LineValidator.isSameShapeLine([tile1, nonMatchingShape])).toBe(false);
  });
});
