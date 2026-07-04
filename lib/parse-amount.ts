/** Strip commas/spaces and keep one decimal point — safe for controlled inputs. */
export function sanitizeDecimalInput(raw: string): string {
    const noCommas = raw.replace(/,/g, '').trim();
    const cleaned = noCommas.replace(/[^\d.]/g, '');
    const dot = cleaned.indexOf('.');
    if (dot === -1) return cleaned;
    return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

/** Parse user/API amount values (string or number) into a positive finite number. */
export function parsePositiveDecimal(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value <= 0) return null;
        return value;
    }

    if (typeof value === 'string') {
        const cleaned = sanitizeDecimalInput(value);
        if (!cleaned || cleaned === '.' || cleaned === '-') return null;
        const n = Number(cleaned);
        if (!Number.isFinite(n) || n <= 0) return null;
        return n;
    }

    return null;
}

export function parsePositiveDecimalOrThrow(value: unknown, message: string): number {
    const n = parsePositiveDecimal(value);
    if (n == null) throw new Error(message);
    return n;
}
