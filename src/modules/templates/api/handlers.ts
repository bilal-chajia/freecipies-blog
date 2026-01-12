/**
 * Template Module - API Handlers
 * ==============================
 * Reusable request handlers for template CRUD operations.
 * Works with raw D1 database for compatibility with existing API routes.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { CreateTemplateInput, UpdateTemplateInput } from '../types';

// Response helpers
export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle GET /api/templates
 */
export async function handleListTemplates(db: D1Database, activeOnly = true) {
  try {
    let query = `
      SELECT 
        id, slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active,
        created_at, updated_at
      FROM pin_templates
      WHERE 1=1
    `;

    if (activeOnly) {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.prepare(query).all();

    // Parse elements_json for each template
    const templates = (result.results || []).map((t: any) => ({
      ...t,
      elements: t.elements_json ? JSON.parse(t.elements_json) : [],
    }));

    return jsonResponse(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return errorResponse('Failed to fetch templates', 500);
  }
}

/**
 * Handle GET /api/templates/:slug
 */
export async function handleGetTemplate(db: D1Database, slug: string) {
  try {
    if (!slug) {
      return errorResponse('Slug is required', 400);
    }

    const result = await db.prepare(`
      SELECT 
        id, slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active,
        created_at, updated_at
      FROM pin_templates
      WHERE slug = ?1
    `).bind(slug).first();

    if (!result) {
      return errorResponse('Template not found', 404);
    }

    // Parse elements_json
    const template = {
      ...result,
      elements: result.elements_json ? JSON.parse(result.elements_json as string) : [],
    };

    return jsonResponse(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return errorResponse('Failed to fetch template', 500);
  }
}

/**
 * Handle POST /api/templates
 */
export async function handleCreateTemplate(
  db: D1Database, 
  body: CreateTemplateInput
) {
  try {
    const {
      slug,
      name,
      description = '',
      thumbnail_url = null,
      width = 1000,
      height = 1500,
      category = 'general',
      elements_json = '[]',
      is_active = true,
    } = body;

    if (!slug || !name) {
      return errorResponse('Slug and name are required', 400);
    }

    // Ensure elements_json is a string
    const elementsStr = typeof elements_json === 'string'
      ? elements_json
      : JSON.stringify(elements_json);

    const result = await db.prepare(`
      INSERT INTO pin_templates (
        slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    `).bind(
      slug,
      name,
      description,
      thumbnail_url,
      width,
      height,
      category,
      elementsStr,
      is_active ? 1 : 0
    ).run();

    if (!result.success) {
      return errorResponse('Failed to create template', 500);
    }

    return jsonResponse({ 
      id: result.meta?.last_row_id,
      slug,
      message: 'Template created successfully' 
    }, 201);
  } catch (error: any) {
    console.error('Error creating template:', error);
    
    if (error.message?.includes('UNIQUE constraint')) {
      return errorResponse('Template with this slug already exists', 409);
    }
    
    return errorResponse('Failed to create template', 500);
  }
}

/**
 * Handle PUT /api/templates/:slug
 */
export async function handleUpdateTemplate(
  db: D1Database,
  slug: string,
  body: UpdateTemplateInput
) {
  try {
    if (!slug) {
      return errorResponse('Slug is required', 400);
    }

    const {
      name,
      description,
      thumbnail_url,
      width,
      height,
      category,
      elements_json,
      is_active,
      slug: newSlug,
    } = body;

    // Ensure elements_json is a string if provided
    const elementsStr = elements_json !== undefined
      ? (typeof elements_json === 'string' ? elements_json : JSON.stringify(elements_json))
      : undefined;

    // Build dynamic update
    const updates: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = ?${paramIndex++}`);
      updateParams.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = ?${paramIndex++}`);
      updateParams.push(description);
    }
    if (thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = ?${paramIndex++}`);
      updateParams.push(thumbnail_url);
    }
    if (width !== undefined) {
      updates.push(`width = ?${paramIndex++}`);
      updateParams.push(width);
    }
    if (height !== undefined) {
      updates.push(`height = ?${paramIndex++}`);
      updateParams.push(height);
    }
    if (category !== undefined) {
      updates.push(`category = ?${paramIndex++}`);
      updateParams.push(category);
    }
    if (elementsStr !== undefined) {
      updates.push(`elements_json = ?${paramIndex++}`);
      updateParams.push(elementsStr);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = ?${paramIndex++}`);
      updateParams.push(is_active ? 1 : 0);
    }
    if (newSlug !== undefined && newSlug !== slug) {
      updates.push(`slug = ?${paramIndex++}`);
      updateParams.push(newSlug);
    }

    if (updates.length === 0) {
      return errorResponse('No updates provided', 400);
    }

    // Add slug for WHERE clause
    updateParams.push(slug);

    const query = `
      UPDATE pin_templates 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?${paramIndex}
    `;

    const result = await db.prepare(query).bind(...updateParams).run();

    if (result.meta?.changes === 0) {
      return errorResponse('Template not found', 404);
    }

    return jsonResponse({ 
      slug: newSlug || slug,
      message: 'Template updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating template:', error);
    
    if (error.message?.includes('UNIQUE constraint')) {
      return errorResponse('Template with this slug already exists', 409);
    }
    
    return errorResponse('Failed to update template', 500);
  }
}

/**
 * Handle DELETE /api/templates/:slug
 */
export async function handleDeleteTemplate(db: D1Database, slug: string) {
  try {
    if (!slug) {
      return errorResponse('Slug is required', 400);
    }

    const result = await db.prepare(`
      DELETE FROM pin_templates WHERE slug = ?1
    `).bind(slug).run();

    if (result.meta?.changes === 0) {
      return errorResponse('Template not found', 404);
    }

    return jsonResponse({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return errorResponse('Failed to delete template', 500);
  }
}
