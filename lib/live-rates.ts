/**
 * Live market mid rates → ZMW, with optional buy/sell spread.
 * Sources: CoinGecko (crypto/USD) + open.er-api.com (USD/ZMW).
 */

import type { PlatformRates } from '@/lib/rates';

const LIVE_CACHE_MS = Number(process.env.LIVE_RATES_CACHE_MS || 60_000);
const DEFAULT_SPREAD_PERCENT = Number(process.env.RATE_SPREAD_PERCENT || 1.5);

type MidRates = { xlm: number; usdc: number };
type LiveBundle = { mid: MidRates; fetchedAt: number };

let liveCache: LiveBundle | null = null;

function isLiveRatesEnabled(): boolean {
  const raw = (process.env.USE_LIVE_RATES ?? 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'no' && raw !== 'off';
}

function applySpread(mid: MidRates, spreadPercent: number): PlatformRates {
  const s = Math.max(0, Math.min(20, spreadPercent)) / 100;
  const buyMult = 1 + s;
  const sellMult = 1 - s;
  return {
    xlm_buy: roundRate(mid.xlm * buyMult),
    xlm_sell: roundRate(mid.xlm * sellMult),
    usdc_buy: roundRate(mid.usdc * buyMult),
    usdc_sell: roundRate(mid.usdc * sellMult),
  };
}

function roundRate(n: number): number {
  return Math.round(n * 10000) / 10000;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUsdZmw(): Promise<number> {
  const data = (await fetchJson('https://open.er-api.com/v6/latest/USD')) as {
    result?: string;
    rates?: { ZMW?: number };
  };
  const zmw = Number(data?.rates?.ZMW);
  if (!Number.isFinite(zmw) || zmw <= 0) throw new Error('Invalid USD/ZMW rate');
  return zmw;
}

async function fetchCryptoUsdFromCoinGecko(): Promise<{ xlm: number; usdc: number }> {
  const data = (await fetchJson(
    'https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=usd'
  )) as {
    stellar?: { usd?: number };
    'usd-coin'?: { usd?: number };
  };
  const xlm = Number(data?.stellar?.usd);
  const usdc = Number(data?.['usd-coin']?.usd);
  if (!Number.isFinite(xlm) || xlm <= 0) throw new Error('Invalid XLM/USD from CoinGecko');
  if (!Number.isFinite(usdc) || usdc <= 0) throw new Error('Invalid USDC/USD from CoinGecko');
  return { xlm, usdc };
}

async function fetchXlmUsdFromBinance(): Promise<number> {
  const data = (await fetchJson(
    'https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT'
  )) as { price?: string };
  const xlm = Number(data?.price);
  if (!Number.isFinite(xlm) || xlm <= 0) throw new Error('Invalid XLMUSDT from Binance');
  return xlm;
}

async function fetchMidZmw(): Promise<MidRates> {
  const usdZmw = await fetchUsdZmw();
  try {
    const crypto = await fetchCryptoUsdFromCoinGecko();
    return {
      xlm: crypto.xlm * usdZmw,
      usdc: crypto.usdc * usdZmw,
    };
  } catch (err) {
    console.warn('CoinGecko rates failed, falling back to Binance XLM:', err);
    const xlmUsd = await fetchXlmUsdFromBinance();
    return {
      xlm: xlmUsd * usdZmw,
      usdc: 1 * usdZmw,
    };
  }
}

export function liveRatesEnabled(): boolean {
  return isLiveRatesEnabled();
}

export function getRateSpreadPercent(): number {
  const n = Number(process.env.RATE_SPREAD_PERCENT);
  return Number.isFinite(n) ? n : DEFAULT_SPREAD_PERCENT;
}

/** Fetch live platform rates (buy/sell with spread). Returns null if disabled or fetch fails. */
export async function fetchLivePlatformRates(
  spreadPercent: number = getRateSpreadPercent()
): Promise<PlatformRates | null> {
  if (!isLiveRatesEnabled()) return null;

  if (liveCache && Date.now() - liveCache.fetchedAt < LIVE_CACHE_MS) {
    return applySpread(liveCache.mid, spreadPercent);
  }

  try {
    const mid = await fetchMidZmw();
    if (!(mid.xlm > 0 && mid.usdc > 0)) return null;
    liveCache = { mid, fetchedAt: Date.now() };
    return applySpread(mid, spreadPercent);
  } catch (err) {
    console.error('Live rates fetch failed:', err);
    return liveCache ? applySpread(liveCache.mid, spreadPercent) : null;
  }
}

export function invalidateLiveRatesCache() {
  liveCache = null;
}
