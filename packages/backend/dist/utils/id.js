import { randomUUID } from 'node:crypto';
export function makeLobbyId() {
    return randomUUID().slice(0, 8);
}
export function makeUserId() {
    return randomUUID();
}
