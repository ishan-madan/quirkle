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

function rejoinTokenStorageKey(lobbyId: string): string {
  return `qwirkle:rejoinToken:${lobbyId.toUpperCase()}`;
}

function getStoredRejoinToken(lobbyId: string): string | null {
  return localStorage.getItem(rejoinTokenStorageKey(lobbyId));
}

function storeRejoinToken(lobbyId: string, rejoinToken: string): void {
  localStorage.setItem(rejoinTokenStorageKey(lobbyId), rejoinToken);
}

function clearRejoinToken(lobbyId: string): void {
  localStorage.removeItem(rejoinTokenStorageKey(lobbyId));
}

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

function getDraftPlacementValidation(
  state: ServerStateView | null,
  selfPlayer: ServerStateView['players'][number] | null,
  draftPlacements: DraftPlacement[],
  tileId: number,
  coordinate: Coordinate
) {
  if (!state || !selfPlayer || selfPlayer.playerNumber !== state.currentPlayerNumber) {
    return { code: 'NOT_YOUR_TURN', message: 'It is not your turn.' };
  }

  const nextPlacements = draftPlacements.filter((placement) => placement.tileId !== tileId);
  nextPlacements.push({ tileId, coordinate });

  const board = new EngineBoard(toBoardMap(state));
  return MoveValidator.validatePlacement(
    nextPlacements,
    selfPlayer.rack as TileInstance[],
    board,
    state.boardEntries.length === 0
  );
}

