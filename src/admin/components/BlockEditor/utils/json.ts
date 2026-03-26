export const parseJsonValue = <T>(value: unknown, fallback: T): T => {
    if (value === null || value === undefined) return fallback;
    if (typeof value !== 'string') return value as T;
    try {
        const parsed = JSON.parse(value);
        return (parsed ?? fallback) as T;
    } catch {
        return fallback;
    }
};

export const parseJsonArray = <T = unknown>(value: unknown): T[] => {
    const parsed = parseJsonValue<unknown>(value, []);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
};

export const parseJsonObject = <T>(value: unknown, fallback: T): T => {
    const parsed = parseJsonValue<unknown>(value, fallback);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as T;
    }
    return fallback;
};
