# Site Settings Table Contract

> **Last Updated:** 2026-05-14

This document is the product/data contract for the `site_settings` table. The executable SQL source remains `db/schema.sql`.

For naming rules, use `docs/NAMING_CONTRACT.md`.

## Scope

`site_settings` is a key-value registry for global CMS/site configuration. It is used for settings that apply across the site and do not justify a dedicated relational table.

Canonical setting domains include:

- image upload settings
- table-of-contents appearance settings
- menu configuration through the menus module
- category page settings
- homepage settings
- SEO defaults
- site identity and organization metadata
- public social links

Related contracts:

- `docs/MEDIA_TABLE_CONTRACT.md` for image upload behavior affected by settings
- `docs/IMAGE_JSON_CONTRACT.md` for global image reference rules
- `docs/ARTICLE_JSON_CONTRACTS.md` for article `seo_json` and `config_json`
- `docs/CATEGORIES_TABLE_CONTRACT.md` for category page settings ownership
- `docs/DATABASE_CONTENT_MODEL.md` for table ownership overview

## Source Of Truth

`site_settings.key` is the stable identity of a setting.

`site_settings.value` stores the setting payload as text. The application parses and validates it according to `type` and the known schema for that key.

The table is not a public config API by itself. The current SQL schema does not include an `is_public` column, so public exposure must be decided by the service/API that reads the setting.

## Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `key` | yes | App/Admin | Primary key. Stable lowercase `snake_case` identifier. |
| `value` | yes | App/Admin | Text payload. Usually JSON string for structured settings. |
| `description` | no | Admin/UI | Helper text for admin settings screens. |
| `category` | no | Admin/UI | Admin grouping, default `general`. |
| `sort_order` | no | Admin/UI | Display order inside a category. |
| `type` | no | Admin/UI/App | Editor/parsing hint. Default `json`. |
| `updated_at` | no | DB | Updated by SQL trigger. |

Supported `type` values in `db/schema.sql`:

- `json`
- `text`
- `number`
- `boolean`
- `image`
- `color`
- `code`

## Value Contract

`value` is always stored as TEXT.

Parsing rules:

- `type = json`: `value` must be valid JSON and parse to the schema expected by `key`.
- `type = text`: `value` is a plain string.
- `type = number`: `value` is a stringified number and must parse safely.
- `type = boolean`: `value` stores `true` or `false`.
- `type = image`: `value` stores a stable image reference such as `media_id`
  or a stored image snapshot. Do not store arbitrary hardcoded domain URLs.
- `type = color`: `value` stores a validated CSS color token or hex value.
- `type = code`: only for trusted admin-managed snippets; never execute unsanitized code in admin or public rendering.

Stored JSON naming rules:

- New `type = json` setting payloads follow `docs/NAMING_CONTRACT.md`.
- Existing non-canonical setting payloads are migration drift, not contract
  shapes.
- Save paths persist canonical `snake_case`.

## Key Naming

Rules:

- Use lowercase `snake_case`.
- Keys must be stable because services reference them directly.
- Prefer namespaced keys when a feature owns a group:
  - `image_upload_settings`
  - `toc_settings`
  - `menu_header`
  - `menu_footer`
  - `seo_defaults`
  - `site_identity`
  - `organization_profile`
  - `public_social_links`
  - `homepage_settings`
  - `category_page_settings`

Avoid:

- UI labels as keys.
- Mixed case keys.
- Keys containing tenant/domain names unless multi-tenant scoping is explicitly designed.

## Known Setting Shapes

### Image Upload Settings

Key: `image_upload_settings`.

Shape:

```json
{
  "max_file_size_mb": 50,
  "variant_widths": {
    "xs": 360,
    "sm": 720,
    "md": 1200,
    "lg": 2048
  },
  "encoding": {
    "format": "webp",
    "webp_quality": 80,
    "avif_quality": 70
  },
  "default_aspect_ratio": "free",
  "default_credit": {
    "type": "author",
    "id": 1,
    "name": "Chef Maria salvador",
    "slug": "chef-maria",
    "avatar": {
      "media_id": 70,
      "alt": "Chef Maria salvador",
      "variants": {
        "xs": {
          "r2_key": "media/images/chef-maria-xs-m8f3a91c.webp",
          "width": 50,
          "height": 50,
          "size_bytes": 906
        },
        "sm": {
          "r2_key": "media/images/chef-maria-sm-m8f3a91c.webp",
          "width": 100,
          "height": 100,
          "size_bytes": 2058
        }
      }
    }
  }
}
```

