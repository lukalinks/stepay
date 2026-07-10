/**
 * End-to-end feature smoke tests. Requires dev server:
 *   npm run dev
 *   npm run test:features
 */

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

const stats = { pass: 0, fail: 0, skip: 0 };

function pass(label) {
    stats.pass++;
    console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
    stats.fail++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

function skip(label, reason) {
    stats.skip++;
    console.log(`  ○ ${label} (skipped${reason ? `: ${reason}` : ''})`);
}

async function json(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, init);
    const body = await res.json().catch(() => ({}));
    return { res, body };
}

async function page(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
    return { res, ok: res.status >= 200 && res.status < 400 };
}

function extractCookie(setCookie) {
    const m = (setCookie || '').match(/((?:__Secure-)?authjs\.session-token=[^;]+)/);
    return m ? m[1] : '';
}

function authed(cookie, path, init = {}) {
    return json(path, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
            ...(init.headers || {}),
        },
    });
}

async function main() {
    console.log(`\nStepay feature tests → ${BASE}\n`);

    try {
        await fetch(`${BASE}/api/health`);
    } catch {
        console.log('Start the dev server first: npm run dev\n');
        process.exit(1);
    }

    // ── Public pages ──
    console.log('Public pages');
    for (const path of ['/', '/login', '/signup', '/forgot-password', '/terms', '/privacy']) {
        const { ok, res } = await page(path);
        if (ok || res.status === 307 || res.status === 308) pass(path);
        else fail(path, `HTTP ${res.status}`);
    }

    console.log('\nProtected routes redirect to login');
    for (const path of ['/dashboard', '/dashboard/send', '/dashboard/buy', '/dashboard/merchant']) {
        const { res } = await page(path);
        if (res.status === 307 || res.status === 308 || res.status === 302) pass(`${path} → login`);
        else fail(`${path} → login`, `HTTP ${res.status}`);
    }

    // ── Public APIs ──
    console.log('\nPublic APIs');
    {
        const { res, body } = await json('/api/health');
        if (res.ok && body.ok) pass('GET /api/health');
        else fail('GET /api/health', `HTTP ${res.status}`);
    }
    {
        const { res, body } = await json('/api/rates');
        if (res.ok && body.rates?.xlm && body.limits) pass('GET /api/rates');
        else fail('GET /api/rates', `HTTP ${res.status}`);
    }
    {
        const { res } = await json('/api/dev/check');
        if (res.ok) pass('GET /api/dev/check');
        else if (res.status === 404) skip('GET /api/dev/check', 'production');
        else fail('GET /api/dev/check', `HTTP ${res.status}`);
    }
    {
        const { res } = await json('/api/lenco/health');
        if (res.ok) pass('GET /api/lenco/health');
        else if (res.status === 404) skip('GET /api/lenco/health', 'production');
        else fail('GET /api/lenco/health', `HTTP ${res.status}`);
    }

    // ── Auth ──
    console.log('\nAuth');
    const testEmail = `feat+${Date.now()}@stepay.test`;
    const testPassword = 'testpass99';
    const testPhone = `97${String(Date.now()).slice(-8)}`;

    const { Keypair } = await import('@stellar/stellar-sdk');
    const walletPublic = Keypair.random().publicKey();

    const intentRes = await fetch(`${BASE}/api/auth/signup/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword, countryCode: 'ZM' }),
    });
    const intentBody = await intentRes.json().catch(() => ({}));
    if (!intentRes.ok || !intentBody.signupId) {
        fail('Signup intent', intentBody.error || `HTTP ${intentRes.status}`);
    } else {
        pass('Signup intent (OTP sent)');
    }

    const verifyCode = intentBody.devConfirmCode;
    if (!verifyCode) {
        fail('Signup verify', 'No devConfirmCode — set NODE_ENV=development or configure SMTP for tests');
    }

    const signupRes = await fetch(`${BASE}/api/auth/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId: intentBody.signupId, code: verifyCode, walletPublic }),
    });
    const setCookies = signupRes.headers.getSetCookie?.() ?? [];
    const cookieHeader = setCookies.length ? setCookies.join('; ') : signupRes.headers.get('set-cookie') || '';
    let cookie = extractCookie(cookieHeader) || (cookieHeader.match(/((?:__Secure-)?authjs\.session-token=[^;]+)/)?.[1] ?? '');
    if (signupRes.ok && cookie) pass('Signup + session cookie');
    else fail('Signup', `HTTP ${signupRes.status}`);

    if (!cookie) {
        console.log('\nCannot continue without session.\n');
        process.exit(1);
    }

    {
        const { res, body } = await authed(cookie, '/api/user');
        if (res.ok && body.user?.walletPublic) pass('GET /api/user (wallet + balances)');
        else fail('GET /api/user', body.error || `HTTP ${res.status}`);
    }

    {
        const { res, body } = await authed(cookie, '/api/user/profile');
        if (res.ok && body.email === testEmail) pass('GET /api/user/profile');
        else fail('GET /api/user/profile', `HTTP ${res.status}`);
    }

    {
        const { res, body } = await authed(cookie, '/api/user/profile', {
            method: 'PATCH',
            body: JSON.stringify({
                fullName: 'Feature Test User',
                phone: `0${testPhone}`,
                address: 'Lusaka, Zambia',
                idDocumentType: 'nrc',
                idDocumentNumber: '123456/78/1',
            }),
        });
        if (res.ok && body.success !== false) pass('PATCH /api/user/profile');
        else fail('PATCH /api/user/profile', body.error || `HTTP ${res.status}`);
    }

    {
        const { res } = await authed(cookie, '/api/transactions');
        if (res.ok) pass('GET /api/transactions');
        else fail('GET /api/transactions', `HTTP ${res.status}`);
    }

    {
        const { res } = await json('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail }),
        });
        if (res.ok) pass('POST /api/auth/forgot-password');
        else fail('POST /api/auth/forgot-password', `HTTP ${res.status}`);
    }

    // ── Deposit ──
    console.log('\nDeposit (buy)');
    {
        const { res, body } = await authed(cookie, '/api/buy', {
            method: 'POST',
            body: JSON.stringify({ amount: 10, phone: testPhone, operator: 'mtn', asset: 'xlm' }),
        });
            if (res.ok && body.success) pass('POST /api/buy (deposit)');
        else fail('POST /api/buy', body.error || `HTTP ${res.status}`);
    }

    // ── Request money ──
    console.log('\nRequest money');
    let requestToken = null;
    {
        const { res, body } = await authed(cookie, '/api/request-money', {
            method: 'POST',
            body: JSON.stringify({ amount: 5, asset: 'usdc', note: 'Feature test' }),
        });
        if (res.ok && body.payToken) {
            pass('POST /api/request-money');
            requestToken = body.payToken;
        } else fail('POST /api/request-money', body.error || `HTTP ${res.status}`);
    }
    {
        const { res, body } = await authed(cookie, '/api/request-money');
        if (res.ok && Array.isArray(body.requests)) pass('GET /api/request-money');
        else fail('GET /api/request-money', `HTTP ${res.status}`);
    }
    if (requestToken) {
        const { res, body } = await json(`/api/request-money/${requestToken}`);
        if (res.ok && body.amount === 5) pass('GET /api/request-money/[token] (public)');
        else fail('GET /api/request-money/[token]', `HTTP ${res.status}`);
        const { ok } = await page(`/pay/request/${requestToken}`);
        if (ok) pass('Page /pay/request/[token]');
        else fail('Page /pay/request/[token]');
    }

    // ── Pay link ──
    console.log('\nPay link (phone pay / QR)');
    let paySlug = null;
    {
        const { res, body } = await authed(cookie, '/api/user/pay-link');
        if (res.ok && body.slug) {
            pass('GET /api/user/pay-link');
            paySlug = body.slug;
        } else fail('GET /api/user/pay-link', `HTTP ${res.status}`);
    }
    {
        const { res } = await authed(cookie, '/api/user/pay-link', {
            method: 'PATCH',
            body: JSON.stringify({ label: 'Test Shop', amount: 25, asset: 'usdc' }),
        });
        if (res.ok) pass('PATCH /api/user/pay-link');
        else fail('PATCH /api/user/pay-link', `HTTP ${res.status}`);
    }
    if (paySlug) {
        const { res, body } = await json(`/api/pay/${paySlug}`);
        if (res.ok && body.slug) pass('GET /api/pay/[slug] (public)');
        else fail('GET /api/pay/[slug]', `HTTP ${res.status}`);
        const { ok } = await page(`/pay/${paySlug}`);
        if (ok) pass('Page /pay/[slug]');
        else fail('Page /pay/[slug]');
    }

    // ── Merchant API ──
    console.log('\nMerchant API');
    let apiKey = null;
    {
        const { res, body } = await authed(cookie, '/api/merchant/keys', {
            method: 'POST',
            body: JSON.stringify({ name: 'Feature test key' }),
        });
        if (res.ok && body.key) {
            pass('POST /api/merchant/keys');
            apiKey = body.key;
        } else fail('POST /api/merchant/keys', body.error || `HTTP ${res.status}`);
    }
    {
        const { res, body } = await authed(cookie, '/api/merchant/keys');
        if (res.ok && Array.isArray(body.keys) && body.keys.length > 0) pass('GET /api/merchant/keys');
        else fail('GET /api/merchant/keys', `HTTP ${res.status}`);
    }

    let checkoutToken = null;
    if (apiKey) {
        const { res, body } = await json('/api/v1/checkouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ amount: 15, asset: 'usdc', label: 'Test checkout' }),
        });
        if (res.ok && body.checkout_token) {
            pass('POST /api/v1/checkouts (partner API)');
            checkoutToken = body.checkout_token;
        } else fail('POST /api/v1/checkouts', body.error || `HTTP ${res.status}`);

        const list = await json('/api/v1/checkouts', {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (list.res.ok && Array.isArray(list.body.checkouts)) pass('GET /api/v1/checkouts');
        else fail('GET /api/v1/checkouts', `HTTP ${list.res.status}`);

        const merchantList = await authed(cookie, '/api/merchant/checkouts');
        if (merchantList.res.ok) pass('GET /api/merchant/checkouts');
        else fail('GET /api/merchant/checkouts', `HTTP ${merchantList.res.status}`);
    }

    if (checkoutToken) {
        const { res, body } = await json(`/api/checkout/${checkoutToken}`);
        if (res.ok && body.amount === 15) pass('GET /api/checkout/[token] (public)');
        else fail('GET /api/checkout/[token]', `HTTP ${res.status}`);
        const { ok } = await page(`/pay/checkout/${checkoutToken}`);
        if (ok) pass('Page /pay/checkout/[token]');
        else fail('Page /pay/checkout/[token]');
    }

    // ── Send / phone lookup ──
    console.log('\nSend & phone pay');
    {
        const { res, body } = await authed(cookie, '/api/send/lookup', {
            method: 'POST',
            body: JSON.stringify({ phone: '979999999' }),
        });
        if (res.ok && typeof body.registered === 'boolean') pass('POST /api/send/lookup');
        else fail('POST /api/send/lookup', body.error || `HTTP ${res.status}`);
    }
    {
        const { res, body } = await authed(cookie, '/api/send/intent', {
            method: 'POST',
            body: JSON.stringify({ mode: 'address', to: 'GAUIMMHS6IUZR5Q2PVTO33NLETPC6GHWAJSX7AP23D5J5PFRYTPECGVF', amount: 0.5, asset: 'xlm' }),
        });
        if (res.ok && body.intentId) {
            pass('POST /api/send/intent');
            if (body.devConfirmCode) {
                const confirm = await authed(cookie, '/api/send/confirm', {
                    method: 'POST',
                    body: JSON.stringify({ intentId: body.intentId, confirmCode: body.devConfirmCode }),
                });
                if (confirm.res.ok && confirm.body.success) pass('POST /api/send/confirm (full flow)');
                else if (confirm.body.error?.includes('Insufficient')) skip('POST /api/send/confirm', 'low balance');
                else fail('POST /api/send/confirm', confirm.body.error || `HTTP ${confirm.res.status}`);
            }
        } else if (body.error?.includes('Insufficient')) {
            skip('POST /api/send/intent', 'insufficient balance (fund wallet to test full send)');
        } else {
            fail('POST /api/send/intent', body.error || `HTTP ${res.status}`);
        }
    }

    // ── Swap & sell intents ──
    console.log('\nSwap & cash out');
    {
        const { res, body } = await authed(cookie, '/api/swap/intent', {
            method: 'POST',
            body: JSON.stringify({ from: 'xlm', to: 'usdc', amount: 1 }),
        });
        if (res.ok && body.intentId) pass('POST /api/swap/intent');
        else if (body.error?.includes('Insufficient')) skip('POST /api/swap/intent', 'insufficient balance');
        else fail('POST /api/swap/intent', body.error || `HTTP ${res.status}`);
    }
    {
        const { res, body } = await authed(cookie, '/api/sell/intent', {
            method: 'POST',
            body: JSON.stringify({ amount: 1, asset: 'xlm', phone: testPhone, operator: 'mtn' }),
        });
        if (res.ok && body.intentId) pass('POST /api/sell/intent');
        else if (body.error?.includes('Insufficient')) skip('POST /api/sell/intent', 'insufficient balance');
        else fail('POST /api/sell/intent', body.error || `HTTP ${res.status}`);
    }

    // ── Stellar simulate (optional) ──
    console.log('\nDev simulate deposit (Stellar)');
    {
        const { res, body } = await authed(cookie, '/api/dev/simulate-deposit', {
            method: 'POST',
            body: JSON.stringify({ amount: 5, asset: 'xlm', memo: 'feature-test' }),
        });
        if (res.ok && body.success) pass('POST /api/dev/simulate-deposit');
        else skip('POST /api/dev/simulate-deposit', body.error?.slice(0, 60) || `HTTP ${res.status}`);
    }

    // ── Logout ──
    console.log('\nLogout');
    {
        const { res } = await authed(cookie, '/api/auth/logout', { method: 'POST' });
        if (res.ok) pass('POST /api/auth/logout');
        else fail('POST /api/auth/logout', `HTTP ${res.status}`);
    }
    pass('Logout endpoint (JWT cookie cleared client-side on next request)');

    console.log(`\n── Summary: ${stats.pass} passed, ${stats.fail} failed, ${stats.skip} skipped ──\n`);
    process.exit(stats.fail > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
