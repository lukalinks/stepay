/**
 * Non-destructive wallet penetration tests.
 *   node scripts/pen-test-wallets.mjs
 *   TEST_BASE_URL=https://stepay.pro node scripts/pen-test-wallets.mjs
 */

const BASE = (process.env.TEST_BASE_URL || 'https://stepay.pro').replace(/\/$/, '');

let pass = 0;
let fail = 0;
const findings = [];

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

function finding(severity, title, detail) {
    findings.push({ severity, title, detail });
}

async function json(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, { ...init, redirect: 'manual' });
    const text = await res.text();
    let body = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        body = { _raw: text.slice(0, 200) };
    }
    return { res, body, text };
}

async function testReachable() {
    console.log('\nConnectivity');
    try {
        const { res, body } = await json('/api/health');
        assert(res.ok && body.ok === true, `health OK (${BASE})`, `HTTP ${res.status}`);
    } catch (err) {
        bad('health OK', err.message);
    }
}

async function testUnauthenticatedAccess() {
    console.log('\nAuth boundary (unauthenticated)');

    const routes = [
        ['GET', '/api/user/wallet-backup'],
        ['PUT', '/api/user/wallet-backup', { vault: { publicKey: 'GCD6WBLOEZMD65Q35IXNCWX2CCNI4BQWVXTJ3B6TTTXKETF46HBCV2RC', salt: 'a', iv: 'b', ciphertext: 'c' }, confirmCode: '000000', challengeNonce: 'x', keyProof: 'y' }],
        ['DELETE', '/api/user/wallet-backup', { confirmCode: '000000' }],
        ['POST', '/api/user/wallet-backup', { action: 'intent' }],
        ['POST', '/api/user/wallet-backup', { action: 'verify', code: '000000' }],
        ['POST', '/api/user/wallet-export', { password: 'wrong' }],
        ['GET', '/api/user/profile'],
        ['GET', '/api/user'],
        ['POST', '/api/send/confirm', { intentId: '00000000-0000-0000-0000-000000000001', confirmCode: '000000' }],
        ['POST', '/api/send/finalize', { intentId: '00000000-0000-0000-0000-000000000001', txHash: 'fake' }],
    ];

    for (const [method, path, payload] of routes) {
        const init = { method, headers: { 'Content-Type': 'application/json' } };
        if (payload) init.body = JSON.stringify(payload);
        const { res, body } = await json(path, init);
        const leaksSecret =
            body.secretKey ||
            (body.vault && typeof body.vault === 'object' && body.vault.ciphertext);
        assert(res.status === 401 || res.status === 403, `${method} ${path} → ${res.status} (blocked)`, `got ${res.status}`);
        if (leaksSecret) {
            bad(`${method} ${path} leaks wallet data without auth`, JSON.stringify(Object.keys(body)));
            finding('CRITICAL', 'Unauthenticated secret leak', path);
        }
    }
}

async function testInvalidSession() {
    console.log('\nInvalid / forged session');

    const fakeCookie = '__Secure-authjs.session-token=eyJhbGciOiJIUzI1NiJ9.evil.sig';
    const { res, body } = await json('/api/user/wallet-backup', {
        headers: { Cookie: fakeCookie },
    });
    assert(res.status === 401 || res.status === 403, 'forged cookie rejected', `HTTP ${res.status}`);
    assert(!body.vault && !body.secretKey, 'forged cookie returns no secrets');
}

async function testIdorWithoutSession() {
    console.log('\nIDOR probes (no valid session)');

    const fakeIntent = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { res, body } = await json('/api/send/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: fakeIntent, confirmCode: '123456' }),
    });
    assert(res.status === 401 || res.status === 403 || res.status === 404, 'confirm without session blocked', `HTTP ${res.status}`);
    assert(!body.plan?.secretKey && !body.secretKey, 'confirm does not leak secretKey');
}

async function testDevEndpointsBlocked() {
    console.log('\nDev / debug endpoints');

    const { res: devRes } = await json('/api/dev/simulate-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1 }),
    });
    assert(devRes.status === 404 || devRes.status === 403 || devRes.status === 401, 'dev simulate-deposit blocked in prod', `HTTP ${devRes.status}`);
}