Rules:

- Store the full normalized settings object.
- Validation belongs to the settings API/service.
- Upload endpoints must read validated settings, not raw `site_settings.value`.
- `max_file_size_mb` controls the maximum accepted upload file size.
- `variant_widths` controls target widths for generated public variants.
- `variant_widths` must include `xs`, `sm`, `md`, and `lg`.
- `variant_widths` configures variant dimensions only; it must not disable
  required variants.
- `media.variants_json` must still store `xs`, `sm`, `md`, `lg`, `original`,
  and `placeholder` for every image media row.
- `original` is not generated by this setting. It is the uploaded/cropped source
  asset defined by `docs/IMAGE_JSON_CONTRACT.md`.
- `encoding.format` is the default generated public variant format.
- `encoding.webp_quality` and `encoding.avif_quality` control generated public
  variant encoding quality.
- Generated R2 keys must follow the canonical key format in
  `docs/NAMING_CONTRACT.md`.
- `default_aspect_ratio` is the initial UI crop/aspect setting; final media
  snapshots still store their own `aspect_ratio` when needed.
- Media caption rules remain defined by `docs/MEDIA_TABLE_CONTRACT.md`.
- Snapshot caption placement remains defined by `docs/IMAGE_JSON_CONTRACT.md`.
- `media.credit` remains required for new media writes and must be an author
  credit snapshot, not a free-form string.
- `default_credit` is the full stored author credit snapshot used when an
  upload flow does not receive an explicit credit snapshot.
- `default_credit.type` must be `author`.
- `default_credit.avatar` is either `null` or an avatar snapshot with `xs` and
  `sm` variants using stored `r2_key`.
- `default_credit` must not be a free-form string or only an author id.
- The admin UI can cache `default_credit` locally and send the complete snapshot
  during upload confirm without reading the author row for every upload.
- Refresh `default_credit` when the selected default author's public identity or
  avatar changes.
- Stored settings use `snake_case`. Current camelCase implementation names are
  migration drift under `docs/NAMING_CONTRACT.md`.

### TOC Settings

Key: `toc_settings`.

```json
{
  "enabled": true,
  "numbering": true,
  "collapsible": true,
  "default_open": true,
  "show_jump_button": true,
  "accent_color": "#f97316",
  "max_depth": 4
}
```

Rules:

- `toc_settings` controls global TOC presentation only.
- TOC item data comes from `articles.cached_toc_json`, not from
  `toc_settings`.
- `enabled = false` disables public TOC rendering globally.
- `articles.config_json.show_table_of_contents = false` disables TOC rendering
  for one article even when global `toc_settings.enabled = true`.
- `numbering` controls whether visible TOC entries display hierarchical
  numbers.
- `collapsible` controls whether the TOC panel can be opened/closed.
- `default_open` controls the initial open state when `collapsible = true`.
- `show_jump_button` controls whether a compact jump/back-to-TOC control can
  render.
- `accent_color` stores a validated CSS color token or hex value.
- `max_depth` controls the deepest visible heading level in the TOC.
- `max_depth` must be an integer from `2` through `6`.
- `max_depth` filters display only; it does not change how
  `cached_toc_json` is generated.
- `toc_settings` must not store TOC items, heading text, anchors, article ids,
  or content block data.
- `toc_settings` must not store per-article visual overrides.

### Category Page Settings

Key: `category_page_settings`.

Shape:

```json
{
  "posts_per_page": 12,
  "layout_mode": "grid",
  "card_style": "standard",
  "show_sidebar": true,
  "show_filters": true,
  "show_breadcrumb": true,
  "article_sort_by": "published_at",
  "article_sort_order": "desc",
  "header_style": "hero"
}
```

Rules:

- These settings apply to all category pages.
- `posts_per_page` is a positive integer.
- `layout_mode` is `grid` or `list`.
- `card_style` is `standard`, `compact`, or `feature`.
- `header_style` is `hero`, `simple`, or `none`.
- `article_sort_by` is one of:
  - `published_at`
  - `updated_at`
  - `headline`
  - `reading_time_minutes`
