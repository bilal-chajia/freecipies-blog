/**
 * Settings Zod Schemas
 * ====================
 * Validation schemas for settings API endpoints:
 *   - Menus (PUT/POST body)
 *   - Appearance (PUT body)
 *   - Image Upload (PUT body)
 */
import { z } from '../helpers';

// ────────────────────────────────────────────
// Menu schemas
// ────────────────────────────────────────────

const MenuTargetSchema = z.object({
  type: z.enum([
    'internal_route',
    'category',
    'tag',
    'article',
    'author',
    'external_url',
    'affiliate',
    'cookbook',
  ]),
  href: z.string().min(1).max(500),
  id: z.number().int().positive().optional(),
  slug: z.string().optional(),
  snapshot: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const MenuImageVariantSchema = z.object({
  r2_key: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_bytes: z.number().int().nonnegative().optional(),
});

const MenuImageSchema = z.object({
  media_id: z.number().int().positive().optional(),
  alt: z.string(),
  placeholder: z.string(),
  variants: z.object({
    xs: MenuImageVariantSchema,
    sm: MenuImageVariantSchema,
  }),
}).strict();

const MenuFeaturedItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('featured_item'),
  label: z.string().min(1).max(120),
  description: z.string().optional(),
  target: MenuTargetSchema,
  image: MenuImageSchema.optional(),
  disclosure_label: z.string().optional(),
}).strict();

/** Recursive canonical menu item schema. */
export const MenuItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().min(1, 'Menu item id is required'),
    type: z.enum(['link', 'group', 'mega', 'separator']),
    label: z.string().max(100).optional(),
    is_enabled: z.boolean().optional(),
    visibility: z.enum(['all', 'desktop', 'mobile']).optional(),
    highlight: z.boolean().optional(),
    open_in_new_tab: z.boolean().optional(),
    target: MenuTargetSchema.optional(),
    overview_target: MenuTargetSchema.optional(),
    layout: z.enum(['columns', 'columns_with_featured_carousel', 'featured_left']).optional(),
    items: z.array(MenuItemSchema).optional(),
    columns: z.array(z.object({
      id: z.string().min(1),
      title: z.string(),
      items: z.array(MenuItemSchema),
    }).strict()).optional(),
    featured_items: z.array(MenuFeaturedItemSchema).optional(),
    image: MenuImageSchema.optional(),
    disclosure_label: z.string().optional(),
  }).passthrough(),
);

export const MenuDocumentSchema = z.object({
  location: z.enum(['header', 'footer', 'mobile', 'sidebar']),
  is_enabled: z.boolean(),
  fallback_to: z.literal('header').nullable(),
  items: z.array(MenuItemSchema),
}).strict();

/** Single menu: id, label, location, items */
export const MenuSchema = z.object({
  id: z.string().min(1, 'Menu id is required'),
  label: z.string().min(1, 'Menu label is required').max(100),
  location: z.enum(['header', 'footer', 'sidebar', 'mobile']).optional(),
  items: z.array(MenuItemSchema),
});

/** Save-menus body (PUT endpoint): one or more canonical menu_* documents. */
export const SaveMenusSchema = z
  .object({
    menu_header: MenuDocumentSchema.optional(),
    menu_footer: MenuDocumentSchema.optional(),
    menu_mobile: MenuDocumentSchema.optional(),
    menu_sidebar: MenuDocumentSchema.optional(),
  })
  .passthrough()
  .refine((d) => Object.keys(d).some((key) => [
    'menu_header',
    'menu_footer',
    'menu_mobile',
    'menu_sidebar',
  ].includes(key)), {
    message: 'Provide at least one menu payload',
  });

/** Create-menu body (POST endpoint): key, label, items?, location?, description? */
export const CreateMenuSchema = z
  .object({
    key: z.string().min(1, 'key is required'),
    label: z.string().min(1, 'label is required'),
    items: z.array(MenuItemSchema).optional(),
    location: z.enum(['header', 'footer', 'sidebar', 'mobile']).optional(),
    description: z.string().optional(),
  })
  .passthrough();

/** Delete-menu query param */
export const DeleteMenuQuery = z.object({
  key: z.string().min(1, 'key parameter is required'),
});

