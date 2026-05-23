export function parseJsonProp<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function stringifyJsonProp(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function stringProp(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function numberProp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
