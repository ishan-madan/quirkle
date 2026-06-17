import { randomInt, randomUUID } from 'node:crypto';

export function makeLobbyId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 6 }, () => letters[randomInt(0, letters.length)]).join('');
}

export function makeUserId(): string {
  return randomUUID();
}

export function makeRejoinToken(): string {
  return randomUUID();
}
