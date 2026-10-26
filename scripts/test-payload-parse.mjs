#!/usr/bin/env node
import postgres from 'postgres';
import { readFileSync } from 'fs';

function coerceIntentPayload(raw) {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        try {
          const inner = JSON.parse(parsed);
          if (inner && typeof inner === 'object' && !Array.isArray(inner)) return inner;
        } catch { return {}; }
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { return {}; }
    return {};
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return {};
}

const env = readFileSync('/var/www/stepay/.env', 'utf8');
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const sql = postgres(dbUrl);
const rows = await sql`SELECT payload FROM sign_intents WHERE type='SWAP' ORDER BY created_at DESC LIMIT 1`;
const raw = rows[0]?.payload;
console.log('typeof raw:', typeof raw);
console.log('raw:', JSON.stringify(raw));
const coerced = coerceIntentPayload(raw);
console.log('coerced:', coerced);
console.log('amount:', coerced.amount, 'type:', typeof coerced.amount);
await sql.end();
