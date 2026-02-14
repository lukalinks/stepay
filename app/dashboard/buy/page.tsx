'use client';

import { DepositForm } from '@/components/DepositForm';

export default function BuyPage() {
    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 sm:rounded-tl-[1.5rem]">
                <DepositForm />
            </div>
        </div>
    );
}