async function testSignupNoDevLeak() {
    console.log('\nProduction OTP leak check');

    const email = `pentest+${Date.now()}@invalid.example`;
    const { res, body } = await json('/api/auth/signup/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'testpass99', countryCode: 'ZM' }),
    });

    if (res.ok && body.devConfirmCode) {
        bad('signup intent exposes devConfirmCode in production');
        finding('HIGH', 'OTP leaked in API response', 'signup/intent returns devConfirmCode');
    } else if (res.ok) {
        ok('signup intent does not expose devConfirmCode');
    } else {
        ok(`signup intent rate-limited or rejected (${res.status}) — no OTP leak observed`);
    }
}

async function testResponseHeaders() {
    console.log('\nResponse hygiene');

    const { res } = await json('/api/health');
    const cache = res.headers.get('cache-control') || '';
    // health may cache; wallet routes should not
    ok(`health cache-control: ${cache || '(none)'}`);

    const fakeCookie = 'authjs.session-token=fake';
    const { res: wRes, text: profileBody } = await json('/api/user/profile', { headers: { Cookie: fakeCookie } });
    assert(!profileBody.includes('wallet_secret'), 'profile error response has no wallet_secret field name leak');
    assert(!profileBody.includes('secretKey'), 'profile error has no secretKey');
}

async function testPublicDataOnly() {
    console.log('\nPublic wallet data (by design)');

    // Pay link / checkout should expose wallet_public only, never secrets
    const { res, body } = await json('/api/checkout/nonexistent-token-12345');
    assert(res.status === 404 || res.status === 400, 'invalid checkout token rejected', `HTTP ${res.status}`);
    assert(!body.secretKey && !body.walletSecret, 'checkout error has no secrets');
}

async function testBackupValidationLogic() {
    console.log('\nBackup key proof validation');

    const { Keypair } = await import('@stellar/stellar-sdk');
    const kp = Keypair.random();
    const nonce = 'test-nonce-123';
    const message = `stepay-backup:${nonce}`;
    const sig = Buffer.from(kp.sign(Buffer.from(message))).toString('base64');

    function verifyBackupKeyProof(walletPublic, nonceVal, signatureB64) {
        try {
            const keypair = Keypair.fromPublicKey(walletPublic.trim());
            return keypair.verify(Buffer.from(`stepay-backup:${nonceVal}`), Buffer.from(signatureB64.trim(), 'base64'));
        } catch {
            return false;
        }
    }

    assert(verifyBackupKeyProof(kp.publicKey(), nonce, sig), 'accepts valid Stellar backup signature');
    assert(!verifyBackupKeyProof(kp.publicKey(), nonce, 'bad'), 'rejects invalid backup signature');
    assert(!verifyBackupKeyProof(Keypair.random().publicKey(), nonce, sig), 'rejects wrong public key');
}

async function testProductionAdminAudit() {
    console.log('\nAdmin wallet storage audit (unauthenticated)');

    const { res, body } = await json('/api/admin/audit');
    assert(res.status === 401 || res.status === 403, 'admin audit requires auth', `HTTP ${res.status}`);
    assert(!body.walletStorage, 'admin audit data not exposed without auth');
}

async function main() {
    console.log(`\nStepay wallet penetration test\nTarget: ${BASE}\n`);

    await testReachable();
    await testUnauthenticatedAccess();
    await testInvalidSession();
    await testIdorWithoutSession();
    await testDevEndpointsBlocked();
    await testSignupNoDevLeak();
    await testResponseHeaders();
    await testPublicDataOnly();
    await testBackupValidationLogic();
    await testProductionAdminAudit();

    if (findings.length) {
        console.log('\n── Findings ──');
        for (const f of findings.sort((a, b) => {
            const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
        })) {
            console.log(`  [${f.severity}] ${f.title}`);
            console.log(`         ${f.detail}`);
        }
    }

    console.log(`\n── Summary: ${pass} passed, ${fail} failed, ${findings.length} findings ──\n`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
