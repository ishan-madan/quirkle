import type { ServerStateView } from '../types/multiplayer';

type Props = {
  state: ServerStateView;
};

export function GameHeader({ state }: Props) {
  const current = state.players.find((player) => player.playerNumber === state.currentPlayerNumber);

  return (
    <header className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/60">Current Player</p>
          <h1 className="text-2xl font-semibold text-ink">
            {current ? `${current.name} (P${current.playerNumber})` : 'Unknown'}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-black/5 px-3 py-1">Turn {state.turnNumber + 1}</span>
          <span className="rounded-full bg-black/5 px-3 py-1">Tiles Left: {state.bagCount}</span>
        </div>
      </div>
    </header>
  );
}
