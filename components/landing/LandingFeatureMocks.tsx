'use client';

import { Phone, Wallet, Send, Store, Key, Shield, HandCoins, ArrowDownLeft, Copy } from 'lucide-react';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';
import { WalletOverview } from '@/components/dashboard/WalletOverview';
import { TransactionRow } from '@/components/dashboard/TransactionRow';
import { LandingPhoneFrame } from '@/components/landing/LandingPhoneFrame';
import { dash } from '@/lib/dashboard-ui';
import {
  LANDING_MOCK_BALANCE,
  LANDING_MOCK_CURRENCY,
  LANDING_MOCK_PORTFOLIO,
  LANDING_MOCK_TODAY_CHANGE,
  LANDING_MOCK_TRANSACTIONS,
  LANDING_MOCK_USER,
} from '@/lib/landing-mock-data';

function MockPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`h-full overflow-hidden ${className}`}>
      <div className={`${dash.panel} h-full overflow-hidden mx-1.5 my-1.5`}>{children}</div>
    </div>
  );
}

function StaticField({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[0.6875rem] font-medium text-white/65">{label}</label>
      <div
        className={`w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[0.75rem] text-white min-h-[34px] flex items-center ${
          mono ? 'font-mono' : 'font-semibold'
        }`}
      >
        {value}
      </div>
      {hint && <p className="text-[0.625rem] text-white/40">{hint}</p>}
    </div>
  );
}

function MockCta({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-[36px] rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-contrast)] text-[0.6875rem] font-bold flex items-center justify-center gap-1.5 shadow-[0_4px_20px_var(--brand-accent-muted)]">
      {children}
    </div>
  );
}

/** /dashboard — wallet overview */
export function WalletMock() {
  return (
    <LandingPhoneFrame title="Overview" size="feature">
      <MockPanel>
        <WalletOverview
          compact
          portfolioLocal={LANDING_MOCK_PORTFOLIO}
          localCurrency={LANDING_MOCK_CURRENCY}
          walletAddr={LANDING_MOCK_USER.walletPublic}
          balance={LANDING_MOCK_BALANCE}
          todayChange={LANDING_MOCK_TODAY_CHANGE}
        />
        <QuickActionsBar
          compact
          variant="responsive"
          className="border-t border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent px-2.5 pb-2.5 pt-1.5"
        />
      </MockPanel>
    </LandingPhoneFrame>
  );
}

/** /dashboard/send */
export function SendMock() {
  return (
    <LandingPhoneFrame title="Send" size="feature">
      <div className="p-2.5 h-full overflow-hidden">
        <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5 mb-3">
          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--brand-accent-muted)] py-2 text-[0.6875rem] font-semibold text-[var(--brand-accent)]">
            <Phone className="h-3 w-3" /> Phone
          </div>
          <div className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[0.6875rem] font-semibold text-white/45">
            <Wallet className="h-3 w-3" /> Address
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <StaticField label="Asset" value="USDC" />
          <StaticField label="Amount" value="120.00" hint="Min 1 USDC" />
        </div>

        <div className="mb-3">
          <label className="block text-[0.6875rem] font-medium text-white/65 mb-1">Recipient mobile</label>
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <span className="inline-flex items-center px-2 py-2 text-[0.6875rem] text-white/45 bg-white/[0.04] border-r border-white/[0.08]">+260</span>
            <span className="flex-1 px-2 py-2 text-[0.75rem] font-semibold text-white">971 456 789</span>
          </div>
          <p className="mt-1 text-[0.625rem] text-[var(--brand-accent)]/80">Found: Chanda Banda · Lusaka</p>
        </div>

        <StaticField label="Note (optional)" value="June rent" />

        <div className="mt-4">
          <MockCta>
            <Send className="h-3.5 w-3.5" /> Continue
          </MockCta>
        </div>
      </div>
    </LandingPhoneFrame>
  );
}

/** /dashboard/buy */
export function DepositMock() {
  return (
    <LandingPhoneFrame title="Deposit" size="feature">
      <div className="p-2.5 h-full overflow-hidden">
        <p className="text-[0.625rem] text-white/40 mb-3">
          Pay with mobile money — funds arrive as USDC in your wallet.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <StaticField label="Asset" value="USDC" />
          <div className="space-y-1">
            <label className="block text-[0.6875rem] font-medium text-white/65">Deposit amount</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.625rem] font-medium text-white/45">ZMW</span>
              <div className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-10 pr-2.5 py-2 text-[0.75rem] font-semibold text-white min-h-[34px] flex items-center">
                26,000
              </div>
            </div>
            <p className="text-[0.625rem] text-white/40">~768.00 USDC</p>
          </div>
        </div>

        <p className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-white/35 mb-2">Mobile money</p>

        <div className="space-y-2 mb-3">
          <div>
            <label className="block text-[0.6875rem] font-medium text-white/65 mb-1">Your number</label>
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <span className="inline-flex items-center px-2 py-2 text-[0.6875rem] text-white/45 bg-white/[0.04] border-r border-white/[0.08]">+260</span>
              <span className="flex-1 px-2 py-2 text-[0.75rem] text-white">971 234 567</span>
            </div>
          </div>
          <StaticField label="Network" value="MTN Mobile Money" />
        </div>

        <MockCta>
          <ArrowDownLeft className="h-3.5 w-3.5" /> Review deposit
        </MockCta>
      </div>
    </LandingPhoneFrame>
  );
}

