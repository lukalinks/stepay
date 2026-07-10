'use client';

interface PayQrCodeProps {
    value: string;
    size?: number;
    className?: string;
}

/** QR via public API — no extra dependency. */
export function PayQrCode({ value, size = 200, className = '' }: PayQrCodeProps) {
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt="Payment QR code"
            width={size}
            height={size}
            className={`rounded-xl border border-white/10 bg-white p-2 ${className}`}
        />
    );
}
