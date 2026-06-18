/**
 * Core types for the Quirkle game engine.
 * These types are fundamental to all game logic and are exported for use by frontend and backend.
 */

export enum Color {
  Red = 'red',
  Orange = 'orange',
  Yellow = 'yellow',
  Green = 'green',
  Blue = 'blue',
  Purple = 'purple',
}

export enum Shape {
  Circle = 'circle',
  Square = 'square',
  Diamond = 'diamond',
  Star = 'star',
  Clover = 'clover',
  Cross = 'cross',
}

export interface TileType {
  readonly color: Color;
  readonly shape: Shape;
}

export interface TileInstance {
  readonly id: number; // 1-108
  readonly type: TileType;
}

export type Coordinate = `${number},${number}`;

export interface Position {
  readonly x: number;
  readonly y: number;
}

export enum RuleFamily {
  Single = 'single',
  SameColorDifferentShape = 'sameColorDifferentShape',
  SameShapeDifferentColor = 'sameShapeDifferentColor',
}

export interface LineValidationResult {
  valid: boolean;
  reason?: string;
  ruleFamily?: RuleFamily;
}

export interface Placement {
  readonly tileId: number;
  readonly coordinate: Coordinate;
}

export interface TurnDraft {
  readonly placements: Placement[];
  readonly lockedAxis: 'horizontal' | 'vertical' | null;
}

export enum GamePhase {
  Lobby = 'lobby',
  WaitingForPlayers = 'waiting_for_players',
  Starting = 'starting',
  PlayerTurn = 'player_turn',
  TileExchange = 'tile_exchange',
  GameOver = 'game_over',
}

export interface GamePlayer {
  readonly id: string;
  readonly playerNumber: number;
  readonly name: string;
  score: number;
  rack: TileInstance[];
  isActive: boolean;
  isConnected: boolean;
}

export interface ScoreLineResult {
  readonly line: TileInstance[];
  readonly points: number;
  readonly isQuirkle: boolean;
}

export interface MoveScoreResult {
  readonly success: boolean;
  readonly total: number;
  readonly lineScores: ScoreLineResult[];
  readonly error?: string;
}

export interface MoveResult {
  readonly success: boolean;
  readonly score?: number;
  readonly scoreBreakdown?: ScoreLineResult[];
  readonly error?: string;
  readonly rejectionCode?: string;
}

export interface GameState {
  readonly gameId: string;
  readonly phase: GamePhase;
  readonly board: Map<Coordinate, TileInstance>;
  readonly players: Map<number, GamePlayer>;
  readonly currentPlayerNumber: number;
  readonly turnNumber: number;
  readonly bagCount: number;
  readonly consecutivePasses: number;
  readonly stalemateMode: boolean;
  readonly turnDraft: TurnDraft | null;
  readonly isGameOver: boolean;
  readonly winner?: number;
  readonly isTied?: boolean;
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly stepNumber?: number;
}
