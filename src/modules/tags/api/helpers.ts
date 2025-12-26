/**
 * Tags Module - API Helpers
 * ==========================
 * Helper functions for API endpoints to handle JSON transformations
 */

interface TagStyleJson {
  svg_code?: string;
  color?: string;
  variant?: string;
}

const normalizeStyleJsonObject = (value: any): TagStyleJson => {
  if (!value || typeof value !== 'object') return {};

  return {
    svg_code: value.svg_code ?? value.svgCode ?? value.icon,
    color: value.color,
    variant: value.variant,
  };
};

/**
 * Parse and validate styleJson from request body
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
 * Transform request body to handle both legacy flat fields and styleJson
 */
export function transformTagRequestBody(body: any): any {
  const transformed = { ...body };

  if (body.styleJson !== undefined) {
    transformed.styleJson = parseStyleJson(body.styleJson);
  } else if (body.color || body.svg_code || body.svgCode || body.variant || body.icon) {
    transformed.styleJson = parseStyleJson({
      color: body.color,
      svg_code: body.svg_code ?? body.svgCode ?? body.icon,
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
 * Transform tag response to include legacy flat fields for backward compatibility
 */
export function transformTagResponse(tag: any): any {
  if (!tag) return tag;

  const response = { ...tag };

  if (tag.styleJson) {
    try {
      const style: TagStyleJson = JSON.parse(tag.styleJson);
      response.color = style.color;
      response.svgCode = style.svg_code;
      response.icon = style.svg_code;
      response.variant = style.variant;
    } catch {
      // Invalid JSON, skip
    }
  }

  return response;
}
