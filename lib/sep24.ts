import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { USDC_ISSUER } from '@/lib/constants';
import type { MarketAnchorConfig } from '@/lib/markets';
import { SEP_TESTNET_USDC_ISSUER } from '@/lib/sep1-toml';
import { sepHomeDomain, sepSigningSecret } from '@/lib/sep-config';

export type StellarToml = {
    WEB_AUTH_ENDPOINT?: string;
    TRANSFER_SERVER_SEP0024?: string;
    SIGNING_KEY?: string;
    NETWORK_PASSPHRASE?: string;
};

const tomlCache = new Map<string, { at: number; data: StellarToml }>();
const CACHE_MS = 5 * 60 * 1000;

export async function fetchAnchorToml(homeDomain: string): Promise<StellarToml> {
    const domain = homeDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const cached = tomlCache.get(domain);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

    const url = `https://${domain}/.well-known/stellar.toml`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Could not load partner config (${domain})`);
    const text = await res.text();
    const data = parseTomlKeys(text);
    tomlCache.set(domain, { at: Date.now(), data });
    return data;
}

function parseTomlKeys(text: string): StellarToml {
    const out: StellarToml = {};
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(
            /^\s*(WEB_AUTH_ENDPOINT|TRANSFER_SERVER_SEP0024|SIGNING_KEY|NETWORK_PASSPHRASE)\s*=\s*"([^"]+)"\s*$/
        );
        if (m) {
            (out as Record<string, string>)[m[1]] = m[2];
        }
    }
    return out;
}

export async function fetchSep24Info(transferServer: string): Promise<Record<string, unknown>> {
    const base = transferServer.replace(/\/$/, '');
    const res = await fetch(`${base}/info`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load partner deposit options');
    return (await res.json()) as Record<string, unknown>;
}

/** MoneyGram sandbox/production USDC floor when /info omits min_amount. */
export const SEP24_DEFAULT_USDC_MIN = 2;

function finiteAmount(value: unknown): number | undefined {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

export function sep24AssetLimits(
    info: Record<string, unknown> | null | undefined,
    kind: 'deposit' | 'withdraw',
    assetCode: string
): { min: number; max?: number } {
    const section = (kind === 'deposit' ? info?.deposit : info?.withdraw) as
        | Record<string, unknown>
        | undefined;
    const code = assetCode.toUpperCase();
    const asset = (section?.[code] || section?.[assetCode] || section?.USDC) as
        | Record<string, unknown>
        | undefined;
    const min =
        finiteAmount(asset?.min_amount) ??
        finiteAmount(asset?.minAmount) ??
        SEP24_DEFAULT_USDC_MIN;
    const max = finiteAmount(asset?.max_amount) ?? finiteAmount(asset?.maxAmount);
    return max != null ? { min, max } : { min };
}

export function friendlySep24InteractiveError(raw: string): string {
    const text = (raw || '').trim();
    const limit = text.match(/limit\s*(\d+(?:\.\d+)?)/i)?.[1];
    if (/less than/i.test(text) && /limit/i.test(text)) {
        const n = limit || String(SEP24_DEFAULT_USDC_MIN);
        return `MoneyGram’s minimum is ${n} USDC. Enter at least ${n} and try again.`;
    }
    if (/too_small|minimum amount/i.test(text)) {
        return `Amount is below MoneyGram’s minimum (${limit || SEP24_DEFAULT_USDC_MIN} USDC).`;
    }
    if (/too_large|maximum amount/i.test(text)) {
        return `Amount is above MoneyGram’s maximum${limit ? ` (${limit} USDC)` : ''}.`;
    }
    return text || 'Could not start partner checkout';
}

function moneygramSandboxEnabled(): boolean {
    const sandbox = (process.env.MONEYGRAM_SANDBOX || '').trim().toLowerCase();
    return sandbox === '1' || sandbox === 'true' || sandbox === 'yes';
}

export function sep24AssetParams(assetCode: string): { asset_code: string; asset_issuer?: string } {
    const code = assetCode.toUpperCase();
    if (code === 'USDC') {
        return {
            asset_code: 'USDC',
            asset_issuer: moneygramSandboxEnabled() ? SEP_TESTNET_USDC_ISSUER : USDC_ISSUER,
        };
    }
    if (code === 'XLM' || code === 'NATIVE') {
        return { asset_code: 'native' };
    }
    return { asset_code: code };
}

export function resolveAnchorEndpoints(toml: StellarToml): {
    webAuth: string;
    transferServer: string;
    networkPassphrase: string;
} {
    const webAuth = toml.WEB_AUTH_ENDPOINT?.trim();
    const transferServer = toml.TRANSFER_SERVER_SEP0024?.trim();
    if (!webAuth || !transferServer) {
        throw new Error('Partner does not support hosted cash in/out yet');
    }
    return {
        webAuth: webAuth.replace(/\/$/, ''),
        transferServer: transferServer.replace(/\/$/, ''),
        networkPassphrase: toml.NETWORK_PASSPHRASE || 'Public Global Stellar Network ; September 2015',
    };
}

/** Client domain Stepay presents to anchors (MoneyGram allowlist). */
export function sep24ClientDomain(): string {
    const fromEnv = process.env.SEP24_CLIENT_DOMAIN?.trim();
    if (fromEnv) return fromEnv.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const sandbox = (process.env.MONEYGRAM_SANDBOX || '').trim().toLowerCase();
    if (sandbox === '1' || sandbox === 'true' || sandbox === 'yes') {
        return (process.env.SEP_TESTNET_TOML_HOST || 'testnet.stepay.pro')
            .replace(/^https?:\/\//i, '')
            .replace(/\/$/, '');
    }
    return sepHomeDomain();
}

export function buildAnchorChallengeUrl(
    webAuth: string,
    account: string,
    opts?: { requiresClientDomain?: boolean }
): string {
    const params = new URLSearchParams({ account });
    if (opts?.requiresClientDomain) {
        params.set('client_domain', sep24ClientDomain());
    }
    return `${webAuth.replace(/\/$/, '')}?${params.toString()}`;
}

function networkFromPassphrase(passphrase: string) {
    return passphrase.includes('Test') ? Networks.TESTNET : Networks.PUBLIC;
}

/**
 * Add Stepay's stellar.toml SIGNING_KEY signature to a user-signed SEP-10 challenge.
 * Required by MoneyGram (and similar) for non-custodial client_domain verification.
 */
export function cosignSep10ChallengeWithClientDomain(
    signedByUserXdr: string,
    networkPassphrase: string
): string {
    const network = networkFromPassphrase(networkPassphrase);
    const tx = TransactionBuilder.fromXDR(signedByUserXdr, network);
    if (!('sign' in tx) || typeof tx.sign !== 'function') {
        throw new Error('Invalid challenge transaction');
    }
    const sandbox = (process.env.MONEYGRAM_SANDBOX || '').trim().toLowerCase();
    const useTestnetKey =
        sandbox === '1' ||
        sandbox === 'true' ||
        sandbox === 'yes' ||
        networkPassphrase.includes('Test');
    const secret = useTestnetKey
        ? process.env.SEP_TESTNET_SIGNING_SECRET?.trim() || sepSigningSecret()
        : sepSigningSecret();
    if (!secret.startsWith('S')) {
        throw new Error('SEP signing secret is not configured for client_domain cosign');
    }
    tx.sign(Keypair.fromSecret(secret));
    return tx.toXDR();
}

export type Sep24Transaction = {
    id: string;
    kind?: string;
    status: string;
    status_eta?: number;
    more_info_url?: string;
    amount_in?: string;
    amount_in_asset?: string;
    amount_out?: string;
    amount_fee?: string;
    from?: string;
    to?: string;
    deposit_memo?: string;
    deposit_memo_type?: string;
    withdraw_anchor_account?: string;
    withdraw_memo?: string;
    withdraw_memo_type?: string;
    stellar_transaction_id?: string;
    external_transaction_id?: string;
    message?: string;
    refunded?: boolean;
};

export async function fetchSep24Transaction(opts: {
    transferServer: string;
    token: string;
    id: string;
}): Promise<Sep24Transaction> {
    const base = opts.transferServer.replace(/\/$/, '');
    const paths = [
        `${base}/transaction?id=${encodeURIComponent(opts.id)}`,
        `${base}/transactions?id=${encodeURIComponent(opts.id)}`,
    ];

    let lastError = 'Could not load transaction status';
    for (const url of paths) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${opts.token}` },
            cache: 'no-store',
        });
        const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            transaction?: Sep24Transaction;
        };
        if (res.ok && data.transaction?.id) {
            const tx = data.transaction;
            if (tx.more_info_url) tx.more_info_url = repairSep24InteractiveUrl(tx.more_info_url);
            return tx;
        }
        if (res.status === 404) {
            lastError = data.error || 'Transaction not found';
            continue;
        }
        lastError = data.error || `Status check failed (${res.status})`;
        if (res.status !== 404) break;
    }
    throw new Error(lastError);
}

