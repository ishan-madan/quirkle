import { TileFace } from './TileFace';

type RackTile = {
  id: number;
  type: { color: string; shape: string };
};

type Props = {
  tiles: RackTile[];
  selectedForExchange: Set<number>;
  onToggleExchange: (tileId: number) => void;
};

export function TileRack({ tiles, selectedForExchange, onToggleExchange }: Props) {
  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-black/70">Tile Rack</h3>
        <p className="text-xs text-black/60">Drag tiles onto the board</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
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
                className={`group relative h-auto w-full aspect-square rounded-lg border border-black/15 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  exchangeSelected ? 'ring-2 ring-orange-500' : ''
                }`}
                title={`${tile.type.color} ${tile.type.shape}`}
              >
                <TileFace tile={tile} iconClassName="h-9 w-9" />
              </button>

              <button
                onClick={() => onToggleExchange(tile.id)}
                className={`w-full rounded-md border px-1.5 py-1 text-[9px] font-semibold leading-none tracking-normal transition ${
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
