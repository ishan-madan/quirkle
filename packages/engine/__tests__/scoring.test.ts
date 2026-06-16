import { describe, it, expect } from 'vitest';
import { Board, CoordinateUtil, Scorer, TileSet } from '../src/index.js';

describe('Scoring regressions', () => {
  it('scores a simple two-tile line as 2 points', () => {
    const tiles = TileSet.generateFullTileSet();
    const redCircle = tiles.find((tile) => tile.type.color === 'red' && tile.type.shape === 'circle');
    const redSquare = tiles.find((tile) => tile.type.color === 'red' && tile.type.shape === 'square');

    if (!redCircle || !redSquare) {
      throw new Error('Required tiles were not found');
    }

    const playerRack = [redCircle, redSquare];
    const board = new Board();
    const placements = [
      { tileId: redCircle.id, coordinate: CoordinateUtil.serialize(0, 0) },
      { tileId: redSquare.id, coordinate: CoordinateUtil.serialize(1, 0) },
    ];

    const result = Scorer.scoreMove(placements, board, playerRack);

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.lineScores).toHaveLength(1);
    expect(result.lineScores[0]?.points).toBe(2);
  });
});
