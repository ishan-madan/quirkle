import type { Coordinate, Position } from '@engine/types';

export function toKey(x: number, y: number): Coordinate {
  return `${x},${y}` as Coordinate;
}

export function fromKey(coord: Coordinate): Position {
  const [x, y] = coord.split(',').map(Number);
  return { x, y };
}

export function parseCoord(coord: Coordinate): { x: number; y: number } {
  const [x, y] = coord.split(',').map(Number);
  return { x, y };
}
