import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Board as EngineBoard, GameEngine, MoveValidator, type Coordinate, type GameState, type Placement, type TileInstance } from '@engine';
import { BoardViewport } from './components/BoardViewport';
import { GameHeader } from './components/GameHeader';
import { Scoreboard } from './components/Scoreboard';
import { TileRack } from './components/TileRack';
import { parseCoord, toKey } from './lib/coords';

function initEngine(): GameEngine {
  const engine = new GameEngine({
    gameId: 'local-game-001',
    playerCount: 2,
    playerNames: ['Player One', 'Player Two'],
    randomSeed: 42,
  });
  engine.startGame(1);
  return engine;
}

function buildDraftTileMap(state: GameState): Map<Coordinate, TileInstance> {
  const currentPlayer = state.players.get(state.currentPlayerNumber);
  const rack = currentPlayer?.rack ?? [];
  const rackById = new Map(rack.map((tile) => [tile.id, tile]));

  const result = new Map<Coordinate, TileInstance>();
  const placements = state.turnDraft?.placements ?? [];
  for (const placement of placements) {
    const tile = rackById.get(placement.tileId);
    if (tile) {
      result.set(placement.coordinate, tile);
    }
  }

  return result;
}

function buildValidTargets(state: GameState): Set<Coordinate> {
  const currentPlayer = state.players.get(state.currentPlayerNumber);
  if (!currentPlayer) {
    return new Set();
  }

  const placements = state.turnDraft?.placements ?? [];
  const placedIds = new Set(placements.map((p) => p.tileId));
  const availableTiles = currentPlayer.rack.filter((tile) => !placedIds.has(tile.id));

  if (availableTiles.length === 0) {
    return new Set();
  }

  const board = new EngineBoard(state.board);
  const occupied = new Set<Coordinate>(state.board.keys());
  for (const placement of placements) {
    occupied.add(placement.coordinate);
  }

  const candidates = new Set<Coordinate>();
  if (occupied.size === 0) {
    candidates.add('0,0' as Coordinate);
  } else {
    for (const coord of occupied) {
      const { x, y } = parseCoord(coord);
      candidates.add(toKey(x + 1, y));
      candidates.add(toKey(x - 1, y));
      candidates.add(toKey(x, y + 1));
      candidates.add(toKey(x, y - 1));
    }
  }

  const valid = new Set<Coordinate>();
  for (const candidate of candidates) {
    if (occupied.has(candidate)) {
      continue;
    }

    let canPlace = false;
    for (const tile of availableTiles) {
      const tentative: Placement[] = [...placements, { tileId: tile.id, coordinate: candidate }];
      const error = MoveValidator.validatePlacement(
        tentative,
        currentPlayer.rack,
        board,
        state.board.size === 0
      );
      if (!error) {
        canPlace = true;
        break;
      }
    }

    if (canPlace) {
      valid.add(candidate);
    }
  }

  return valid;
}