// ────────────────────────────────────────────
// Appearance schemas
// ────────────────────────────────────────────

/** TOC settings sub-object */
const TocSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  numbering: z.boolean().optional(),
  collapsible: z.boolean().optional(),
  default_open: z.boolean().optional(),
  show_jump_button: z.boolean().optional(),
  accent_color: z.string().optional(),
  max_depth: z.number().int().min(2).max(6).optional(),
}).strict();

/** PUT body for appearance: { toc?: Partial<TocSettings> } */
export const AppearanceSchema = z
  .object({
    toc: TocSettingsSchema.optional(),
  })
  .passthrough();

// ────────────────────────────────────────────
// Category page settings schema (global)
// ────────────────────────────────────────────

/** PUT body for global category page settings (partial of the 9 settings). */
export const CategoryPageSettingsSchema = z
  .object({
    posts_per_page: z.number().int().min(1).max(50).optional(),
    layout_mode: z.enum(['grid', 'list', 'masonry']).optional(),
    card_style: z.enum(['compact', 'full', 'minimal']).optional(),
    show_sidebar: z.boolean().optional(),
    show_filters: z.boolean().optional(),
    show_breadcrumb: z.boolean().optional(),
    article_sort_by: z.enum(['published_at', 'title', 'view_count']).optional(),
    article_sort_order: z.enum(['asc', 'desc']).optional(),
    header_style: z.enum(['hero', 'minimal', 'none']).optional(),
  })
  .strict();

// ────────────────────────────────────────────
// Image-upload schemas
// ────────────────────────────────────────────

// ────────────────────────────────────────────
// Homepage settings schema
// ────────────────────────────────────────────

const HomepagePageSeoSchema = z
  .object({
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    no_index: z.boolean().optional(),
    canonical: z.string().optional(),
    og_image: z.string().optional(),
    og_title: z.string().optional(),
    og_description: z.string().optional(),
    twitter_card: z.enum(['summary', 'summary_large_image']).optional(),
  })
  .strict();

const HomepageRecipeRefSchema = z
  .object({
    article_id: z.number().int().positive(),
    headline: z.string(),
    route: z.string().min(1),
    category: z
      .object({
        label: z.string(),
        slug: z.string(),
        color: z.string().optional(),
      })
      .nullable()
      .optional(),
  })
  .strict();

const HomepageRoundupRefSchema = z
  .object({
    roundup_id: z.number().int().positive(),
    title: z.string(),
    route: z.string().min(1),
  })
  .strict();

const homepageSectionBase = {
  id: z.string().min(1),
  enabled: z.boolean(),
};

