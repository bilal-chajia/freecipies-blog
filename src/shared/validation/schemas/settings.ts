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

/** Recursive menu-item schema (id, label, url, target, optional children) */
export const MenuItemSchema: z.ZodType<{
  id: string;
  label: string;
  url: string;
  target?: '_self' | '_blank';
  children?: Array<{
    id: string;
    label: string;
    url: string;
    target?: '_self' | '_blank';
    children?: any[];
  }>;
}> = z.lazy(() =>
  z.object({
    id: z.string().min(1, 'Menu item id is required'),
    label: z.string().min(1, 'Menu item label is required').max(100),
    url: z.string().min(1, 'Menu item url is required').max(500),
    target: z.enum(['_self', '_blank']).optional(),
    children: z.array(MenuItemSchema).optional(),
  }),
);

/** Single menu: id, label, location, items */
export const MenuSchema = z.object({
  id: z.string().min(1, 'Menu id is required'),
  label: z.string().min(1, 'Menu label is required').max(100),
  location: z.enum(['header', 'footer', 'sidebar']).optional(),
  items: z.array(MenuItemSchema),
});

/** Save-menus body (PUT endpoint): headerMenu / footerMenu arrays of raw items */
export const SaveMenusSchema = z
  .object({
    headerMenu: z.array(MenuItemSchema).optional(),
    footerMenu: z.array(MenuItemSchema).optional(),
  })
  .passthrough()
  .refine((d) => d.headerMenu !== undefined || d.footerMenu !== undefined, {
    message: 'Provide at least headerMenu or footerMenu',
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
  max_depth: z.number().int().min(1).max(6).optional(),
  defaultOpen: z.boolean().optional(),
  showJumpButton: z.boolean().optional(),
  accentColor: z.string().optional(),
  maxDepth: z.number().int().min(1).max(6).optional(),
});

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
export const ImageUploadSettingsSchema = z
  .object({
    webpQuality: z.number().int().min(1).max(100).optional(),
    avifQuality: z.number().int().min(1).max(100).optional(),
    maxFileSizeMB: z.number().positive().optional(),
    variantLg: z.number().int().positive().optional(),
    variantMd: z.number().int().positive().optional(),
    variantSm: z.number().int().positive().optional(),
    variantXs: z.number().int().positive().optional(),
    defaultFormat: z.string().optional(),
    defaultAspectRatio: z.string().optional(),
    defaultCreditAuthorId: z.coerce.number().int().positive().optional().or(z.literal('')),
  })
  .passthrough();
