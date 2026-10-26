'use client';

import { DepositForm } from '@/components/DepositForm';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { CashRailRouter } from '@/components/market/CashRailRouter';

export default function BuyPage() {
    return (
        <DashboardPanel>
            <CashRailRouter kind="deposit" mobileMoney={<DepositForm embedded />} />
        </DashboardPanel>
    );
}
