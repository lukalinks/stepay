/**
 * Create the stepay database (if missing) and apply SQL migrations incrementally.
 * Usage: node scripts/setup-db.mjs
 * Requires DATABASE_URL in .env or environment.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile() {
    try {
        const raw = readFileSync(join(root, '.env'), 'utf8');
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            const value = trimmed.slice(eq + 1).trim();
            if (!process.env[key]) process.env[key] = value;
        }
    } catch {
        // .env optional if DATABASE_URL is already set
    }
}

function parseDbUrl(url) {
    const u = new URL(url);
    const dbName = u.pathname.replace(/^\//, '') || 'postgres';
    u.pathname = '/postgres';
    return { adminUrl: u.toString(), dbName };
}

/** If migration effects already exist, mark applied without re-running SQL. */
const MIGRATION_MARKERS = {
    '00001_init_schema.sql': 'users',
    '00013_rate_limits.sql': 'rate_limit_events',
    '00014_phone_pay_features.sql': 'pay_links',
    '00015_merchant_api.sql': 'merchant_api_keys',
    '00017_signup_verifications.sql': 'signup_verifications',
    '00018_admin_otp_login.sql': 'admin_login_verifications',
};

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Add it to .env first.');
    process.exit(1);
}

const { adminUrl, dbName } = parseDbUrl(databaseUrl);
const admin = postgres(adminUrl, { max: 1 });

const exists = await admin`
    SELECT 1 FROM pg_database WHERE datname = ${dbName}
`;
if (exists.length === 0) {
    await admin.unsafe(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Created database: ${dbName}`);
} else {
    console.log(`Database already exists: ${dbName}`);
}

await admin.end();

const app = postgres(databaseUrl, { max: 1 });

await app.unsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
`);

const migrationsDir = join(root, 'db', 'migrations');
const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

const appliedRows = await app`SELECT filename FROM schema_migrations`;
const applied = new Set(appliedRows.map((r) => r.filename));

async function tableExists(name) {
    const rows = await app`SELECT to_regclass(${`public.${name}`}) AS reg`;
    return rows[0]?.reg != null;
}

// Bootstrap tracking for databases created before schema_migrations existed
if (applied.size === 0 && (await tableExists('users'))) {
    for (const file of files) {
        const marker = MIGRATION_MARKERS[file];
        if (marker && !(await tableExists(marker))) continue;
        if (!marker && file < '00013_rate_limits.sql') {
            // Intermediate migrations on an existing DB — assume applied if users exists
            await app`INSERT INTO schema_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
            applied.add(file);
            continue;
        }
        if (marker && (await tableExists(marker))) {
            await app`INSERT INTO schema_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
            applied.add(file);
        }
    }
    if (applied.size > 0) {
        console.log(`Bootstrapped ${applied.size} migration(s) already present in database.`);
    }
}

for (const file of files) {
    if (applied.has(file)) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
    }

    const marker = MIGRATION_MARKERS[file];
    if (marker && (await tableExists(marker))) {
        await app`INSERT INTO schema_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
        console.log(`Skipping ${file} (${marker} already exists)`);
        continue;
    }

    const sqlText = readFileSync(join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file}...`);
    try {
        await app.unsafe(sqlText);
        await app`INSERT INTO schema_migrations (filename) VALUES (${file})`;
        console.log(`Applied ${file}`);
    } catch (err) {
        console.error(`Failed on ${file}:`, err.message ?? err);
        process.exit(1);
    }
}

await app.end();
console.log('Database setup complete.');