- `article_sort_order` is `asc` or `desc`.
- Per-category navigation order stays in `categories.sort_order`.
- Article ordering inside a category page uses `article_sort_by` and
  `article_sort_order`.
- Category page article lists must include only public active articles:
  `articles.workflow_status = 'published'` and `articles.deleted_at IS NULL`.
- Category page article lists must filter by `articles.category_id`.
- `show_filters` controls category-page filter UI only; it does not change the
  source of category/tag relationships.
- `show_breadcrumb` controls breadcrumb display only; it does not change public
  routes or canonical URLs.
- `show_sidebar` controls optional layout/sidebar rendering only; sidebar
  content source remains owned by the relevant feature.
- Do not store category-specific labels, copy, images, or SEO in this setting.
- Category source fields remain in `categories`.
- `collection_title` remains a `categories` field, not a site setting.
- `category_page_settings` must not store article ids, category ids, tag ids,
  image snapshots, SEO metadata, or per-category overrides.

### SEO Defaults

Key: `seo_defaults`.

Shape:

```json
{
  "title_separator": "|",
  "default_meta_description": "Reliable recipes and cooking guides.",
  "default_og_image": "https://example.com/images/default-og.webp",
  "twitter_card": "summary_large_image",
  "robots_index": true,
  "robots_follow": true
}
```

Rules:

- `seo_defaults` controls global fallback values for HTML metadata only.
- The public brand name comes from `site_identity.site_name`.
- `default_og_image` is required and must be a non-empty public image URL.
- Article, category, and author SEO fallbacks use `default_og_image` when the
  entity has no usable image snapshot.
- `default_meta_description` is used only when a page has no stronger
  entity-specific description fallback.
- `twitter_card` is `summary` or `summary_large_image`.
- `title_separator` is used by SEO title fallback logic.
- `robots_index` and `robots_follow` are global defaults. Page-level
  `seo_json.no_index` overrides indexing behavior for that page.
- `seo_defaults` must not store page-specific metadata, Schema.org JSON-LD,
  article ids, category ids, author ids, or image snapshots.
- `seo_defaults` must not store canonical URLs. Canonical URLs are derived from
  entity routes or explicit page-level `seo_json.canonical`.

### Homepage Settings

Key: `homepage_settings`.

Purpose: source of truth for configurable homepage sections and homepage SEO.

Shape:

```json
{
  "seo": {
    "meta_title": "SaaS Blog",
    "meta_description": "Reliable recipes and cooking guides.",
    "no_index": false,
    "canonical": "https://example.com",
    "og_image": "https://example.com/images/home-og.webp",
    "og_title": "SaaS Blog",
    "og_description": "Reliable recipes and cooking guides.",
    "twitter_card": "summary_large_image"
  },
  "sections": [
    { "id": "stories", "type": "stories", "enabled": true },
    { "id": "hero", "type": "hero", "enabled": true, "mode": "slider", "show_search": true, "refs": [] },
    { "id": "quick_filters", "type": "quick_filters", "enabled": false, "title": "Explore recipes", "filters": [] },
    { "id": "featured", "type": "featured_recipes", "enabled": true, "title": "Featured Recipes", "subtitle": "Handpicked for you", "source": "latest", "category_slug": null, "count": 4, "refs": [] },
    { "id": "categories", "type": "category_browse", "enabled": true, "title": "Browse by Category", "subtitle": "", "max": 8 },
    { "id": "collections", "type": "collections", "enabled": true, "title": "Recipe Collections", "subtitle": "", "refs": [] },
    { "id": "seasonal_spotlight", "type": "seasonal_spotlight", "enabled": false, "title": "Seasonal spotlight", "body": "", "image": null, "cta": { "label": "", "href": "" } },
    { "id": "latest", "type": "latest", "enabled": true, "title": "Latest Recipes", "count": 8 },
    { "id": "social_proof", "type": "social_proof", "enabled": false, "eyebrow": "", "title": "", "stats": [], "testimonials": [], "logos": [] },
    { "id": "about", "type": "about_author", "enabled": true, "author_id": null },
    { "id": "lead_magnet", "type": "lead_magnet", "enabled": false, "eyebrow": "", "title": "", "body": "", "image": null, "cta": { "label": "", "href": "" } },
    { "id": "newsletter", "type": "newsletter", "enabled": true, "title": "Get New Recipes Weekly", "subtitle": "Subscribe to receive delicious recipes straight to your inbox.", "button_text": "Subscribe", "placeholder_text": "Your email address" },
    { "id": "faq", "type": "faq", "enabled": false, "title": "Frequently Asked Questions", "items": [] }
  ]
}
```

