/**
 * Article Zod Schemas
 * ===================
 * Validation schemas for articles API endpoints.
 */
import { z } from '../helpers';
import { PaginationSchema } from './common';
import { ContentDocumentInputSchema } from '@modules/content-blocks';
import { RoundupJsonInputSchema } from '@modules/articles/validation/roundup-json.schema';
import { RecipeJsonInputSchema } from '@modules/articles/validation/recipe-json.schema';
import { FaqsJsonInputSchema } from '@modules/articles/validation/faqs-json.schema';
import { ImagesJsonInputSchema } from '@modules/articles/validation/images-json.schema';

/** GET /api/articles query params */
export const ArticleListQuery = PaginationSchema.extend({
  slug: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  tag: z.string().optional(),
  type: z.enum(['recipe', 'article', 'roundup']).optional(),
  workflow_status: z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived', 'all']).optional(),
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
  short_description: z.string().optional(),
  content_json: ContentDocumentInputSchema.optional(),
  recipe_json: RecipeJsonInputSchema.optional(),
  roundup_json: RoundupJsonInputSchema.optional(),
  images_json: ImagesJsonInputSchema.optional(),
  faqs_json: FaqsJsonInputSchema.optional(),
  author_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  selectedTags: z.array(z.number().int().positive()).optional(),
  seo_json: z.string().optional(),
  config_json: z.string().optional(),
  is_favorite: z.boolean().optional(),
}).passthrough();

/** PUT /api/admin/articles/:id body — same shape as create */
export const UpdateArticleSchema = CreateArticleSchema;

/** PATCH /api/admin/articles/:id?action=... query params */
export const ArticleActionQuery = z.object({
  action: z.enum(['set-workflow-status', 'toggle-favorite']),
});