function isRecipeListingHref(href: string): boolean {
  return /^\/recipes(?:[/?#]|$)/.test(href);
}

function isSafeCtaHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\')) return true;

  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

const HomepageQuickFilterSchema = z.object({
  label: z.string().trim().min(1),
  href: z.string().trim().min(1).refine(isRecipeListingHref, {
    message: 'Quick filter URLs must begin with /recipes',
  }),
}).strict();

const HomepageResolvedImageVariantSchema = z.object({
  url: z.string().trim().min(1).refine((url) => url.startsWith('/api/images/'), {
    message: 'Spotlight image variants must use a local image route',
  }),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_bytes: z.number().int().nonnegative().optional(),
}).strict();

const HomepageResolvedImageSnapshotSchema = z.object({
  media_id: z.number().int().positive(),
  alt: z.string().trim().min(1),
  placeholder: z.string().trim().min(1),
  focal_point: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).strict().optional(),
  aspect_ratio: z.string().trim().min(1).optional(),
  variants: z.object({
    sm: HomepageResolvedImageVariantSchema,
    md: HomepageResolvedImageVariantSchema,
    lg: HomepageResolvedImageVariantSchema,
  }).strict(),
}).strict();

const HomepageSeasonalSpotlightSchema = z.object({
  ...homepageSectionBase,
  type: z.literal('seasonal_spotlight'),
  title: z.string().trim(),
  body: z.string().trim(),
  image: HomepageResolvedImageSnapshotSchema.nullable(),
  cta: z.object({
    label: z.string().trim(),
    href: z.string().trim(),
  }).strict(),
}).strict().superRefine((section, context) => {
  if (section.cta.href && !isSafeCtaHref(section.cta.href)) {
    context.addIssue({ code: 'custom', path: ['cta', 'href'], message: 'Spotlight CTA URL must be an internal path or HTTPS URL' });
  }
  if (!section.enabled) return;

  if (!section.title) {
    context.addIssue({ code: 'custom', path: ['title'], message: 'Spotlight title is required' });
  }
  if (!section.body) {
    context.addIssue({ code: 'custom', path: ['body'], message: 'Spotlight body is required' });
  }
  if (!section.image) {
    context.addIssue({ code: 'custom', path: ['image'], message: 'Spotlight image is required' });
  }
  if (!section.cta.label) {
    context.addIssue({ code: 'custom', path: ['cta', 'label'], message: 'Spotlight CTA label is required' });
  }
  if (!section.cta.href) {
    context.addIssue({ code: 'custom', path: ['cta', 'href'], message: 'Spotlight CTA URL must be an internal path or HTTPS URL' });
  }
});

const HomepageSocialProofStatSchema = z.object({
  value: z.string().trim(),
  label: z.string().trim(),
}).strict();

const HomepageSocialProofTestimonialSchema = z.object({
  quote: z.string().trim(),
  name: z.string().trim(),
  role: z.string().trim().optional(),
}).strict();

const HomepageSocialProofLogoSchema = z.object({
  name: z.string().trim(),
  image: HomepageResolvedImageSnapshotSchema.nullable(),
}).strict();

const HomepageSocialProofSchema = z.object({
  ...homepageSectionBase,
  type: z.literal('social_proof'),
  eyebrow: z.string().trim(),
  title: z.string().trim(),
  stats: z.array(HomepageSocialProofStatSchema).max(4),
  testimonials: z.array(HomepageSocialProofTestimonialSchema).max(6),
  logos: z.array(HomepageSocialProofLogoSchema).max(6),
}).strict().superRefine((section, context) => {
  if (!section.enabled) return;

  if (!section.eyebrow) {
    context.addIssue({ code: 'custom', path: ['eyebrow'], message: 'Social proof eyebrow is required' });
  }
  if (!section.title) {
    context.addIssue({ code: 'custom', path: ['title'], message: 'Social proof title is required' });
  }
  if (section.stats.length + section.testimonials.length + section.logos.length === 0) {
    context.addIssue({ code: 'custom', path: ['stats'], message: 'Social proof requires a stat, testimonial, or logo' });
  }
  section.stats.forEach((stat, index) => {
    if (!stat.value) {
      context.addIssue({ code: 'custom', path: ['stats', index, 'value'], message: 'Social proof stat value is required' });
    }
    if (!stat.label) {
      context.addIssue({ code: 'custom', path: ['stats', index, 'label'], message: 'Social proof stat label is required' });
    }
  });
  section.testimonials.forEach((testimonial, index) => {
    if (!testimonial.quote) {
      context.addIssue({ code: 'custom', path: ['testimonials', index, 'quote'], message: 'Social proof testimonial quote is required' });
    }
    if (!testimonial.name) {
      context.addIssue({ code: 'custom', path: ['testimonials', index, 'name'], message: 'Social proof testimonial name is required' });
    }
  });
  section.logos.forEach((logo, index) => {
    if (!logo.name) {
      context.addIssue({ code: 'custom', path: ['logos', index, 'name'], message: 'Social proof logo name is required' });
    }
    if (!logo.image) {
      context.addIssue({ code: 'custom', path: ['logos', index, 'image'], message: 'Social proof logo image is required' });
    }
  });
});

const HomepageLeadMagnetSchema = z.object({
  ...homepageSectionBase,
  type: z.literal('lead_magnet'),
  eyebrow: z.string().trim(),
  title: z.string().trim(),
  body: z.string().trim(),
  image: HomepageResolvedImageSnapshotSchema.nullable(),
  cta: z.object({
    label: z.string().trim(),
    href: z.string().trim(),
  }).strict(),
}).strict().superRefine((section, context) => {
  if (section.cta.href && !isSafeCtaHref(section.cta.href)) {
    context.addIssue({ code: 'custom', path: ['cta', 'href'], message: 'Lead magnet CTA URL must be an internal path or HTTPS URL' });
  }
  if (!section.enabled) return;

  if (!section.eyebrow) {
    context.addIssue({ code: 'custom', path: ['eyebrow'], message: 'Lead magnet eyebrow is required' });
  }
  if (!section.title) {
    context.addIssue({ code: 'custom', path: ['title'], message: 'Lead magnet title is required' });
  }
  if (!section.body) {
    context.addIssue({ code: 'custom', path: ['body'], message: 'Lead magnet body is required' });
  }
  if (!section.image) {
    context.addIssue({ code: 'custom', path: ['image'], message: 'Lead magnet image is required' });
  }
  if (!section.cta.label) {
    context.addIssue({ code: 'custom', path: ['cta', 'label'], message: 'Lead magnet CTA label is required' });
  }
  if (!section.cta.href) {
    context.addIssue({ code: 'custom', path: ['cta', 'href'], message: 'Lead magnet CTA URL must be an internal path or HTTPS URL' });
  }
});

const HomepageSectionSchema = z.discriminatedUnion('type', [
  z.object({ ...homepageSectionBase, type: z.literal('stories') }).strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('hero'),
      mode: z.enum(['slider', 'grid']),
      show_search: z.boolean(),
      refs: z.array(HomepageRecipeRefSchema),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('quick_filters'),
      title: z.string().trim().min(1),
      filters: z.array(HomepageQuickFilterSchema),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('featured_recipes'),
      title: z.string(),
      subtitle: z.string(),
      source: z.enum(['manual', 'category', 'latest']),
      category_slug: z.string().nullable(),
      count: z.number().int().min(1).max(24),
      refs: z.array(HomepageRecipeRefSchema),
    })
    .strict(),
  HomepageSeasonalSpotlightSchema,
  HomepageSocialProofSchema,
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('category_browse'),
      title: z.string(),
      subtitle: z.string(),
      max: z.number().int().min(1).max(24),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('collections'),
      title: z.string(),
      subtitle: z.string(),
      refs: z.array(HomepageRoundupRefSchema),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('latest'),
      title: z.string(),
      count: z.number().int().min(1).max(24),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('about_author'),
      author_id: z.number().int().positive().nullable(),
    })
    .strict(),
  HomepageLeadMagnetSchema,
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('newsletter'),
      title: z.string(),
      subtitle: z.string(),
      button_text: z.string(),
      placeholder_text: z.string(),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('faq'),
      title: z.string(),
      items: z.array(
        z.object({ question: z.string().trim().min(1), answer: z.string().trim().min(1) }).strict(),
      ),
    })
    .strict(),
]);

