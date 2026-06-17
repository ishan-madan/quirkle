import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config.js';
import { authenticateSocket } from './socket/middleware/authenticateSocket.js';
import { LobbyManager } from './lobby/LobbyManager.js';
import { GameSessionManager } from './game/GameSessionManager.js';
import { registerHandlers } from './socket/registerHandlers.js';
import { createPool } from './db/client.js';
import { PersistenceService } from './persistence/PersistenceService.js';
import { registerPersistenceRoutes } from './api/persistenceRoutes.js';
import { maskDatabaseUrl } from './config.js';
function assertStartupConfig() {
}
function logStartupConfig() {
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const persistence = config.enablePersistence === 'false' || !config.databaseUrl
    ? null
    : new PersistenceService(createPool(config.databaseUrl));
registerPersistenceRoutes(app, persistence);
app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'qwirkle-backend' });
});
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
const lobbyManager = new LobbyManager();
const sessionManager = new GameSessionManager();
const socketsByUser = new Map();
io.use(authenticateSocket);
io.on('connection', (socket) => {
    registerHandlers(io, socket, lobbyManager, sessionManager, socketsByUser, persistence);
});
app.use(express.static(frontendDistPath));
app.get('*', (_req, res) => {
    res.sendFile(frontendIndexPath);
});
const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${PORT}`);
});
