type TileLike = {
  id?: number;
  type: { color: string; shape: string };
};

type Props = {
  tile: TileLike;
  iconClassName?: string;
};

const colorClassMap: Record<string, string> = {
  red: 'text-red-500',
  orange: 'text-orange-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
};

export function TileFace({ tile, iconClassName = 'h-6 w-6' }: Props) {
  return (
    <div className="flex h-full items-center justify-center">
      <ShapeGlyph
        shape={tile.type.shape}
        className={`${iconClassName} ${colorClassMap[tile.type.color] ?? 'text-gray-400'}`}
      />
    </div>
  );
}

function ShapeGlyph({ shape, className }: { shape: string; className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      {shape === 'circle' ? <circle cx="50" cy="50" r="28" /> : null}
      {shape === 'square' ? <rect x="24" y="24" width="52" height="52" rx="8" /> : null}
      {shape === 'diamond' ? <polygon points="50,15 85,50 50,85 15,50" /> : null}
      {shape === 'star' ? (
        <polygon points="50,12 60,38 88,38 66,55 74,84 50,66 26,84 34,55 12,38 40,38" />
      ) : null}
      {shape === 'clover' ? (
        <>
          <circle cx="35" cy="34" r="16" />
          <circle cx="65" cy="34" r="16" />
          <circle cx="35" cy="62" r="16" />
          <circle cx="65" cy="62" r="16" />
          <rect x="46" y="58" width="8" height="24" rx="4" />
        </>
      ) : null}
      {shape === 'cross' ? <path d="M38 18h24v20h20v24H62v20H38V62H18V38h20z" /> : null}
    </svg>
  );
}