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
    // Legacy admin fields accepted by normalizers during migration.
    url: z.string().optional(),
    openInNewTab: z.boolean().optional(),
    featured: z.unknown().optional(),
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

/** Save-menus body (PUT endpoint): headerMenu / footerMenu arrays of raw items */
export const SaveMenusSchema = z
  .object({
    headerMenu: z.array(MenuItemSchema).optional(),
    footerMenu: z.array(MenuItemSchema).optional(),
    mobileMenu: z.array(MenuItemSchema).optional(),
    sidebarMenu: z.array(MenuItemSchema).optional(),
    menu_header: MenuDocumentSchema.optional(),
    menu_footer: MenuDocumentSchema.optional(),
    menu_mobile: MenuDocumentSchema.optional(),
    menu_sidebar: MenuDocumentSchema.optional(),
  })
  .passthrough()
  .refine((d) => Object.keys(d).some((key) => [
    'headerMenu',
    'footerMenu',
    'mobileMenu',
    'sidebarMenu',
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
