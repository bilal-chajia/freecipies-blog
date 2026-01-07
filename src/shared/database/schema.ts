/**
 * Shared Database - Combined Schema
 * ===================================
 * Aggregates all module schemas for the Drizzle client.
 */

// Content Modules
export * from '@modules/articles/schema/articles.schema';
export * from '@modules/articles/schema/articles-to-tags.schema';
export * from '@modules/categories/schema/categories.schema';
export * from '@modules/authors/schema/authors.schema';
export * from '@modules/tags/schema/tags.schema';
export * from '@modules/media/schema/media.schema';
export * from '@modules/settings/schema/settings.schema';
// Note: menus module uses site_settings table, no separate schema needed

// Feature Modules
export * from '@modules/templates/schema/templates.schema';
export * from '@modules/pinterest/schema/pinterest.schema';

// Export any other schemas needing strict typing or relations
