import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import type { Coordinate, TileInstance } from '@engine/types';
import { BoardViewport } from './components/BoardViewport';
import { GameHeader } from './components/GameHeader';
import { Scoreboard } from './components/Scoreboard';
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

export default function App() {
  const [name, setName] = useState<string>(() => localStorage.getItem(STORAGE.name) ?? '');
  const [lobbyIdInput, setLobbyIdInput] = useState<string>('');
  const [joinedLobbyId, setJoinedLobbyId] = useState<string | null>(() => localStorage.getItem(STORAGE.lobbyId));
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [gameState, setGameState] = useState<ServerStateView | null>(null);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [draftPlacements, setDraftPlacements] = useState<Array<{ tileId: number; coordinate: Coordinate }>>([]);
  const [selectedForExchange, setSelectedForExchange] = useState<Set<number>>(new Set());

  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 120, y: 120 });

  const socketRef = useRef<GameSocket | null>(null);
  const userIdRef = useRef<string>('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players.find((p) => p.isCurrent) ?? null;
  }, [gameState]);

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

  const validTargets = useMemo(() => new Set<Coordinate>(gameState?.validTargets ?? []), [gameState]);

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
      if (message) setStatus(message);
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
    setError('');
    setDraftPlacements((prev) => {
      if (prev.some((p) => p.coordinate === coordinate)) {
        return prev;
      }
      if (prev.some((p) => p.tileId === tileId)) {
        return prev;
      }
      return [...prev, { tileId, coordinate }];
    });
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

  const showLobbyShell = !gameState;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-col gap-4 px-3 pb-4 pt-4 sm:px-6">
      <header className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/60">Qwirkle Multiplayer</p>
            <h1 className="text-2xl font-semibold text-ink">Server-Authoritative Lobby</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {joinedLobbyId ? <span className="rounded-full bg-black/5 px-3 py-1">Lobby {joinedLobbyId}</span> : null}
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
                    className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75 transition hover:bg-black/5"
                  >
                    Leave
                  </button>
                </div>
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
        <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            <GameHeader state={gameState} />

            <BoardViewport
              boardTiles={boardTiles}
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
                <button onClick={onCommit} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
                  Submit Move
                </button>
                <button onClick={onUndo} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  Undo Draft
                </button>
                <button onClick={onPass} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  Pass
                </button>
                <button onClick={onExchange} className="rounded-lg border border-orange-500/70 bg-orange-500 px-3 py-2 text-sm font-semibold text-white">
                  Exchange Selected
                </button>
                <button onClick={handleLeaveLobby} className="ml-auto rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  Leave Lobby
                </button>
              </div>

              <p className="mt-3 text-sm text-black/70">{status || 'All game state is synchronized from server.'}</p>
              {error ? (
                <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}
            </div>

            <TileRack
              tiles={selfPlayer?.rack ?? []}
              selectedForExchange={selectedForExchange}
              onToggleExchange={onToggleExchange}
            />
          </section>

          <aside className="space-y-4">
            <Scoreboard state={gameState} />
            <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/70">Live Status</h3>
              <ul className="space-y-1 text-sm text-black/70">
                <li>Current turn: {currentPlayer?.name ?? 'Unknown'}</li>
                <li>Remaining tiles: {gameState?.bagCount ?? 0}</li>
                <li>Server legal targets: {gameState?.validTargets.length ?? 0}</li>
              </ul>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
