/**
 * Only allow same-origin relative paths (blocks //evil.com open redirects).
 */
export function safeInternalPath(
    path: string | null | undefined,
    fallback = '/dashboard'
): string {
    if (!path) return fallback;
    const p = path.trim();
    if (!p.startsWith('/')) return fallback;
    if (p.startsWith('//')) return fallback;
    if (p.includes('://')) return fallback;
    if (p.includes('\\')) return fallback;
    if (/[\x00-\x1f]/.test(p)) return fallback;
    return p;
}
