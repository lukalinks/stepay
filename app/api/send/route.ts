import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { getUserIdFromRequest } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
    to: z.string().min(1, 'Recipient address required'),
    amount: z.coerce.number().refine((n) => !isNaN(n) && n > 0, 'Amount must be a positive number'),
    asset: z.enum(['xlm', 'usdc']).default('xlm'),
    memo: z.string().max(28).optional(),
});

/** Stellar public key format: G + 55 base32 chars (case-insensitive) */
function isValidStellarAddress(addr: string): boolean {
    const cleaned = addr.trim().toUpperCase();
    return /^G[A-Z2-7]{55}$/.test(cleaned);
}

function formatAddress(addr: string): string {
    return addr.trim().toUpperCase();
}

export async function GET() {
    return NextResponse.json({ message: 'Use POST to send XLM/USDC. See docs for payload.' });
}

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        let parsed: z.infer<typeof schema>;
        try {
            parsed = schema.parse(body);
        } catch (zodErr) {
            const issues = (zodErr as z.ZodError).errors;
            const msg = issues.map((i) => i.message).join('. ') || 'Invalid input';
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const { to: rawTo, amount, asset, memo } = parsed;
        const destAddress = formatAddress(rawTo);

        if (!isValidStellarAddress(destAddress)) {
            return NextResponse.json(
                { error: 'Invalid Stellar address. Must start with G and be 56 characters (e.g. GAAAA...).' },
                { status: 400 }
            );
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const amountStr = amount.toFixed(7);
        const balance = asset === 'usdc'
            ? await StellarService.getUSDCBalance(user.wallet_public)
            : await StellarService.getBalance(user.wallet_public);

        if (Number(balance) < amount) {
            return NextResponse.json(
                { error: `Insufficient ${asset.toUpperCase()} balance. You have ${balance}.` },
                { status: 400 }
            );
        }

        if (asset === 'xlm') {
            const minXlm = 0.1;
            if (amount < minXlm) {
                return NextResponse.json(
                    { error: `Minimum ${minXlm} XLM to send.` },
                    { status: 400 }
                );
            }
        } else {
            const minUsdc = 1;
            if (amount < minUsdc) {
                return NextResponse.json(
                    { error: `Minimum ${minUsdc} USDC to send.` },
                    { status: 400 }
                );
            }
        }

        // Don't send to self
        if (destAddress === user.wallet_public) {
            return NextResponse.json(
                { error: 'Cannot send to your own address.' },
                { status: 400 }
            );
        }

        try {
            const txHash = asset === 'usdc'
                ? await StellarService.sendUSDC(user.wallet_secret, destAddress, amountStr, memo)
                : await StellarService.sendXLM(user.wallet_secret, destAddress, amountStr, memo);

            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'SEND',
                amount_fiat: 0,
                amount_xlm: amount,
                status: 'COMPLETED',
                reference: `SEND-${Date.now()}`,
                tx_hash: txHash,
                asset: asset,
            });

            return NextResponse.json({
                success: true,
                txHash,
                message: `${amount} ${asset.toUpperCase()} sent successfully.`,
            });
        } catch (stellarError: unknown) {
            const err = stellarError as Record<string, unknown>;
            const resp = err?.response as Record<string, unknown> | undefined;
            // Axios: resp.data = Horizon body. Stellar SDK: resp = Horizon body.
            const body = (resp && 'extras' in resp ? resp : resp?.data) as Record<string, unknown> | undefined;
            const extras = (body?.extras || body) as Record<string, unknown> | undefined;
            const rc = (extras?.result_codes || body?.result_codes) as { transaction?: string; operations?: string[] } | undefined;
            const ops = rc?.operations ?? [];
            const txCode = rc?.transaction;
            const rawMsg = String(err?.message ?? 'Transaction failed.');

            // Log actual Stellar codes for debugging
            console.error('Send failed:', { ops, txCode, raw: JSON.stringify(extras ?? err) });

            const OP_MESSAGES: Record<string, string> = {
                op_no_trust: 'Recipient does not have a USDC trustline. They must add USDC to their wallet first.',
                op_low_reserve: 'Insufficient XLM for network fees. Keep some XLM for reserves.',
                op_underfunded: 'Insufficient balance. Reserve some XLM for network fees.',
                op_no_destination: 'Recipient account does not exist.',
                op_line_full: 'Recipient has reached their USDC limit. They cannot receive more.',
                op_no_source_account: 'Source account error. Please try again.',
                op_src_no_trust: 'You do not have a USDC trustline. Add USDC to your wallet first.',
                op_src_not_authorized: 'You are not authorized to send this asset.',
                op_not_authorized: 'Recipient is not authorized to hold this asset.',
                op_bad_auth: 'Wrong network or invalid signature. Check your wallet is on Stellar mainnet.',
            };

            let msg: string | undefined;
            for (const op of ops) {
                if (OP_MESSAGES[op]) {
                    msg = OP_MESSAGES[op];
                    break;
                }
            }
            if (!msg) {
                if (rawMsg.includes('op_no_trust')) msg = OP_MESSAGES.op_no_trust;
                else if (rawMsg.includes('op_low_reserve')) msg = OP_MESSAGES.op_low_reserve;
                else if (rawMsg.includes('op_underfunded')) msg = OP_MESSAGES.op_underfunded;
            }
            if (!msg) {
                const isGenericTxFailure =
                    (typeof body?.detail === 'string' && (
                        body.detail.includes('extras.result_codes') ||
                        body.detail.includes('transaction failed when submitted') ||
                        body.detail.includes('stellar.org')
                    )) ||
                    rawMsg.includes('Request failed with status code') ||
                    rawMsg.includes('Transaction submission failed') ||
                    rawMsg.includes('transaction failed when submitted');
                if (isGenericTxFailure) {
                    const codeHint = ops[0] ?? txCode;
                    msg = txCode === 'tx_insufficient_fee'
                        ? 'Network fee too low. Please try again.'
                        : codeHint
                            ? `Transaction failed (${codeHint}). See Stellar docs or check recipient address and balance.`
                            : 'Transaction failed. Check the recipient address and your balance, then try again.';
                } else if (typeof body?.detail === 'string') {
                    msg = body.detail;
                } else {
                    msg = rawMsg;
                }
            }
            let finalMsg = msg ?? 'Transaction failed. Please try again.';
            if (finalMsg.includes('extras.result_codes') || finalMsg.includes('stellar.org/api/errors')) {
                const codeHint = ops[0] ?? txCode;
                finalMsg = codeHint
                    ? `Transaction failed (${codeHint}). See Stellar docs or check recipient address and balance.`
                    : 'Transaction failed. Check the recipient address and your balance, then try again.';
            }
            return NextResponse.json({ error: finalMsg }, { status: 400 });
        }
    } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        console.error('Send API Error:', error);
        if (err?.name === 'ZodError') {
            const issues = (error as z.ZodError).errors;
            const message = issues.map((i) => i.message).join('. ') || 'Invalid input';
            return NextResponse.json({ error: message }, { status: 400 });
        }
        return NextResponse.json({ error: err?.message || 'Failed to send' }, { status: 400 });
    }
}
