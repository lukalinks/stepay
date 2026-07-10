/**
 * Swap / cash-out stuck-state tests.
 *
 *   TEST_BASE_URL=http://localhost:3000 node scripts/test-swap-sell-flow.mjs
 */

const BASE = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

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

function extractCookie(setCookie) {
    const m = (setCookie || '').match(/((?:__Secure-)?authjs\.session-token=[^;]+)/);
    return m ? m[1] : '';
}

async function main() {
    console.log(`\nSwap / sell flow tests\nTarget: ${BASE}\n`);

    const health = await fetch(`${BASE}/api/health`);
    assert(health.ok, 'GET /api/health');

    const retry = await fetch(`${BASE}/api/operations/retry-stuck`, { method: 'POST' });
    assert(retry.status === 401, 'retry-stuck requires auth', `HTTP ${retry.status}`);

    const { Keypair } = await import('@stellar/stellar-sdk');
    const email = `swap-sell+${Date.now()}@stepay.test`;
    const password = 'testpass123456';

    const intentRes = await fetch(`${BASE}/api/auth/signup/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, countryCode: 'ZM' }),
    });
    const intentBody = await intentRes.json().catch(() => ({}));
    if (!intentRes.ok || !intentBody.signupId || !intentBody.devConfirmCode) {
        bad('signup intent', intentBody.error || 'no devConfirmCode');
        console.log(`\n── Summary: ${pass} passed, ${fail} failed ──\n`);
        process.exit(1);
    }
    ok('signup intent');

    const signupRes = await fetch(`${BASE}/api/auth/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            signupId: intentBody.signupId,
            code: intentBody.devConfirmCode,
            walletPublic: Keypair.random().publicKey(),
            cloudBackupEnabled: false,
        }),
    });
    const setCookies = signupRes.headers.getSetCookie?.() ?? [];
    const cookie = extractCookie(setCookies.length ? setCookies.join('; ') : signupRes.headers.get('set-cookie') || '');
    if (!signupRes.ok || !cookie) {
        bad('signup verify', `HTTP ${signupRes.status}`);
        process.exit(1);
    }
    ok('signup verify');

    await fetch(`${BASE}/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
            fullName: 'Swap Sell Test',
            phone: '+260971234567',
            address: '1 Test Rd, Lusaka',
            idDocumentType: 'nrc',
            idDocumentNumber: '111111/11/1',
        }),
    });

    const swapIntent = await fetch(`${BASE}/api/swap/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ from: 'xlm', to: 'usdc', amount: 1 }),
    });
    const swapBody = await swapIntent.json().catch(() => ({}));
    if (swapIntent.ok && swapBody.intentId) {
        ok('POST /api/swap/intent');
    } else if (swapBody.error?.includes('Insufficient')) {
        ok('POST /api/swap/intent (balance gate only)');
    } else {
        bad('POST /api/swap/intent', swapBody.error || `HTTP ${swapIntent.status}`);
    }

    const sellIntent = await fetch(`${BASE}/api/sell/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
            amount: 1,
            asset: 'xlm',
            phone: '+260972222222',
            operator: 'mtn',
        }),
    });
    const sellBody = await sellIntent.json().catch(() => ({}));
    if (sellIntent.ok && sellBody.intentId) {
        ok('POST /api/sell/intent with alternate phone');
    } else if (sellBody.error?.includes('Insufficient') || sellBody.error?.includes('cash out up to')) {
        ok('POST /api/sell/intent (balance/reserve gate only)');
    } else {
        bad('POST /api/sell/intent', sellBody.error || `HTTP ${sellIntent.status}`);
    }

    const retryAuthed = await fetch(`${BASE}/api/operations/retry-stuck`, {
        method: 'POST',
        headers: { Cookie: cookie },
    });
    const retryBody = await retryAuthed.json().catch(() => ({}));
    assert(retryAuthed.ok && retryBody.ok === true, 'POST /api/operations/retry-stuck (authed)', retryBody.error);

    console.log(`\n── Summary: ${pass} passed, ${fail} failed ──\n`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
