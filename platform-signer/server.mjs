/**
 * Stepay platform wallet signer — holds PLATFORM_WALLET_SECRET and signs payments.
 * Bind to localhost only. Authenticate with PLATFORM_SIGNER_TOKEN.
 */
import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import * as StellarSdk from '@stellar/stellar-sdk';

const PORT = Number(process.env.PLATFORM_SIGNER_PORT || 3101);
const HOST = process.env.PLATFORM_SIGNER_HOST || '127.0.0.1';
const TOKEN = (process.env.PLATFORM_SIGNER_TOKEN || '').trim();
const SECRET = (process.env.PLATFORM_WALLET_SECRET || '').trim();
const USDC_ISSUER =
    process.env.USDC_ISSUER || 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const MAX_XLM = Number(process.env.PLATFORM_SIGNER_MAX_XLM || 50000);
const MAX_USDC = Number(process.env.PLATFORM_SIGNER_MAX_USDC || 50000);
const MIN_XLM_FOR_USDC_TRUSTLINE = Number(process.env.MIN_XLM_FOR_USDC_TRUSTLINE || 1.5);
const MIN_XLM_NEW_ACCOUNT_FOR_USDC = Number(process.env.MIN_XLM_NEW_ACCOUNT_FOR_USDC || 2);
const MIN_ACCOUNT_BALANCE = 1;

const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon.stellar.org';
const serverHorizon = new StellarSdk.Horizon.Server(HORIZON_URL);
const networkPassphrase = StellarSdk.Networks.PUBLIC;
const USDC_ASSET = new StellarSdk.Asset('USDC', USDC_ISSUER);

if (!SECRET || !SECRET.startsWith('S')) {
    console.error('PLATFORM_WALLET_SECRET missing or invalid');
    process.exit(1);
}
if (!TOKEN || TOKEN.length < 24) {
    console.error('PLATFORM_SIGNER_TOKEN missing or too short (min 24 chars)');
    process.exit(1);
}

const keypair = StellarSdk.Keypair.fromSecret(SECRET);
const PUBLIC_KEY = keypair.publicKey();

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err) {
    const msg = String(err?.message || err || '').toLowerCase();
    const status = String(err?.response?.status ?? '');
    const blob = `${msg} ${status}`;
    return (
        blob.includes('sequence') ||
        blob.includes('tx_bad_seq') ||
        blob.includes('504') ||
        blob.includes('502') ||
        blob.includes('503') ||
        blob.includes('timeout') ||
        blob.includes('econnreset') ||
        blob.includes('network') ||
        blob.includes('try again')
    );
}

async function withRetry(fn, attempts = 3) {
    let last;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            last = err;
            if (!isRetryable(err) || i >= attempts - 1) break;
            await sleep(1200 * (i + 1));
        }
    }
    throw last;
}

function authOk(req) {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const alt = (req.headers['x-signer-token'] || '').toString().trim();
    const provided = bearer || alt;
    if (!provided || provided.length !== TOKEN.length) return false;
    try {
        return timingSafeEqual(Buffer.from(provided), Buffer.from(TOKEN));
    } catch {
        return false;
    }
}

function isStellarPublic(addr) {
    return typeof addr === 'string' && addr.startsWith('G') && addr.length >= 56;
}

async function accountExists(publicKey) {
    try {
        await serverHorizon.loadAccount(publicKey);
        return true;
    } catch {
        return false;
    }
}

async function getXlmBalance(publicKey) {
    try {
        const account = await serverHorizon.loadAccount(publicKey);
        const native = account.balances.find((b) => b.asset_type === 'native');
        return Number(native?.balance ?? 0);
    } catch {
        return 0;
    }
}

async function sendXlm(destination, amount, memo) {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error('Invalid amount');
    if (amountNum > MAX_XLM) throw new Error(`Amount exceeds max XLM (${MAX_XLM})`);

    return withRetry(async () => {
        const sourceAccount = await serverHorizon.loadAccount(PUBLIC_KEY);
        const destExists = await accountExists(destination);

        let operation;
        if (!destExists) {
            const startingBalance = Math.max(amountNum, MIN_ACCOUNT_BALANCE).toFixed(7);
            if (amountNum < MIN_ACCOUNT_BALANCE) {
                throw new Error(`Minimum ${MIN_ACCOUNT_BALANCE} XLM required to create new account.`);
            }
            operation = StellarSdk.Operation.createAccount({
                destination,
                startingBalance,
            });
        } else {
            operation = StellarSdk.Operation.payment({
                destination,
                asset: StellarSdk.Asset.native(),
                amount: String(amount),
            });
        }

        let builder = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(30);

        if (memo) builder = builder.addMemo(StellarSdk.Memo.text(String(memo).slice(0, 28)));

        const tx = builder.build();
        tx.sign(keypair);
        const result = await serverHorizon.submitTransaction(tx);
        return result.hash;
    });
}

