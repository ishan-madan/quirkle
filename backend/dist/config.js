import 'dotenv/config';
export const config = {
    port: process.env.PORT,
    corsOrigin: process.env.CORS_ORIGIN,
    maxEventsPerSecond: Number(process.env.MAX_EVENTS_PER_SECOND),
    databaseUrl: process.env.DATABASE_URL,
    enablePersistence: process.env.ENABLE_PERSISTENCE,
    nodeEnv: process.env.NODE_ENV,
};
export function maskDatabaseUrl(databaseUrl) {
    if (!databaseUrl) {
        return '(missing)';
    }
    try {
        const url = new URL(databaseUrl);
        if (url.password) {
            url.password = '***';
        }
        return url.toString();
    }
    catch {
        return databaseUrl.replace(/:[^:@/]+@/, ':***@');
    }
}
