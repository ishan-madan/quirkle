/**
 * GameEngine: Main orchestrator for the Qwirkle game.
 *
 * This is the authoritative game logic engine.
 * It coordinates:
 * - Game state management
 * - Turn processing
 * - Move validation and scoring
 * - Endgame detection
 */

import {
  Coordinate,
  GamePhase,
  GamePlayer,
  GameState,
  Placement,
  TileInstance,
  MoveResult,
  ValidationError,
} from '../types.js';
import Board from '../board/Board.js';
import CoordinateUtil from '../board/Coordinate.js';
import LineValidator from '../board/LineValidator.js';
import MoveValidator from '../board/MoveValidator.js';
import Scorer from '../scoring/Scorer.js';
import TileBag from '../tile/TileBag.js';
import TileSet from '../tile/TileSet.js';
import TurnDraft from '../turn/TurnDraft.js';

export interface GameEngineConfig {
  gameId: string;
  playerCount: 2 | 3 | 4;
  playerNames: string[];
  randomSeed?: number;
}

export class GameEngine {
  private gameId: string;
  private phase: GamePhase = GamePhase.Lobby;
  private board: Board = new Board();
  private bag: TileBag;
  private players: Map<number, GamePlayer> = new Map();
  private currentPlayerNumber: number = 1;
  private turnNumber: number = 0;
  private turnDraft: TurnDraft | null = null;
  private consecutivePasses: number = 0;
  private stalemateMode: boolean = false;
  private isGameOver: boolean = false;
  private winner: number | undefined;
  private isTied: boolean = false;

  constructor(config: GameEngineConfig) {
    this.gameId = config.gameId;

    if (config.playerNames.length !== config.playerCount) {
      throw new Error(
        `playerNames length (${config.playerNames.length}) must match playerCount (${config.playerCount})`
      );
    }

    // Initialize bag
    this.bag = new TileBag();
    if (config.randomSeed !== undefined) {
      this.bag.shuffle(config.randomSeed);
    } else {
      this.bag.shuffle();
    }

    // Initialize players
    for (let i = 0; i < config.playerCount; i++) {
      const playerNumber = i + 1;
      const playerName = config.playerNames[i];
      if (playerName === undefined) {
        throw new Error(`Missing player name for player ${playerNumber}`);
      }
      this.players.set(playerNumber, {
        id: `player-${playerNumber}`,
        playerNumber,
        name: playerName,
        score: 0,
        rack: [],
        isActive: true,
        isConnected: true,
      });
    }
  }

  /**
   * Start the game: deal tiles and set first player.
   */
  startGame(firstPlayerNumber: number): void {
    if (this.phase !== GamePhase.Lobby) {
      throw new Error('Game already started');
    }

    // Deal 6 tiles to each player
    for (const [, player] of this.players) {
      player.rack = this.bag.drawTiles(6);
    }

    // Set first player
    this.currentPlayerNumber = firstPlayerNumber;
    this.phase = GamePhase.PlayerTurn;
    this.turnNumber = 0;
  }

  /**
   * Get the current game state.
   */
  getGameState(): GameState {
    return {
      gameId: this.gameId,
      phase: this.phase,
      board: new Map(this.board['tiles'] as Map<Coordinate, TileInstance>),
      players: new Map(this.players),
      currentPlayerNumber: this.currentPlayerNumber,
      turnNumber: this.turnNumber,
      bagCount: this.bag.getCount(),
      consecutivePasses: this.consecutivePasses,
      stalemateMode: this.stalemateMode,
      turnDraft: this.turnDraft?.getDraft() || null,
      isGameOver: this.isGameOver,
      isTied: this.isTied,
      ...(this.winner !== undefined ? { winner: this.winner } : {}),
    };
  }

  /**
   * Get the current player.
   */
  getCurrentPlayer(): GamePlayer {
    const player = this.players.get(this.currentPlayerNumber);
    if (!player) {
      throw new Error(`Player ${this.currentPlayerNumber} not found`);
    }
    return player;
  }

  /**
   * Add a tile to the current player's draft.
   */
  addTileToDraft(tileId: number, coordinate: Coordinate): void {
    if (this.phase !== GamePhase.PlayerTurn) {
      throw new Error('Not in player turn phase');
    }

    if (!this.turnDraft) {
      this.turnDraft = new TurnDraft();
    }

    const player = this.getCurrentPlayer();
    const tile = player.rack.find((t) => t.id === tileId);
    if (!tile) {
      throw new Error(`Tile ${tileId} not in current player's rack`);
    }

    this.turnDraft.addPlacement({ tileId, coordinate });
  }

  /**
   * Undo the last placement in the draft.
   */
  undoLastPlacement(): boolean {
    if (!this.turnDraft) {
      return false;
    }

    return this.turnDraft.undo();
  }

