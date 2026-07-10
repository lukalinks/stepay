'use client';

import { DepositForm } from '@/components/DepositForm';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';

export default function BuyPage() {
    return (
        <DashboardPanel>
            <DepositForm embedded />
        </DashboardPanel>
    );
}
