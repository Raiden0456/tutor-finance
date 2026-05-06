import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { schema } from './schema.js';
import { env } from '../config.js';

export type Database = NodePgDatabase<typeof schema>;

let pool: pg.Pool | undefined;
let db: Database | undefined;

export function getPool(): pg.Pool {
  if (pool) return pool;
  pool = new pg.Pool({ connectionString: env.databaseUrl });
  return pool;
}

export function getDb(): Database {
  if (db) return db;
  db = drizzle(getPool(), { schema });
  return db;
}

// Aliases kept for backwards-compatible call sites.
export const createPool = (_url: string): pg.Pool => getPool();
export const createDb = (_pool: pg.Pool): Database => getDb();
