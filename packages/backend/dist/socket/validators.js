import { z } from 'zod';
const coordinateRegex = /^-?\d+,-?\d+$/;
export const createLobbySchema = z.object({
    name: z.string().trim().min(1).max(24).optional(),
});
export const lobbyIdSchema = z.object({
    lobbyId: z.string().min(4).max(64),
});
export const submitMoveSchema = z.object({
    lobbyId: z.string().min(4).max(64),
    kind: z.union([z.literal('place'), z.literal('pass')]),
    placements: z
        .array(z.object({
        tileId: z.number().int().min(1),
        coordinate: z.string().regex(coordinateRegex),
    }))
        .optional(),
});
export const drawTilesSchema = z.object({
    lobbyId: z.string().min(4).max(64),
    tileIds: z.array(z.number().int().min(1)).min(1).max(6),
});
