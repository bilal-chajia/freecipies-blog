/**
 * Element serialization — canonical snake_case, no key conversion.
 * The stored JSON shape IS the in-memory shape (TEMPLATE_JSON_CONTRACT.md).
 */
import type { TemplateElement } from '../types/elements.types';

export function stringifyStoredTemplateElements(elements: TemplateElement[]): string {
  return JSON.stringify(elements);
}

export function parseStoredTemplateElements(
  elements_json: string | TemplateElement[] | unknown[] | null | undefined
): TemplateElement[] {
  if (Array.isArray(elements_json)) {
    return elements_json as TemplateElement[];
  }
  if (typeof elements_json === 'string' && elements_json.trim()) {
    try {
      const parsed: unknown = JSON.parse(elements_json);
      return Array.isArray(parsed) ? (parsed as TemplateElement[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
