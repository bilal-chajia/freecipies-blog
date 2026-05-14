import { z } from 'zod';
import { normalizeContentDocument } from '../normalize/normalize-content-document';

const publicImageVariantSchema = z.object({
  url: z.string().min(1).optional(),
  r2_key: z.string().min(1).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_bytes: z.number().int().nonnegative().optional(),
}).strict().refine((variant) => Boolean(variant.url || variant.r2_key), {
  message: 'image variant requires url or r2_key',
});

const compactRelatedImageSchema = z.object({
  media_id: z.number().int().positive(),
  alt: z.string().min(1),
  variants: z.object({
    sm: publicImageVariantSchema.optional(),
    md: publicImageVariantSchema.optional(),
  }).strict().refine((variants) => Boolean(variants.sm || variants.md), {
    message: 'related_content.image requires sm or md variant',
  }),
}).strict();

const publicImageVariantsSchema = z.object({
  sm: publicImageVariantSchema.optional(),
  md: publicImageVariantSchema.optional(),
  lg: publicImageVariantSchema.optional(),
}).strict().refine((variants) => Boolean(variants.sm && variants.md && variants.lg), {
  message: 'image block requires sm, md, and lg variants',
});

const imageCreditAvatarSchema = z.object({
  media_id: z.number().int().positive().optional(),
  alt: z.string().optional(),
  variants: z.object({
    xs: publicImageVariantSchema.optional(),
    sm: publicImageVariantSchema.optional(),
  }).strict().refine((variants) => Boolean(variants.xs || variants.sm), {
    message: 'image credit avatar requires xs or sm variant',
  }),
}).strict();

const imageCreditSchema = z.object({
  type: z.literal('author'),
  id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  avatar: imageCreditAvatarSchema.optional(),
}).strict();

const baseBlockSchema = z.object({
  id: z.string().min(1),
});

const paragraphBlockSchema = baseBlockSchema.extend({
  type: z.literal('paragraph'),
  text: z.string(),
}).strict();

const headingBlockSchema = baseBlockSchema.extend({
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  text: z.string(),
}).strict();

const blockquoteBlockSchema = baseBlockSchema.extend({
  type: z.literal('blockquote'),
  text: z.string(),
  cite: z.string().optional(),
}).strict();

const listBlockSchema = baseBlockSchema.extend({
  type: z.literal('list'),
  style: z.enum(['ordered', 'unordered', 'checklist']),
  items: z.array(z.string()),
}).strict();

const imageBlockSchema = baseBlockSchema.extend({
  type: z.literal('image'),
  media_id: z.number().int().positive(),
  alt: z.string(),
  caption: z.string().optional(),
  credit: imageCreditSchema.optional(),
  variants: publicImageVariantsSchema.optional(),
}).strict();

const videoBlockSchema = baseBlockSchema.extend({
  type: z.literal('video'),
  provider: z.enum(['youtube', 'vimeo', 'self']),
  video_id: z.string().min(1),
  aspect_ratio: z.enum(['16:9', '4:3', '1:1', '9:16']),
}).strict();

const tipBoxBlockSchema = baseBlockSchema.extend({
  type: z.literal('tip_box'),
  variant: z.enum(['tip', 'warning', 'info', 'note']),
  title: z.string().optional(),
  text: z.string(),
}).strict();

const dividerBlockSchema = baseBlockSchema.extend({
  type: z.literal('divider'),
}).strict();

const tableBlockSchema = baseBlockSchema.extend({
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
}).strict();

const beforeAfterImageSchema = z.object({
  media_id: z.number().int().positive(),
  alt: z.string(),
  label: z.string().optional(),
  variants: publicImageVariantsSchema.optional(),
}).strict();

const beforeAfterBlockSchema = baseBlockSchema.extend({
  type: z.literal('before_after'),
  layout: z.enum(['slider', 'side_by_side']),
  before: beforeAfterImageSchema,
  after: beforeAfterImageSchema,
}).strict();

const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
}).strict();

