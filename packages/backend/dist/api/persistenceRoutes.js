import { z } from 'zod';
const leaderboardQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
});
export function registerPersistenceRoutes(app, persistence) {
    app.get('/api/users/:externalUserId/stats', async (req, res) => {
        if (!persistence) {
            res.status(503).json({ error: 'Persistence is disabled' });
            return;
        }
        const { externalUserId } = req.params;
        if (!externalUserId) {
            res.status(400).json({ error: 'externalUserId is required' });
            return;
        }
        const result = await persistence.getUserStatsByExternalUserId(externalUserId);
        if (!result) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(result);
    });
    app.get('/api/games/:gameId', async (req, res) => {
        if (!persistence) {
            res.status(503).json({ error: 'Persistence is disabled' });
            return;
        }
        const gameId = req.params.gameId;
        if (!gameId) {
            res.status(400).json({ error: 'gameId is required' });
            return;
        }
        const summary = await persistence.getGameSummary(gameId);
        if (!summary) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }
        res.json(summary);
    });
    app.get('/api/leaderboard', async (req, res) => {
        if (!persistence) {
            res.status(503).json({ error: 'Persistence is disabled' });
            return;
        }
        const parsed = leaderboardQuerySchema.parse(req.query);
        const leaderboard = await persistence.getLeaderboard(parsed.limit);
        res.json({ leaderboard });
    });
}
