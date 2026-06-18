# Quirkle Frontend

React + TypeScript + Tailwind client for real-time multiplayer Quirkle.

## What This App Does

- Connects to the backend over Socket.IO.
- Supports lobby creation, join, leave, and host-controlled game start.
- Persists local player identity and lobby code in localStorage for reconnect flows.
- Restores active lobby on reconnect and uses per-lobby rejoin tokens.
- Renders a zoomable and pannable board viewport.
- Supports draft-based placement with drag-and-drop and undo.
- Allows pass and tile exchange actions.
- Shows per-turn feedback, game status, and game over results.

## Project Structure

```text
packages/frontend/
	src/
		App.tsx
		index.css
		main.tsx
		components/
			BoardViewport.tsx
			GameHeader.tsx
			Scoreboard.tsx
			TileFace.tsx
			TileRack.tsx
		lib/coords.ts
		network/socket.ts
		types/multiplayer.ts
```

## Multiplayer Event Flow

Client emits:

- createLobby
- joinLobby
- leaveLobby
- startGame
- submitMove (place or pass)
- drawTiles (exchange)

Client listens for:

- lobbyUpdated
- gameUpdate
- gameOver
- serverError

## Engine Integration

- Uses @quirkle/engine move validation in the client for draft-time UX feedback.
- Server remains authoritative; client-side checks are advisory and do not commit state.

## Environment

- VITE_BACKEND_URL: backend base URL (default is http://localhost:4000).

## Scripts

- npm run dev: start Vite dev server.
- npm run build: TypeScript build + Vite production bundle.
- npm run preview: preview production build locally.

## Local Development

```bash
cd packages/frontend
npm install
npm run dev
```

## Production Build Check

```bash
npm run build
npm run preview
```
