import { randomUUID } from 'node:crypto';

export function makeLobbyId(): string {
  return randomUUID().slice(0, 8);
}

export function makeUserId(): string {
  return randomUUID();
}
