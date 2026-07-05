/**
 * Security fix regression tests (no dev server required for unit tests).
 *   node scripts/test-security-fixes.mjs
 *
 * Optional integration tests (dev server must be running):
 *   TEST_BASE_URL=http://localhost:3000 node scripts/test-security-fixes.mjs --integration
 */

import { isIP } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const runIntegration = process.argv.includes('--integration');
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

let pass = 0;
let fail = 0;

function ok(label) {
    pass++;
    console.log(`  ✓ ${label}`);
}

function bad(label, detail) {
    fail++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

function assert(cond, label, detail) {
    if (cond) ok(label);
    else bad(label, detail);
}

// ── Mirror lib/url-security.ts (keep in sync) ──
const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata.goog']);

function isLocalDevHostname(hostname) {
    const h = hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

function isPrivateOrReservedIp(hostname) {
    const ipVersion = isIP(hostname);
    if (ipVersion === 4) {
        const parts = hostname.split('.').map(Number);
        const [a, b] = parts;
        if (a === 10 || a === 127 || a === 0) return true;
        if (a === 169 && b === 254) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 100 && b >= 64 && b <= 127) return true;
        return false;
    }
    if (ipVersion === 6) {
        const h = hostname.toLowerCase();
        if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
    }
    return false;
}

function assertPublicHostname(hostname) {
    const h = hostname.toLowerCase().replace(/\.$/, '');
    if (BLOCKED_HOSTNAMES.has(h)) throw new Error('blocked hostname');
    if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) throw new Error('blocked hostname');
    if (isPrivateOrReservedIp(h)) throw new Error('private ip');
}

function assertSafeWebhookUrl(raw) {
    if (!raw?.trim()) return null;
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:') throw new Error('must be https');
    assertPublicHostname(parsed.hostname.toLowerCase());
    return parsed.toString();
}

function assertSafeRedirectUrl(raw) {
    if (!raw?.trim()) return null;
    const parsed = new URL(raw.trim());
    const isDev = process.env.NODE_ENV !== 'production';
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === 'https:') {
        assertPublicHostname(host);
        return parsed.toString();
    }
    if (isDev && parsed.protocol === 'http:' && isLocalDevHostname(host)) return parsed.toString();
    throw new Error('must be https');
}

function testUrlSecurity() {
    console.log('\nURL security (unit)');

    assert(assertSafeWebhookUrl('https://merchant.example.com/hook') !== null, 'allows public HTTPS webhook');
    assert(assertSafeRedirectUrl('https://shop.example.com/thanks') !== null, 'allows public HTTPS redirect');

    try {
        assertSafeWebhookUrl('http://169.254.169.254/latest/meta-data/');
        bad('blocks metadata SSRF');
    } catch {
        ok('blocks metadata SSRF');
    }

    try {
        assertSafeWebhookUrl('https://127.0.0.1/hook');
        bad('blocks localhost webhook');
    } catch {
        ok('blocks localhost webhook');
    }

    try {
        assertSafeWebhookUrl('http://merchant.example.com/hook');
        bad('blocks HTTP webhook');
    } catch {
        ok('blocks HTTP webhook');
    }

    try {
        assertSafeRedirectUrl('javascript:alert(1)');
        bad('blocks javascript redirect');
    } catch {
        ok('blocks javascript redirect');
    }

    assert(assertSafeRedirectUrl(null) === null, 'null redirect returns null');
    assert(assertSafeWebhookUrl(undefined) === null, 'undefined webhook returns null');
}

async function runTypecheck() {
    console.log('\nTypeScript');
    return new Promise((resolve) => {
        const proc = spawn('npx', ['tsc', '--noEmit'], { cwd: root, shell: true, stdio: 'pipe' });
        let err = '';
        proc.stderr.on('data', (d) => { err += d; });
        proc.on('close', (code) => {
            if (code === 0) ok('tsc --noEmit');
            else bad('tsc --noEmit', err.trim().slice(0, 200));
            resolve();
        });
    });
}

async function json(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, init);
    const body = await res.json().catch(() => ({}));
    return { res, body };
}

function extractCookie(setCookie) {
    const m = (setCookie || '').match(/((?:__Secure-)?authjs\.session-token=[^;]+)/);
    return m ? m[1] : '';
}

