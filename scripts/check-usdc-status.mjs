#!/usr/bin/env node
import fs from 'fs';
import postgres from 'postgres';

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1);
}

const sql = postgres(process.env.DATABASE_URL);
const rows = await sql`
  SELECT reference, status, tx_hash, amount_xlm
  FROM transactions
  WHERE asset = 'usdc' AND type = 'BUY'
  ORDER BY created_at DESC
  LIMIT 8
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
