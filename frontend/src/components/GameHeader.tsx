import type { ServerStateView } from '../types/multiplayer';

type Props = {
  state: ServerStateView;
  error?: string;
};

export function GameHeader({ state, error }: Props) {
  const players = [...state.players].sort((a, b) => a.playerNumber - b.playerNumber);

  return (
    <header className="flex h-fit flex-col rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-black/60">Scoreboard</div>
        <div className="text-sm font-semibold text-black/70">Tiles Left: {state.bagCount}</div>
      </div>

      <div className="mt-3 space-y-2">
        {players.map((player) => {
          const isCurrent = player.playerNumber === state.currentPlayerNumber;
          return (
            <div
              key={player.playerNumber}
              className={`flex items-center justify-between rounded-xl px-3 py-2 transition ${
                isCurrent ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-black/[0.03]'
              }`}
            >
              <span className="text-sm font-medium">
                P{player.playerNumber} · {player.name}
                {!player.connected ? ' (offline)' : ''}
              </span>
              <span className="text-sm font-bold">{player.score}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 min-h-[46px]">
        {error ? (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : (
          <div className="rounded-lg border border-transparent px-3 py-2 text-sm text-transparent">placeholder</div>
        )}
      </div>
    </header>
  );
}
