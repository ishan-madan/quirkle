import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Board as EngineBoard, MoveValidator, type Coordinate, type TileInstance } from '@engine';
import { BoardViewport } from './components/BoardViewport';
import { GameHeader } from './components/GameHeader';
import { TileRack } from './components/TileRack';
import { connectGameSocket, type GameSocket } from './network/socket';
import type { Lobby, ServerStateView } from './types/multiplayer';

const STORAGE = {
  userId: 'qwirkle:userId',
  name: 'qwirkle:name',
  lobbyId: 'qwirkle:lobbyId',
};

function getOrCreateUserId(): string {
  const existing = localStorage.getItem(STORAGE.userId);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(STORAGE.userId, created);
  return created;
}

function toBoardMap(state: ServerStateView | null): Map<Coordinate, TileInstance> {
  const map = new Map<Coordinate, TileInstance>();
  if (!state) return map;
  for (const [coord, tile] of state.boardEntries) {
    map.set(coord, tile as TileInstance);
  }
  return map;
}

type DraftPlacement = { tileId: number; coordinate: Coordinate };

function canPlaceDraftTile(
  state: ServerStateView | null,
  selfPlayer: ServerStateView['players'][number] | null,
  draftPlacements: DraftPlacement[],
  tileId: number,
  coordinate: Coordinate
): boolean {
  if (!state || !selfPlayer || selfPlayer.playerNumber !== state.currentPlayerNumber) {
    return false;
  }

  const nextPlacements = draftPlacements.filter((placement) => placement.tileId !== tileId);
  nextPlacements.push({ tileId, coordinate });

  const board = new EngineBoard(toBoardMap(state));
  const validation = MoveValidator.validatePlacement(
    nextPlacements,
    selfPlayer.rack as TileInstance[],
    board,
    state.boardEntries.length === 0
  );

  return validation === null;
}

function computeDraftValidTargets(
  state: ServerStateView | null,
  selfPlayer: ServerStateView['players'][number] | null,
  draftPlacements: DraftPlacement[]
): Set<Coordinate> {
  if (!state || !selfPlayer || selfPlayer.playerNumber !== state.currentPlayerNumber) {
    return new Set<Coordinate>();
  }

  const placedIds = new Set(draftPlacements.map((placement) => placement.tileId));
  const availableTiles = selfPlayer.rack.filter((tile) => !placedIds.has(tile.id));
  if (availableTiles.length === 0) {
    return new Set<Coordinate>();
  }

  const boardTiles = toBoardMap(state);
  const occupied = new Set<Coordinate>(boardTiles.keys());
  for (const placement of draftPlacements) {
    occupied.add(placement.coordinate);
  }

  const candidates = new Set<Coordinate>();
  if (occupied.size === 0) {
    candidates.add('0,0' as Coordinate);
  } else {
    for (const coord of occupied) {
      const [xPart, yPart] = coord.split(',');
      const x = Number(xPart);
      const y = Number(yPart);
      candidates.add(`${x + 1},${y}` as Coordinate);
      candidates.add(`${x - 1},${y}` as Coordinate);
      candidates.add(`${x},${y + 1}` as Coordinate);
      candidates.add(`${x},${y - 1}` as Coordinate);
    }
  }

  const valid = new Set<Coordinate>();
  for (const candidate of candidates) {
    if (occupied.has(candidate)) {
      continue;
    }

    for (const tile of availableTiles) {
      if (canPlaceDraftTile(state, selfPlayer, draftPlacements, tile.id, candidate)) {
        valid.add(candidate);
        break;
      }
    }
  }

  return valid;
}

