'use client';

import type { WalletVaultSnapshot } from '@/lib/client-wallet';

export async function requestWalletBackupUploadIntent(): Promise<{
    ok: boolean;
    error?: string;
    devConfirmCode?: string;
    maskedEmail?: string;
    challengeNonce?: string;
}> {
    const res = await fetch('/api/user/wallet-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'upload-intent' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Could not send code.' };
    return {
        ok: true,
        devConfirmCode: data.devConfirmCode,
        maskedEmail: data.maskedEmail,
        challengeNonce: data.challengeNonce,
    };
}

export async function uploadWalletBackup(
    vault: WalletVaultSnapshot,
    opts: { confirmCode: string; challengeNonce: string; keyProof: string }
): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('/api/user/wallet-backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vault, ...opts }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Could not save backup.' };
    return { ok: true };
}

export async function requestWalletBackupDeleteIntent(): Promise<{
    ok: boolean;
    error?: string;
    devConfirmCode?: string;
    maskedEmail?: string;
}> {
    const res = await fetch('/api/user/wallet-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete-intent' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Could not send code.' };
    return { ok: true, devConfirmCode: data.devConfirmCode, maskedEmail: data.maskedEmail };
}

export async function disableWalletBackup(confirmCode: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('/api/user/wallet-backup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Could not disable backup.' };
    return { ok: true };
}

export async function requestWalletRestoreCode(): Promise<{
    ok: boolean;
    error?: string;
    devConfirmCode?: string;
    maskedEmail?: string;
}> {
    const res = await fetch('/api/user/wallet-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'intent' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Could not send code.' };
    return { ok: true, devConfirmCode: data.devConfirmCode, maskedEmail: data.maskedEmail };
}

export async function fetchWalletBackupAfterOtp(code: string): Promise<{
    ok: boolean;
    error?: string;
    vault?: WalletVaultSnapshot;
}> {
    const res = await fetch('/api/user/wallet-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'verify', code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Verification failed.' };
    const vault = data.vault as WalletVaultSnapshot | undefined;
    if (!vault?.publicKey) return { ok: false, error: 'Invalid backup received.' };
    return { ok: true, vault };
}

export async function getWalletBackupStatus(): Promise<{
    cloudBackupEnabled?: boolean;
    hasCloudBackup?: boolean;
    isHosted?: boolean;
} | null> {
    const res = await fetch('/api/user/wallet-backup', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
}

export async function requestWalletExportIntent(): Promise<{
    ok: boolean;
    error?: string;
    devConfirmCode?: string;
    maskedEmail?: string;
}> {
    const res = await fetch('/api/user/wallet-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'intent' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Could not send code.' };
    return { ok: true, devConfirmCode: data.devConfirmCode, maskedEmail: data.maskedEmail };
}

export async function exportHostedWallet(password: string, confirmCode: string): Promise<{
    ok: boolean;
    error?: string;
    publicKey?: string;
    secretKey?: string;
}> {
    const res = await fetch('/api/user/wallet-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'export', password, confirmCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Could not export wallet.' };
    return { ok: true, publicKey: data.publicKey, secretKey: data.secretKey };
}
