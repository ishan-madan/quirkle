import type { Socket } from 'socket.io';
import type { SocketData } from '../../types/socket.js';
import { makeUserId } from '../../utils/id.js';

export function authenticateSocket(socket: Socket<any, any, any, SocketData>, next: (err?: Error) => void): void {
  const rawName = socket.handshake.auth?.name ?? socket.handshake.query.name;
  const rawUserId = socket.handshake.auth?.userId ?? socket.handshake.query.userId;
  const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : 'Guest';
  const userId = typeof rawUserId === 'string' && rawUserId.trim().length > 0 ? rawUserId.trim() : makeUserId();

  socket.data.user = {
    userId,
    name,
  };

  socket.data.rateState = {
    windowStartMs: Date.now(),
    count: 0,
  };

  next();
}
