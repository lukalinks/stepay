/**
 * Smoke-test env fields and API validation. Run with dev server up:
 *   npm run dev
 *   node scripts/test-all-fields.mjs
 */

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

function pass(label) {
    console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

async function json(path, init) {
    const res = await fetch(`${BASE}${path}`, init);
    const body = await res.json().catch(() => ({}));
    return { res, body };
}

async function main() {
    console.log(`\nStepay field tests → ${BASE}\n`);

    // --- Env / infra ---
    console.log('Environment & config (/api/dev/check)');
    try {
        const { res, body } = await json('/api/dev/check');
        if (!res.ok) {
            fail('dev check reachable', `HTTP ${res.status}`);
        } else {
            pass('dev check reachable');
            for (const f of body.fields || []) {
                if (f.ok) pass(f.field);
                else fail(f.field, f.hint);
            }
            if (body.lenco?.httpStatus) {
                console.log(`  Lenco API: HTTP ${body.lenco.httpStatus} ${body.lenco.message || ''}`);
            }
        }
    } catch (err) {
        fail('dev check', err.message);
        console.log('\nStart the dev server first: npm run dev\n');
        process.exit(1);
    }

    // --- Auth validation (no session) ---
    console.log('\nLogin field validation');
    const loginCases = [
        [{ email: '', password: 'secret1' }, 400, 'empty email'],
        [{ email: 'bad', password: 'secret1' }, 400, 'invalid email'],
        [{ email: 'a@b.com', password: '12345' }, 400, 'short password'],
    ];
    for (const [payload, expectStatus, label] of loginCases) {
        const { res } = await json('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.status === expectStatus) pass(label);
        else fail(label, `expected ${expectStatus}, got ${res.status}`);
    }

    console.log('\nSignup field validation');
    const signupCases = [
        [{ email: '', password: 'secret1' }, 400, 'empty email'],
        [{ email: 'bad', password: 'secret1' }, 400, 'invalid email'],
        [{ email: 'a@b.com', password: '12345' }, 400, 'short password'],
    ];
    for (const [payload, expectStatus, label] of signupCases) {
        const { res } = await json('/api/auth/signup/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.status === expectStatus) pass(label);
        else fail(label, `expected ${expectStatus}, got ${res.status}`);
    }

    // --- Buy / deposit (requires auth) ---
    console.log('\nDeposit field validation (/api/buy)');
    const { res: unauth } = await json('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10, phone: '+260971234567', operator: 'mtn', asset: 'xlm' }),
    });
    if (unauth.status === 401) pass('requires sign-in');
    else fail('requires sign-in', `HTTP ${unauth.status}`);

    const testEmail = `fieldtest+${Date.now()}@stepay.test`;
    const testPassword = 'testpass99';
    const { Keypair } = await import('@stellar/stellar-sdk');
    const walletPublic = Keypair.random().publicKey();

    const intentRes = await fetch(`${BASE}/api/auth/signup/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword, countryCode: 'ZM' }),
    });
    const intentBody = await intentRes.json().catch(() => ({}));
    const verifyCode = intentBody.devConfirmCode;

    const signupRes = verifyCode
        ? await fetch(`${BASE}/api/auth/signup/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signupId: intentBody.signupId, code: verifyCode, walletPublic }),
          })
        : intentRes;
    const setCookie = signupRes.headers.get('set-cookie') || '';
    const sessionMatch = setCookie.match(/authjs\.session-token=[^;]+/);
    const cookie = sessionMatch ? sessionMatch[0] : '';

    if (!signupRes.ok || !cookie) {
        fail('test user signup', `HTTP ${signupRes.status}`);
    } else {
        pass('test user signup');

        const authed = (payload) =>
            json('/api/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Cookie: cookie },
                body: JSON.stringify(payload),
            });

        const buyCases = [
            [{ amount: 0, phone: '971234567', operator: 'mtn', asset: 'xlm' }, 400, 'amount below minimum'],
            [{ amount: 999999, phone: '971234567', operator: 'mtn', asset: 'xlm' }, 400, 'amount above maximum'],
            [{ amount: 10, phone: '123', operator: 'mtn', asset: 'xlm' }, 400, 'invalid phone'],
            [{ amount: 10, phone: '971234567', operator: 'invalid', asset: 'xlm' }, 400, 'invalid operator'],
            [{ amount: 10, phone: '971234567', operator: 'mtn', asset: 'btc' }, 400, 'invalid asset'],
        ];

        for (const [payload, expectStatus, label] of buyCases) {
            const { res } = await authed(payload);
            if (res.status === expectStatus) pass(label);
            else fail(label, `expected ${expectStatus}, got ${res.status}`);
        }

        for (const operator of ['mtn', 'airtel', 'zamtel']) {
            const { res, body } = await authed({
                amount: 10,
                phone: '971234567',
                operator,
                asset: 'xlm',
            });
            if (res.ok && body.success) pass(`valid deposit (${operator})`);
            else if (res.status === 400 && body.code === 'lenco_error') {
                fail(`valid deposit (${operator})`, body.error?.slice(0, 80));
            } else {
                fail(`valid deposit (${operator})`, `HTTP ${res.status} ${body.error || ''}`);
            }
        }

        for (const asset of ['xlm', 'usdc']) {
            const { res, body } = await authed({
                amount: 10,
                phone: '971234567',
                operator: 'mtn',
                asset,
            });
            if (res.ok && body.success) pass(`valid deposit (${asset})`);
            else if (res.status === 400 && body.code === 'lenco_error') {
                fail(`valid deposit (${asset})`, body.error?.slice(0, 80));
            } else {
                fail(`valid deposit (${asset})`, `HTTP ${res.status}`);
            }
        }
    }

    console.log('\nDone.\n');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
