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
import { Coordinate, GamePlayer, GameState, MoveResult } from '../types.js';
export interface GameEngineConfig {
    gameId: string;
    playerCount: 2 | 3 | 4;
    playerNames: string[];
    randomSeed?: number;
}
export declare class GameEngine {
    private gameId;
    private phase;
    private board;
    private bag;
    private players;
    private currentPlayerNumber;
    private turnNumber;
    private turnDraft;
    private consecutivePasses;
    private stalemateMode;
    private isGameOver;
    private winner;
    private isTied;
    constructor(config: GameEngineConfig);
    /**
     * Start the game: deal tiles and set first player.
     */
    startGame(firstPlayerNumber: number): void;
    /**
     * Get the current game state.
     */
    getGameState(): GameState;
    /**
     * Get the current player.
     */
    getCurrentPlayer(): GamePlayer;
    /**
     * Add a tile to the current player's draft.
     */
    addTileToDraft(tileId: number, coordinate: Coordinate): void;
    /**
     * Undo the last placement in the draft.
     */
    undoLastPlacement(): boolean;
    /**
     * Commit (confirm) the current draft as a move.
     */
    commitMove(): MoveResult;
    /**
     * Player exchanges tiles instead of placing.
     */
    exchangeTiles(tileIds: number[]): MoveResult;
    /**
     * Player passes their turn.
     */
    pass(): MoveResult;
    /**
     * Check endgame conditions after a move.
     */
    private checkEndgame;
    /**
     * End game due to a player emptying their rack.
     */
    private endGameByRackDepletion;
    /**
     * End game due to stalemate (all players pass consecutively with empty bag).
     */
    private endGameByStalemate;
    /**
     * Determine the winner(s) based on final scores.
     */
    private determineWinner;
    /**
     * Advance to the next player's turn.
     */
    private advanceToNextPlayer;
}
export default GameEngine;
