import { Pool } from 'pg';

import env from '../config/env';

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export async function withClient<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
