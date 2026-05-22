/**
 * Article Zod Schemas
 * ===================
 * Validation schemas for articles API endpoints.
 */
import { z } from '../helpers';
import { PaginationSchema } from './common';
import { ContentDocumentInputSchema } from '@modules/content-blocks';

/** GET /api/articles query params */
export const ArticleListQuery = PaginationSchema.extend({
  slug: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  tag: z.string().optional(),
  type: z.enum(['recipe', 'article', 'roundup']).optional(),
  workflowStatus: z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived', 'all']).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
}).transform(({ page, limit, ...rest }) => ({
  page,
  limit,
  offset: (page - 1) * limit,
  ...rest
}));

/** POST /api/articles body — .passthrough() keeps extra admin fields */
export const CreateArticleSchema = z.object({
  type: z.enum(['recipe', 'article', 'roundup']),
  slug: z.string().min(1),
  headline: z.string().min(1),
  shortDescription: z.string().optional(),
  contentJson: ContentDocumentInputSchema.optional(),
  recipeJson: z.string().optional(),
  roundupJson: z.string().optional(),
  imagesJson: z.string().optional(),
  authorId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  selectedTags: z.array(z.number().int().positive()).optional(),
  seoJson: z.string().optional(),
  configJson: z.string().optional(),
  isFavorite: z.boolean().optional(),
}).passthrough();

/** PUT /api/admin/articles/:id body — same shape as create */
export const UpdateArticleSchema = CreateArticleSchema;

/** PATCH /api/admin/articles/:id?action=... query params */
export const ArticleActionQuery = z.object({
  action: z.enum(['set-workflow-status', 'toggle-favorite']),
});