export default function App() {
  const engineRef = useRef<GameEngine>(initEngine());
  const [state, setState] = useState<GameState>(() => engineRef.current.getGameState());
  const [warning, setWarning] = useState<string>('');
  const [status, setStatus] = useState<string>('Game started. Drag tiles to the board.');
  const [selectedForExchange, setSelectedForExchange] = useState<Set<number>>(new Set());

  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 120, y: 120 });

  const refresh = () => {
    setState(engineRef.current.getGameState());
  };

  useEffect(() => {
    if (state.isGameOver) {
      if (state.isTied) {
        setStatus('Game over: tie game.');
      } else {
        setStatus(`Game over: Player ${state.winner} wins.`);
      }
    }
  }, [state.isGameOver, state.isTied, state.winner]);

  const currentPlayer = state.players.get(state.currentPlayerNumber);
  const draftTiles = useMemo(() => buildDraftTileMap(state), [state]);
  const validTargets = useMemo(() => buildValidTargets(state), [state]);

  const onDropTile = (coord: Coordinate, tileId: number) => {
    setWarning('');
    try {
      engineRef.current.addTileToDraft(tileId, coord);
      refresh();
      setStatus('Tile added to draft. Confirm move to score.');
    } catch (error) {
      setWarning(error instanceof Error ? error.message : 'Could not place tile.');
    }
  };

  const onCommit = () => {
    setWarning('');
    const result = engineRef.current.commitMove();
    if (!result.success) {
      setWarning(result.error ?? 'Invalid move.');
      return;
    }
    setSelectedForExchange(new Set());
    refresh();
    setStatus(`Move committed. +${result.score ?? 0} points.`);
  };

  const onUndo = () => {
    engineRef.current.undoLastPlacement();
    refresh();
    setWarning('');
  };

  const onPass = () => {
    setWarning('');
    const result = engineRef.current.pass();
    if (!result.success) {
      setWarning(result.error ?? 'Cannot pass right now.');
      return;
    }
    setSelectedForExchange(new Set());
    refresh();
    setStatus('Turn passed.');
  };

  const onExchange = () => {
    setWarning('');
    const ids = Array.from(selectedForExchange);
    const result = engineRef.current.exchangeTiles(ids);
    if (!result.success) {
      setWarning(result.error ?? 'Exchange failed.');
      return;
    }
    setSelectedForExchange(new Set());
    refresh();
    setStatus(`Exchanged ${ids.length} tile${ids.length === 1 ? '' : 's'}.`);
  };

  const onReset = () => {
    engineRef.current = initEngine();
    setSelectedForExchange(new Set());
    setScale(1);
    setOffset({ x: 120, y: 120 });
    setWarning('');
    setStatus('New local game created.');
    refresh();
  };

  const onToggleExchange = (tileId: number) => {
    setSelectedForExchange((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) {
        next.delete(tileId);
      } else {
        next.add(tileId);
      }
      return next;
    });
  };

  const onPointerDownPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffset = { ...offset };

    const onMove = (moveEvent: PointerEvent) => {
      setOffset({
        x: startOffset.x + moveEvent.clientX - startX,
        y: startOffset.y + moveEvent.clientY - startY,
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onWheelZoom = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = -event.deltaY * 0.0012;
    setScale((prev) => Math.min(2.3, Math.max(0.45, prev + delta)));
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-col gap-4 px-3 pb-4 pt-4 sm:px-6">
      <GameHeader state={state} />

      <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <BoardViewport
            boardTiles={state.board}
            draftTiles={draftTiles}
            validTargets={validTargets}
            onDropTile={onDropTile}
            scale={scale}
            offset={offset}
            onPointerDownPan={onPointerDownPan}
            onWheelZoom={onWheelZoom}
          />

          <div className="rounded-2xl border border-black/10 bg-white/85 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onCommit}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Confirm Move
              </button>
              <button
                onClick={onUndo}
                className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75 transition hover:bg-black/5"
              >
                Undo Draft
              </button>
              <button
                onClick={onPass}
                className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75 transition hover:bg-black/5"
              >
                Pass
              </button>
              <button
                onClick={onExchange}
                className="rounded-lg border border-orange-500/70 bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Exchange Selected
              </button>
              <button
                onClick={onReset}
                className="ml-auto rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75 transition hover:bg-black/5"
              >
                New Game
              </button>
            </div>

            <p className="mt-3 text-sm text-black/70">{status}</p>
            {warning ? (
              <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                Invalid move: {warning}
              </p>
            ) : null}
          </div>

          <TileRack
            tiles={currentPlayer?.rack ?? []}
            selectedForExchange={selectedForExchange}
            onToggleExchange={onToggleExchange}
          />
        </section>

        <aside className="space-y-4">
          <Scoreboard state={state} />

          <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/70">Move Hints</h3>
            <ul className="space-y-1 text-sm text-black/70">
              <li>Blue-highlighted cells are valid placement targets.</li>
              <li>Draft tiles have a bright ring on the board.</li>
              <li>Use wheel to zoom and drag to pan the board.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
