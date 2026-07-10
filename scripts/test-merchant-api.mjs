/**
 * Merchant Partner API integration tests.
 *
 *   node scripts/test-merchant-api.mjs
 *   TEST_BASE_URL=https://stepay.pro node scripts/test-merchant-api.mjs
 *   STEPAY_API_KEY=sk_live_... node scripts/test-merchant-api.mjs
 *   node scripts/test-merchant-api.mjs --integration   # signup + create key + full flow
 */

const BASE = (process.env.TEST_BASE_URL || 'https://stepay.pro').replace(/\/$/, '');
const runIntegration = process.argv.includes('--integration');
let API_KEY = process.env.STEPAY_API_KEY?.trim() || '';

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

async function json(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, init);
    const body = await res.json().catch(() => ({}));
    return { res, body };
}

async function testPublicEndpoints() {
    console.log('\nPublic endpoints');

    const health = await json('/api/health');
    assert(health.res.ok && health.body.ok === true, 'GET /api/health', `HTTP ${health.res.status}`);

    const embed = await fetch(`${BASE}/embed.js`);
    assert(embed.ok, 'GET /embed.js accessible', `HTTP ${embed.status}`);
    const embedText = await embed.text();
    assert(embedText.includes('StepayEmbed'), 'embed.js exposes StepayEmbed.init', 'missing global');

    const docs = await fetch(`${BASE}/developers`);
    assert(docs.ok, 'GET /developers page', `HTTP ${docs.status}`);
}

async function testAuthRequired() {
    console.log('\nAuth boundary');

    const list = await json('/api/v1/checkouts');
    assert(list.res.status === 401, 'GET /api/v1/checkouts without key → 401', `HTTP ${list.res.status}`);

    const create = await json('/api/v1/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5, label: 'Test' }),
    });
    assert(create.res.status === 401, 'POST /api/v1/checkouts without key → 401', `HTTP ${create.res.status}`);

    const invalid = await json('/api/v1/checkouts', {
        headers: { Authorization: 'Bearer sk_live_invalid_key_for_test' },
    });
    assert(invalid.res.status === 401, 'GET with invalid key → 401', `HTTP ${invalid.res.status}`);
}

async function testValidationWithKey() {
    console.log('\nValidation (authenticated)');

    const noLabel = await json('/api/v1/checkouts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 5 }),
    });
    assert(noLabel.res.status === 400, 'POST without label → 400', noLabel.body.error);

    const ssrf = await json('/api/v1/checkouts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: 5,
            label: 'SSRF test',
            webhook_url: 'https://169.254.169.254/latest/meta-data/',
        }),
    });
    assert(ssrf.res.status === 400, 'POST rejects SSRF webhook_url', `HTTP ${ssrf.res.status}`);

    const good = await json('/api/v1/checkouts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: 1,
            asset: 'usdc',
            label: 'API integration test',
            reference: `test-${Date.now()}`,
            success_url: 'https://example.com/thanks',
        }),
    });
    assert(good.res.ok && good.body.checkout_token, 'POST creates checkout', good.body.error);
    assert(good.body.checkout_url?.includes('/pay/checkout/'), 'checkout_url returned');
    assert(good.body.embed_url?.includes('embed=1'), 'embed_url returned');

    if (!good.res.ok || !good.body.id) return null;

    const checkoutId = good.body.id;
    const token = good.body.checkout_token;

    const getOne = await json(`/api/v1/checkouts/${checkoutId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
    });
    assert(getOne.res.ok && getOne.body.id === checkoutId, 'GET /api/v1/checkouts/:id', getOne.body.error);

    const list = await json('/api/v1/checkouts', {
        headers: { Authorization: `Bearer ${API_KEY}` },
    });
    assert(list.res.ok && Array.isArray(list.body.checkouts), 'GET /api/v1/checkouts list');
    assert(list.body.checkouts.some((c) => c.id === checkoutId), 'created checkout appears in list');

    const pub = await json(`/api/checkout/${token}`);
    assert(pub.res.ok && pub.body.amount === 1, 'Public GET /api/checkout/:token', pub.body.error);
    assert(pub.body.mobileMoneyEnabled !== undefined || pub.body.label, 'checkout has payer-facing fields');

    const fakeId = '00000000-0000-0000-0000-000000000099';
    const notFound = await json(`/api/v1/checkouts/${fakeId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
    });
    assert(notFound.res.status === 404, 'GET unknown checkout → 404', `HTTP ${notFound.res.status}`);

    return good.body;
}

function extractCookie(setCookie) {
    const m = (setCookie || '').match(/((?:__Secure-)?authjs\.session-token=[^;]+)/);
    return m ? m[1] : '';
}

async function bootstrapApiKeyViaSignup() {
    console.log('\nIntegration bootstrap (signup + API key)');

    const { Keypair } = await import('@stellar/stellar-sdk');
    const email = `merchant-api+${Date.now()}@stepay.test`;
    const password = 'testpass123456';

    const intentRes = await fetch(`${BASE}/api/auth/signup/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, countryCode: 'ZM' }),
    });
    const intentBody = await intentRes.json().catch(() => ({}));
    if (!intentRes.ok || !intentBody.signupId || !intentBody.devConfirmCode) {
        bad('signup intent for API key bootstrap', intentBody.error || 'no devConfirmCode (production?)');
        return false;
    }
    ok('signup intent');

    const walletPublic = Keypair.random().publicKey();
    const signupRes = await fetch(`${BASE}/api/auth/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            signupId: intentBody.signupId,
            code: intentBody.devConfirmCode,
            walletPublic,
            cloudBackupEnabled: false,
        }),
    });
    const setCookies = signupRes.headers.getSetCookie?.() ?? [];
    const cookieHeader = setCookies.length ? setCookies.join('; ') : signupRes.headers.get('set-cookie') || '';
    const cookie = extractCookie(cookieHeader);
    if (!signupRes.ok || !cookie) {
        bad('signup verify + session', `HTTP ${signupRes.status}`);
        return false;
    }
    ok('signup verify + session');

    const keyRes = await fetch(`${BASE}/api/merchant/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ name: 'API test' }),
    });
    const keyBody = await keyRes.json().catch(() => ({}));
    if (!keyRes.ok || !keyBody.key) {
        bad('create merchant API key', keyBody.error);
        return false;
    }
    API_KEY = keyBody.key;
    ok('merchant API key created');
    return true;
}

async function main() {
    console.log(`\nStepay Merchant API tests\nTarget: ${BASE}\n`);

    await testPublicEndpoints();
    await testAuthRequired();

    if (runIntegration && !API_KEY) {
        const booted = await bootstrapApiKeyViaSignup();
        if (!booted) {
            console.log('\n── Summary: ' + pass + ' passed, ' + fail + ' failed ──\n');
            process.exit(fail > 0 ? 1 : 0);
        }
    }

    if (!API_KEY) {
        console.log('\n  ○ Authenticated tests skipped — set STEPAY_API_KEY or use --integration');
    } else {
        await testValidationWithKey();
    }

    console.log(`\n── Summary: ${pass} passed, ${fail} failed ──\n`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