async function testIntegration() {
    console.log('\nIntegration (requires dev server)');

    try {
        await fetch(`${BASE}/api/health`);
    } catch {
        bad('dev server reachable', `start with npm run dev — ${BASE}`);
        return;
    }
    ok('dev server reachable');

    const testEmail = `sec+${Date.now()}@stepay.test`;
    const testPassword = 'testpass123456';
    const { Keypair } = await import('@stellar/stellar-sdk');
    const walletPublic = Keypair.random().publicKey();

    const intentRes = await fetch(`${BASE}/api/auth/signup/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword, countryCode: 'ZM' }),
    });
    const intentBody = await intentRes.json().catch(() => ({}));
    if (!intentRes.ok || !intentBody.signupId || !intentBody.devConfirmCode) {
        bad('signup flow for auth test', intentBody.error || 'no devConfirmCode');
        return;
    }
    ok('signup intent');

    const signupRes = await fetch(`${BASE}/api/auth/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            signupId: intentBody.signupId,
            code: intentBody.devConfirmCode,
            walletPublic,
        }),
    });
    const setCookies = signupRes.headers.getSetCookie?.() ?? [];
    const cookieHeader = setCookies.length ? setCookies.join('; ') : signupRes.headers.get('set-cookie') || '';
    const cookie = extractCookie(cookieHeader);
    if (!signupRes.ok || !cookie) {
        bad('signup verify + session', `HTTP ${signupRes.status}`);
        return;
    }
    ok('signup verify + session cookie');

    const userRes = await json('/api/user', { headers: { Cookie: cookie } });
    assert(userRes.res.ok && userRes.body.user?.walletPublic, 'authenticated GET /api/user', userRes.body.error);

    const keyRes = await json('/api/merchant/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ name: 'Security test' }),
    });
    const apiKey = keyRes.body.key;
    assert(keyRes.res.ok && apiKey, 'create merchant API key', keyRes.body.error);

    if (apiKey) {
        const evil = await json('/api/v1/checkouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                amount: 5,
                asset: 'usdc',
                label: 'Evil webhook test',
                webhook_url: 'https://169.254.169.254/latest/meta-data/',
            }),
        });
        assert(!evil.res.ok, 'rejects SSRF webhook_url on checkout create', `got HTTP ${evil.res.status}`);

        const good = await json('/api/v1/checkouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                amount: 5,
                asset: 'usdc',
                label: 'Good checkout',
                success_url: 'https://example.com/thanks',
            }),
        });
        assert(good.res.ok && good.body.checkout_token, 'allows valid checkout', good.body.error);
        const checkoutToken = good.body.checkout_token;

        if (checkoutToken) {
            const pub = await json(`/api/checkout/${checkoutToken}`);
            assert(pub.res.ok && pub.body.amount === 5, 'public checkout GET works', `HTTP ${pub.res.status}`);
            assert(pub.body.successUrl === 'https://example.com/thanks', 'successUrl returned to payer');

            let got429 = false;
            for (let i = 0; i < 7; i++) {
                const mm = await json(`/api/checkout/${checkoutToken}/mobile-money`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: '+260971234567', operator: 'mtn' }),
                });
                if (mm.res.status === 429) {
                    got429 = true;
                    break;
                }
            }
            assert(got429, 'checkout mobile-money rate limit triggers 429');
        }
    }

    const payLink = await json('/api/user/pay-link', { headers: { Cookie: cookie } });
    if (payLink.res.ok && payLink.body.slug) {
        assert(payLink.body.slug.length >= 32, 'pay link slug has high entropy (>=32 chars)', `len=${payLink.body.slug.length}`);
    } else {
        bad('pay link slug entropy', payLink.body.error);
    }
}

function testWalletBackupValidation() {
    console.log('\nWallet cloud backup validation');

    const validKey = 'GCD6WBLOEZMD65Q35IXNCWX2CCNI4BQWVXTJ3B6TTTXKETF46HBCV2RC';
    const vault = {
        publicKey: validKey,
        salt: 'abc',
        iv: 'def',
        ciphertext: 'ghi',
    };

    function parseWalletVaultBackup(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const publicKey = typeof raw.publicKey === 'string' ? raw.publicKey.trim() : '';
        const salt = typeof raw.salt === 'string' ? raw.salt.trim() : '';
        const iv = typeof raw.iv === 'string' ? raw.iv.trim() : '';
        const ciphertext = typeof raw.ciphertext === 'string' ? raw.ciphertext.trim() : '';
        if (!publicKey || !salt || !iv || !ciphertext) return null;
        if (!/^G[A-Z2-7]{55}$/.test(publicKey)) return null;
        return { publicKey, salt, iv, ciphertext };
    }

    function validateVaultMatchesPublic(v, walletPublic) {
        return v.publicKey.trim().toUpperCase() === walletPublic.trim().toUpperCase();
    }

    assert(parseWalletVaultBackup(vault)?.publicKey === validKey, 'parses valid vault backup');
    assert(parseWalletVaultBackup({ publicKey: 'bad' }) === null, 'rejects invalid vault');
    assert(validateVaultMatchesPublic(vault, validKey), 'vault matches wallet public');
    assert(!validateVaultMatchesPublic(vault, 'GBAD'), 'vault rejects wrong public');
}

async function testBackupKeyProof() {
    console.log('\nBackup key proof (unit)');

    const { Keypair } = await import('@stellar/stellar-sdk');
    const kp = Keypair.random();
    const nonce = 'unit-test-nonce';
    const sig = Buffer.from(kp.sign(Buffer.from(`stepay-backup:${nonce}`))).toString('base64');

    function verifyBackupKeyProof(walletPublic, nonceVal, signatureB64) {
        try {
            const keypair = Keypair.fromPublicKey(walletPublic.trim());
            return keypair.verify(Buffer.from(`stepay-backup:${nonceVal}`), Buffer.from(signatureB64.trim(), 'base64'));
        } catch {
            return false;
        }
    }

    assert(verifyBackupKeyProof(kp.publicKey(), nonce, sig), 'valid backup signature');
    assert(!verifyBackupKeyProof(kp.publicKey(), nonce, 'nope'), 'invalid signature rejected');
}

async function main() {
    console.log('\nStepay security fix tests\n');
    testUrlSecurity();
    testWalletBackupValidation();
    await testBackupKeyProof();
    await runTypecheck();
    if (runIntegration) {
        await testIntegration();
    } else {
        console.log('\n  ○ Integration tests skipped (run with --integration and npm run dev)');
    }
    console.log(`\n── Summary: ${pass} passed, ${fail} failed ──\n`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
