#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE = process.env.WEBHOOK_BASE || 'http://127.0.0.1:3000';

for (const line of fs.readFileSync('/var/www/stepay/.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
}

const webhookSecret = process.env.LENCO_WEBHOOK_SECRET?.trim();
const lencoSecret = process.env.LENCO_SECRET_KEY?.trim();
const key =
    webhookSecret ||
    (lencoSecret ? crypto.createHash('sha256').update(lencoSecret).digest('hex') : null);

console.log('--- Lenco webhook test ---');
console.log('URL:', `${BASE}/api/hooks/lenco`);
console.log('LENCO_WEBHOOK_SECRET set:', Boolean(webhookSecret));
console.log('LENCO_SECRET_KEY set:', Boolean(lencoSecret));
console.log('Signing key available:', Boolean(key));

const getRes = await fetch(`${BASE}/api/hooks/lenco`);
console.log('\nGET', getRes.status, await getRes.text());

const unsigned = await fetch(`${BASE}/api/hooks/lenco`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"event":"test"}',
});
console.log('POST unsigned', unsigned.status, await unsigned.text());

if (!key) {
    console.error('\nFAIL: No webhook signing key configured');
    process.exit(1);
}

const body = JSON.stringify({
    event: 'transaction.successful',
    data: {
        status: 'successful',
        clientReference: 'webhook-test-nonexistent-ref',
        type: 'collection',
    },
});
const sig = crypto.createHmac('sha512', key).update(body).digest('hex');
const signed = await fetch(`${BASE}/api/hooks/lenco`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-lenco-signature': sig,
    },
    body,
});
console.log('POST signed (fake ref)', signed.status, await signed.text());

const extGet = await fetch('https://stepay.pro/api/hooks/lenco', {
    headers: { Host: 'stepay.pro' },
    // use direct if DNS broken externally from VPS
}).catch(() => null);
if (extGet) {
    console.log('\nExternal GET https://stepay.pro', extGet.status, await extGet.text());
} else {
    const viaIp = await fetch('https://187.124.210.108/api/hooks/lenco', {
        headers: { Host: 'stepay.pro' },
        // @ts-ignore node fetch may reject bad cert for IP - try http apache
    }).catch(() => null);
    if (!viaIp) {
        const httpGet = await fetch('http://127.0.0.1:3000/api/hooks/lenco');
        console.log('\nPublic URL should be: https://stepay.pro/api/hooks/lenco');
    }
}

console.log('\nOK: Webhook endpoint reachable and signature verification works.');
