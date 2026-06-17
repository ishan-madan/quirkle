import 'dotenv/config';
// Validate CORS origin for production
const getCorsOrigin = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const corsEnv = process.env.CORS_ORIGIN;
    if (isProduction && !corsEnv) {
        throw new Error('CORS_ORIGIN environment variable is required in production. ' +
            'Set it to your Netlify frontend URL (e.g., https://myapp.netlify.app)');
    }
    // Development: allow multiple localhost variations
    if (!isProduction) {
        return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
    }
    // Production: use configured origin
    return corsEnv || 'http://localhost:5173';
};
export const config = {
    port: Number(process.env.PORT ?? 4000),
    corsOrigin: getCorsOrigin(),
    maxEventsPerSecond: Number(process.env.MAX_EVENTS_PER_SECOND ?? 20),
    databaseUrl: process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? '',
    enablePersistence: (process.env.ENABLE_PERSISTENCE ?? 'true') !== 'false',
};
