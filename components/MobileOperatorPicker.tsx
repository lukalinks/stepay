'use client';

import Image from 'next/image';
import {
    MOBILE_OPERATOR_BRANDS,
    type MobileOperator,
    type MobileOperatorId,
} from '@/lib/markets';

type MobileOperatorPickerProps = {
    operators: MobileOperator[];
    value: MobileOperatorId;
    onChange: (id: MobileOperatorId) => void;
    size?: 'sm' | 'md';
    className?: string;
};

export function MobileOperatorPicker({
    operators,
    value,
    onChange,
    size = 'md',
    className = '',
}: MobileOperatorPickerProps) {
    const compact = size === 'sm';

    return (
        <div
            className={`grid grid-cols-3 gap-2 ${className}`}
            role="radiogroup"
            aria-label="Mobile network"
        >
            {operators.map((op) => {
                const brand = MOBILE_OPERATOR_BRANDS[op.id];
                const selected = value === op.id;
                return (
                    <button
                        key={op.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(op.id)}
                        className={`flex flex-col items-center justify-center rounded-xl border transition-all ${
                            compact ? 'min-h-[72px] px-1 py-2' : 'min-h-[88px] px-2 py-3'
                        } ${
                            selected
                                ? 'border-white/30 bg-white/[0.08]'
                                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                        style={selected ? { boxShadow: `0 0 0 1px ${brand.ring}` } : undefined}
                    >
                        <span
                            className={`relative block overflow-hidden rounded-md ${
                                op.id === 'mtn' ? 'bg-[#FFCB05]' : 'bg-white'
                            } ${compact ? 'h-7 w-[5rem]' : 'h-9 w-28'}`}
                        >
                            <Image
                                src={brand.logo}
                                alt={`${op.label} logo`}
                                fill
                                className={`object-contain ${op.id === 'airtel' ? 'p-0.5' : op.id === 'zamtel' ? 'p-1.5' : 'p-1'}`}
                                sizes={compact ? '80px' : '112px'}
                            />
                        </span>
                        <span
                            className={`mt-1.5 font-medium text-white/80 ${compact ? 'text-[10px]' : 'text-xs'}`}
                        >
                            {op.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export function MobileOperatorBadge({ operatorId }: { operatorId: MobileOperatorId }) {
    const brand = MOBILE_OPERATOR_BRANDS[operatorId];
    const bgClass =
        operatorId === 'mtn' ? 'bg-[#FFCB05]' : operatorId === 'airtel' ? 'bg-white' : 'bg-white';
    return (
        <span className="inline-flex items-center gap-2">
            <span className={`relative inline-block h-6 w-16 overflow-hidden rounded ${bgClass}`}>
                <Image src={brand.logo} alt="" fill className="object-contain p-0.5" sizes="64px" />
            </span>
        </span>
    );
}