export type Sep24InteractiveResult = {
    id: string;
    url: string;
    type?: string;
};

/** Some anchors omit `&` before `token=` (`asset_code=USDCtoken=...`). */
export function repairSep24InteractiveUrl(url: string): string {
    let out = url.replace(/([?&]asset_code=[A-Za-z0-9_]+)token=/i, '$1&token=');
    // Sandbox SEP-24 currently returns extramps.moneygram.com, whose JS bundle is not deployed.
    // The working sandbox hosted UI is the Anchor UI on extstellar.moneygram.com (same query params).
    try {
        const parsed = new URL(out);
        if (parsed.hostname.toLowerCase() === 'extramps.moneygram.com') {
            parsed.hostname = 'extstellar.moneygram.com';
            out = parsed.toString();
        }
    } catch {
        /* leave unchanged */
    }
    return out;
}

async function assertInteractiveUrlReachable(url: string, partnerName?: string): Promise<void> {
    const partner = partnerName || 'Partner';
    try {
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(12000),
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (compatible; Stepay/1.0; +https://stepay.pro) AppleWebKit/537.36',
            },
        });
        // 403 is often bot/CDN protection — browsers may still load the page.
        if (res.status === 404 || res.status >= 500) {
            throw new Error(
                `${partner} checkout page is temporarily unavailable. Try again later or contact their support.`
            );
        }
    } catch (err) {
        if (err instanceof Error && err.message.includes('checkout page')) throw err;
        // Don't block on network probes from the server — user browser may still succeed.
    }
}

