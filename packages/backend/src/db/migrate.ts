import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './client.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run(): Promise<void> {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL or SUPABASE_DB_URL is required to run migrations');
  }

  const pool = createPool(config.databaseUrl);
  const client = await pool.connect();

  try {
    await client.query('begin');
    await client.query(
      'create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())'
    );

    const migrationsDir = path.resolve(__dirname, '../../db/migrations');
    const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const migrationId = file;
      const already = await client.query('select 1 from schema_migrations where id = $1', [migrationId]);
      if (already.rowCount && already.rowCount > 0) {
        continue;
      }

      const sqlPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(sqlPath, 'utf8');
      await client.query(sql);
      await client.query('insert into schema_migrations(id) values ($1)', [migrationId]);
      // eslint-disable-next-line no-console
      console.log(`Applied migration: ${migrationId}`);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
