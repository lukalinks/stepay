import { probeLencoAuth } from '@/lib/lenco-config';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { StellarService } from '@/lib/stellar';

export type HealthProbe = {
    ok: boolean;
    label: string;
    detail?: string;
    checkedAt: string;
};

export async function probeHorizon(): Promise<HealthProbe> {
    const checkedAt = new Date().toISOString();
    try {
        const res = await fetch('https://horizon.stellar.org/', { signal: AbortSignal.timeout(8000) });
        return {
            ok: res.ok,
            label: 'Stellar Horizon',
            detail: res.ok ? 'Reachable' : `HTTP ${res.status}`,
            checkedAt,
        };
    } catch (err) {
        return {
            ok: false,
            label: 'Stellar Horizon',
            detail: err instanceof Error ? err.message : 'Unreachable',
            checkedAt,
        };
    }
}

export async function probePlatformWallet(): Promise<HealthProbe & { xlm?: string; usdc?: string }> {
    const checkedAt = new Date().toISOString();
    try {
        const [xlm, usdc] = await Promise.all([
            StellarService.getBalance(PLATFORM_WALLET_PUBLIC),
            StellarService.getUSDCBalance(PLATFORM_WALLET_PUBLIC),
        ]);
        return {
            ok: true,
            label: 'Platform wallet',
            detail: `${xlm} XLM · ${usdc} USDC`,
            xlm,
            usdc,
            checkedAt,
        };
    } catch (err) {
        return {
            ok: false,
            label: 'Platform wallet',
            detail: err instanceof Error ? err.message : 'Could not load balances',
            checkedAt,
        };
    }
}

export async function probeLenco(): Promise<HealthProbe & { accountBalance?: number }> {
    const checkedAt = new Date().toISOString();
    const auth = await probeLencoAuth();
    if (!auth.ok) {
        return {
            ok: false,
            label: 'Lenco MoMo',
            detail: auth.message || auth.secretDiagnosis || `HTTP ${auth.status}`,
            checkedAt,
        };
    }

    let accountBalance: number | undefined;
    try {
        const key = process.env.LENCO_SECRET_KEY?.trim();
        const url = `${(process.env.LENCO_API_URL || 'https://api.lenco.co/access/v2').trim()}/accounts`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
        });
        const body = await res.json().catch(() => ({}));
        const accounts = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
        const accountId = process.env.LENCO_ACCOUNT_ID?.trim();
        const match = accountId
            ? accounts.find((a: { id?: string }) => String(a.id) === accountId)
            : accounts[0];
        const bal = match?.availableBalance ?? match?.balance ?? match?.ledgerBalance;
        if (bal != null) accountBalance = Number(bal);
    } catch {
        // non-fatal
    }

    return {
        ok: true,
        label: 'Lenco MoMo',
        detail: accountBalance != null ? `Float ~${accountBalance.toLocaleString()} ZMW` : 'API authenticated',
        accountBalance,
        checkedAt,
    };
}

export async function getAdminHealth(): Promise<{
    env: { auth: boolean; smtp: boolean; encryption: boolean; lenco: boolean };
    probes: HealthProbe[];
}> {
    const [horizon, platform, lenco] = await Promise.all([
        probeHorizon(),
        probePlatformWallet(),
        probeLenco(),
    ]);

    return {
        env: {
            auth: !!process.env.AUTH_SECRET?.trim(),
            smtp: !!(process.env.SMTP_HOST?.trim() || process.env.RESEND_API_KEY?.trim()),
            encryption: !!process.env.WALLET_ENCRYPTION_KEY?.trim(),
            lenco: !!process.env.LENCO_SECRET_KEY?.trim(),
        },
        probes: [lenco, horizon, platform],
    };
}
