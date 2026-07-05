/**
 * Verify cash out accepts any valid mobile money number (not just profile phone).
 *
 *   TEST_BASE_URL=http://localhost:3000 node scripts/test-sell-payout-phone.mjs
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
    console.log(`\nSell payout phone tests\nTarget: ${BASE}\n`);

    const { Keypair } = await import('@stellar/stellar-sdk');
    const email = `sell-phone+${Date.now()}@stepay.test`;
    const password = 'testpass123456';
    const profilePhone = '+260971111111';
    const payoutPhone = '+260972222222';

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
    const cookieHeader = setCookies.length ? setCookies.join('; ') : signupRes.headers.get('set-cookie') || '';
    const cookie = extractCookie(cookieHeader);
    if (!signupRes.ok || !cookie) {
        bad('signup verify', `HTTP ${signupRes.status}`);
        console.log(`\n── Summary: ${pass} passed, ${fail} failed ──\n`);
        process.exit(1);
    }
    ok('signup verify');

    const profileRes = await fetch(`${BASE}/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
            fullName: 'Sell Phone Test',
            phone: profilePhone,
            address: '123 Test Street, Lusaka',
            idDocumentType: 'nrc',
            idDocumentNumber: '123456/78/9',
        }),
    });
    const profileBody = await profileRes.json().catch(() => ({}));
    assert(profileRes.ok, 'complete profile with phone A', profileBody.error);

    const sellRes = await fetch(`${BASE}/api/sell/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
            amount: 1,
            asset: 'xlm',
            phone: payoutPhone,
            operator: 'mtn',
        }),
    });
    const sellBody = await sellRes.json().catch(() => ({}));

    if (sellRes.ok && sellBody.intentId) {
        ok('sell intent accepts payout phone B (different from profile phone A)');
    } else if (sellBody.error?.includes('Insufficient')) {
        ok('sell intent accepts alternate phone (failed only on balance, not phone match)');
    } else if (sellBody.error?.includes('Cash out must use the mobile money number')) {
        bad('sell intent rejects alternate payout phone', sellBody.error);
    } else if (sellBody.error?.includes('profile')) {
        bad('sell intent blocked by profile phone rule', sellBody.error);
    } else {
        bad('POST /api/sell/intent with alternate phone', sellBody.error || `HTTP ${sellRes.status}`);
    }

    const invalidRes = await fetch(`${BASE}/api/sell/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
            amount: 1,
            asset: 'xlm',
            phone: '123',
            operator: 'mtn',
        }),
    });
    const invalidBody = await invalidRes.json().catch(() => ({}));
    assert(
        !invalidRes.ok && invalidBody.error?.includes('valid mobile'),
        'sell intent rejects invalid phone',
        invalidBody.error
    );

    console.log(`\n── Summary: ${pass} passed, ${fail} failed ──\n`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
