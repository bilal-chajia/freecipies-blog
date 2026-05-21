/**
 * JSON contract helpers.
 *
 * Stored and serialized app JSON uses snake_case. TypeScript internals can use
 * camelCase, but every DB/API boundary should normalize before persistence or
 * response serialization.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

const CAMEL_BOUNDARY = /([a-z0-9])([A-Z])/g;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJsonObject(value: unknown): JsonObject | null {
  if (isJsonObject(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return isJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function toSnakeCaseKey(key: string): string {
  return key
    .replace(CAMEL_BOUNDARY, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

export function toSnakeCaseJson<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCaseJson(item)) as T;
  }

  if (!isJsonObject(value)) {
    return value;
  }

  const result: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    result[toSnakeCaseKey(key)] = toSnakeCaseJson(child);
  }

  return result as T;
}

export function stringifySnakeCaseJson(value: JsonValue): string {
  return JSON.stringify(toSnakeCaseJson(value));
}

