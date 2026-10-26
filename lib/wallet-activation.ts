/**
 * One-time network activation: user pays for Stellar account / USDC trustline XLM.
 * XLM is credited to their wallet (reserve), not taken as platform revenue.
 */

import {
  ACTIVATION_BUFFER_ZMW,
  MIN_XLM_FOR_USDC_TRUSTLINE,
  MIN_XLM_NEW_ACCOUNT_FOR_USDC,
} from '@/lib/constants';
import { StellarService } from '@/lib/stellar';
import type { PlatformRates } from '@/lib/rates';

export type WalletActivationQuote = {
  required: boolean;
  xlm: number;
  fiat: number;
  reason: 'account' | 'trustline' | 'none';
  label: string;
};

function roundFiat(n: number): number {
  return Math.ceil(n * 100) / 100;
}

function roundXlm(n: number): number {
  return Math.ceil(n * 1e7) / 1e7;
}

/**
 * How much XLM the platform would otherwise gift to unlock deposits.
 * XLM-only first deposits use the purchased amount (≥1 XLM) — no separate fee.
 */
export async function getActivationXlmNeeded(
  walletPublic: string,
  asset: 'xlm' | 'usdc'
): Promise<{ xlm: number; reason: WalletActivationQuote['reason'] }> {
  if (asset !== 'usdc') {
    return { xlm: 0, reason: 'none' };
  }

  const exists = await StellarService.accountExists(walletPublic);
  if (!exists) {
    return { xlm: MIN_XLM_NEW_ACCOUNT_FOR_USDC, reason: 'account' };
  }

  const hasTrust = await StellarService.hasUSDCTrustline(walletPublic);
  if (hasTrust) {
    return { xlm: 0, reason: 'none' };
  }

  const balance = Number(await StellarService.getBalance(walletPublic));
  if (balance >= MIN_XLM_FOR_USDC_TRUSTLINE) {
    return { xlm: 0, reason: 'none' };
  }

  const topUp = MIN_XLM_FOR_USDC_TRUSTLINE - balance + 0.05;
  return { xlm: roundXlm(Math.max(topUp, 0)), reason: 'trustline' };
}

export async function quoteWalletActivation(
  walletPublic: string,
  asset: 'xlm' | 'usdc',
  rates: PlatformRates
): Promise<WalletActivationQuote> {
  const { xlm, reason } = await getActivationXlmNeeded(walletPublic, asset);
  if (xlm <= 0) {
    return {
      required: false,
      xlm: 0,
      fiat: 0,
      reason: 'none',
      label: 'One-time network setup',
    };
  }

  const fiat = roundFiat(xlm * rates.xlm_buy + Math.max(0, ACTIVATION_BUFFER_ZMW));
  return {
    required: true,
    xlm,
    fiat,
    reason,
    label: 'One-time network setup',
  };
}

export function activationQuoteToJson(q: WalletActivationQuote) {
  return {
    required: q.required,
    xlm: q.xlm,
    fiat: q.fiat,
    reason: q.reason,
    label: q.label,
    description:
      'Unlocks USDC on Stellar. The XLM stays in your wallet for network reserves.',
  };
}
