import { describe, it, expect } from 'vitest';
import { Board, CoordinateUtil, MoveValidator, TileSet } from '../src/index.js';

function buildSameColorLine() {
  const tiles = TileSet.generateFullTileSet();
  const redCircle = tiles.find((tile) => tile.type.color === 'red' && tile.type.shape === 'circle');
  const redSquare = tiles.find((tile) => tile.type.color === 'red' && tile.type.shape === 'square');
  const redDiamond = tiles.find((tile) => tile.type.color === 'red' && tile.type.shape === 'diamond');

  if (!redCircle || !redSquare || !redDiamond) {
    throw new Error('Required tiles were not found');
  }

  return { redCircle, redSquare, redDiamond };
}

describe('Move validation regressions', () => {
  it('allows extending a line on both ends in one move', () => {
    const board = new Board();
    const { redCircle, redSquare, redDiamond } = buildSameColorLine();

    board.placeTile(CoordinateUtil.serialize(0, 0), redCircle);
    board.placeTile(CoordinateUtil.serialize(1, 0), redSquare);
    board.placeTile(CoordinateUtil.serialize(2, 0), redDiamond);

    const redStar = TileSet.generateFullTileSet().find(
      (tile) => tile.type.color === 'red' && tile.type.shape === 'star'
    );
    const redClover = TileSet.generateFullTileSet().find(
      (tile) => tile.type.color === 'red' && tile.type.shape === 'clover'
    );

    if (!redStar || !redClover) {
      throw new Error('Required tiles were not found');
    }

    const playerRack = [redStar, redClover];
    const placements = [
      { tileId: redStar.id, coordinate: CoordinateUtil.serialize(-1, 0) },
      { tileId: redClover.id, coordinate: CoordinateUtil.serialize(3, 0) },
    ];

    const error = MoveValidator.validatePlacement(placements, playerRack, board, false);
    expect(error).toBeNull();
  });
});
