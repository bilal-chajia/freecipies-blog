/**
 * Tags Module - API Helpers
 * ==========================
 * Helper functions for API endpoints to handle JSON transformations
 */

interface TagStyleJson {
  color?: string;
  variant?: string;
}

const normalizeStyleJsonObject = (value: any): TagStyleJson => {
  if (!value || typeof value !== 'object') return {};

  return {
    color: value.color,
    variant: value.variant,
  };
};

/**
 * Parse and validate style_json from request body
 */
export function parseStyleJson(value: any): string {
  if (!value) return '{}';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeStyleJsonObject(parsed));
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(normalizeStyleJsonObject(value));
  }

  return '{}';
}

/**
 * Transform request body to handle flat style fields and style_json
 */
export function transformTagRequestBody(body: any): any {
  const transformed = { ...body };

  if (body.style_json !== undefined) {
    transformed.style_json = parseStyleJson(body.style_json);
  } else if (body.color || body.variant) {
    transformed.style_json = parseStyleJson({
      color: body.color,
      variant: body.variant,
    });
  }

  delete transformed.color;
  delete transformed.icon;
  delete transformed.svg_code;
  delete transformed.svgCode;
  delete transformed.variant;

  return transformed;
}

/**
 * Transform tag response to include flat style fields for admin consumers
 */
export function transformTagResponse(tag: any): any {
  if (!tag) return tag;

  const response = { ...tag };

  if (tag.style_json) {
    try {
      const style: TagStyleJson = JSON.parse(tag.style_json);
      response.color = style.color;
      response.variant = style.variant;
    } catch {
      // Invalid JSON, skip
    }
  }

  return response;
}
