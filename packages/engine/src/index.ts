/**
 * Quirkle Game Engine
 *
 * Main export file. Contains the complete, deterministic, UI-agnostic
 * game engine for Quirkle, following the specification in README.md.
 */

export * from './types.js';
export { TileSet } from './tile/TileSet.js';
export { TileBag } from './tile/TileBag.js';
export { Board } from './board/Board.js';
export { CoordinateUtil } from './board/Coordinate.js';
export { LineValidator } from './board/LineValidator.js';
export { MoveValidator } from './board/MoveValidator.js';
export { Scorer } from './scoring/Scorer.js';
export { TurnDraft } from './turn/TurnDraft.js';
export { GameEngine, type GameEngineConfig } from './game/GameEngine.js';