/** PUT body for homepage settings: optional seo + optional ordered sections array. */
export const HomepageSettingsSchema = z
  .object({
    seo: HomepagePageSeoSchema.optional(),
    sections: z.array(HomepageSectionSchema).optional(),
  })
  .strict();

// ────────────────────────────────────────────
// Image-upload schemas
// ────────────────────────────────────────────

/** PUT body for image-upload: partial match of known defaults, types must match */
const ImageUploadCreditAvatarVariantSchema = z.object({
  r2_key: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_bytes: z.number().int().nonnegative().optional(),
});

const ImageUploadCreditSchema = z.object({
  type: z.literal('author'),
  id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  avatar: z.object({
    media_id: z.number().int().positive().optional(),
    alt: z.string().optional(),
    variants: z.object({
      xs: ImageUploadCreditAvatarVariantSchema,
      sm: ImageUploadCreditAvatarVariantSchema,
    }),
  }).nullable(),
});

export const ImageUploadSettingsSchema = z
  .object({
    max_file_size_mb: z.number().positive().optional(),
    variant_widths: z.object({
      xs: z.number().int().positive(),
      sm: z.number().int().positive(),
      md: z.number().int().positive(),
      lg: z.number().int().positive(),
    }).optional(),
    encoding: z.object({
      format: z.enum(['webp', 'avif']),
      webp_quality: z.number().int().min(1).max(100),
      avif_quality: z.number().int().min(1).max(100),
    }).optional(),
    default_aspect_ratio: z.string().optional(),
    default_credit: ImageUploadCreditSchema.nullable().optional(),
  })
  .strict();
