'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DepositForm } from './DepositForm';

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
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div className="relative w-full max-w-md max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-xl border border-slate-200/60">
                <div className="sticky top-0 z-10 flex justify-end p-3 pb-0 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 -m-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
                <DepositForm onSuccess={handleSuccess} compact />
            </div>
        </div>
    );
}
