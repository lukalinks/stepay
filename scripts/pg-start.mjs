/**
 * Start local PostgreSQL from `.pgdata` (created on first `npm run db:setup`).
 * Requires PostgreSQL binaries on PATH or under Program Files (Windows).
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pgData = join(root, '.pgdata');

function findPgCtl() {
    if (process.platform === 'win32') {
        for (const ver of ['18', '17', '16', '15']) {
            const candidate = `C:\\Program Files\\PostgreSQL\\${ver}\\bin\\pg_ctl.exe`;
            if (existsSync(candidate)) return candidate;
        }
    }
    return 'pg_ctl';
}

function findInitdb() {
    if (process.platform === 'win32') {
        for (const ver of ['18', '17', '16', '15']) {
            const candidate = `C:\\Program Files\\PostgreSQL\\${ver}\\bin\\initdb.exe`;
            if (existsSync(candidate)) return candidate;
        }
    }
    return 'initdb';
}

if (!existsSync(pgData)) {
    console.log('Initializing local PostgreSQL in .pgdata ...');
    const init = spawnSync(findInitdb(), ['-D', pgData, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--locale=C'], {
        stdio: 'inherit',
    });
    if (init.status !== 0) {
        process.exit(init.status ?? 1);
    }
}

const logFile = join(pgData, 'server.log');
const status = spawnSync(findPgCtl(), ['-D', pgData, 'status'], { encoding: 'utf8' });
if (status.status === 0) {
    console.log('PostgreSQL is already running (.pgdata).');
    process.exit(0);
}

const start = spawnSync(findPgCtl(), ['-D', pgData, '-l', logFile, 'start'], { stdio: 'inherit' });
if (start.status !== 0) {
    console.error(`Failed to start PostgreSQL. See ${logFile}`);
    process.exit(start.status ?? 1);
}

console.log('PostgreSQL started on localhost:5432 (database: stepay after npm run db:setup).');