  /**
   * Commit (confirm) the current draft as a move.
   */
  commitMove(): MoveResult {
    if (this.phase !== GamePhase.PlayerTurn) {
      return {
        success: false,
        error: 'Not in player turn phase',
      };
    }

    if (!this.turnDraft || this.turnDraft.isEmpty()) {
      return {
        success: false,
        error: 'No tiles in draft',
      };
    }

    const placements = this.turnDraft.getPlacements();
    const player = this.getCurrentPlayer();
    const isFirstMove = this.board.isEmpty();

    // Validate placements (16-step validation)
    const validationError = MoveValidator.validatePlacement(
      placements,
      player.rack,
      this.board,
      isFirstMove
    );

    if (validationError) {
      return {
        success: false,
        error: validationError.message,
        rejectionCode: validationError.code,
      };
    }

    // Score the move
    const scoreResult = Scorer.scoreMove(placements, this.board, player.rack);
    if (!scoreResult.success) {
      return {
        success: false,
        error: scoreResult.error ?? 'Scoring failed',
      };
    }

    // Apply placements to board
    for (const placement of placements) {
      const tile = player.rack.find((t) => t.id === placement.tileId);
      if (!tile) {
        return {
          success: false,
          error: 'Tile not found in rack during commit',
        };
      }
      this.board.placeTile(placement.coordinate, tile);
    }

    // Remove placed tiles from player's rack
    const placedIds = new Set(placements.map((p) => p.tileId));
    player.rack = player.rack.filter((t) => !placedIds.has(t.id));

    // Draw replacement tiles
    const tilesToDraw = 6 - player.rack.length;
    const drawnTiles = this.bag.drawTiles(tilesToDraw);
    player.rack.push(...drawnTiles);

    // Update score
    player.score += scoreResult.total;

    // Reset consecutive passes
    this.consecutivePasses = 0;

    // Clear draft
    this.turnDraft = null;

    // Check endgame conditions
    this.checkEndgame();

    // If game not over, advance to next player
    if (!this.isGameOver) {
      this.advanceToNextPlayer();
    }

    return {
      success: true,
      score: scoreResult.total,
      scoreBreakdown: scoreResult.lineScores,
    };
  }

  /**
   * Player exchanges tiles instead of placing.
   */
  exchangeTiles(tileIds: number[]): MoveResult {
    if (this.phase !== GamePhase.PlayerTurn) {
      return {
        success: false,
        error: 'Not in player turn phase',
      };
    }

    if (tileIds.length === 0) {
      return {
        success: false,
        error: 'Must exchange at least one tile',
      };
    }

    if (this.bag.getCount() < tileIds.length) {
      return {
        success: false,
        error: 'Not enough tiles in bag',
      };
    }

    const player = this.getCurrentPlayer();
    const tileIdSet = new Set(tileIds);

    // Verify all tiles are in player's rack
    const tilesToExchange: TileInstance[] = [];
    for (const tileId of tileIds) {
      const tile = player.rack.find((t) => t.id === tileId);
      if (!tile) {
        return {
          success: false,
          error: `Tile ${tileId} not in rack`,
        };
      }
      tilesToExchange.push(tile);
    }

    // Remove from rack
    player.rack = player.rack.filter((t) => !tileIdSet.has(t.id));

    // Return to bag
    this.bag.returnTiles(tilesToExchange);
    this.bag.shuffle();

    // Draw replacement tiles
    const drawnTiles = this.bag.drawTiles(tilesToExchange.length);
    player.rack.push(...drawnTiles);

    // Reset consecutive passes
    this.consecutivePasses = 0;

    // Clear draft
    this.turnDraft = null;

    // Advance to next player
    this.advanceToNextPlayer();

    return {
      success: true,
      score: 0,
    };
  }

  /**
   * Player passes their turn.
   */
  pass(): MoveResult {
    if (this.phase !== GamePhase.PlayerTurn) {
      return {
        success: false,
        error: 'Not in player turn phase',
      };
    }

    // Clear draft
    this.turnDraft = null;

    // Increment consecutive passes
    this.consecutivePasses++;

    // Check if game ends by stalemate
    if (this.stalemateMode && this.consecutivePasses >= this.players.size) {
      this.endGameByStalemate();
      return {
        success: true,
        score: 0,
      };
    }

    // Advance to next player
    this.advanceToNextPlayer();

    return {
      success: true,
      score: 0,
    };
  }

  /**
   * Check endgame conditions after a move.
   */
  private checkEndgame(): void {
    const currentPlayer = this.getCurrentPlayer();

    // Condition 1: Rack empty and bag empty
    if (currentPlayer.rack.length === 0 && this.bag.isEmpty()) {
      this.endGameByRackDepletion();
      return;
    }

    // Condition 2: Bag empty, enter stalemate mode
    if (this.bag.isEmpty() && !this.stalemateMode) {
      this.stalemateMode = true;
      this.consecutivePasses = 0;
    }
  }

  /**
   * End game due to a player emptying their rack.
   */
  private endGameByRackDepletion(): void {
    this.isGameOver = true;
    this.phase = GamePhase.GameOver;

    // Award rack-empty bonus
    const currentPlayer = this.getCurrentPlayer();
    let rackBonusTotal = 6;
    currentPlayer.score += rackBonusTotal;

    // Determine winner
    this.determineWinner();
  }

  /**
   * End game due to stalemate (all players pass consecutively with empty bag).
   */
  private endGameByStalemate(): void {
    this.isGameOver = true;
    this.phase = GamePhase.GameOver;

    // No rack-empty bonus in stalemate
    this.determineWinner();
  }

  /**
   * Determine the winner(s) based on final scores.
   */
  private determineWinner(): void {
    let maxScore = -Infinity;
    let winners: number[] = [];

    for (const [, player] of this.players) {
      if (player.score > maxScore) {
        maxScore = player.score;
        winners = [player.playerNumber];
      } else if (player.score === maxScore) {
        winners.push(player.playerNumber);
      }
    }

    if (winners.length === 1) {
      this.winner = winners[0];
      this.isTied = false;
    } else {
      // Tie (multiple winners)
      this.winner = winners[0]; // First winner (arbitrary)
      this.isTied = true;
    }
  }

  /**
   * Advance to the next player's turn.
   */
  private advanceToNextPlayer(): void {
    const playerCount = this.players.size;
    this.currentPlayerNumber = ((this.currentPlayerNumber % playerCount) + 1) || playerCount;
    this.turnNumber++;
  }
}

export default GameEngine;
