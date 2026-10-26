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
const txs = await sql`
  SELECT reference, status, tx_hash, amount_xlm
  FROM transactions
  WHERE type = 'BUY' AND asset = 'usdc' AND status IN ('PENDING', 'PROCESSING')
  ORDER BY created_at DESC
  LIMIT 8
`;
console.log('STUCK', JSON.stringify(txs));

const users = await sql`
  SELECT wallet_public FROM users WHERE id = '98da3f82-63ba-456d-8261-d96eca7a43c1' LIMIT 1
`;
const wp = users[0]?.wallet_public;
if (wp) {
  const uacct = await fetch('https://horizon.stellar.org/accounts/' + wp).then((r) => r.json());
  const usdcLines = (uacct.balances || []).filter((b) => b.asset_code === 'USDC');
  console.log('USDC_LINES', JSON.stringify(usdcLines));
}
await sql.end();
