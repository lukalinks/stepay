import postgres from 'postgres';

const connectionString =
    process.env.DATABASE_URL?.trim() ||
    'postgresql://127.0.0.1:5432/placeholder';

/**
 * Serverless-friendly Postgres client. Set DATABASE_URL in production.
 * The placeholder URL avoids build-time import errors; first query fails at runtime if unset.
 */
export const sql = postgres(connectionString, { max: 10, idle_timeout: 20 });
