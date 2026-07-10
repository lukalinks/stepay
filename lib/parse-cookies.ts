/** All values for a cookie name (browsers may send duplicates with different Domain attributes). */
export function parseCookieValues(cookieHeader: string | null, name: string): string[] {
    if (!cookieHeader) return [];
    const values: string[] = [];
    for (const segment of cookieHeader.split(';')) {
        const eq = segment.indexOf('=');
        if (eq <= 0) continue;
        const key = segment.slice(0, eq).trim();
        if (key === name) {
            values.push(segment.slice(eq + 1).trim());
        }
    }
    return values;
}