function getValidationFeedbackMessage(validation: { code: string; message: string } | null): string {
  if (!validation) {
    return '';
  }

  switch (validation.code) {
    case 'NOT_ADJACENT':
      return 'Tile must be placed adjacent to another tile.';
    case 'INVALID_PRIMARY_LINE':
    case 'INVALID_PERPENDICULAR_LINE':
      return validation.message.replace(/^Primary line invalid:\s*/i, 'Violates line rule: ').replace(/^Perpendicular line invalid:\s*/i, 'Violates line rule: ');
    case 'COORDINATE_OCCUPIED':
      return 'That space is already occupied.';
    case 'NOT_COLLINEAR':
      return 'Tiles played this turn must stay in one row or one column.';
    case 'GAP_IN_PLACEMENT':
      return 'Tiles played this turn must be contiguous with no gaps.';
    case 'LINE_TOO_LONG':
      return 'That move would create a line longer than six tiles.';
    default:
      return validation.message;
  }
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
  const [moveFeedback, setMoveFeedback] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [copiedLobbyCode, setCopiedLobbyCode] = useState<boolean>(false);
  const [lobbyActionError, setLobbyActionError] = useState<{ target: 'create' | 'join'; message: string } | null>(null);
  const [rejoinBanner, setRejoinBanner] = useState<string>('');

  const [draftPlacements, setDraftPlacements] = useState<DraftPlacement[]>([]);
  const [selectedForExchange, setSelectedForExchange] = useState<Set<number>>(new Set());

  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 120, y: 120 });
  const [scoreboardHeight, setScoreboardHeight] = useState<number | null>(null);

  const socketRef = useRef<GameSocket | null>(null);
  const userIdRef = useRef<string>('');
  const scoreboardRef = useRef<HTMLDivElement | null>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lobbyActionErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rejoinBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showRejoinBanner = (message: string) => {
    if (rejoinBannerTimeoutRef.current) {
      clearTimeout(rejoinBannerTimeoutRef.current);
    }

    setRejoinBanner(message);
    rejoinBannerTimeoutRef.current = setTimeout(() => {
      setRejoinBanner('');
    }, 2500);
  };

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

    const onAnyEvent = (eventName: string, ...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log('[socket] received', eventName, ...args);
    };
    socket.onAny(onAnyEvent);

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Connected to backend.');
      setError('');

      const persistedLobbyId = localStorage.getItem(STORAGE.lobbyId);
      if (persistedLobbyId) {
        socket.emit(
          'joinLobby',
          {
            lobbyId: persistedLobbyId,
            rejoinToken: getStoredRejoinToken(persistedLobbyId) ?? undefined,
          },
          ({ rejoinToken }) => {
            storeRejoinToken(persistedLobbyId, rejoinToken);
            setJoinedLobbyId(persistedLobbyId);
          }
        );
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
        setMoveFeedback(/^Move accepted/i.test(message) ? message : '');
        if (/reconnected to game/i.test(message)) {
          showRejoinBanner('Rejoined your in-progress game.');
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
        showLobbyActionError('join', 'Lobby not found');
      }
      setError(message);
    });

    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      if (lobbyActionErrorTimeoutRef.current) {
        clearTimeout(lobbyActionErrorTimeoutRef.current);
      }
      if (rejoinBannerTimeoutRef.current) {
        clearTimeout(rejoinBannerTimeoutRef.current);
      }
      socket.offAny(onAnyEvent);
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      showLobbyActionError('create', 'Name is required');
      return;
    }

    try {
      const socket = requireSocket();
      socket.emit('createLobby', { name: trimmedName }, ({ lobbyId, rejoinToken }) => {
        setJoinedLobbyId(lobbyId);
        localStorage.setItem(STORAGE.lobbyId, lobbyId);
        storeRejoinToken(lobbyId, rejoinToken);
        showLobbyActionError('create', '');
      });
    } catch (err) {
      showLobbyActionError('create', err instanceof Error ? err.message : 'Could not create lobby');
    }
  };

  const handleJoinLobby = () => {
    const lobbyId = lobbyIdInput.trim();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showLobbyActionError('join', 'Name is required');
      return;
    }

    if (!lobbyId) {
      showLobbyActionError('join', 'Lobby code is required');
      return;
    }

    try {
      const socket = requireSocket();
      socket.emit('joinLobby', { lobbyId, rejoinToken: getStoredRejoinToken(lobbyId) ?? undefined }, ({ rejoinToken }) => {
        setJoinedLobbyId(lobbyId);
        localStorage.setItem(STORAGE.lobbyId, lobbyId);
        storeRejoinToken(lobbyId, rejoinToken);
        showLobbyActionError('join', '');
      });
    } catch (err) {
      showLobbyActionError('join', err instanceof Error ? err.message : 'Could not join lobby');
    }
  };

  const handleLeaveLobby = () => {
    if (!joinedLobbyId) return;
    const lobbyId = joinedLobbyId;
    try {
      const socket = requireSocket();
      socket.emit('leaveLobby', { lobbyId }, () => {
        setLobby(null);
        setGameState(null);
        setJoinedLobbyId(null);
        localStorage.removeItem(STORAGE.lobbyId);
        setRejoinBanner('');
        if (!gameState) {
          clearRejoinToken(lobbyId);
        }
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
    const validation = getDraftPlacementValidation(gameState, selfPlayer, draftPlacements, tileId, coordinate);
    if (validation) {
      const feedback = getValidationFeedbackMessage(validation);
      setError(feedback);
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
  }, [gameState, error]);

  const showLobbyActionError = (target: 'create' | 'join', message: string) => {
    if (lobbyActionErrorTimeoutRef.current) {
      clearTimeout(lobbyActionErrorTimeoutRef.current);
    }

    if (!message) {
      setLobbyActionError(null);
      return;
    }

    setLobbyActionError({ target, message });
    lobbyActionErrorTimeoutRef.current = setTimeout(() => {
      setLobbyActionError(null);
    }, 1800);
  };

  const showLobbyCodeCopied = () => {
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }

    setCopiedLobbyCode(true);
    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setCopiedLobbyCode(false);
    }, 1500);
  };

  const copyLobbyCode = async () => {
    if (!joinedLobbyId) return;
    try {
      await navigator.clipboard.writeText(joinedLobbyId.toUpperCase());
      setStatus('Lobby code copied.');
      showLobbyCodeCopied();
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
            <h1 className="text-2xl font-semibold text-ink">Online Lobby</h1>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className={`rounded-full px-3 py-1 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {!showLobbyShell && joinedLobbyId ? (
              <button
                onClick={handleLeaveLobby}
                className="rounded-lg border border-red-600/70 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 sm:text-sm"
              >
                Leave Lobby
              </button>
            ) : null}
            {joinedLobbyId ? (
              <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-2 py-1">
                <span className="text-black/60">Lobby</span>
                <input
                  readOnly
                  value={joinedLobbyId.toUpperCase()}
                  className="w-28 rounded bg-white px-2 py-1 font-mono text-xs font-semibold tracking-[0.08em] text-black/80 outline-none"
                />
                <button
                  onClick={copyLobbyCode}
                  className="rounded border border-black/15 bg-white px-2 py-1 text-[11px] font-semibold text-black/70 hover:bg-black/5"
                >
                  {copiedLobbyCode ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {!showLobbyShell && rejoinBanner ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {rejoinBanner}
          </div>
        ) : null}
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateLobby}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Create Lobby
              </button>
              {lobbyActionError?.target === 'create' ? (
                <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                  {lobbyActionError.message}
                </span>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/70">Join Lobby</h2>
            <label className="mb-2 block text-sm text-black/70">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Your name"
            />
            <label className="mb-2 block text-sm text-black/70">Lobby Code</label>
            <input
              value={lobbyIdInput}
              onChange={(e) => setLobbyIdInput(e.target.value.toUpperCase())}
              className="mb-3 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="e.g. ABCDEF"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleJoinLobby}
                className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black/75 transition hover:bg-black/5"
              >
                Join Lobby
              </button>
              {lobbyActionError?.target === 'join' ? (
                <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                  {lobbyActionError.message}
                </span>
              ) : null}
            </div>
          </section>

          {lobby ? (
            <section className="lg:col-span-2 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70">Waiting Room</h2>
                <div className="flex gap-2">
                  <button
                    disabled={userIdRef.current !== lobby.hostUserId}
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
                  value={lobby.id.toUpperCase()}
                  className="w-44 rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-sm tracking-[0.08em] text-black/80 outline-none"
                />
                <button
                  onClick={copyLobbyCode}
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/5"
                >
                  {copiedLobbyCode ? 'Copied!' : 'Copy Code'}
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
          <section className="flex min-h-0 flex-col gap-3">
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
              className="flex-1"
            />
          </section>

          <aside className="space-y-4">
            <div
              className="flex min-h-0 flex-col rounded-2xl border border-black/10 bg-white/85 p-3 shadow-sm backdrop-blur-sm"
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
              </div>
            </div>

            <TileRack
              tiles={visibleRackTiles}
              selectedForExchange={selectedForExchange}
              onToggleExchange={onToggleExchange}
            />

            <div className="min-h-[72px] rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              {moveFeedback ? (
                <p className="text-sm text-black/70">{moveFeedback}</p>
              ) : null}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
