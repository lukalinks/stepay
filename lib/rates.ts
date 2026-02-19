/**
 * Platform rates and fees - reads from DB (platform_settings) with env fallback.
 * Admin can update via /api/admin/settings.
 */

import { supabase } from './supabase';

export interface PlatformRates {
  xlm_buy: number;   // ZMW per 1 XLM (user pays ZMW, gets XLM)
  xlm_sell: number;  // ZMW per 1 XLM (user sells XLM, gets ZMW)
  usdc_buy: number;
  usdc_sell: number;
}

export interface PlatformFees {
  buy_percent: number;  // e.g. 1 = 1% fee on buy
  sell_percent: number;
}

export interface PlatformLimits {
  min_deposit_zmw: number;
  max_deposit_zmw: number;
  min_withdraw_zmw: number;
  max_withdraw_zmw: number;
}

const DEFAULT_RATES: PlatformRates = {
  xlm_buy: Number(process.env.XLM_RATE_ZMW || 3.5),
  xlm_sell: Number(process.env.XLM_RATE_ZMW || 3.5),
  usdc_buy: Number(process.env.USDC_RATE_ZMW || 25),
  usdc_sell: Number(process.env.USDC_RATE_ZMW || 25),
};

const DEFAULT_FEES: PlatformFees = {
  buy_percent: 0,
  sell_percent: 0,
};

const DEFAULT_LIMITS: PlatformLimits = {
  min_deposit_zmw: 4,
  max_deposit_zmw: 50000,
  min_withdraw_zmw: 4,
  max_withdraw_zmw: 50000,
};

let cachedRates: PlatformRates | null = null;
let cachedFees: PlatformFees | null = null;
let cachedLimits: PlatformLimits | null = null;
let cacheExpiry = 0;
const CACHE_MS = 10_000; // 10 sec - admin changes should reflect quickly

async function fetchFromDb<T>(key: string, defaultVal: T): Promise<T> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value_json')
      .eq('key', key)
      .single();
    if (data?.value_json) {
      return JSON.parse(data.value_json) as T;
    }
  } catch {
    // ignore
  }
  return defaultVal;
}

export async function getRates(): Promise<PlatformRates> {
  if (cachedRates && Date.now() < cacheExpiry) {
    return cachedRates;
  }
  cachedRates = await fetchFromDb<PlatformRates>('rates', DEFAULT_RATES);
  cacheExpiry = Date.now() + CACHE_MS;
  return cachedRates;
}

export async function getFees(): Promise<PlatformFees> {
  if (cachedFees && Date.now() < cacheExpiry) {
    return cachedFees!;
  }
  cachedFees = await fetchFromDb<PlatformFees>('fee', DEFAULT_FEES);
  return cachedFees;
}

export async function getLimits(): Promise<PlatformLimits> {
  if (cachedLimits && Date.now() < cacheExpiry) {
    return cachedLimits!;
  }
  cachedLimits = await fetchFromDb<PlatformLimits>('limits', DEFAULT_LIMITS);
  return cachedLimits;
}

export function invalidateRatesCache() {
  cachedRates = null;
  cachedFees = null;
  cachedLimits = null;
  cacheExpiry = 0;
}

/** For buy: ZMW → crypto. Accounts for buy fee if any. */
/** For buy: ZMW → crypto. Accounts for buy fee if any. */
export function zmwToCrypto(zmw: number, asset: 'xlm' | 'usdc', rates: PlatformRates, fees: PlatformFees): number {
  const rate = asset === 'usdc' ? rates.usdc_buy : rates.xlm_buy;
  const feeMult = 1 - fees.buy_percent / 100;
  return (zmw / rate) * feeMult;
}

/** For sell: crypto → ZMW. Accounts for sell fee if any. */
export function cryptoToZmw(crypto: number, asset: 'xlm' | 'usdc', rates: PlatformRates, fees: PlatformFees): number {
  const rate = asset === 'usdc' ? rates.usdc_sell : rates.xlm_sell;
  const feeMult = 1 - fees.sell_percent / 100;
  return crypto * rate * feeMult;
}

/** Inverse of cryptoToZmw: ZMW payout → min crypto to sell. Used for withdraw limits. */
export function zmwToCryptoForSell(zmw: number, asset: 'xlm' | 'usdc', rates: PlatformRates, fees: PlatformFees): number {
  const rate = asset === 'usdc' ? rates.usdc_sell : rates.xlm_sell;
  const feeMult = 1 - fees.sell_percent / 100;
  return zmw / (rate * feeMult) || 0;
}
