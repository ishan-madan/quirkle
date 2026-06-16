type RackTile = {
  id: number;
  type: { color: string; shape: string };
};

type Props = {
  tiles: RackTile[];
  selectedForExchange: Set<number>;
  onToggleExchange: (tileId: number) => void;
};

const colorMap: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

export function TileRack({ tiles, selectedForExchange, onToggleExchange }: Props) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-black/70">Tile Rack</h3>
        <p className="text-xs text-black/60">Drag tiles onto the board</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {tiles.map((tile) => {
          const exchangeSelected = selectedForExchange.has(tile.id);
          return (
            <div key={tile.id} className="space-y-2">
              <button
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/tile-id', String(tile.id));
                  event.dataTransfer.effectAllowed = 'move';
                }}
                className={`group relative w-full rounded-xl border border-black/15 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  exchangeSelected ? 'ring-2 ring-orange-500' : ''
                }`}
                title={`${tile.type.color} ${tile.type.shape}`}
              >
                <div className={`mx-auto h-3 w-3 rounded-full ${colorMap[tile.type.color] ?? 'bg-gray-400'}`} />
                <div className="mt-2 text-center text-xs font-semibold capitalize text-black/80">{tile.type.shape}</div>
                <div className="text-center text-[10px] uppercase tracking-wide text-black/50">#{tile.id}</div>
              </button>

              <button
                onClick={() => onToggleExchange(tile.id)}
                className={`w-full rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                  exchangeSelected
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-black/15 bg-white text-black/70 hover:bg-black/5'
                }`}
              >
                Exchange
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
