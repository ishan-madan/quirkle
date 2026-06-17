import type { Coordinate, TileInstance } from '@engine/types';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { parseCoord, toKey } from '../lib/coords';
import { useMemo, useState } from 'react';
import { TileFace } from './TileFace';

type Props = {
  boardTiles: Map<Coordinate, TileInstance>;
  draftTiles: Map<Coordinate, TileInstance>;
  validTargets: Set<Coordinate>;
  onDropTile: (coord: Coordinate, tileId: number) => void;
  onRemoveDraftTile: (tileId: number) => void;
  scale: number;
  offset: { x: number; y: number };
  onPointerDownPan: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onWheelZoom: (event: ReactWheelEvent<HTMLDivElement>) => void;
  className?: string;
};

export function BoardViewport({
  boardTiles,
  draftTiles,
  validTargets,
  onDropTile,
  onRemoveDraftTile,
  scale,
  offset,
  onPointerDownPan,
  onWheelZoom,
  className,
}: Props) {
  const [dragOverCoord, setDragOverCoord] = useState<Coordinate | null>(null);
  const { minX, maxX, minY, maxY } = useMemo(() => {
    const all = [...boardTiles.keys(), ...draftTiles.keys()];
    if (all.length === 0) {
      return { minX: -5, maxX: 5, minY: -4, maxY: 4 };
    }

    const points = all.map(parseCoord);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    return {
      minX: Math.min(...xs) - 3,
      maxX: Math.max(...xs) + 3,
      minY: Math.min(...ys) - 3,
      maxY: Math.max(...ys) + 3,
    };
  }, [boardTiles, draftTiles]);

  const rows: number[] = [];
  const cols: number[] = [];
  for (let y = minY; y <= maxY; y++) rows.push(y);
  for (let x = minX; x <= maxX; x++) cols.push(x);

  return (
    <div
      className={`relative min-h-[360px] w-full overflow-hidden rounded-2xl border border-black/10 bg-white/60 shadow-sm ${className ?? 'h-[52vh]'}`}
      onPointerDown={onPointerDownPan}
      onWheel={onWheelZoom}
    >
      <div
        className="absolute left-0 top-0 touch-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <div
          className="grid gap-1 p-4"
          style={{
            gridTemplateColumns: `repeat(${cols.length}, minmax(0, 44px))`,
          }}
        >
          {rows.flatMap((y) =>
            cols.map((x) => {
              const coord = toKey(x, y);
              const placed = boardTiles.get(coord);
              const draft = draftTiles.get(coord);
              const tile = draft ?? placed;
              const isDraft = Boolean(draft) && !placed;
              const isValidTarget = validTargets.has(coord);

              return (
                <div
                  key={coord}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverCoord(coord);
                  }}
                  onDragEnter={() => {
                    setDragOverCoord(coord);
                  }}
                  onDragLeave={(event) => {
                    if (event.target === event.currentTarget) {
                      setDragOverCoord(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOverCoord(null);
                    const tileId = Number(event.dataTransfer.getData('text/tile-id'));
                    if (!Number.isNaN(tileId)) {
                      onDropTile(coord, tileId);
                    }
                  }}
                  className={`h-11 w-11 rounded-md border transition ${
                    dragOverCoord === coord
                      ? 'border-black/80 bg-accent/10 ring-2 ring-accent'
                      : tile
                        ? 'border-black/20 bg-white shadow-sm'
                        : isValidTarget
                          ? 'border-accent/40 bg-accent/10'
                          : 'border-black/10 bg-black/[0.03]'
                  }`}
                >
                  {tile ? (
                    <div
                      draggable={isDraft}
                      onClick={() => {
                        if (draft) {
                          onRemoveDraftTile(draft.id);
                        }
                      }}
                      onDragStart={(event) => {
                        if (!draft) {
                          return;
                        }
                        event.dataTransfer.setData('text/tile-id', String(draft.id));
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      className={`h-full w-full rounded-md p-1 ${isDraft ? 'cursor-grab ring-2 ring-accent/60' : ''}`}
                      title={isDraft ? 'Drag to move this tile or click to return it to your rack' : undefined}
                    >
                      <TileFace tile={tile} />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-1 text-xs text-white">
        Zoom {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