async function sendUsdc(destination, amount, memo) {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error('Invalid amount');
    if (amountNum > MAX_USDC) throw new Error(`Amount exceeds max USDC (${MAX_USDC})`);

    return withRetry(async () => {
        const sourceAccount = await serverHorizon.loadAccount(PUBLIC_KEY);
        let builder = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase,
        })
            .addOperation(
                StellarSdk.Operation.payment({
                    destination,
                    asset: USDC_ASSET,
                    amount: String(amount),
                })
            )
            .setTimeout(30);

        if (memo) builder = builder.addMemo(StellarSdk.Memo.text(String(memo).slice(0, 28)));

        const tx = builder.build();
        tx.sign(keypair);
        const result = await serverHorizon.submitTransaction(tx);
        return result.hash;
    });
}

async function ensureXlmForUsdc(destination) {
    const exists = await accountExists(destination);
    if (!exists) {
        const hash = await sendXlm(destination, String(MIN_XLM_NEW_ACCOUNT_FOR_USDC));
        return { hash, action: 'create' };
    }
    const balance = await getXlmBalance(destination);
    if (balance < MIN_XLM_FOR_USDC_TRUSTLINE) {
        const topUp = (MIN_XLM_FOR_USDC_TRUSTLINE - balance + 0.05).toFixed(7);
        const hash = await sendXlm(destination, topUp);
        return { hash, action: 'topup' };
    }
    return { hash: null, action: 'none' };
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (c) => {
            size += c.length;
            if (size > 64_000) {
                reject(new Error('Body too large'));
                req.destroy();
                return;
            }
            chunks.push(c);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8');
                resolve(raw ? JSON.parse(raw) : {});
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
    });
    res.end(data);
}

const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, {
            ok: true,
            publicKey: PUBLIC_KEY,
            service: 'stepay-platform-signer',
        });
    }

    if (!authOk(req)) {
        return sendJson(res, 401, { error: 'Unauthorized' });
    }

    try {
        if (req.method === 'POST' && url.pathname === '/v1/send') {
            const body = await readBody(req);
            const asset = String(body.asset || '').toLowerCase();
            const destination = String(body.destination || '').trim();
            const amount = String(body.amount || '').trim();
            const memo = body.memo != null ? String(body.memo) : undefined;
            const reason = String(body.reason || 'unspecified').slice(0, 64);

            if (!isStellarPublic(destination)) {
                return sendJson(res, 400, { error: 'Invalid destination' });
            }
            if (asset !== 'xlm' && asset !== 'usdc') {
                return sendJson(res, 400, { error: 'asset must be xlm or usdc' });
            }

            const hash =
                asset === 'usdc'
                    ? await sendUsdc(destination, amount, memo)
                    : await sendXlm(destination, amount, memo);

            console.log(
                JSON.stringify({
                    event: 'signed_send',
                    asset,
                    destination,
                    amount,
                    reason,
                    hash,
                    at: new Date().toISOString(),
                })
            );
            return sendJson(res, 200, { ok: true, hash, publicKey: PUBLIC_KEY });
        }

        if (req.method === 'POST' && url.pathname === '/v1/ensure-xlm-for-usdc') {
            const body = await readBody(req);
            const destination = String(body.destination || '').trim();
            if (!isStellarPublic(destination)) {
                return sendJson(res, 400, { error: 'Invalid destination' });
            }
            const result = await ensureXlmForUsdc(destination);
            console.log(
                JSON.stringify({
                    event: 'ensure_xlm_for_usdc',
                    destination,
                    ...result,
                    at: new Date().toISOString(),
                })
            );
            return sendJson(res, 200, { ok: true, ...result, publicKey: PUBLIC_KEY });
        }

        return sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('signer error:', message);
        return sendJson(res, 500, { error: message });
    }
});

httpServer.listen(PORT, HOST, () => {
    const fp = createHash('sha256').update(PUBLIC_KEY).digest('hex').slice(0, 12);
    console.log(`platform-signer listening on http://${HOST}:${PORT} pubkey_fp=${fp}`);
});
