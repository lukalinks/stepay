'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';

export function AvatarUploadButton({
    hasAvatar,
    onChanged,
}: {
    hasAvatar: boolean;
    onChanged: (avatarUrl: string | null) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const upload = async (file: File) => {
        setLoading(true);
        setError(null);
        try {
            const body = new FormData();
            body.set('file', file);
            const res = await fetch('/api/user/avatar', {
                method: 'POST',
                body,
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            onChanged(typeof data.avatarUrl === 'string' ? data.avatarUrl : null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const remove = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/user/avatar', { method: 'DELETE', credentials: 'include' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not remove photo');
            onChanged(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove photo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => inputRef.current?.click()}
                    className={dash.ctaGhost}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {hasAvatar ? 'Change photo' : 'Add photo'}
                </button>
                {hasAvatar && (
                    <button type="button" disabled={loading} onClick={remove} className={dash.ctaGhost}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                    </button>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void upload(file);
                }}
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
    );
}
