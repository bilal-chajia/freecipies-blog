type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const TYPE_TO_STORED: Record<string, string> = {
  imageSlot: 'image_slot',
};

const TYPE_TO_EDITOR: Record<string, string> = {
  image_slot: 'imageSlot',
};

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function convertKeys(value: unknown, convertKey: (key: string) => string): JsonValue {
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convertKey));
  }
  if (typeof value === 'object') {
    const output: Record<string, JsonValue> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
      output[convertKey(key)] = convertKeys(nestedValue, convertKey);
    });
    return output;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
}

export function toStoredTemplateElements(elements: unknown[]): JsonValue[] {
  return elements.map((element) => {
    const stored = convertKeys(element, toSnakeCase) as Record<string, JsonValue>;
    if (typeof stored.type === 'string') {
      stored.type = TYPE_TO_STORED[stored.type] ?? stored.type;
    }
    return stored;
  });
}

export function stringifyStoredTemplateElements(elements: unknown[]): string {
  return JSON.stringify(toStoredTemplateElements(elements));
}

export function toEditorTemplateElements<TElement = Record<string, unknown>>(
  elements_json: string | unknown[] | null | undefined
): TElement[] {
  let rawElements: unknown[] = [];

  if (typeof elements_json === 'string' && elements_json.trim()) {
    try {
      const parsed = JSON.parse(elements_json);
      rawElements = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawElements = [];
    }
  } else if (Array.isArray(elements_json)) {
    rawElements = elements_json;
  }

  return rawElements.map((element) => {
    const editor = convertKeys(element, toCamelCase) as Record<string, unknown>;
    if (typeof editor.type === 'string') {
      editor.type = TYPE_TO_EDITOR[editor.type] ?? editor.type;
    }
    return editor as TElement;
  });
}
