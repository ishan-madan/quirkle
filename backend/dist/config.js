import 'dotenv/config';
export const config = {
    port: Number(process.env.PORT ?? 4000),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    maxEventsPerSecond: Number(process.env.MAX_EVENTS_PER_SECOND ?? 20),
    databaseUrl: process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? '',
    enablePersistence: (process.env.ENABLE_PERSISTENCE ?? 'true') !== 'false',
};
