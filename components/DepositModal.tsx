'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DepositForm } from './DepositForm';
import { dash } from '@/lib/dashboard-ui';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSuccess = () => {
        onSuccess?.();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div className={`relative w-full max-w-md max-h-[90vh] overflow-auto ${dash.panel}`}>
                <div className="sticky top-0 z-10 flex justify-end p-3 pb-0 bg-[#0a0a0a]/95">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 -m-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>
                <DepositForm onSuccess={handleSuccess} compact />
            </div>
        </div>
    );
}
