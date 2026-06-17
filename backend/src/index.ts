import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config.js';
import { authenticateSocket } from './socket/middleware/authenticateSocket.js';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types/socket.js';
import { LobbyManager } from './lobby/LobbyManager.js';
import { GameSessionManager } from './game/GameSessionManager.js';
import { registerHandlers } from './socket/registerHandlers.js';
import { createPool } from './db/client.js';
import { PersistenceService } from './persistence/PersistenceService.js';
import { registerPersistenceRoutes } from './api/persistenceRoutes.js';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const persistence =
  config.enablePersistence && config.databaseUrl
    ? new PersistenceService(createPool(config.databaseUrl))
    : null;

registerPersistenceRoutes(app, persistence);

app.get('/', (_req, res) => {
  res.send('Qwirkle backend running');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'qwirkle-backend' });
});

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: false,
    },
  }
);

const lobbyManager = new LobbyManager();
const sessionManager = new GameSessionManager();
const socketsByUser = new Map<string, string>();

io.use(authenticateSocket);

io.on('connection', (socket) => {
  registerHandlers(io, socket, lobbyManager, sessionManager, socketsByUser, persistence);
});

httpServer.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${config.port}`);
});
