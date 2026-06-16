import type { Socket } from 'socket.io';
import type { SocketData } from '../../types/socket.js';

export function checkRateLimit(socket: Socket<any, any, any, SocketData>, maxEventsPerSecond: number): boolean {
  const now = Date.now();
  const state = socket.data.rateState;

  if (now - state.windowStartMs >= 1000) {
    state.windowStartMs = now;
    state.count = 0;
  }

  state.count += 1;
  return state.count <= maxEventsPerSecond;
}
