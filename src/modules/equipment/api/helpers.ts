/**
 * Equipment Module - API Helpers
 * ===============================
 * Helper functions for API endpoints to handle JSON transformations
 */

/**
 * Transform request body for equipment: ensure JSON fields are stringified
 */
export function transformEquipmentRequestBody(body: any): any {
    const transformed = { ...body };

    // Ensure keywords is a JSON string
    if (transformed.keywords !== undefined) {
        if (Array.isArray(transformed.keywords)) {
            transformed.keywords = JSON.stringify(transformed.keywords);
        } else if (typeof transformed.keywords === 'string') {
            try {
                JSON.parse(transformed.keywords); // validate
            } catch {
                transformed.keywords = '[]';
            }
        }
    }

    // Ensure imageJson is a JSON string
    if (transformed.imageJson !== undefined) {
        if (typeof transformed.imageJson === 'object') {
            transformed.imageJson = JSON.stringify(transformed.imageJson);
        }
    }

    return transformed;
}

/**
 * Transform equipment response: parse JSON fields for the frontend
 */
export function transformEquipmentResponse(item: any): any {
    if (!item) return item;

    const response = { ...item };

    // Parse keywords
    if (typeof response.keywords === 'string') {
        try {
            response.keywordsList = JSON.parse(response.keywords);
        } catch {
            response.keywordsList = [];
        }
    }

    // Parse imageJson
    if (typeof response.imageJson === 'string') {
        try {
            response.image = JSON.parse(response.imageJson);
        } catch {
            response.image = {};
        }
    }

    return response;
}