Rules:

- `homepage_settings` owns homepage configuration.
- `homepage_settings.seo` owns homepage HTML metadata.
- Homepage SEO must not be stored in `seo_defaults`.
- `seo_defaults` remains fallback data only.
- `homepage_settings.seo` uses the same page SEO shape as category
  `seo_json`.
- `homepage_settings.seo.meta_title`, `meta_description`, `canonical`,
  `og_image`, `og_title`, and `og_description` must be explicit non-empty
  strings before publish.
- `homepage_settings.seo.og_image` must be a non-empty public image URL before
  publish.
- `homepage_settings.seo.og_image` is selected directly in admin and stored as
  the final public image URL string.
- Homepage `og_image` is not derived from homepage hero images, category images,
  article images, or `seo_defaults.default_og_image`.
- The admin UI can resolve a selected media image into the final public URL
  before saving `homepage_settings.seo.og_image`.
- `homepage_settings.seo.og_image` must not store an image snapshot, `media_id`,
  `r2_key`, or `original`.
- `homepage_settings.seo.canonical` must be the canonical public site origin or
  an explicit homepage canonical URL.
- `homepage_settings.seo.twitter_card` is `summary` or `summary_large_image`.
- `homepage_settings.seo.no_index = true` emits noindex metadata for the
  homepage.
- `homepage_settings` must not store Schema.org JSON-LD. Homepage JSON-LD is
  generated from `site_identity`, `organization_profile`, public social links,
  and homepage source settings.
- Public homepage rendering must read `homepage_settings` through a cached
  settings loader, not repeated raw D1 reads.
- Admin save of `homepage_settings` must invalidate the cached homepage settings
  payload.
- Admin edit/preview paths can force a fresh read when needed.

Section rules:

- `homepage_settings.sections` is an ordered array; array order is the public render
  order. Reordering is expressed by reordering the array.
- Each section has `id` (stable string), `type` (from the catalog below), and `enabled`.
- Disabled sections (`enabled = false`) are persisted but not rendered.
- Active section `type` values: `stories`, `hero`, `quick_filters`, `featured_recipes`,
  `category_browse`, `collections`, `seasonal_spotlight`, `latest`, `social_proof`,
  `about_author`, `lead_magnet`, `newsletter`, and `faq`. `popular`, `social_feed`, and
  `banner` remain reserved; unknown types are rejected by validation.
- Manually-curated sections store light references, not image snapshots:
  - recipe ref: `{ article_id, headline, route, category? { label, slug, color? } }`
  - roundup ref: `{ roundup_id, title, route }`
  - author ref: `author_id` (or `null` to use the `is_featured` author)
- Images and heavy fields are resolved at render time from the live rows; settings must
  not store recipe/roundup image snapshots or `r2_key` for these refs.
- `hero.mode` is `slider` or `grid`; `hero.show_search` toggles the hero search box.
- `quick_filters` is disabled by default after `hero`; `seasonal_spotlight` is disabled by
  default after `collections`.
- `social_proof` is disabled by default immediately after `latest` and stores:
  `{ eyebrow, title, stats[], testimonials[], logos[] }`, where `stats[]` items are
  `{ value, label }`, `testimonials[]` items are `{ quote, name, role? }`, and `logos[]`
  items are `{ name, image }`. The eyebrow is optional. Enabled social proof requires a
  non-empty title and at least one valid stat, testimonial, or logo; every retained item
  must satisfy its required fields. It permits at most four stats, six testimonials, and
  six logos.
- `lead_magnet` is disabled by default immediately after `about_author` and stores:
  `{ eyebrow, title, body, image, cta: { label, href } }`. Enabled lead magnets require
  every copy field, a structural image snapshot, and a CTA label plus a safe CTA URL.
- Homepage structural image snapshots for `seasonal_spotlight.image`,
  `social_proof.logos[].image`, and `lead_magnet.image` store `media_id`, `alt`,
  `placeholder`, optional `focal_point` and `aspect_ratio`, and exactly `sm`, `md`, and
  `lg` variants with storage `r2_key`, width, height, and optional `size_bytes`. They omit
  `caption`, `credit`, and `original`.
