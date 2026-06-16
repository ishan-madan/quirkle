/**
 * Unit tests for Board and Coordinate utilities
 */

import { describe, it, expect } from 'vitest';
import { Board, CoordinateUtil, TileSet, Color, Shape } from '../src/index.js';

describe('CoordinateUtil', () => {
  it('should serialize coordinates correctly', () => {
    expect(CoordinateUtil.serialize(0, 0)).toBe('0,0');
    expect(CoordinateUtil.serialize(3, -2)).toBe('3,-2');
    expect(CoordinateUtil.serialize(-5, 10)).toBe('-5,10');
  });

  it('should deserialize coordinates correctly', () => {
    const result1 = CoordinateUtil.deserialize('0,0');
    expect(result1.x).toBe(0);
    expect(result1.y).toBe(0);

    const result2 = CoordinateUtil.deserialize('3,-2');
    expect(result2.x).toBe(3);
    expect(result2.y).toBe(-2);
  });

  it('should check adjacency correctly', () => {
    expect(CoordinateUtil.areAdjacent('0,0', '1,0')).toBe(true);
    expect(CoordinateUtil.areAdjacent('0,0', '0,1')).toBe(true);
    expect(CoordinateUtil.areAdjacent('0,0', '1,1')).toBe(false);
    expect(CoordinateUtil.areAdjacent('0,0', '0,0')).toBe(false);
  });

  it('should get neighbors correctly', () => {
    const neighbors = CoordinateUtil.getNeighbors('0,0');
    expect(neighbors).toContain('1,0');
    expect(neighbors).toContain('-1,0');
    expect(neighbors).toContain('0,1');
    expect(neighbors).toContain('0,-1');
    expect(neighbors).toHaveLength(4);
  });

  it('should determine axis correctly', () => {
    expect(CoordinateUtil.getAxis(['0,0', '1,0', '2,0'])).toBe('horizontal');
    expect(CoordinateUtil.getAxis(['0,0', '0,1', '0,2'])).toBe('vertical');
    expect(CoordinateUtil.getAxis(['0,0', '1,1'])).toBeNull();
    expect(CoordinateUtil.getAxis(['0,0'])).toBeNull();
    expect(CoordinateUtil.getAxis([])).toBeNull();
  });

  it('should sort coordinates by axis', () => {
    const horizontal = CoordinateUtil.sortByAxis(['2,0', '0,0', '1,0'], 'horizontal');
    expect(horizontal).toEqual(['0,0', '1,0', '2,0']);

    const vertical = CoordinateUtil.sortByAxis(['0,2', '0,0', '0,1'], 'vertical');
    expect(vertical).toEqual(['0,0', '0,1', '0,2']);
  });

  it('should check contiguity correctly', () => {
    expect(CoordinateUtil.isContiguous(['0,0', '1,0', '2,0'])).toBe(true);
    expect(CoordinateUtil.isContiguous(['0,0', '2,0'])).toBe(false);
    expect(CoordinateUtil.isContiguous(['0,0'])).toBe(true);
  });

  it('should get span correctly', () => {
    const span = CoordinateUtil.getSpan(['0,0', '2,0', '1,0']);
    expect(span.start).toBe('0,0');
    expect(span.end).toBe('2,0');
    expect(span.allCoordinates).toEqual(['0,0', '1,0', '2,0']);
  });

  it('should validate coordinates correctly', () => {
    expect(CoordinateUtil.isValid('0,0')).toBe(true);
    expect(CoordinateUtil.isValid('3,-2')).toBe(true);
    expect(CoordinateUtil.isValid('invalid')).toBe(false);
    expect(CoordinateUtil.isValid('0')).toBe(false);
    expect(CoordinateUtil.isValid('0,0,0')).toBe(false);
  });
});

describe('Board', () => {
  it('should initialize empty', () => {
    const board = new Board();
    expect(board.isEmpty()).toBe(true);
    expect(board.getTileCount()).toBe(0);
  });

  it('should place tiles', () => {
    const board = new Board();
    const tile = TileSet.getTileById(1);

    board.placeTile('0,0', tile);

    expect(board.isOccupied('0,0')).toBe(true);
    expect(board.getTile('0,0')).toEqual(tile);
    expect(board.getTileCount()).toBe(1);
  });

  it('should prevent duplicate placements', () => {
    const board = new Board();
    const tile = TileSet.getTileById(1);

    board.placeTile('0,0', tile);
    expect(() => board.placeTile('0,0', tile)).toThrow();
  });

  it('should remove tiles', () => {
    const board = new Board();
    const tile = TileSet.getTileById(1);

    board.placeTile('0,0', tile);
    board.removeTile('0,0');

    expect(board.isOccupied('0,0')).toBe(false);
  });

  it('should get maximal lines (horizontal)', () => {
    const board = new Board();

    // Place three tiles horizontally
    board.placeTile('0,0', TileSet.getTileById(1));
    board.placeTile('1,0', TileSet.getTileById(2));
    board.placeTile('2,0', TileSet.getTileById(3));

    const line = board.getMaximalLine('1,0', 'horizontal');
    expect(line).toEqual(['0,0', '1,0', '2,0']);
  });

  it('should get maximal lines (vertical)', () => {
    const board = new Board();

    // Place three tiles vertically
    board.placeTile('0,0', TileSet.getTileById(1));
    board.placeTile('0,1', TileSet.getTileById(2));
    board.placeTile('0,2', TileSet.getTileById(3));

    const line = board.getMaximalLine('0,1', 'vertical');
    expect(line).toEqual(['0,0', '0,1', '0,2']);
  });

  it('should get neighbors correctly', () => {
    const board = new Board();
    board.placeTile('0,0', TileSet.getTileById(1));
    board.placeTile('1,0', TileSet.getTileById(2));
    board.placeTile('0,1', TileSet.getTileById(3));

    const neighbors = board.getNeighbors('0,0');
    expect(neighbors).toHaveLength(2);
    expect(neighbors.map((t) => t.id)).toContain(2);
    expect(neighbors.map((t) => t.id)).toContain(3);
  });

  it('should check adjacency correctly', () => {
    const board = new Board();
    board.placeTile('0,0', TileSet.getTileById(1));

    expect(board.hasAdjacentTile('1,0')).toBe(true);
    expect(board.hasAdjacentTile('0,1')).toBe(true);
    expect(board.hasAdjacentTile('2,2')).toBe(false);
  });

  it('should clone correctly', () => {
    const board = new Board();
    board.placeTile('0,0', TileSet.getTileById(1));

    const clone = board.clone();
    expect(clone.getTileCount()).toBe(1);
    expect(clone.isOccupied('0,0')).toBe(true);

    // Modify original
    board.placeTile('1,0', TileSet.getTileById(2));
    expect(board.getTileCount()).toBe(2);
    expect(clone.getTileCount()).toBe(1);
  });
});
