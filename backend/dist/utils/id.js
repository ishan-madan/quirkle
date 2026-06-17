import { randomInt, randomUUID } from 'node:crypto';
export function makeLobbyId() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length: 6 }, () => letters[randomInt(0, letters.length)]).join('');
}
export function makeUserId() {
    return randomUUID();
}
export function makeRejoinToken() {
    return randomUUID();
}
