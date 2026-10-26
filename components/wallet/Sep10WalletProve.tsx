'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import { getUnlockedSecret, hasLocalWallet, isWalletUnlocked } from '@/lib/client-wallet';
import { proveWalletWithSep10 } from '@/lib/sep10-client';
import { useWallet } from '@/components/wallet/WalletProvider';

/** SEP-10 prove-ownership control for Settings. */
export function Sep10WalletProve({ serverWalletPublic }: { serverWalletPublic?: string }) {
    const { unlocked, requestUnlock } = useWallet();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!hasLocalWallet() || !serverWalletPublic) return null;

    const run = async () => {
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            if (!isWalletUnlocked() && !unlocked) {
                requestUnlock?.();
                setError('Unlock your wallet, then try again.');
                return;
            }
            const secret = getUnlockedSecret();
            if (!secret) {
                requestUnlock?.();
                setError('Unlock your wallet, then try again.');
                return;
            }
            const { token, account } = await proveWalletWithSep10(secret);
            const res = await fetch('/api/sep10/verify-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Verification failed');
            if (data.matches) {
                setMessage(`SEP-10 verified — ${account.slice(0, 4)}…${account.slice(-4)} matches your account.`);
            } else {
                setError(data.message || 'Signed wallet does not match this account.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${dash.panelInset} p-4 space-y-2`}>
            <p className="text-sm font-semibold text-white">Stellar wallet proof (SEP-10)</p>
            <p className="text-xs text-white/45 leading-relaxed">
                Cryptographically prove this device controls your registered Stellar key — standard wallet auth used across
                the Stellar ecosystem.
            </p>
            <button type="button" onClick={run} disabled={loading} className={dash.ctaSecondary}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? 'Verifying…' : 'Verify wallet ownership'}
            </button>
            {message && <p className="text-xs text-emerald-400">{message}</p>}
            {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
    );
}
