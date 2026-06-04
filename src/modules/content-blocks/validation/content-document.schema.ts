import { z } from 'zod';
import { CONTENT_BLOCK_TYPES } from '../contract/content-blocks.types';
import { normalizeContentDocument } from '../normalize/normalize-content-document';

const canonicalBlockTypes = new Set<string>(CONTENT_BLOCK_TYPES);

const storedImageVariantSchema = z.object({
  r2_key: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_bytes: z.number().int().nonnegative().optional(),
}).strict();

const compactRelatedImageSchema = z.object({
  media_id: z.number().int().positive(),
  alt: z.string().min(1),
  variants: z.object({
    xs: storedImageVariantSchema,
    sm: storedImageVariantSchema,
  }),
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
  image_ref: z.string().min(1),
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

const beforeAfterBlockSchema = baseBlockSchema.extend({
  type: z.literal('before_after'),
  layout: z.enum(['slider', 'side_by_side']),
  before_image_ref: z.string().min(1),
  after_image_ref: z.string().min(1),
  before_label: z.string().optional(),
  after_label: z.string().optional(),
}).strict();

const relatedContentItemSchema = z.object({
  article_id: z.number().int().positive(),
  snapshot: z.object({
    id: z.number().int().positive(),
    type: z.enum(['recipe', 'article', 'roundup']),
    slug: z.string().min(1),
    headline: z.string().min(1),
    short_description: z.string().optional(),
    image: compactRelatedImageSchema.optional(),
  }).passthrough(),
}).strict().refine((item) => item.snapshot.id === item.article_id, {
  message: 'related_content snapshot.id must match article_id',
});

const relatedContentBlockSchema = baseBlockSchema.extend({
  type: z.literal('related_content'),
  title: z.string().optional(),
  layout: z.enum(['grid', 'carousel', 'list']),
  limit: z.number().int().positive().optional(),
  items: z.array(relatedContentItemSchema),
}).strict();

const mainRecipeBlockSchema = baseBlockSchema.extend({
  type: z.literal('main_recipe'),
}).strict();

const mainRoundupBlockSchema = baseBlockSchema.extend({
  type: z.literal('main_roundup'),
}).strict();

const mainFaqBlockSchema = baseBlockSchema.extend({
  type: z.literal('main_faq'),
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
  relatedContentBlockSchema,
  mainRecipeBlockSchema,
  mainRoundupBlockSchema,
  mainFaqBlockSchema,
]);

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
        message: 'content_json must be valid JSON',
      });
      return z.NEVER;
    }
  }

  if (!parseInput || typeof parseInput !== 'object' || Array.isArray(parseInput)) {
    ctx.addIssue({
      code: 'custom',
      message: 'content_json must be a ContentDocument object',
    });
    return z.NEVER;
  }

  const rawDocument = parseInput as { version?: unknown; kind?: unknown; blocks?: unknown };
  if (rawDocument.version !== 1 || rawDocument.kind !== 'content_document' || !Array.isArray(rawDocument.blocks)) {
    ctx.addIssue({
      code: 'custom',
      message: 'content_json must include version, kind, and blocks',
    });
    return z.NEVER;
  }

  const rawBlocks = rawDocument.blocks;
  for (const rawBlock of rawBlocks) {
    if (!rawBlock || typeof rawBlock !== 'object' || Array.isArray(rawBlock) || typeof (rawBlock as { id?: unknown }).id !== 'string' || !(rawBlock as { id: string }).id.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'content_json blocks must include id',
      });
      return z.NEVER;
    }

    const rawType = (rawBlock as { type?: unknown }).type;
    if (typeof rawType !== 'string' || !canonicalBlockTypes.has(rawType)) {
      ctx.addIssue({
        code: 'custom',
        message: 'content_json contains unsupported blocks',
      });
      return z.NEVER;
    }
  }

  const document = normalizeContentDocument(parseInput);
  if (rawBlocks.length !== document.blocks.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'content_json contains unsupported blocks',
    });
    return z.NEVER;
  }

  const result = ContentDocumentSchema.safeParse(document);

  if (!result.success) {
    ctx.addIssue({
      code: 'custom',
      message: result.error.issues[0]?.message || 'Invalid content_json document',
    });
    return z.NEVER;
  }

  return result.data;
});