export default function App() {
  const [name, setName] = useState<string>(() => localStorage.getItem(STORAGE.name) ?? '');
  const [lobbyIdInput, setLobbyIdInput] = useState<string>('');
  const [joinedLobbyId, setJoinedLobbyId] = useState<string | null>(() => localStorage.getItem(STORAGE.lobbyId));
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [gameState, setGameState] = useState<ServerStateView | null>(null);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [lastTurnPoints, setLastTurnPoints] = useState<string>('No turns completed yet.');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [draftPlacements, setDraftPlacements] = useState<DraftPlacement[]>([]);
  const [selectedForExchange, setSelectedForExchange] = useState<Set<number>>(new Set());

  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 120, y: 120 });
  const [scoreboardHeight, setScoreboardHeight] = useState<number | null>(null);

  const socketRef = useRef<GameSocket | null>(null);
  const userIdRef = useRef<string>('');
  const scoreboardRef = useRef<HTMLDivElement | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

  const selfPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players.find((p) => p.rack.length > 0) ?? gameState.players[0] ?? null;
  }, [gameState]);

  const boardTiles = useMemo(() => toBoardMap(gameState), [gameState]);

  const draftTiles = useMemo(() => {
    const map = new Map<Coordinate, TileInstance>();
    if (!selfPlayer) return map;
    const rackMap = new Map(selfPlayer.rack.map((tile) => [tile.id, tile as TileInstance]));
    for (const placement of draftPlacements) {
      const tile = rackMap.get(placement.tileId);
      if (tile) map.set(placement.coordinate, tile);
    }
    return map;
  }, [selfPlayer, draftPlacements]);

  const visibleRackTiles = useMemo(() => {
    if (!selfPlayer) return [];
    const placedIds = new Set(draftPlacements.map((placement) => placement.tileId));
    return selfPlayer.rack.filter((tile) => !placedIds.has(tile.id));
  }, [selfPlayer, draftPlacements]);

  const validTargets = useMemo(
    () => computeDraftValidTargets(gameState, selfPlayer, draftPlacements),
    [gameState, selfPlayer, draftPlacements]
  );

  useEffect(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    userIdRef.current = getOrCreateUserId();
    localStorage.setItem(STORAGE.name, trimmedName);

    const socket = connectGameSocket({
      backendUrl,
      name: trimmedName,
      userId: userIdRef.current,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Connected to backend.');
      setError('');

      const persistedLobbyId = localStorage.getItem(STORAGE.lobbyId);
      if (persistedLobbyId) {
        socket.emit('joinLobby', { lobbyId: persistedLobbyId }, () => {
          setJoinedLobbyId(persistedLobbyId);
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setStatus('Disconnected. Attempting reconnection...');
    });

    socket.on('lobbyUpdated', (nextLobby) => {
      setLobby(nextLobby);
      setJoinedLobbyId(nextLobby.id);
      localStorage.setItem(STORAGE.lobbyId, nextLobby.id);
    });

    socket.on('gameUpdate', ({ state, message }) => {
      setGameState(state);
      setDraftPlacements([]);
      setSelectedForExchange(new Set());
      if (message) {
        setStatus(message);
        const pointsMatch = message.match(/(\d+)\s+point/i);
        if (pointsMatch) {
          setLastTurnPoints(`${pointsMatch[1]} points on the last turn.`);
        } else if (/pass/i.test(message)) {
          setLastTurnPoints('0 points on the last turn (pass).');
        } else if (/exchange|draw/i.test(message)) {
          setLastTurnPoints('0 points on the last turn (exchange).');
        }
      }
      setError('');
    });

    socket.on('gameOver', ({ state }) => {
      setGameState(state);
      setDraftPlacements([]);
      setSelectedForExchange(new Set());
      if (state.isTied) {
        setStatus('Game over: tie game.');
      } else {
        setStatus(`Game over: Player ${state.winner} wins.`);
      }
    });

    socket.on('serverError', ({ message }) => {
      if (message === 'Lobby not found') {
        setLobby(null);
        setGameState(null);
        setJoinedLobbyId(null);
        localStorage.removeItem(STORAGE.lobbyId);
      }
      setError(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [backendUrl, name]);

  const requireSocket = (): GameSocket => {
    const socket = socketRef.current;
    if (!socket) throw new Error('Socket not connected');
    return socket;
  };

  const handleCreateLobby = () => {
    try {
      const socket = requireSocket();
      socket.emit('createLobby', { name }, ({ lobbyId }) => {
        setJoinedLobbyId(lobbyId);
        localStorage.setItem(STORAGE.lobbyId, lobbyId);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create lobby');
    }
  };

  const handleJoinLobby = () => {
    const lobbyId = lobbyIdInput.trim();
    if (!lobbyId) {
      setError('Lobby code is required');
      return;
    }

    try {
      const socket = requireSocket();
      socket.emit('joinLobby', { lobbyId }, () => {
        setJoinedLobbyId(lobbyId);
        localStorage.setItem(STORAGE.lobbyId, lobbyId);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join lobby');
    }
  };

  const handleLeaveLobby = () => {
    if (!joinedLobbyId) return;
    try {
      const socket = requireSocket();
      socket.emit('leaveLobby', { lobbyId: joinedLobbyId }, () => {
        setLobby(null);
        setGameState(null);
        setJoinedLobbyId(null);
        localStorage.removeItem(STORAGE.lobbyId);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave lobby');
    }
  };

  const handleStartGame = () => {
    if (!joinedLobbyId) return;
    try {
      requireSocket().emit('startGame', { lobbyId: joinedLobbyId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start game');
    }
  };

  const onDropTile = (coordinate: Coordinate, tileId: number) => {
    if (!canPlaceDraftTile(gameState, selfPlayer, draftPlacements, tileId, coordinate)) {
      setError('That position is not legal for the current draft.');
      return;
    }

    setDraftPlacements((prev) => {
      const next = prev.filter((placement) => placement.tileId !== tileId);
      if (next.some((placement) => placement.coordinate === coordinate)) {
        return prev;
      }
      return [...next, { tileId, coordinate }];
    });
    setError('');
  };

  const onRemoveDraftTile = (tileId: number) => {
    setDraftPlacements((prev) => prev.filter((placement) => placement.tileId !== tileId));
    setError('');
  };

  const onUndo = () => {
    setDraftPlacements((prev) => prev.slice(0, -1));
    setError('');
  };

  const onPass = () => {
    if (!joinedLobbyId) return;
    try {
      requireSocket().emit('submitMove', { lobbyId: joinedLobbyId, kind: 'pass' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pass');
    }
  };

  const onCommit = () => {
    if (!joinedLobbyId) return;
    if (draftPlacements.length === 0) {
      setError('Add at least one tile to draft before confirming.');
      return;
    }

    try {
      requireSocket().emit('submitMove', {
        lobbyId: joinedLobbyId,
        kind: 'place',
        placements: draftPlacements,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit move');
    }
  };

  const onExchange = () => {
    if (!joinedLobbyId) return;
    const ids = Array.from(selectedForExchange);
    if (ids.length === 0) {
      setError('Select tiles to exchange first.');
      return;
    }

    try {
      requireSocket().emit('drawTiles', { lobbyId: joinedLobbyId, tileIds: ids });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not exchange tiles');
    }
  };

  const onToggleExchange = (tileId: number) => {
    setSelectedForExchange((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) next.delete(tileId);
      else next.add(tileId);
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

  useLayoutEffect(() => {
    const element = scoreboardRef.current;
    if (!element) return;

    const updateHeight = () => {
      setScoreboardHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, [gameState, error, lastTurnPoints]);

  const copyLobbyCode = async () => {
    if (!joinedLobbyId) return;
    try {
      await navigator.clipboard.writeText(joinedLobbyId);
      setStatus('Lobby code copied.');
    } catch {
      setStatus('Could not copy lobby code.');
    }
  };

  const showLobbyShell = !gameState;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-col gap-4 px-3 pb-4 pt-4 sm:px-6">
      <header className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/60">Qwirkle Multiplayer</p>
            <h1 className="text-2xl font-semibold text-ink">Qwirkle Multiplayer</h1>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className={`rounded-full px-3 py-1 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {joinedLobbyId ? (
              <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-2 py-1">
                <span className="text-black/60">Lobby</span>
                <input
                  readOnly
                  value={joinedLobbyId}
                  className="w-28 rounded bg-white px-2 py-1 font-mono text-xs font-semibold tracking-[0.08em] text-black/80 outline-none"
                />
                <button
                  onClick={copyLobbyCode}
                  className="rounded border border-black/15 bg-white px-2 py-1 text-[11px] font-semibold text-black/70 hover:bg-black/5"
                >
                  Copy
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {showLobbyShell ? (
        <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/70">Create Lobby</h2>
            <label className="mb-2 block text-sm text-black/70">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Your name"
            />
            <button
              onClick={handleCreateLobby}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Create Lobby
            </button>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/70">Join Lobby</h2>
            <label className="mb-2 block text-sm text-black/70">Lobby Code</label>
            <input
              value={lobbyIdInput}
              onChange={(e) => setLobbyIdInput(e.target.value)}
              className="mb-3 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="e.g. a1b2c3d4"
            />
            <button
              onClick={handleJoinLobby}
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75 transition hover:bg-black/5"
            >
              Join Lobby
            </button>
          </section>

          {lobby ? (
            <section className="lg:col-span-2 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70">Waiting Room</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleStartGame}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Start Game
                  </button>
                  <button
                    onClick={handleLeaveLobby}
                    className="rounded-lg border border-red-600/70 bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    Leave
                  </button>
                </div>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-black/60">Lobby Code</span>
                <input
                  readOnly
                  value={lobby.id}
                  className="w-44 rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-sm tracking-[0.08em] text-black/80 outline-none"
                />
                <button
                  onClick={copyLobbyCode}
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/5"
                >
                  Copy Code
                </button>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lobby.players.map((player) => (
                  <li key={player.userId} className="rounded-lg bg-black/[0.03] px-3 py-2 text-sm">
                    <span className="font-semibold">{player.name}</span>
                    {player.userId === lobby.hostUserId ? ' (host)' : ''}
                    {!player.connected ? ' • disconnected' : ''}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>
      ) : (
        <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="space-y-3">
            <div ref={scoreboardRef}>
              <GameHeader state={gameState} error={error} />
            </div>

            <BoardViewport
              boardTiles={boardTiles}
              draftTiles={draftTiles}
              validTargets={validTargets}
              onDropTile={onDropTile}
              onRemoveDraftTile={onRemoveDraftTile}
              scale={scale}
              offset={offset}
              onPointerDownPan={onPointerDownPan}
              onWheelZoom={onWheelZoom}
            />

            <p className="rounded-2xl border border-black/10 bg-white/85 px-3 py-2 text-sm text-black/70 shadow-sm backdrop-blur-sm">
              {status || 'All game state is synchronized from server.'}
            </p>
          </section>

          <aside className="space-y-4">
            <div
              className="flex h-fit flex-col rounded-2xl border border-black/10 bg-white/85 p-3 shadow-sm backdrop-blur-sm"
              style={scoreboardHeight ? { minHeight: `${scoreboardHeight}px` } : undefined}
            >
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onCommit} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
                  End Turn
                </button>
                <button onClick={onExchange} className="rounded-lg border border-orange-500/70 bg-orange-500 px-3 py-2 text-sm font-semibold text-white">
                  Exchange Selected Tiles
                </button>
                <button onClick={onUndo} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  Undo
                </button>
                <button onClick={onPass} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  Pass Turn
                </button>
                <button onClick={handleLeaveLobby} className="col-span-2 rounded-lg border border-red-600/70 bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500">
                  Leave Lobby
                </button>
              </div>
            </div>

            <TileRack
              tiles={visibleRackTiles}
              selectedForExchange={selectedForExchange}
              onToggleExchange={onToggleExchange}
            />

            <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/70">Last Turn Points</h3>
              <p className="text-sm text-black/75">{lastTurnPoints}</p>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