- Admin/API payloads resolve those same structural snapshots to local `/api/images/` URLs
  and never expose `r2_key`. Admin saves accept only local image routes and reconstruct the
  stored snapshot keys at the server boundary.
- Media propagation synchronizes matching homepage structural snapshots in
  `seasonal_spotlight.image`, `social_proof.logos[].image`, and `lead_magnet.image`.
- CTA URLs accept internal paths beginning with `/` except `//` and `/\\`, or absolute `https:` URLs.
- `featured_recipes.source` is `manual`, `category`, or `latest`. With `manual`, `refs`
  drives the list; with `category`, `category_slug` selects the source; with `latest`,
  the newest published recipes are used.
- `faq.items[]` use `{ question, answer }` and are the source for homepage `FAQPage`
  JSON-LD.
- `faq` is the only fixed-position homepage section and MUST be final. Read and update
  normalization MUST move an existing FAQ to the final position, or append the default FAQ
  when it is missing, without changing the relative order of other existing sections.
- When `homepage_settings` is missing `sections` (legacy seo-only value), the service
  falls back to the default section set.
- `homepage_settings.sections` must not store Schema.org JSON-LD; JSON-LD is generated at
  render from these sections plus `organization_profile` / `site_identity`.

### Site Identity

Key: `site_identity`.

Shape:

```json
{
  "site_name": "SaaS Blog",
  "site_url": "https://example.com",
  "tagline": "Reliable recipes and cooking guides.",
  "locale": "en-US"
}
```

Rules:

- `site_url` is the canonical public origin without a trailing slash.
- `site_name` is the public brand name.
- `tagline` is the short public brand support line used only where a generic
  site tagline is needed.
- `locale` uses a valid BCP 47 locale tag.
- Public `<html lang>` derives from `locale` when site rendering is
  settings-driven.
- Canonical URL builders use `site_url` as the origin.
- RSS/feed metadata, sitemap URLs, and JSON-LD site URLs use `site_url`.
- SEO title fallback logic uses `site_identity.site_name` plus
  `seo_defaults.title_separator`.
- Do not store organization legal/contact details here; use
  `organization_profile`.
- Do not store page-specific SEO here; use the page SEO source such as
  `homepage_settings.seo`, article `seo_json`, category `seo_json`, or author
  `seo_json`.
- Do not store social profile links here; use `public_social_links` and
  `organization_profile.same_as`.

### Organization Profile

Key: `organization_profile`.

Shape:

```json
{
  "name": "SaaS Blog",
  "url": "https://example.com",
  "logo_url": "https://example.com/images/logo.png",
  "same_as": ["https://www.instagram.com/example"],
  "contact_email": "contact@example.com"
}
```

Rules:

- This setting feeds site-level Organization JSON-LD and public footer/header
  organization metadata.
- `name` is the public organization/publisher name.
- `url` is the public organization URL and normally matches
  `site_identity.site_url`.
- `logo_url` is a public image URL.
- `same_as[]` contains public canonical social/profile URLs.
- `contact_email` is public contact email only. Private/internal email belongs
  outside public settings.
- `organization_profile` is used as article/recipe publisher data in generated
  JSON-LD.
- `organization_profile` must not store generated Schema.org JSON-LD. JSON-LD
  is generated from this source setting.
- `organization_profile` must not store private company data, tax data, billing
  data, admin emails, API credentials, or provider secrets.
- Social display links for UI belong to `public_social_links`; `same_as[]` is
  for canonical profile URLs used by metadata and JSON-LD.

### Public Social Links

Key: `public_social_links`.

Shape:

```json
[
  {
    "network": "instagram",
    "url": "https://instagram.com/example",
    "label": "@example"
  }
]
```

Rules:

- Each item uses `{ network, url, label }`.
- `network` follows the same naming rule as author `bio_json.socials[]`.
- Allowed networks are: `twitter`, `instagram`, `facebook`, `youtube`,
  `pinterest`, `tiktok`, `linkedin`, `website`, `email`, and `custom`.
- `url` is required and must be a valid public URL, except `network = "email"`
  where a public `mailto:` URL is allowed.
