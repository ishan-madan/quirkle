# Qwirkle Frontend (Local Play)

React + TypeScript + Tailwind frontend for the existing local Qwirkle engine.

## Run

```bash
cd packages/frontend
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Features

- Responsive board layout
- Zoom with mouse wheel
- Pan by dragging the board viewport
- Drag-and-drop tile placement from rack to board
- Bottom tile rack
- Current player indicator
- Scoreboard
- Remaining tiles counter
- Valid move highlighting
- Invalid move warning banner
- Local gameplay only (no networking)

## Notes

- Engine is imported from sibling package source.
- Frontend is intentionally local-first and deterministic for turn-by-turn testing.
