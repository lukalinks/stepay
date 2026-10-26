import { createHmac, timingSafeEqual } from 'crypto';
import { Keypair, Networks, WebAuth } from '@stellar/stellar-sdk';
import {
    sepHomeDomain,
    sepNetworkPassphrase,
    sepSigningPublicKey,
    sepSigningSecret,
} from '@/lib/sep-config';

const TOKEN_TTL_SEC = 15 * 60;

function networkPassphrase(): string {
    const p = sepNetworkPassphrase();
    if (p.includes('Test')) return Networks.TESTNET;
    return Networks.PUBLIC;
}

export function buildSep10Challenge(clientAccount: string): {
    transaction: string;
    network_passphrase: string;
} {
    const account = clientAccount.trim();
    if (!account.startsWith('G') || account.length < 56) {
        throw new Error('account must be a valid Stellar public key');
    }

    const serverKeypair = Keypair.fromSecret(sepSigningSecret());
    const home = sepHomeDomain();
    const webAuthDomain = home;
    const transaction = WebAuth.buildChallengeTx(
        serverKeypair,
        account,
        home,
        300,
        networkPassphrase(),
        webAuthDomain
    );

    return {
        transaction,
        network_passphrase: networkPassphrase(),
    };
}

export function verifySep10Challenge(signedTxXdr: string): { account: string } {
    const serverAccount = sepSigningPublicKey();
    const home = sepHomeDomain();
    const webAuthDomain = home;

    const { clientAccountID } = WebAuth.readChallengeTx(
        signedTxXdr,
        serverAccount,
        networkPassphrase(),
        home,
        webAuthDomain
    );

    WebAuth.verifyChallengeTxSigners(
        signedTxXdr,
        serverAccount,
        networkPassphrase(),
        [clientAccountID],
        home,
        webAuthDomain
    );

    return { account: clientAccountID };
}

function tokenSecret(): string {
    const s = process.env.AUTH_SECRET?.trim() || process.env.SEP_TOKEN_SECRET?.trim();
    if (!s) throw new Error('AUTH_SECRET is required for SEP-10 tokens');
    return s;
}

/** Compact HMAC token (not Auth.js session) — proves SEP-10 success for ~15m. */
export function issueSep10Token(account: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'SEP10' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
        JSON.stringify({
            sub: account,
            iss: sepHomeDomain(),
            iat: now,
            exp: now + TOKEN_TTL_SEC,
        })
    ).toString('base64url');
    const data = `${header}.${payload}`;
    const sig = createHmac('sha256', tokenSecret()).update(data).digest('base64url');
    return `${data}.${sig}`;
}

export function verifySep10Token(token: string): { account: string } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const data = `${header}.${payload}`;
    const expected = createHmac('sha256', tokenSecret()).update(data).digest('base64url');
    try {
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    } catch {
        return null;
    }
    try {
        const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
            sub?: string;
            exp?: number;
        };
        if (!body.sub || !body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
        return { account: body.sub };
    } catch {
        return null;
    }
}
