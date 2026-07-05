'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, Send, Smartphone, Wallet, XCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PayQrCode } from '@/components/dashboard/PayQrCode';
import { MobileOperatorPicker } from '@/components/MobileOperatorPicker';
import { BRAND } from '@/lib/brand';
import { dash } from '@/lib/dashboard-ui';
import { formatPhoneE164ForMarket } from '@/lib/phone';
import type { MobileOperator, MobileOperatorId } from '@/lib/markets';

type CheckoutInfo = {
    error?: string;
    label?: string;
    description?: string;
    referenceId?: string;
    amount?: number;
    asset?: string;
    merchantName?: string;
    status?: string;
    cancelUrl?: string;
    successUrl?: string;
    countryCode?: string;
    currency?: string;
    phoneDialCode?: string;
    mobileOperators?: MobileOperator[];
    mobileMoneyEnabled?: boolean;
    mobileMoneyZmw?: number | null;
};

type PayMethod = 'wallet' | 'mobile_money';

export default function CheckoutPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const token = String(params.token ?? '');
    const embed = searchParams.get('embed') === '1';
    const [info, setInfo] = useState<CheckoutInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [payMethod, setPayMethod] = useState<PayMethod>('mobile_money');
    const [phone, setPhone] = useState('');
    const [operator, setOperator] = useState<MobileOperatorId>('mtn');
    const [mmLoading, setMmLoading] = useState(false);
    const [mmError, setMmError] = useState('');
    const [mmPending, setMmPending] = useState(false);
    const [mmMessage, setMmMessage] = useState('');

    const loadCheckout = useCallback(async () => {
        const res = await fetch(`/api/checkout/${token}`);
        const data = (await res.json()) as CheckoutInfo;
        setInfo(data);
        return data;
    }, [token]);

    useEffect(() => {
        loadCheckout().finally(() => setLoading(false));
    }, [loadCheckout]);

    useEffect(() => {
        const ops = info?.mobileOperators;
        if (ops?.length && !ops.some((o) => o.id === operator)) {
            setOperator(ops[0].id);
        }
    }, [info?.mobileOperators, operator]);

    useEffect(() => {
        if (!mmPending) return;
        const interval = setInterval(async () => {
            const data = await loadCheckout();
            if (data.status === 'paid') {
                setMmPending(false);
                if (data.successUrl) {
                    window.location.href = data.successUrl;
                }
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [mmPending, loadCheckout]);

    const status = String(info?.status ?? '');
    const paid = status === 'paid';
    const expired = status === 'expired';
    const sendHref = `/dashboard/send?checkout=${token}`;
    const loginHref = `/login?next=${encodeURIComponent(sendHref)}`;
    const checkoutUrl = typeof window !== 'undefined' ? window.location.href.replace(/\?embed=1/, '') : '';
    const mmEnabled = Boolean(info?.mobileMoneyEnabled && info?.mobileMoneyZmw);
    const dialCode = info?.phoneDialCode ?? '+260';

    const startMobileMoney = async () => {
        setMmError('');
        let fullPhone: string;
        try {
            fullPhone = formatPhoneE164ForMarket(phone, info?.countryCode ?? 'ZM');
        } catch {
            setMmError('Enter a valid mobile money number.');
            return;
        }

        setMmLoading(true);
        try {
            const res = await fetch(`/api/checkout/${token}/mobile-money`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: fullPhone,
                    operator,
                    countryCode: info?.countryCode,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMmError(data.error || 'Could not start payment.');
                return;
            }
            setMmMessage(data.message || 'Check your phone to approve the payment.');
            setMmPending(true);
        } catch {
            setMmError('Something went wrong. Please try again.');
        } finally {
            setMmLoading(false);
        }
    };

    const shell = embed ? '' : 'min-h-screen flex flex-col items-center justify-center p-6';

    return (
        <div className={shell} style={{ background: BRAND.bg, color: '#fff' }}>
            {!embed && <Logo size="md" variant="dark" className="mb-8" />}
            <div className={`w-full max-w-md ${dash.panel} ${dash.panelPadding} text-center`}>
                {loading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--brand-accent)]" />
                ) : info?.error ? (
                    <p className="text-white/50">{String(info.error)}</p>
                ) : paid ? (
                    <>
                        <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
                        <h1 className="text-xl font-bold">Payment received</h1>
                        <p className="text-white/50 text-sm mt-2">{String(info?.label)}</p>
                    </>
                ) : expired ? (
                    <>
                        <XCircle className="mx-auto h-12 w-12 text-red-400/80 mb-3" />
                        <h1 className="text-xl font-bold">Link expired</h1>
                        <p className="text-white/50 text-sm mt-2">Ask the merchant for a new payment link.</p>
                    </>
                ) : (
                    <>
                        <p className={dash.sectionLabel}>Pay {String(info?.merchantName ?? 'merchant')}</p>
                        <h1 className="text-xl font-bold mt-1">{String(info?.label ?? 'Payment')}</h1>
                        {info?.description && (
                            <p className="text-white/45 text-sm mt-2">{String(info.description)}</p>
                        )}
                        {info?.referenceId && (
                            <p className="text-xs text-white/35 mt-1 font-mono">Ref: {String(info.referenceId)}</p>
                        )}
                        <p className="text-3xl font-bold text-[var(--brand-accent)] my-5">
                            {Number(info?.amount).toFixed(info?.asset === 'usdc' ? 2 : 4)}{' '}
                            {String(info?.asset).toUpperCase()}
                        </p>

                        {mmEnabled && !mmPending && (
                            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-1">
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('mobile_money')}
                                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                                        payMethod === 'mobile_money'
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/50 hover:text-white/70'
                                    }`}
                                >
                                    <Smartphone className="h-4 w-4" />
                                    Mobile money
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('wallet')}
                                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                                        payMethod === 'wallet'
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/50 hover:text-white/70'
                                    }`}
                                >
                                    <Wallet className="h-4 w-4" />
                                    Stepay wallet
                                </button>
                            </div>
                        )}

                        {mmPending ? (
                            <div className="space-y-3 text-left">
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400 mb-2" />
                                    <p className="text-sm text-emerald-100/90">{mmMessage}</p>
                                    <p className={`${dash.hint} mt-2`}>
                                        Waiting for confirmation… The merchant receives USDC once you approve on your phone.
                                    </p>
                                </div>
                            </div>
                        ) : payMethod === 'mobile_money' && mmEnabled ? (
                            <div className="space-y-4 text-left">
                                <p className={`${dash.hint} text-center`}>
                                    Pay{' '}
                                    <span className="text-white font-semibold">
                                        {info?.mobileMoneyZmw?.toFixed(2)} {info?.currency}
                                    </span>{' '}
                                    — no Stepay account needed
                                </p>
                                <div className="space-y-2">
                                    <label className={dash.label}>Mobile network</label>
                                    <MobileOperatorPicker
                                        operators={info?.mobileOperators ?? []}
                                        value={operator}
                                        onChange={setOperator}
                                        size="sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={dash.label} htmlFor="checkout-mm-phone">
                                        Mobile money number
                                    </label>
                                    <div className={dash.phoneGroup}>
                                        <span className={dash.phonePrefix}>{dialCode}</span>
                                        <input
                                            id="checkout-mm-phone"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            className={dash.phoneInput}
                                            placeholder="97 123 4567"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {mmError && <p className="text-sm text-red-400/90">{mmError}</p>}
                                <button
                                    type="button"
                                    onClick={startMobileMoney}
                                    disabled={mmLoading || !phone.trim()}
                                    className={dash.ctaFull}
                                >
                                    {mmLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Smartphone className="h-5 w-5" /> Pay with mobile money
                                        </>
                                    )}
                                </button>
                                <p className={`${dash.hint} text-center`}>
                                    Merchant receives {Number(info?.amount).toFixed(2)} USDC
                                </p>
                            </div>
                        ) : (
                            <>
                                {!embed && checkoutUrl && (
                                    <div className="flex justify-center mb-5">
                                        <PayQrCode value={checkoutUrl} size={160} />
                                    </div>
                                )}
                                <Link href={loginHref} className={`${dash.ctaFull} mb-2`}>
                                    <Send className="h-5 w-5" /> Pay with Stepay wallet
                                </Link>
                                <p className={`${dash.hint} mt-4`}>
                                    Sign in and pay from your Stepay dollar wallet
                                </p>
                            </>
                        )}

                        {info?.cancelUrl && !mmPending && (
                            <a
                                href={String(info.cancelUrl)}
                                className={`${dash.ctaSecondary} inline-flex mt-4`}
                            >
                                Cancel
                            </a>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
