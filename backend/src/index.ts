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
import { maskDatabaseUrl } from './config.js';

function assertStartupConfig(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN is undefined in production. Aborting startup.');
  }
}

function logStartupConfig(): void {
  // eslint-disable-next-line no-console
  console.log('[boot] NODE_ENV=%s', process.env.NODE_ENV ?? '(undefined)');
  // eslint-disable-next-line no-console
  console.log('[boot] PORT=%s', process.env.PORT ?? '(undefined)');
  // eslint-disable-next-line no-console
  console.log('[boot] CORS_ORIGIN env=%s', process.env.CORS_ORIGIN ?? '(undefined)');
  // eslint-disable-next-line no-console
  console.log('[boot] config.corsOrigin=%s', config.corsOrigin ?? '(undefined)');
  // eslint-disable-next-line no-console
  console.log('[boot] DATABASE_URL=%s', maskDatabaseUrl(process.env.DATABASE_URL));
}

logStartupConfig();
assertStartupConfig();

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const persistence =
  config.enablePersistence === 'false' || !config.databaseUrl
    ? null
    : new PersistenceService(createPool(config.databaseUrl));

registerPersistenceRoutes(app, persistence);

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

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'qwirkle-backend',
    time: new Date().toISOString(),
  });
});

const lobbyManager = new LobbyManager();
const sessionManager = new GameSessionManager();
const socketsByUser = new Map<string, string>();

io.use(authenticateSocket);

io.on('connection', (socket) => {
  registerHandlers(io, socket, lobbyManager, sessionManager, socketsByUser, persistence);
});

const PORT = Number(process.env.PORT) || 4000;

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});
