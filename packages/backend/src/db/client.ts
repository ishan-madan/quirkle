import { Pool } from 'pg';

export function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}