- `label` is the visible UI label, such as `@example`, `YouTube`, or `Email`.
- Do not use the older `platform` key.
- Use an empty array when no public social links render.
- `public_social_links` owns public UI/footer/header social links.
- `organization_profile.same_as[]` owns canonical profile URLs for metadata and
  JSON-LD.
- A link can exist in both places when it is both shown in UI and used as a
  canonical organization profile URL.
- Do not store private social/admin handles, API tokens, pixel ids, or tracking
  configuration in `public_social_links`.

### Menu Settings

Canonical menu keys:

- `menu_header`
- `menu_footer`
- `menu_mobile`
- `menu_sidebar`

Each menu key stores one menu document.

Stored value shape:

```json
{
  "location": "header",
  "is_enabled": true,
  "fallback_to": null,
  "items": [
    {
      "id": "menu-recipes",
      "type": "mega",
      "label": "Recipes",
      "is_enabled": true,
      "visibility": "desktop",
      "highlight": false,
      "overview_target": {
        "type": "internal_route",
        "href": "/recipes"
      },
      "layout": "columns_with_featured_carousel",
      "columns": [
        {
          "id": "column-course",
          "title": "By Course",
          "items": [
            {
              "id": "menu-breakfast",
              "type": "link",
              "label": "Breakfast",
              "is_enabled": true,
              "visibility": "all",
              "highlight": false,
              "open_in_new_tab": false,
              "target": {
                "type": "category",
                "id": 3,
                "slug": "breakfast",
                "href": "/categories/breakfast",
                "snapshot": {
                  "label": "Breakfast",
                  "color": "#f97316"
                }
              },
              "image": {
                "media_id": 105,
                "alt": "Breakfast recipes",
                "placeholder": "data:image/jpeg;base64,...",
                "variants": {
                  "xs": {
                    "r2_key": "media/images/breakfast-xs-a91c3f2b.webp",
                    "width": 360,
                    "height": 240
                  },
                  "sm": {
                    "r2_key": "media/images/breakfast-sm-a91c3f2b.webp",
                    "width": 720,
                    "height": 480
                  }
                }
              }
            }
          ]
        }
      ],
      "featured_items": [
        {
          "id": "featured-cookbook-summer",
          "type": "featured_item",
          "label": "Summer Cookbook",
          "description": "Fresh seasonal recipes for warm days.",
          "target": {
            "type": "cookbook",
            "href": "/cookbooks/summer-recipes",
            "snapshot": {
              "title": "Summer Cookbook",
              "subtitle": "Fresh seasonal recipes"
            }
          },
          "image": {
            "media_id": 120,
            "alt": "Summer cookbook cover",
            "placeholder": "data:image/jpeg;base64,...",
            "variants": {
              "xs": {
                "r2_key": "media/images/summer-cookbook-xs-c3f2b19a.webp",
                "width": 360,
                "height": 240
              },
              "sm": {
                "r2_key": "media/images/summer-cookbook-sm-c3f2b19a.webp",
                "width": 720,
                "height": 480
              }
            }
          }
        },
        {
          "id": "featured-blender",
          "type": "featured_item",
          "label": "Favorite Blender",
          "description": "Our recommended blender for smoothies.",
          "target": {
            "type": "affiliate",
            "href": "https://example.com/product",
            "snapshot": {
              "title": "Favorite Blender",
              "description": "Our recommended blender for smoothies."
            }
          },
          "disclosure_label": "Affiliate"
        }
      ]
    }
  ]
}
```

Rules:

- Menus are configuration, not article content.
- `menu_header`, `menu_footer`, `menu_mobile`, and `menu_sidebar` each store
  one menu document.
- `location` must match the setting key suffix.
- `is_enabled = false` disables that menu location.
- `fallback_to` is `null` except `menu_mobile`, which can use
  `"fallback_to": "header"`.
- `items[]` is ordered.
- Empty menus store a menu document with an empty `items` array.
- Missing menu settings fall back to service defaults only until the admin saves
  the first canonical document.
- Valid item types are `link`, `group`, `mega`, and `separator`.
- `link` is a clickable menu item.
- `group` is a non-clickable grouping container with ordered child items.
- `mega` is a header-only disclosure dropdown with columns and optional
  featured items.
