/**
 * Template Module - Placeholder Utilities
 * ========================================
 * Variable substitution for template text elements.
 */

import type { ArticleData } from '../types';

/**
 * Substitute placeholders like {{article.title}} with actual values
 */
export function substitutePlaceholders(text: string, article: ArticleData): string {
  if (!text || !article) return text;

  return text.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, obj, key) => {
    if (obj === 'article' && key in article) {
      const value = article[key as keyof ArticleData];
      return value !== undefined && value !== null ? String(value) : '';
    }
    return match; // Keep original if not found
  });
}

/**
 * Check if text contains any bindings
 */
export function hasBinding(text: string): boolean {
  return /\{\{.+\}\}/.test(text);
}

/**
 * Extract all binding keys from text
 * Returns array like ['article.title', 'article.category']
 */
export function extractBindings(text: string): string[] {
  const matches = text.match(/\{\{(\w+\.\w+)\}\}/g);
  if (!matches) return [];
  
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
}

/**
 * List of supported placeholder variables
 */
export const SUPPORTED_PLACEHOLDERS = [
  { key: '{{article.title}}', description: 'Article title/headline' },
  { key: '{{article.categoryLabel}}', description: 'Category name' },
  { key: '{{article.authorName}}', description: 'Author name' },
  { key: '{{article.prepTime}}', description: 'Preparation time' },
  { key: '{{article.cookTime}}', description: 'Cooking time' },
  { key: '{{article.servings}}', description: 'Number of servings' },
  { key: '{{article.rating}}', description: 'Recipe rating' },
  { key: '{{article.image}}', description: 'Featured image URL' },
] as const;