/** /dashboard/merchant */
export function MerchantMock() {
  return (
    <LandingPhoneFrame title="Accept payments" size="feature">
      <div className="p-2.5 h-full overflow-hidden space-y-2.5">
        <div className="rounded-xl border border-white/[0.06] bg-[#121212] p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
            <p className="text-[0.75rem] font-bold text-white">Quick checkout</p>
          </div>
          <StaticField label="Description" value="Term 2 school fees" />
          <div className="grid grid-cols-2 gap-2">
            <StaticField label="Amount (USDC)" value="25.00" />
            <StaticField label="Reference" value="INV-2026-042" />
          </div>
          <MockCta>Create payment link</MockCta>
        </div>

        <div>
          <p className="text-[0.625rem] font-bold text-white mb-1.5">Recent checkouts</p>
          <div className="rounded-xl border border-white/[0.06] bg-[#121212] p-2.5">
            <p className="text-[0.75rem] font-semibold text-white">Café order #184</p>
            <p className="text-[0.625rem] text-white/40 mt-0.5">
              12.50 USDC · <span className="text-emerald-400">paid</span>
            </p>
            <div className="mt-2 flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[0.625rem] text-white/55 w-fit">
              <Copy className="h-2.5 w-2.5" /> Copy link
            </div>
          </div>
        </div>
      </div>
    </LandingPhoneFrame>
  );
}

/** /dashboard/request */
export function RequestMock() {
  return (
    <LandingPhoneFrame title="Request money" size="feature">
      <div className="p-2.5 h-full overflow-hidden">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StaticField label="Amount" value="450.00" />
          <StaticField label="Asset" value="USDC" />
        </div>

        <div className="mb-3">
          <label className="block text-[0.6875rem] font-medium text-white/65 mb-1">
            Payer phone <span className="text-white/40">(optional)</span>
          </label>
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <span className="inline-flex items-center px-2 py-2 text-[0.6875rem] text-white/45 bg-white/[0.04] border-r border-white/[0.08]">+260</span>
            <span className="flex-1 px-2 py-2 text-[0.75rem] text-white">977 345 678</span>
          </div>
        </div>

        <StaticField label="Note" value="Brand design — March invoice" />

        <div className="mt-4">
          <MockCta>
            <HandCoins className="h-3.5 w-3.5" /> Create payment request
          </MockCta>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--brand-accent-border)] bg-[var(--brand-accent-subtle)] p-2.5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[var(--brand-accent)] mb-1">Share link</p>
          <p className="text-[0.5625rem] font-mono text-white/55 break-all">stepay.pro/pay/req_a8f3…</p>
        </div>
      </div>
    </LandingPhoneFrame>
  );
}

/** /dashboard/transactions */
export function TransactionsMock() {
  return (
    <LandingPhoneFrame title="History" size="feature">
      <MockPanel className="!mx-0 !my-0">
        <div className="px-1 pt-1">
          <p className="px-2 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white/35">Recent activity</p>
          {LANDING_MOCK_TRANSACTIONS.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      </MockPanel>
    </LandingPhoneFrame>
  );
}

/** /dashboard/settings — wallet security */
export function SecurityMock() {
  return (
    <LandingPhoneFrame title="Wallet & security" size="feature">
      <div className="p-2.5 h-full overflow-hidden space-y-2.5">
        <div className="rounded-xl border border-[var(--brand-accent-border)] bg-gradient-to-br from-[#161616] via-[#121212] to-[#0c0c0c] p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-accent-muted)] text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent-border)]">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[0.75rem] font-bold text-white">Non-custodial</p>
              <p className="text-[0.625rem] text-white/45">Only you control your keys</p>
            </div>
          </div>
          <p className="text-[0.625rem] text-white/50 leading-relaxed">
            Your private keys are stored on this device. Stepay cannot move your funds.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#121212] p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
            <p className="text-[0.75rem] font-bold text-white">Stellar address</p>
          </div>
          <code className="block rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1.5 text-[0.5625rem] font-mono text-white/70 break-all">
            GDT5…F1G2
          </code>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[0.625rem] font-semibold text-emerald-300">Backup saved</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#121212] p-2.5">
          <p className="text-[0.6875rem] font-medium text-white/65 mb-1.5">Export secret key</p>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[0.625rem] text-white/35 font-mono">
            S••••••••••••••••••••••••••••••••
          </div>
        </div>
      </div>
    </LandingPhoneFrame>
  );
}