- `separator` is visual only and must not store a target.
- Valid `visibility` values are `all`, `desktop`, and `mobile`.
- `open_in_new_tab` is allowed only on clickable items with a target.
- External links opened in a new tab must render with `rel="noopener noreferrer"`.
- Valid target types are `internal_route`, `category`, `tag`, `article`,
  `author`, `external_url`, `affiliate`, and `cookbook`.
- `internal_route.href` must be a site-relative path beginning with `/`.
- `external_url.href` and `affiliate.href` must be valid public URLs.
- `affiliate` targets must include `disclosure_label`.
- `affiliate` and `cookbook` are supported structural target types in v1; they
  do not require dedicated database tables.
- `article`, `category`, `tag`, and `author` targets store a lightweight
  `target.snapshot` resolved by the admin save flow.
- Target snapshots prevent public rendering from doing extra D1 reads for menu
  labels and presentation metadata.
- Menu snapshots are not source-of-truth content. They are regenerated when the
  admin changes the referenced item or saves the menu.
- `mega.layout` is one of `columns`, `columns_with_featured_carousel`, or
  `featured_left`.
- `mega.columns[].items[]` reuse the same link item contract.
- `mega.featured_items[]` is ordered.
- If `featured_items` contains one item, the renderer displays one featured
  card.
- If `featured_items` contains more than one item, the renderer can display a
  carousel or compact feature list according to the layout.
- `mega.featured_items[]` can target internal articles, categories, tags,
  authors, internal routes, external URLs, affiliate links, or cookbook links.
- Header mega item images and featured item images are lightweight structural
  menu image snapshots.
- Menu image snapshots store `media_id`, `alt`, `placeholder`, and variants
  `xs` and `sm`.
- Menu image snapshots must use stored `r2_key` and must not store public `url`.
- Menu image snapshots must not contain `caption`, `credit`, or `original`.
- Footer and sidebar menus must not store menu images in v1.
- `menu_mobile` can be explicitly configured, but when it is missing, disabled,
  or empty with `fallback_to = "header"`, the renderer derives mobile navigation
  from `menu_header`.
- Mobile derivation converts header mega menus into accordion/list navigation.
- Public menu rendering must follow the disclosure navigation pattern: semantic
  navigation links plus buttons with `aria-expanded` for expandable panels.
- Public site navigation must not use ARIA application menu roles such as
  `menu` or `menubar`.
- Public renderers read menu documents from the settings cache, not repeated raw
  D1 reads.
- Admin save of any `menu_*` setting must invalidate that menu cache key.
- Admin save of `menu_header` must also invalidate derived mobile menu cache when
  `menu_mobile` falls back to `header`.

## Runtime Usage

Admin:

- Settings screens group rows by `category` and order by `sort_order`.
- Feature-specific settings APIs must validate the payload for their own key.
- Admin settings writes must invalidate the KV cache entry for the written key.

Public Astro/API:

- Public pages must read only explicit, safe settings needed for rendering.
- Do not expose all settings wholesale.
- Do not expose secrets or provider API keys from this table.
- Public settings loaders should read from KV first, then D1 on cache miss.
- Cached settings values must be stored under namespaced keys such as
  `site_settings:v1:{key}`.
- KV cache entries store the raw `site_settings.value` text, not transformed
  public payloads.
- Service-level parsing and validation still happen after a KV cache read.
- Cache TTL is allowed, but correctness depends on invalidation after admin
  writes.
- Admin preview/edit flows can bypass KV when they need fresh draft behavior.

## Security Rules

- Prefer Cloudflare secrets for real secrets such as API keys.
- If a sensitive value is temporarily stored in `site_settings`, never expose it through public APIs.
- `code` settings require strict trust boundaries and sanitization.
- `image` settings must avoid hardcoded absolute URLs when a `media_id` or R2
  key can be resolved dynamically.

## Validation Rules

- `key`: required, unique, lowercase `snake_case`.
- `value`: required text.
- `category`: default `general`.
- `sort_order`: integer, lower appears first.
- `type`: one of the SQL-supported values.
- JSON payloads must be validated by the feature service before save.

## Lifecycle Rules

- No `created_at` column exists in the current SQL schema.
- No `deleted_at` soft delete exists for this table.
- Removing a setting is a hard delete, except feature services either reset to defaults or store an empty value.
- `updated_at` is maintained by SQL trigger.
- There is no `is_public` flag. If public/private settings become necessary, add it deliberately to SQL, Drizzle, docs, and APIs together.