/** SEP-24 interactive lives under TRANSFER_SERVER_SEP0024. Never POST to the site origin. */
function interactiveBases(transferServer: string): string[] {
    return [transferServer.replace(/\/$/, '')];
}

type InteractivePostResult = {
    ok: boolean;
    status: number;
    id?: string;
    url?: string;
    type?: string;
    error?: string;
    retryEncoding: boolean;
};

async function postSep24Interactive(
    url: string,
    token: string,
    contentType: string,
    body: string,
    hops = 0
): Promise<InteractivePostResult> {
    const res = await fetch(url, {
        method: 'POST',
        redirect: 'manual',
        cache: 'no-store',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': contentType,
            Accept: 'application/json',
        },
        body,
    });

    // 301/302 would turn a follow-up POST into GET (405). Retry the Location as POST.
    const location = res.headers.get('location');
    if (location && hops < 3 && [301, 302, 307, 308].includes(res.status)) {
        const next = new URL(location, url).toString();
        if (next !== url) {
            return postSep24Interactive(next, token, contentType, body, hops + 1);
        }
    }

    const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
        url?: string;
        type?: string;
    };
    const error = data.error || (!res.ok ? `Partner checkout failed (${res.status})` : undefined);
    return {
        ok: res.ok && Boolean(data.url && data.id),
        status: res.status,
        id: data.id,
        url: data.url,
        type: data.type,
        error,
        retryEncoding: res.status === 404 || res.status === 400 || /content-type/i.test(error || ''),
    };
}

function sandboxPrefillFields(): Record<string, string> {
    if (!moneygramSandboxEnabled()) return {};
    // Sandbox agents and quotes are US-only. Without this the widget geo-detects
    // (e.g. France), pickup total stays 0, and Continue never proceeds.
    return {
        address_country_code: 'USA',
        country_code: 'USA',
        state_or_province: 'US-MN',
        city: 'Northfield',
        postal_code: '55057',
    };
}

export async function startSep24Interactive(opts: {
    transferServer: string;
    token: string;
    kind: 'deposit' | 'withdraw';
    account: string;
    assetCode: string;
    amount?: string | number | null;
    lang?: string;
    partnerName?: string;
}): Promise<Sep24InteractiveResult> {
    const { asset_code, asset_issuer } = sep24AssetParams(opts.assetCode);
    const path =
        opts.kind === 'deposit'
            ? '/transactions/deposit/interactive'
            : '/transactions/withdraw/interactive';

    const payload: Record<string, string> = {
        asset_code: asset_code === 'native' ? 'native' : asset_code,
        account: opts.account,
        lang: opts.lang || 'en',
    };
    if (asset_issuer) payload.asset_issuer = asset_issuer;
    if (opts.amount != null && opts.amount !== '') {
        payload.amount = String(opts.amount);
    }

    const withPrefill = { ...payload, ...sandboxPrefillFields() };
    const encodings: Array<{ contentType: string; body: string }> = [
        { contentType: 'application/json', body: JSON.stringify(withPrefill) },
        { contentType: 'application/json', body: JSON.stringify(payload) },
        { contentType: 'application/x-www-form-urlencoded', body: new URLSearchParams(withPrefill).toString() },
    ];

    let lastError = 'Could not start partner checkout';
    for (const base of interactiveBases(opts.transferServer)) {
        for (const enc of encodings) {
            const result = await postSep24Interactive(`${base}${path}`, opts.token, enc.contentType, enc.body);
            if (result.ok && result.url && result.id) {
                const url = repairSep24InteractiveUrl(result.url);
                await assertInteractiveUrlReachable(url, opts.partnerName);
                return { id: result.id, url, type: result.type };
            }
            lastError = result.error || lastError;
            if (!result.retryEncoding) break;
        }
    }

    throw new Error(lastError);
}

export function assertAnchorConfig(anchor?: MarketAnchorConfig | null): MarketAnchorConfig {
    if (!anchor?.homeDomain || !anchor.assetCode) {
        throw new Error('No cash partner configured for this country');
    }
    return anchor;
}

export function partnerAuthErrorHint(raw: string | undefined, requiresClientDomain?: boolean): string {
    const msg = (raw || '').trim();
    if (!requiresClientDomain) return msg || 'Partner authentication failed';
    const lower = msg.toLowerCase();
    if (
        !msg ||
        lower.includes('unable to process') ||
        lower.includes('client_domain') ||
        lower.includes('not allow') ||
        lower.includes('whitelist') ||
        lower.includes('allowlist')
    ) {
        return (
            msg ||
            'MoneyGram could not authenticate Stepay yet. Ask MoneyGram to allowlist stepay.pro (non-custodial wallet domain + SIGNING_KEY).'
        );
    }
    return msg;
}
