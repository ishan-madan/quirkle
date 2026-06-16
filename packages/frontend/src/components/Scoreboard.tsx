import type { ServerStateView } from '../types/multiplayer';

type Props = {
  state: ServerStateView;
};

export function Scoreboard({ state }: Props) {
  const players = [...state.players].sort((a, b) => a.playerNumber - b.playerNumber);

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/70">Scoreboard</h2>
      <div className="space-y-2">
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
    </div>
  );
}
