/** Normalize jsonb intent payloads (handles legacy double-encoded JSON strings). */
export function coerceIntentPayload(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};

    if (typeof raw === 'string') {
        try {
            const parsed: unknown = JSON.parse(raw);
            if (typeof parsed === 'string') {
                try {
                    const inner = JSON.parse(parsed);
                    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
                        return inner as Record<string, unknown>;
                    }
                } catch {
                    return {};
                }
            }
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return {};
        }
        return {};
    }

    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Record<string, unknown>;
    }

    return {};
}
