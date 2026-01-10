/**
 * Template Module - API Handlers
 * ==============================
 * Reusable request handlers for template CRUD operations.
 * Delegates to TemplateService for database operations using Drizzle ORM.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { createDb } from '@shared/database/drizzle';
import type { CreateTemplateInput, UpdateTemplateInput } from '../types';
import * as TemplateService from '../services/templates.service';

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
 * Transform service result to API response format
 * Includes both elements_json (raw string for frontend) and elements (parsed array)
 */
function transformTemplate(template: any) {
  if (!template) return null;
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    thumbnail_url: template.thumbnailUrl,
    width: template.width,
    height: template.height,
    category: template.category,
    elements_json: template.elementsJson,
    elements: template.elementsJson ? JSON.parse(template.elementsJson) : [],
    is_active: template.isActive,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

/**
 * Handle GET /api/templates
 */
export async function handleListTemplates(d1: D1Database, activeOnly = true) {
  try {
    const db = createDb(d1);
    const templates = await TemplateService.getTemplates(db, { activeOnly });

    // Transform to API response format
    const response = templates.map(transformTemplate);

    return jsonResponse(response);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return errorResponse('Failed to fetch templates', 500);
  }
}

/**
 * Handle GET /api/templates/:slug
 */
export async function handleGetTemplate(d1: D1Database, slug: string) {
  try {
    if (!slug) {
      return errorResponse('Slug is required', 400);
    }

    const db = createDb(d1);
    const template = await TemplateService.getTemplateBySlug(db, slug);

    if (!template) {
      return errorResponse('Template not found', 404);
    }

    return jsonResponse(transformTemplate(template));
  } catch (error) {
    console.error('Error fetching template:', error);
    return errorResponse('Failed to fetch template', 500);
  }
}

/**
 * Handle POST /api/templates
 */
export async function handleCreateTemplate(
  d1: D1Database,
  body: CreateTemplateInput
) {
  try {
    const { slug, name } = body;

    if (!slug || !name) {
      return errorResponse('Slug and name are required', 400);
    }

    const db = createDb(d1);

    // Check if slug already exists
    const exists = await TemplateService.slugExists(db, slug);
    if (exists) {
      return errorResponse('Template with this slug already exists', 409);
    }

    const template = await TemplateService.createTemplate(db, {
      slug,
      name,
      description: body.description,
      category: body.category,
      width: body.width,
      height: body.height,
      elementsJson: body.elements_json,
      thumbnailUrl: body.thumbnail_url ?? undefined,
      isActive: body.is_active,
    });

    return jsonResponse({
      id: template.id,
      slug: template.slug,
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
  d1: D1Database,
  slug: string,
  body: UpdateTemplateInput
) {
  try {
    if (!slug) {
      return errorResponse('Slug is required', 400);
    }

    const db = createDb(d1);

    // Check if template exists
    const existing = await TemplateService.getTemplateBySlug(db, slug);
    if (!existing) {
      return errorResponse('Template not found', 404);
    }

    // If changing slug, check new slug doesn't exist
    if (body.slug && body.slug !== slug) {
      const exists = await TemplateService.slugExists(db, body.slug);
      if (exists) {
        return errorResponse('Template with this slug already exists', 409);
      }
    }

    const updated = await TemplateService.updateTemplate(db, slug, body);

    return jsonResponse({
      slug: updated?.slug || slug,
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
export async function handleDeleteTemplate(d1: D1Database, slug: string) {
  try {
    if (!slug) {
      return errorResponse('Slug is required', 400);
    }

    const db = createDb(d1);
    const deleted = await TemplateService.deleteTemplate(db, slug);

    if (!deleted) {
      return errorResponse('Template not found', 404);
    }

    return jsonResponse({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return errorResponse('Failed to delete template', 500);
  }
}
