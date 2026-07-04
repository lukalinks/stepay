'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    formatLocalCurrencyCode,
    getMarket,
    type MarketConfig,
    type MobileOperatorId,
} from '@/lib/markets';

export type MarketLimits = {
    minDeposit: number;
    maxDeposit: number;
    minWithdraw: number;
    maxWithdraw: number;
};

const DEFAULT_LIMITS: MarketLimits = {
    minDeposit: 4,
    maxDeposit: 50000,
    minWithdraw: 4,
    maxWithdraw: 50000,
};

export function useMarketRates() {
    const [market, setMarket] = useState<MarketConfig>(() => getMarket());
    const [rates, setRates] = useState<{
        xlm: { buy: number; sell: number };
        usdc: { buy: number; sell: number };
    } | null>(null);
    const [fees, setFees] = useState({ buyPercent: 0, sellPercent: 0 });
    const [limits, setLimits] = useState<MarketLimits>(DEFAULT_LIMITS);

    const fetchRates = useCallback(() => {
        fetch('/api/rates')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.market) setMarket({ ...getMarket(data.market.countryCode), ...data.market });
                if (data?.rates) setRates(data.rates);
                if (data?.fees) setFees(data.fees);
                if (data?.limits) {
                    setLimits({
                        minDeposit: data.limits.minDeposit ?? data.limits.minDepositZmw ?? DEFAULT_LIMITS.minDeposit,
                        maxDeposit: data.limits.maxDeposit ?? data.limits.maxDepositZmw ?? DEFAULT_LIMITS.maxDeposit,
                        minWithdraw: data.limits.minWithdraw ?? data.limits.minWithdrawZmw ?? DEFAULT_LIMITS.minWithdraw,
                        maxWithdraw: data.limits.maxWithdraw ?? data.limits.maxWithdrawZmw ?? DEFAULT_LIMITS.maxWithdraw,
                    });
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchRates();
    }, [fetchRates]);

    const formatFiat = useCallback(
        (amount: number | string) => formatLocalCurrencyCode(amount, market.countryCode),
        [market.countryCode]
    );

    const hasMobileMoney = market.paymentMethods.includes('mobile_money');
    const defaultOperator = (market.mobileOperators[0]?.id ?? 'mtn') as MobileOperatorId;

    return { market, rates, fees, limits, fetchRates, formatFiat, hasMobileMoney, defaultOperator };
}