const faqSectionBlockSchema = baseBlockSchema.extend({
  type: z.literal('faq_section'),
  title: z.string().optional(),
  items: z.array(faqItemSchema),
}).strict();

const relatedContentItemSchema = z.object({
  content_type: z.enum(['recipe', 'article', 'roundup']),
  article_id: z.number().int().positive().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  image: compactRelatedImageSchema.optional(),
  total_time: z.number().int().positive().optional(),
  difficulty: z.string().optional(),
  reading_time: z.number().int().positive().optional(),
  item_count: z.number().int().positive().optional(),
}).strict();

const relatedContentBlockSchema = baseBlockSchema.extend({
  type: z.literal('related_content'),
  title: z.string().optional(),
  layout: z.enum(['grid', 'carousel', 'list']),
  mode: z.enum(['manual', 'auto']).optional(),
  limit: z.number().int().positive().optional(),
  items: z.array(relatedContentItemSchema),
}).strict();

const roundupItemBlockSchema = baseBlockSchema.extend({
  type: z.literal('roundup_item'),
  article_id: z.number().int().positive().nullable().optional(),
  external_url: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  note: z.string().optional(),
  cover: z.string().nullable().optional(),
}).strict();

const mainRecipeBlockSchema = baseBlockSchema.extend({
  type: z.literal('main_recipe'),
}).strict();

export const ContentBlockSchema = z.discriminatedUnion('type', [
  paragraphBlockSchema,
  headingBlockSchema,
  blockquoteBlockSchema,
  listBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  tipBoxBlockSchema,
  dividerBlockSchema,
  tableBlockSchema,
  beforeAfterBlockSchema,
  faqSectionBlockSchema,
  relatedContentBlockSchema,
  roundupItemBlockSchema,
  mainRecipeBlockSchema,
]).superRefine((block, ctx) => {
  if (block.type === 'roundup_item' && !block.article_id && !(block.external_url && block.title)) {
    ctx.addIssue({
      code: 'custom',
      message: 'roundup_item requires article_id or external_url and title',
    });
  }
});

export const ContentDocumentSchema = z.object({
  version: z.literal(1),
  kind: z.literal('content_document'),
  blocks: z.array(ContentBlockSchema),
});

export const ContentDocumentInputSchema = z.unknown().transform((input, ctx) => {
  let parseInput = input;
  if (typeof input === 'string') {
    try {
      parseInput = JSON.parse(input);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'contentJson must be valid JSON',
      });
      return z.NEVER;
    }
  }

  if (!parseInput || typeof parseInput !== 'object' || Array.isArray(parseInput)) {
    ctx.addIssue({
      code: 'custom',
      message: 'contentJson must be a ContentDocument object',
    });
    return z.NEVER;
  }

  const rawDocument = parseInput as { version?: unknown; kind?: unknown; blocks?: unknown };
  if (rawDocument.version !== 1 || rawDocument.kind !== 'content_document' || !Array.isArray(rawDocument.blocks)) {
    ctx.addIssue({
      code: 'custom',
      message: 'contentJson must include version, kind, and blocks',
    });
    return z.NEVER;
  }

  const rawBlocks = rawDocument.blocks;
  for (const rawBlock of rawBlocks) {
    if (!rawBlock || typeof rawBlock !== 'object' || Array.isArray(rawBlock) || typeof (rawBlock as { id?: unknown }).id !== 'string' || !(rawBlock as { id: string }).id.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'contentJson blocks must include id',
      });
      return z.NEVER;
    }
  }

  const document = normalizeContentDocument(parseInput);
  if (rawBlocks.length !== document.blocks.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'contentJson contains unsupported blocks',
    });
    return z.NEVER;
  }

  const result = ContentDocumentSchema.safeParse(document);

  if (!result.success) {
    ctx.addIssue({
      code: 'custom',
      message: result.error.issues[0]?.message || 'Invalid contentJson document',
    });
    return z.NEVER;
  }

  return result.data;
});
