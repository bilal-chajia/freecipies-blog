
-- Contract: docs/SITE_SETTINGS_TABLE_CONTRACT.md
CREATE TABLE IF NOT EXISTS site_settings (
    -- The unique identifier for the setting group.
    -- Examples: 'site_info', 'social_links', 'theme_config', 'scripts'
    -- CONSTRAINT: Use snake_case, lowercase (e.g., 'footer_config', NOT 'FooterConfig').
    key TEXT PRIMARY KEY,

    -- The configuration payload.
    -- IMPORTANT: This column stores JSON strings, not simple text.
    -- This allows nesting complex data without creating multiple columns.
    -- VALIDATION: App layer should validate against expected schema per key.
    value TEXT NOT NULL,

    -- Helper text for the Admin Panel UI.
    -- Displayed to the user to explain what this setting controls.
    -- Example: "Manage links to your social media profiles for the footer."
    description TEXT,

    -- Grouping for the Admin Settings page.
    -- Allows organizing settings into collapsible sections in the UI.
    -- Common values: 'general', 'seo', 'social', 'theme', 'scripts', 'integrations'
    category TEXT DEFAULT 'general',

    -- Display order within a category.
    -- Lower numbers appear first. Use increments of 10 for easy reordering.
    -- Example: site_info=10, contact_info=20, social_links=30
    sort_order INTEGER DEFAULT 0,

    -- Type hint for the Admin UI editor.
    -- Tells the frontend what kind of input to render.
    -- OPTIONS:
    --   'json'    = Full JSON editor (default, for complex objects)
    --   'text'    = Simple text input
    --   'number'  = Numeric input
    --   'boolean' = Toggle switch
    --   'image'   = Image picker (value stores media_id or URL)
    --   'color'   = Color picker (value stores hex code)
    --   'code'    = Code editor with syntax highlighting (for scripts)
    type TEXT DEFAULT 'json' CHECK (type IN ('json', 'text', 'number', 'boolean', 'image', 'color', 'code')),

    -- Timestamp for auditing changes.
    -- Shows when this setting was last modified in the Admin Panel.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_settings_category
    ON site_settings(category, sort_order);

CREATE TRIGGER IF NOT EXISTS update_site_settings_timestamp
AFTER UPDATE ON site_settings
BEGIN
    UPDATE site_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;


--
-- DELETION SAFETY:
--   When deleting a media row, the backend MUST:
--   1. Read variants_json to extract r2_key for ALL variants (original, xs, sm, md, lg).
--   2. Send DeleteObject commands to R2 for each variant.
--   3. Only then delete (or soft-delete) the SQL row.
--   This prevents "orphaned files" (ghost files) on R2 storage.
--

-- Contract: docs/MEDIA_TABLE_CONTRACT.md, docs/IMAGE_JSON_CONTRACT.md
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. SEARCHABLE METADATA (Standard SQL Columns)
    -- Extracted from JSON to allow fast SQL filtering (WHERE name LIKE '%...%').

    -- Internal name for the editor (e.g., "Apple Pie Shoot 01").
    -- Used in the Media Library search and file browser.
    name TEXT NOT NULL,

    -- SEO / Accessibility Text.
    -- Kept as a separate column to allow efficient full-text search.
    -- REQUIRED: Every image must have alt text for accessibility (WCAG).
    alt_text TEXT NOT NULL,

    -- Visible Caption.
    -- Can be displayed below the image in articles.
    -- Example: "Fresh apple pie cooling on a rustic wooden table"
    caption TEXT NOT NULL,

    -- Legal / copyright attribution.
    credit TEXT NOT NULL,

    -- Filter helper (e.g., 'image/webp', 'image/gif', 'video/mp4').
    -- REQUIRED: Used to filter Media Library by type.
    mime_type TEXT NOT NULL DEFAULT 'image/webp',

    -- Optional human-readable ratio hint ("16:9", "4:5", "1:1").
    -- Used for layout hints and space reservation before image loads.
    -- Calculated from the largest variant (lg) dimensions at upload time.
    aspect_ratio TEXT,

    -- 2. TECHNICAL PAYLOAD (The "Plumbing")
    -- Stores the references to the physical files on R2.
    -- Read-only for the frontend; managed by the upload pipeline.
    --
    -- BREAKPOINT STRATEGY (Width targets, height auto-calculated from aspect ratio):
    --

    variants_json TEXT NOT NULL,

    -- 3. SMART DISPLAY (Design Control)
    -- Focal Point for CSS `object-position`.
    -- Prevents the subject from being cropped out on mobile screens.
    -- SCHEMA: {"x": 50, "y": 50} (Percentages 0-100).
    -- DEFAULT: Center (50, 50). Updated via click-to-set in Admin UI.
    focal_point_json TEXT DEFAULT '{"x": 50, "y": 50}',

    -- 4. SYSTEM METADATA
    -- When this media record was first created.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- When metadata (name, alt_text, caption, etc.) was last updated.
    -- Does NOT change when variants are regenerated.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete marker.
    -- If NOT NULL, the media is considered deleted but files remain on R2
    -- until a cleanup job runs. This allows for "undo" functionality.
    -- LOGIC: Frontend queries should filter WHERE deleted_at IS NULL.
    deleted_at DATETIME DEFAULT NULL
);

-- Optimized for the Admin Media Library search bar.


-- Optimized for "Most Recent" sorting in Media Library.
CREATE INDEX IF NOT EXISTS idx_media_date ON media(created_at DESC);

-- Filter out soft-deleted items efficiently.
CREATE INDEX IF NOT EXISTS idx_media_active ON media(deleted_at);

CREATE TRIGGER IF NOT EXISTS update_media_timestamp
AFTER UPDATE ON media
BEGIN
    UPDATE media SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;





-- 2. TAXONOMIES (Structure du site)

--           - SQL: High-frequency filtering (slug, parent, is_online).
--           - JSON: Rich content payloads (images with variants, config).
--
-- Contract: docs/CATEGORIES_TABLE_CONTRACT.md
CREATE TABLE IF NOT EXISTS categories (
    -- Surrogate primary key.
    -- Used for relations (articles.category_id) and internal references.
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. NAVIGATION & HIERARCHY

    -- URL identifier for routing.
    -- IMMUTABLE: Should never change after creation (breaks SEO/bookmarks).
    -- FORMAT: Lowercase, kebab-case only.
    -- REGEX: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    -- EXAMPLES: "breakfast", "quick-meals", "gluten-free-desserts"
    -- BAD: "Breakfast", "quick_meals", "gluten free"
    slug TEXT UNIQUE NOT NULL,

    -- Display label for navigation menus, breadcrumbs, and sidebar.
    -- CONSTRAINT: Keep under 30 characters for UI fitness.
    -- EXAMPLES: "Breakfast", "Quick Meals", "Desserts"
    label TEXT NOT NULL,

    -- Self-reference for hierarchical categories (Adjacency List Pattern).
    -- Example tree: Recipes > Vegan > Dessert
    -- NULL = Top-level category (no parent).
    -- ON DELETE SET NULL: If parent is deleted, children become top-level.
    -- DEPTH LIMIT: Recommend max 3 levels for UX (Menu > Submenu > Leaf).
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,

    -- Pre-computed hierarchy depth for fast filtering.
    -- 0 = Root/top-level category (no parent).
    -- 1 = Direct child of a root category.
    -- 2 = Grandchild (2 levels deep), etc.
    -- UPDATED BY: App logic or trigger when parent_id changes.
    -- USAGE: Fast queries like "WHERE depth <= 1" for main nav menus.
    -- PERFORMANCE: Avoids expensive recursive CTE queries.
    depth INTEGER DEFAULT 0,

    -- Display order for menus and navigation.
    -- LOGIC: Lower numbers appear first.
    -- TIP: Use increments of 10 (10, 20, 30) for easy reordering.
    sort_order INTEGER DEFAULT 0,

    -- 2. DISPLAY TEXT (Landing Page Content)

    -- H1 page title for the category landing page.
    -- FALLBACK: If NULL, use 'label' value.
    -- SEO TIP: Can be longer/more descriptive than 'label'.
    -- EXAMPLE: "Easy Breakfast Recipes for Busy Mornings"
    headline TEXT,

    -- Header text above the post grid/list.
    -- Provides context for the article collection.
    -- FALLBACK: If NULL, use 'headline' or 'label'.
    -- EXAMPLES: "Latest Breakfast Recipes", "Most Popular Vegan Dishes"
    collection_title TEXT,

    -- Intro paragraph displayed below the headline.
    -- REQUIRED: Used for SEO (meta description fallback) and user context.
    -- RECOMMENDED: 160-225 characters for optimal SEO.
    -- EXAMPLE: "Start your day right with our collection of quick and healthy breakfast recipes. ...."
    short_description TEXT NOT NULL,

    -- 3. VISUALS (Display-Ready Image Data)
    -- Category image slots.
    images_json TEXT DEFAULT '{}' CHECK (json_valid(images_json)),

    -- 4. VISUAL STYLE

    -- UI theme color for category badges, borders, and accents.
    -- FORMAT: 8-character HEX with alpha (e.g., #ff6600ff).
    -- USAGE: CSS variables, category pills, hover states.
    -- DEFAULT: Orange (#ff6600ff).
    color TEXT DEFAULT '#ff6600ff',

    -- 5. SEO

    -- SEO overrides for the category landing page.
    seo_json TEXT DEFAULT '{}' CHECK (json_valid(seo_json)),

    -- 6. PROMOTION & VISIBILITY

    -- Featured flag for homepage and sidebar widgets.
    -- 1 = Display in "Featured Categories" section.
    -- 0 = Standard category (default).
    -- LIMIT: Recommend max 4-6 featured categories for UX.
    is_featured BOOLEAN DEFAULT 0,

    -- Visibility toggle.
    -- 0 = Draft (hidden from public, visible in Admin).
    -- 1 = Published (visible to all users).
    is_online BOOLEAN DEFAULT 0,

    -- 7. DERIVED METRICS

    -- Denormalized count of published articles in this category.
    -- UPDATED BY: Background job or trigger when articles change.
    -- USAGE: Display "42 recipes" badge on category cards.
    cached_post_count INTEGER DEFAULT 0 CHECK (cached_post_count >= 0),

    -- 8. LIFECYCLE

    -- Record creation timestamp (UTC).
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Last modification timestamp (UTC).
    -- Auto-updated by trigger on any column change.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete marker.
    -- NULL = Active record.
    -- NOT NULL = Logically deleted (hidden from queries, kept for recovery).
    -- Active queries should include WHERE deleted_at IS NULL.
    deleted_at DATETIME DEFAULT NULL
);

-- TRIGGERS & INDEXES

CREATE TRIGGER IF NOT EXISTS update_categories_timestamp
AFTER UPDATE ON categories
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);                 -- Routing
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);          -- Hierarchy
CREATE INDEX IF NOT EXISTS idx_categories_display ON categories(is_online, sort_order); -- Menus
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(is_featured);      -- Home Page Widgets
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(deleted_at);         -- Soft delete filter




--           - SQL: Identity, role-based filtering, and high-level display info.
--           - JSON: Rich assets (images, bio) mapped from the Media Library.
--
-- Contract: docs/AUTHORS_TABLE_CONTRACT.md
CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. IDENTITY & ROUTING

    -- URL identifier for routing.
    -- IMMUTABLE: Should never change after creation (breaks SEO/bookmarks).
    -- FORMAT: Lowercase, kebab-case only.
    -- REGEX: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    -- EXAMPLES: "jane-doe", "chef-john", "guest-contributor-2024"
    slug TEXT UNIQUE NOT NULL,

    -- Public display name shown on article bylines and profile page.
    -- EXAMPLES: "Jane Doe", "Chef John", "The SaaS Blog Team"
    name TEXT NOT NULL,

    -- Internal contact email (unique per author).
    -- USAGE: Admin authentication and internal notifications.
    -- SECURITY: Never exposed publicly by default. Public contact email must be
    -- intentional via bio_json.socials.
    email TEXT UNIQUE NOT NULL,

    -- 2. INTERNAL ROLE

    -- Internal role for permissions and workflow.
    -- OPTIONS: 'guest', 'staff', 'editor', 'admin'
    -- DEFAULT: 'guest' (safety precaution for new authors)
    -- USAGE: Admin permissions only. Public title comes from job_title.
    role TEXT DEFAULT 'guest' CHECK (role IN ('guest', 'staff', 'editor', 'admin')),

    -- 3. PUBLIC PROFILE TEXT

    -- Public professional title shown on bylines, article cards, and profile page.
    -- EXAMPLES: "Senior Editor", "Guest Contributor", "Founder & Chef"
    job_title TEXT,

    -- Main H1 for the author profile page.
    -- FALLBACK: If NULL, use 'name' value.
    -- EXAMPLE: "Meet Jane Doe, Our Senior Food Editor"
    headline TEXT,

    -- Optional H2-style subheading/tagline.
    -- EXAMPLE: "Passionate about healthy Mediterranean cuisine"
    subtitle TEXT,

    -- Primary short public bio for cards, listing pages, SEO fallback, and
    -- articles.cached_author_json.bio.
    -- RECOMMENDED: 100-160 characters.
    short_description TEXT NOT NULL,

    -- Visible hero/body introduction for the author profile page.
    -- Not copied into article caches. Can include markdown if renderer supports it.
    introduction TEXT,

    -- 4. VISUALS (Display-Ready Image Data)
    -- Author image slots.
    images_json TEXT DEFAULT '{}' CHECK (json_valid(images_json)),

    -- 5. BIOGRAPHY & SOCIALS
    -- Public BlockEditor biography content, expertise labels, and intentional
    -- public socials/contact links.
    bio_json TEXT DEFAULT '{}' CHECK (json_valid(bio_json)),

    -- 6. AI PERSONA
    -- Private AI/editorial persona instructions. Not rendered publicly by default.
    persona_json TEXT DEFAULT '{}' CHECK (json_valid(persona_json)),

    -- 7. SEO
    -- Publish-required for public author profiles.
    seo_json TEXT DEFAULT '{}' CHECK (json_valid(seo_json)),

    -- 8. PROMOTION & VISIBILITY

    -- Featured flag for homepage "Featured Authors" section.
    -- 1 = Display in featured author widgets.
    -- 0 = Standard author (default).
    is_featured BOOLEAN DEFAULT 0,

    -- Visibility toggle for public author profile/listing surfaces.
    -- 0 = Hidden/Draft (not shown on author public pages).
    -- 1 = Published author profile/listing.
    -- NOTE: Existing article bylines can still render from article caches.
    is_online BOOLEAN DEFAULT 0,

    -- 9. LIST ORDER

    -- Display order for team page.
    -- LOGIC: Lower numbers appear first.
    -- TIP: Use increments of 10 (10, 20, 30) for easy reordering.
    sort_order INTEGER DEFAULT 0,

    -- 10. DERIVED METRICS

    -- Denormalized count of online, non-deleted articles by this author.
    -- UPDATED BY: Trigger when article author/visibility/lifecycle changes.
    -- USAGE: Display "42 articles by Jane" on profile cards.
    cached_post_count INTEGER DEFAULT 0 CHECK (cached_post_count >= 0),

    -- 11. LIFECYCLE

    -- Record creation timestamp (UTC).
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Last modification timestamp (UTC).
    -- Auto-updated by trigger on any column change.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete marker.
    -- CRITICAL: Do not hard delete an author referenced by articles.
    -- If NOT NULL, author is archived and hidden from active author queries.
    -- Existing article bylines can continue to render from cached_author_json.
    deleted_at DATETIME DEFAULT NULL
);

-- TRIGGERS & INDEXES

CREATE TRIGGER IF NOT EXISTS update_authors_timestamp
AFTER UPDATE ON authors
BEGIN
    UPDATE authors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);     -- Routing
CREATE INDEX IF NOT EXISTS idx_authors_role ON authors(role);     -- Team Page Filtering
CREATE INDEX IF NOT EXISTS idx_authors_email ON authors(email);   -- Admin Lookups
CREATE INDEX IF NOT EXISTS idx_authors_featured ON authors(is_featured);  -- Featured Authors Widget
CREATE INDEX IF NOT EXISTS idx_authors_display ON authors(is_online, sort_order);  -- Team Page
CREATE INDEX IF NOT EXISTS idx_authors_active ON authors(deleted_at);  -- Soft delete filter




-- Contract: docs/TAGS_TABLE_CONTRACT.md
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. IDENTITY & ROUTING

    -- URL identifier for routing and query params.
    -- FORMAT: Lowercase, kebab-case only.
    -- REGEX: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    -- EXAMPLES: "gluten-free", "under-30-minutes", "vegetarian"
    -- USAGE: /tags/gluten-free or ?filters=gluten-free,vegetarian
    slug TEXT UNIQUE NOT NULL,

    -- Display label shown on tag buttons, badges, and filters.
    -- EXAMPLES: "Gluten Free", "Under 30 Minutes", "Vegetarian"
    -- CONSTRAINT: Keep under 25 characters for UI fitness.
    label TEXT NOT NULL,

    -- Optional description for SEO and tooltips.
    -- USAGE: Meta description for /tags/slug pages, hover tooltips.
    -- RECOMMENDED: 100-160 characters for optimal SEO.
    -- EXAMPLE: "Recipes free from gluten, perfect for celiac-friendly diets."
    description TEXT,

    -- 2. VISUAL STYLING (Design System)
    -- Visual styling metadata.
    style_json TEXT DEFAULT '{}' CHECK (json_valid(style_json)),

    -- 3. SYSTEM & METRICS

    -- Denormalized count of published articles using this tag.
    -- USAGE: Tag cloud sorting (most popular first), badge display.
    -- UPDATED BY: Background job or trigger on articles_to_tags changes.
    cached_post_count INTEGER DEFAULT 0 CHECK (cached_post_count >= 0),

    -- Record creation timestamp (UTC).
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Last modification timestamp (UTC).
    -- Auto-updated by trigger on any column change.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete marker.
    -- NULL = Active tag.
    -- NOT NULL = Logically deleted (hidden from filters, kept for history).
    -- Active queries should include WHERE deleted_at IS NULL.
    deleted_at DATETIME DEFAULT NULL
);

-- TRIGGERS & INDEXES

CREATE TRIGGER IF NOT EXISTS update_tags_timestamp
AFTER UPDATE ON tags
BEGIN
    UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- LOGIC: Sorts by count DESCENDING (High to Low).
CREATE INDEX IF NOT EXISTS idx_tags_popular ON tags(cached_post_count DESC);

CREATE INDEX IF NOT EXISTS idx_tags_label ON tags(label);

CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(deleted_at);

-- Contract: docs/EQUIPMENT_TABLE_CONTRACT.md
CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. IDENTITY

    -- URL identifier for routing (e.g., /equipment/stand-mixer).
    -- FORMAT: Lowercase, kebab-case only.
    slug TEXT UNIQUE NOT NULL,

    -- Display name shown in recipe cards and equipment lists.
    -- EXAMPLES: "Stand Mixer", "Sheet Pan", "Digital Thermometer"
    name TEXT NOT NULL,

    -- Brand name for display and SEO.
    -- EXAMPLES: "KitchenAid", "Cuisinart", "Le Creuset", "Lodge"
    brand TEXT,

    -- Short description for tooltips and equipment pages.
    -- EXAMPLE: "Essential for whipping egg whites and kneading dough."
    description TEXT,

    -- Synonyms/keywords for equipment matching.
    keywords TEXT DEFAULT '[]' CHECK (json_valid(keywords)),

    -- Equipment category for filtering in admin.
    -- OPTIONS: "appliances", "bakeware", "cookware", "utensils", "gadgets", "other"
    category TEXT DEFAULT 'other' CHECK (category IN ('appliances', 'bakeware', 'cookware', 'utensils', 'gadgets', 'other')),

    -- 2. VISUALS
    -- Product image snapshot.
    image_json TEXT DEFAULT '{}' CHECK (json_valid(image_json)),

    -- 3. AFFILIATE LINKS

    -- Primary affiliate link.
    -- EXAMPLE: "https://www.amazon.com/dp/B00005UP2P?tag=yourtag-20"
    affiliate_url TEXT,

    -- Affiliate provider for tracking/reporting.
    -- OPTIONS: "amazon", "williams-sonoma", "target", "walmart", "custom"
    affiliate_provider TEXT,

    -- Affiliate disclosure note (optional override).
    -- DEFAULT: Use global site_settings disclosure.
    affiliate_note TEXT,

    -- 4. SYSTEM

    -- Visibility toggle.
    -- 0 = Hidden (don't show affiliate links).
    -- 1 = Active (show in recipes).
    is_active BOOLEAN DEFAULT 1,

    -- Sort order for equipment lists.
    sort_order INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

CREATE TRIGGER IF NOT EXISTS update_equipment_timestamp
AFTER UPDATE ON equipment
BEGIN
    UPDATE equipment SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_equipment_slug ON equipment(slug);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_active ON equipment(is_active);


-- Contract: docs/ARTICLE_TABLE_CONTRACT.md
-- JSON contracts: docs/CONTENT_JSON_CONTRACT.md, docs/CONTENT_BLOCKS_CONTRACT.md,
-- docs/ARTICLE_JSON_CONTRACTS.md, docs/RECIPE_JSON_CONTRACT.md,
-- docs/ROUNDUP_JSON_CONTRACT.md, docs/ARTICLE_CACHED_FIELDS_CONTRACT.md
CREATE TABLE IF NOT EXISTS articles (
    -- 1. IDENTITY & ROUTING

    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Surrogate key for internal use, relations, and snapshots.

    slug TEXT UNIQUE NOT NULL,
    -- URL handle used in routes (e.g. "/recipes/{slug}").
    -- Globally unique; if you want to reuse slugs after soft delete,
    -- handle that logic at the app layer for D1.

    type TEXT NOT NULL DEFAULT 'article' CHECK (type IN ('article', 'recipe', 'roundup')),
    -- Content kind:
    --   'article' = generic editorial content
    --   'recipe'  = structured recipe
    --   'roundup' = curated list of recipes/articles
    -- Used to switch editor UI and front-end rendering.

    locale TEXT DEFAULT 'en',
    -- Language/locale code for i18n (e.g. "en", "en-US", "fr").
    -- Enables localized routing, indexing, and search.

    -- 2. RELATIONSHIPS

    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    -- Main taxonomy bucket (e.g. "Breakfast", "Desserts").
    -- Kept relational for filtering, navigation, and stats.

    author_id   INTEGER NOT NULL REFERENCES authors(id)   ON DELETE RESTRICT,
    -- Primary author/owner for attribution and author archives.

    parent_article_id INTEGER NULL REFERENCES articles(id) ON DELETE SET NULL,
    -- Optional parent for topic clusters / pillar pages.
    -- Example: pillar guide as parent of multiple child recipes.

    -- 3. DISPLAY METADATA (SOURCE OF TRUTH FOR TITLE & DESCRIPTION)

    headline TEXT NOT NULL,
    -- Main H1 for the article page.
    -- For recipes, treat this as the recipe name.

    subtitle TEXT NULL,
    -- Optional H2-style subheading near the headline.

    short_description TEXT NOT NULL,
    -- Primary description used for:
    --   - Cards / listing pages
    --   - Meta description (if no custom SEO description)
    --   - Recipe schema description (as a source of truth)
    -- Keep it concise (~<=160 characters recommended).

    excerpt TEXT NULL,
    -- Slightly longer teaser for:
    --   - Blog index pages
    --   - Category archives
    --   - Email/newsletter intros
    -- Optional; can differ from short_description for editorial reasons.

    introduction TEXT,
    -- Hero / "chapeau" copy near the top of the article.
    -- Good for storytelling/context before the main content.

    images_json TEXT DEFAULT '{}' CHECK (json_valid(images_json)),
    -- Article image slots: hero, thumbnail, recipe_steps.

    -- 4. RICH CONTENT (BLOCK-BASED BODY)

    content_json TEXT DEFAULT '{"version":1,"kind":"content_document","blocks":[]}' CHECK (json_valid(content_json)),
    -- Versioned ContentDocument object representing the article body.
    -- Block
    --

    -- 5. RECIPE DATA ("GOLD KEY") for type='recipe'
    --   NOTE:
    --     - headline & short_description are the truth for name/description.
    --     - recipe_json focuses on timings, servings, structure, and extras.
    --

    recipe_json TEXT DEFAULT '{
      "prep": null,
      "cook": null,
      "total": null,
      "servings": null,
      "recipe_yield": null,

      "recipe_category": null,
      "recipe_cuisine": null,
      "keywords": [],
      "suitable_for_diet": [],

      "difficulty": null,
      "cooking_method": null,
      "estimated_cost": null,

      "ingredients": [],
      "instructions": [],
      "tips": [],

      "nutrition": null,
      "aggregate_rating": null,
      "equipment": [],
      "video": null
    }' CHECK (json_valid(recipe_json)),
    -- Recipe-specific source data for type='recipe'.

    -- 6. ROUNDUP / LIST DATA for type='roundup'

    roundup_json TEXT DEFAULT '{
      "items": [],
      "list_type": "ItemList"
    }' CHECK (json_valid(roundup_json)),
    -- Compatibility field for roundup data.
    --

    -- 7. STRUCTURED FAQ SOURCE

    faqs_json TEXT DEFAULT '[]' CHECK (json_valid(faqs_json)),
    -- Source FAQ items used for visible FAQ display and jsonld_json generation.

    -- 8. SNAPSHOTS & CACHES (ZERO-JOIN RENDERING)


    cached_tags_json TEXT DEFAULT '[]' CHECK (json_valid(cached_tags_json)),
    -- Minimal tag snapshots; source of truth is articles_to_tags + tags.

    cached_category_json TEXT DEFAULT '{}' CHECK (json_valid(cached_category_json)),
    -- Category snapshot for zero-join card/list rendering.

    cached_author_json TEXT DEFAULT '{}' CHECK (json_valid(cached_author_json)),
    -- Author snapshot for zero-join card/byline rendering.

    cached_rating_json TEXT DEFAULT '{}' CHECK (json_valid(cached_rating_json)),
    -- Optional denormalized rating snapshot; source is recipe_json.aggregate_rating.

    reading_time_minutes INTEGER DEFAULT 0 CHECK (reading_time_minutes >= 0),
    -- Approximate reading time from visible reader text.
    -- Includes visible marker payloads such as main_recipe, main_roundup, and main_faq.

    cached_toc_json TEXT DEFAULT '[]' CHECK (json_valid(cached_toc_json)),
    -- Table of contents cache generated from content_json heading blocks.

    cached_recipe_json TEXT DEFAULT '{
      "is_recipe": false,
      "total_time_minutes": null,
      "difficulty": null,
      "servings": null,
      "calories_per_serving": null,
      "primary_diet_labels": [],
      "primary_occasion_labels": [],
      "main_ingredients": [],
      "is_quick": false,
      "is_healthy": false,
      "is_budget": false
    }' CHECK (json_valid(cached_recipe_json)),
    -- Lightweight recipe snapshot for lists, cards, roundup items,
    -- related content, and recipe filters. Full recipe rendering reads recipe_json.

    cached_card_json TEXT DEFAULT '{}' CHECK (json_valid(cached_card_json)),
    -- Zero-join card snapshot for listings, pickers, and related content.

    -- 9. SEO & STRUCTURED DATA

    seo_json TEXT DEFAULT '{
      "meta_title": null,
      "meta_description": null,
      "no_index": false,
      "canonical": null,
      "og_image": null,
      "og_title": null,
      "og_description": null,
      "twitter_card": "summary_large_image"
    }' CHECK (json_valid(seo_json)),
    -- Per-article SEO overrides.

    jsonld_json TEXT DEFAULT '[]' CHECK (json_valid(jsonld_json)),
    -- Complete generated Schema.org JSON-LD graph for the page.
    -- Built from article source fields, recipe_json, roundup_json, faqs_json,
    -- images_json, relationship caches, and site organization settings.

    -- 10. CONFIG, WORKFLOW, EXPERIMENTS

    config_json TEXT DEFAULT '{
      "allow_comments": true,
      "show_table_of_contents": true,
      "manual_related_ids": [],
      "experiment_key": null,
      "experiment_variant": null
    }' CHECK (json_valid(config_json)),
    -- Per-article feature toggles and experiment hooks.

    workflow_status TEXT DEFAULT 'draft' CHECK (workflow_status IN ('draft', 'in_review', 'scheduled', 'published', 'archived')),
    -- Editorial workflow:
    --   'draft'      : in progress.
    --   'in_review'  : awaiting editor approval.
    --   'scheduled'  : approved, will go live at scheduled_at.
    --   'published'  : live.
    --   'archived'   : not actively promoted, but still accessible.

    scheduled_at DATETIME NULL,
    -- Optional scheduled publish date/time (UTC).
    -- Your app can flip is_online + workflow_status when this time is reached.

    -- 11. SYSTEM & ACCESS CONTROL

    is_online   BOOLEAN DEFAULT 0,
    -- 0 = not publicly visible; 1 = visible (subject to access_level).
    -- Typically true only for 'published' items.

    is_favorite BOOLEAN DEFAULT 0,
    -- Flag for homepage "featured" or curated rails.

    access_level INTEGER DEFAULT 0,
    -- 0 = Public
    -- 1 = Members
    -- 2 = Premium
    -- Enforced by your auth/entitlement layer.

    view_count INTEGER DEFAULT 0,
    -- Simple global view counter (for more detailed analytics, use a separate table).

    published_at DATETIME,
    -- Timestamp when the article first went live (UTC).

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Creation timestamp (UTC).

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Last update timestamp; kept in sync by trigger.

    deleted_at DATETIME DEFAULT NULL
    -- Soft-delete marker (non-null = logically deleted).
);


CREATE INDEX IF NOT EXISTS idx_articles_slug
    ON articles(slug);

CREATE INDEX IF NOT EXISTS idx_articles_type
    ON articles(type);
-- Fast lookup by slug for routing.

CREATE INDEX IF NOT EXISTS idx_articles_feed
    ON articles(is_online, published_at DESC);
-- Main feed index:
--   WHERE is_online = 1
--   ORDER BY published_at DESC

CREATE INDEX IF NOT EXISTS idx_articles_cat
    ON articles(category_id);
-- Category archive and filters.

CREATE INDEX IF NOT EXISTS idx_articles_author
    ON articles(author_id);
-- Author archives and dashboards.

CREATE INDEX IF NOT EXISTS idx_articles_parent
    ON articles(parent_article_id);
-- Topic/pillar clusters and "more from this guide" queries.

CREATE INDEX IF NOT EXISTS idx_articles_workflow
    ON articles(workflow_status);
-- Admin/editor views filtered by workflow status.

CREATE INDEX IF NOT EXISTS idx_articles_active
    ON articles(deleted_at);
-- Soft delete filter: efficiently exclude deleted articles.

-- TRIGGERS

-- 1) Auto-update updated_at on any UPDATE
CREATE TRIGGER IF NOT EXISTS trg_articles_updated_at
AFTER UPDATE ON articles
BEGIN
  UPDATE articles
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
-- Keeps updated_at in sync without needing explicit app logic.

-- 2) Auto-set published_at when article first goes online
CREATE TRIGGER IF NOT EXISTS trg_articles_set_published_at
AFTER UPDATE ON articles
WHEN NEW.is_online = 1
  AND (OLD.is_online IS NULL OR OLD.is_online = 0)
  AND NEW.published_at IS NULL
BEGIN
  UPDATE articles
  SET published_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
-- Ensures first go-live time is recorded automatically.

-- 3) Keep workflow_status consistent when marking online
CREATE TRIGGER IF NOT EXISTS trg_articles_online_workflow
AFTER UPDATE ON articles
WHEN NEW.is_online = 1 AND NEW.workflow_status != 'published'
BEGIN
  UPDATE articles
  SET workflow_status = 'published'
  WHERE id = NEW.id;
END;
-- If something is online, its workflow_status is forced to 'published'.

-- 4) Soft delete guard: convert DELETE into soft delete
CREATE TRIGGER IF NOT EXISTS trg_articles_prevent_delete
BEFORE DELETE ON articles
BEGIN
  UPDATE articles
  SET deleted_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
  SELECT RAISE(IGNORE);
END;
-- Prevents hard deletes; turns them into soft deletes by setting deleted_at.





-- Table de liaison (Many-to-Many)
-- Contract: docs/TAGS_TABLE_CONTRACT.md
CREATE TABLE IF NOT EXISTS articles_to_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_tag_to_article ON articles_to_tags(tag_id);


-- 4. RECHERCHE (FTS5)

-- Search Index for Articles and Recipes
-- Includes headline, metadata, tags, author, category, and flattened JSON content
CREATE VIRTUAL TABLE IF NOT EXISTS idx_articles_search USING fts5(
    headline,
    subtitle,
    short_description,
    body_content,    -- Flattened text from content_json + recipe_json
    tag_labels,      -- Flattened tag labels from cached_tags_json
    author_name,     -- From cached_author_json for "recipes by Jane" search
    category_name,   -- From cached_category_json for category search
    content='articles',
    content_rowid='id'
);

-- Search Index for Media Library (Admin Search)
CREATE VIRTUAL TABLE IF NOT EXISTS idx_media_search_fts USING fts5(
    name,
    alt_text,
    caption,
    credit,
    content='media',
    content_rowid='id'
);

-- MEDIA FTS5 SYNC TRIGGERS
-- The FTS delete command MUST supply the original indexed values.

CREATE TRIGGER IF NOT EXISTS trg_media_search_ai AFTER INSERT ON media
BEGIN
  INSERT INTO idx_media_search_fts(rowid, name, alt_text, caption, credit)
  VALUES (NEW.id, NEW.name, NEW.alt_text, NEW.caption, NEW.credit);
END;

CREATE TRIGGER IF NOT EXISTS trg_media_search_au AFTER UPDATE ON media
BEGIN
  INSERT INTO idx_media_search_fts(idx_media_search_fts, rowid, name, alt_text, caption, credit)
  VALUES('delete', OLD.id, OLD.name, OLD.alt_text, OLD.caption, OLD.credit);

  INSERT INTO idx_media_search_fts(rowid, name, alt_text, caption, credit)
  SELECT NEW.id, NEW.name, NEW.alt_text, NEW.caption, NEW.credit
  WHERE NEW.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_media_search_ad AFTER DELETE ON media
BEGIN
  INSERT INTO idx_media_search_fts(idx_media_search_fts, rowid, name, alt_text, caption, credit)
  VALUES('delete', OLD.id, OLD.name, OLD.alt_text, OLD.caption, OLD.credit);
END;

CREATE TRIGGER IF NOT EXISTS trg_articles_search_ai AFTER INSERT ON articles
BEGIN
  INSERT INTO idx_articles_search(
    rowid, headline, subtitle, short_description, body_content,
    tag_labels, author_name, category_name
  )
  VALUES (
    NEW.id,
    NEW.headline,
    NEW.subtitle,
    NEW.short_description,
    (
      SELECT GROUP_CONCAT(txt, ' ') FROM (
        -- Content blocks: direct text fields used by paragraph, heading, quote, tip, etc.
        SELECT json_extract(value, '$.text') as txt
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.text') IS NOT NULL

        UNION ALL

        -- Content blocks: titles, captions, notes, subtitles.
        SELECT json_extract(value, '$.title')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.title') IS NOT NULL

        UNION ALL

        SELECT json_extract(value, '$.caption')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.caption') IS NOT NULL

        UNION ALL

        SELECT json_extract(value, '$.note')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.note') IS NOT NULL

        UNION ALL

        SELECT json_extract(value, '$.subtitle')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.subtitle') IS NOT NULL

        UNION ALL

        -- List blocks: string items or object items with text/label/title.
        SELECT CASE
          WHEN item.type = 'object' THEN COALESCE(
            json_extract(item.value, '$.text'),
            json_extract(item.value, '$.label'),
            json_extract(item.value, '$.title')
          )
          ELSE item.value
        END
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'list'

        UNION ALL

        -- FAQ source items.
        SELECT json_extract(item.value, '$.question')
        FROM json_each(NEW.faqs_json) AS item

        UNION ALL

        SELECT json_extract(item.value, '$.answer')
        FROM json_each(NEW.faqs_json) AS item

        UNION ALL

        -- Table blocks.
        SELECT header.value
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.headers') AS header
        WHERE json_extract(block.value, '$.type') = 'table'

        UNION ALL

        SELECT cell.value
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.rows') AS row,
             json_each(row.value) AS cell
        WHERE json_extract(block.value, '$.type') = 'table'

        UNION ALL

        -- Related content snapshots.
        SELECT json_extract(item.value, '$.title')
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'

        UNION ALL

        SELECT json_extract(item.value, '$.description')
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'

        UNION ALL

        -- Recipe ingredients.
        SELECT json_extract(g.value, '$.section_title')
        FROM json_each(NEW.recipe_json, '$.ingredients') AS g
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(i.value, '$.name')
        FROM json_each(NEW.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(i.value, '$.note')
        FROM json_each(NEW.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'

        UNION ALL

        -- Recipe instructions.
        SELECT json_extract(s.value, '$.section_title')
        FROM json_each(NEW.recipe_json, '$.instructions') AS s
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(step.value, '$.text')
        FROM json_each(NEW.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(step.value, '$.tip')
        FROM json_each(NEW.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE NEW.type = 'recipe'

        UNION ALL

        -- Recipe metadata useful for search.
        SELECT json_extract(NEW.recipe_json, '$.recipe_category')
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(NEW.recipe_json, '$.recipe_cuisine')
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(NEW.recipe_json, '$.difficulty')
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT keyword.value
        FROM json_each(NEW.recipe_json, '$.keywords') AS keyword
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT equipment.value
        FROM json_each(NEW.recipe_json, '$.equipment') AS equipment
        WHERE NEW.type = 'recipe' AND equipment.type = 'text'

        UNION ALL

        SELECT json_extract(equipment.value, '$.label')
        FROM json_each(NEW.recipe_json, '$.equipment') AS equipment
        WHERE NEW.type = 'recipe'
      )
    ),
    -- 4. Flatten tag labels from cached_tags_json snapshots
    (SELECT GROUP_CONCAT(json_extract(value, '$.label'), ' ') FROM json_each(NEW.cached_tags_json)),
    -- 5. Author name
    json_extract(NEW.cached_author_json, '$.name'),
    -- 6. Category label
    json_extract(NEW.cached_category_json, '$.label')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_articles_search_au AFTER UPDATE ON articles
BEGIN
  -- Clean up old index entry (values MUST match original indexed data for FTS5 consistency)
  INSERT INTO idx_articles_search(
    idx_articles_search, rowid, headline, subtitle, short_description,
    body_content, tag_labels, author_name, category_name
  )
  SELECT 'delete', OLD.id, OLD.headline, OLD.subtitle, OLD.short_description,
    (
      SELECT GROUP_CONCAT(txt, ' ') FROM (
        SELECT json_extract(value, '$.text') as txt
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.text') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.title')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.title') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.caption')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.caption') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.note')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.note') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.subtitle')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.subtitle') IS NOT NULL
        UNION ALL
        SELECT CASE
          WHEN item.type = 'object' THEN COALESCE(
            json_extract(item.value, '$.text'),
            json_extract(item.value, '$.label'),
            json_extract(item.value, '$.title')
          )
          ELSE item.value
        END
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'list'
        UNION ALL
        SELECT json_extract(item.value, '$.question')
        FROM json_each(OLD.faqs_json) AS item
        UNION ALL
        SELECT json_extract(item.value, '$.answer')
        FROM json_each(OLD.faqs_json) AS item
        UNION ALL
        SELECT header.value
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.headers') AS header
        WHERE json_extract(block.value, '$.type') = 'table'
        UNION ALL
        SELECT cell.value
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.rows') AS row,
             json_each(row.value) AS cell
        WHERE json_extract(block.value, '$.type') = 'table'
        UNION ALL
        SELECT json_extract(item.value, '$.title')
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'
        UNION ALL
        SELECT json_extract(item.value, '$.description')
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'
        UNION ALL
        SELECT json_extract(g.value, '$.section_title')
        FROM json_each(OLD.recipe_json, '$.ingredients') AS g
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(i.value, '$.name')
        FROM json_each(OLD.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(i.value, '$.note')
        FROM json_each(OLD.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(s.value, '$.section_title')
        FROM json_each(OLD.recipe_json, '$.instructions') AS s
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(step.value, '$.text')
        FROM json_each(OLD.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(step.value, '$.tip')
        FROM json_each(OLD.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(OLD.recipe_json, '$.recipe_category')
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(OLD.recipe_json, '$.recipe_cuisine')
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(OLD.recipe_json, '$.difficulty')
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT keyword.value
        FROM json_each(OLD.recipe_json, '$.keywords') AS keyword
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT equipment.value
        FROM json_each(OLD.recipe_json, '$.equipment') AS equipment
        WHERE OLD.type = 'recipe' AND equipment.type = 'text'
        UNION ALL
        SELECT json_extract(equipment.value, '$.label')
        FROM json_each(OLD.recipe_json, '$.equipment') AS equipment
        WHERE OLD.type = 'recipe'
      )
    ),
    (SELECT GROUP_CONCAT(json_extract(value, '$.label'), ' ') FROM json_each(OLD.cached_tags_json)),
    json_extract(OLD.cached_author_json, '$.name'),
    json_extract(OLD.cached_category_json, '$.label');

  -- Only insert fresh entry if NOT soft-deleted
  INSERT INTO idx_articles_search(
    rowid, headline, subtitle, short_description, body_content,
    tag_labels, author_name, category_name
  )
  SELECT
    NEW.id,
    NEW.headline,
    NEW.subtitle,
    NEW.short_description,
    (
      SELECT GROUP_CONCAT(txt, ' ') FROM (
        -- Content blocks: direct text fields used by paragraph, heading, quote, tip, etc.
        SELECT json_extract(value, '$.text') as txt
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.text') IS NOT NULL

        UNION ALL

        -- Content blocks: titles, captions, notes, subtitles.
        SELECT json_extract(value, '$.title')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.title') IS NOT NULL

        UNION ALL

        SELECT json_extract(value, '$.caption')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.caption') IS NOT NULL

        UNION ALL

        SELECT json_extract(value, '$.note')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.note') IS NOT NULL

        UNION ALL

        SELECT json_extract(value, '$.subtitle')
        FROM json_each(NEW.content_json, '$.blocks')
        WHERE json_extract(value, '$.subtitle') IS NOT NULL

        UNION ALL

        -- List blocks: string items or object items with text/label/title.
        SELECT CASE
          WHEN item.type = 'object' THEN COALESCE(
            json_extract(item.value, '$.text'),
            json_extract(item.value, '$.label'),
            json_extract(item.value, '$.title')
          )
          ELSE item.value
        END
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'list'

        UNION ALL

        -- FAQ source items.
        SELECT json_extract(item.value, '$.question')
        FROM json_each(NEW.faqs_json) AS item

        UNION ALL

        SELECT json_extract(item.value, '$.answer')
        FROM json_each(NEW.faqs_json) AS item

        UNION ALL

        -- Table blocks.
        SELECT header.value
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.headers') AS header
        WHERE json_extract(block.value, '$.type') = 'table'

        UNION ALL

        SELECT cell.value
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.rows') AS row,
             json_each(row.value) AS cell
        WHERE json_extract(block.value, '$.type') = 'table'

        UNION ALL

        -- Related content snapshots.
        SELECT json_extract(item.value, '$.title')
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'

        UNION ALL

        SELECT json_extract(item.value, '$.description')
        FROM json_each(NEW.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'

        UNION ALL

        -- Recipe ingredients.
        SELECT json_extract(g.value, '$.section_title')
        FROM json_each(NEW.recipe_json, '$.ingredients') AS g
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(i.value, '$.name')
        FROM json_each(NEW.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(i.value, '$.note')
        FROM json_each(NEW.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'

        UNION ALL

        -- Recipe instructions.
        SELECT json_extract(s.value, '$.section_title')
        FROM json_each(NEW.recipe_json, '$.instructions') AS s
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(step.value, '$.text')
        FROM json_each(NEW.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(step.value, '$.tip')
        FROM json_each(NEW.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE NEW.type = 'recipe'

        UNION ALL

        -- Recipe metadata useful for search.
        SELECT json_extract(NEW.recipe_json, '$.recipe_category')
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(NEW.recipe_json, '$.recipe_cuisine')
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT json_extract(NEW.recipe_json, '$.difficulty')
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT keyword.value
        FROM json_each(NEW.recipe_json, '$.keywords') AS keyword
        WHERE NEW.type = 'recipe'

        UNION ALL

        SELECT equipment.value
        FROM json_each(NEW.recipe_json, '$.equipment') AS equipment
        WHERE NEW.type = 'recipe' AND equipment.type = 'text'

        UNION ALL

        SELECT json_extract(equipment.value, '$.label')
        FROM json_each(NEW.recipe_json, '$.equipment') AS equipment
        WHERE NEW.type = 'recipe'
      )
    ),
    -- 4. Flatten tag labels from cached_tags_json snapshots
    (SELECT GROUP_CONCAT(json_extract(value, '$.label'), ' ') FROM json_each(NEW.cached_tags_json)),
    -- 5. Author name
    json_extract(NEW.cached_author_json, '$.name'),
    -- 6. Category label
    json_extract(NEW.cached_category_json, '$.label')
  WHERE NEW.deleted_at IS NULL;  -- Only index if NOT soft-deleted
END;

CREATE TRIGGER IF NOT EXISTS trg_articles_search_ad AFTER DELETE ON articles
BEGIN
  INSERT INTO idx_articles_search(
    idx_articles_search, rowid, headline, subtitle, short_description,
    body_content, tag_labels, author_name, category_name
  )
  SELECT 'delete', OLD.id, OLD.headline, OLD.subtitle, OLD.short_description,
    (
      SELECT GROUP_CONCAT(txt, ' ') FROM (
        SELECT json_extract(value, '$.text') as txt
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.text') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.title')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.title') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.caption')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.caption') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.note')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.note') IS NOT NULL
        UNION ALL
        SELECT json_extract(value, '$.subtitle')
        FROM json_each(OLD.content_json, '$.blocks')
        WHERE json_extract(value, '$.subtitle') IS NOT NULL
        UNION ALL
        SELECT CASE
          WHEN item.type = 'object' THEN COALESCE(
            json_extract(item.value, '$.text'),
            json_extract(item.value, '$.label'),
            json_extract(item.value, '$.title')
          )
          ELSE item.value
        END
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'list'
        UNION ALL
        SELECT json_extract(item.value, '$.question')
        FROM json_each(OLD.faqs_json) AS item
        UNION ALL
        SELECT json_extract(item.value, '$.answer')
        FROM json_each(OLD.faqs_json) AS item
        UNION ALL
        SELECT header.value
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.headers') AS header
        WHERE json_extract(block.value, '$.type') = 'table'
        UNION ALL
        SELECT cell.value
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.rows') AS row,
             json_each(row.value) AS cell
        WHERE json_extract(block.value, '$.type') = 'table'
        UNION ALL
        SELECT json_extract(item.value, '$.title')
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'
        UNION ALL
        SELECT json_extract(item.value, '$.description')
        FROM json_each(OLD.content_json, '$.blocks') AS block,
             json_each(block.value, '$.items') AS item
        WHERE json_extract(block.value, '$.type') = 'related_content'
        UNION ALL
        SELECT json_extract(g.value, '$.section_title')
        FROM json_each(OLD.recipe_json, '$.ingredients') AS g
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(i.value, '$.name')
        FROM json_each(OLD.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(i.value, '$.note')
        FROM json_each(OLD.recipe_json, '$.ingredients') as g,
             json_each(g.value, '$.items') as i
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(s.value, '$.section_title')
        FROM json_each(OLD.recipe_json, '$.instructions') AS s
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(step.value, '$.text')
        FROM json_each(OLD.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(step.value, '$.tip')
        FROM json_each(OLD.recipe_json, '$.instructions') AS s,
             json_each(s.value, '$.steps') AS step
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(OLD.recipe_json, '$.recipe_category')
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(OLD.recipe_json, '$.recipe_cuisine')
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT json_extract(OLD.recipe_json, '$.difficulty')
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT keyword.value
        FROM json_each(OLD.recipe_json, '$.keywords') AS keyword
        WHERE OLD.type = 'recipe'
        UNION ALL
        SELECT equipment.value
        FROM json_each(OLD.recipe_json, '$.equipment') AS equipment
        WHERE OLD.type = 'recipe' AND equipment.type = 'text'
        UNION ALL
        SELECT json_extract(equipment.value, '$.label')
        FROM json_each(OLD.recipe_json, '$.equipment') AS equipment
        WHERE OLD.type = 'recipe'
      )
    ),
    (SELECT GROUP_CONCAT(json_extract(value, '$.label'), ' ') FROM json_each(OLD.cached_tags_json)),
    json_extract(OLD.cached_author_json, '$.name'),
    json_extract(OLD.cached_category_json, '$.label');
END;


-- Contract: Pinterest board storage; see docs/DATABASE_CONTENT_MODEL.md
CREATE TABLE IF NOT EXISTS pinterest_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Surrogate key for internal use and foreign keys from pinterest_pins.

    slug TEXT UNIQUE NOT NULL,
    -- Internal handle for the board (e.g. "quick-dinners").
    -- Used in admin URLs, dropdowns, or config.
    -- Should remain stable even if the display name changes.

    name TEXT NOT NULL,
    -- Human-readable board name (e.g. "Quick Dinners").
    -- Shown in the admin UI when choosing a board.

    description TEXT,
    -- Board description for reference.
    -- Can match Pinterest board description.

    board_url TEXT,
    -- Full Pinterest board URL, e.g.:
    --   "https://www.pinterest.com/your_profile/quick-dinners/"
    -- Used for quick access from the admin and for reference.

    cover_image_url TEXT,
    -- Board cover image for admin preview.
    -- Can be a URL from your media library or Pinterest.

    locale TEXT DEFAULT 'en',
    -- Optional: language/locale the board primarily targets.
    -- Align this with article.locale if you separate content per language
    -- (e.g. 'en', 'en-US', 'fr').

    is_active BOOLEAN DEFAULT 1,
    -- 1 = board is selectable for new pins.
    -- 0 = board kept only for history (old pins), not used for new exports.

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- When this board record was created in your system.

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Last time you updated board metadata (name, URL, status).
    -- You can keep this in sync with a trigger or in your app.

    deleted_at DATETIME DEFAULT NULL
    -- Soft delete marker:
    --   NULL  = normal board.
    --   NOT NULL = logically deleted/retired (hide in UI, keep for history).
);

CREATE INDEX IF NOT EXISTS idx_pinterest_boards_active ON pinterest_boards(is_active);

CREATE TRIGGER IF NOT EXISTS update_pinterest_boards_timestamp
AFTER UPDATE ON pinterest_boards
BEGIN
    UPDATE pinterest_boards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;



-- Contract: Pinterest pin storage; see docs/DATABASE_CONTENT_MODEL.md
CREATE TABLE IF NOT EXISTS pinterest_pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Optional direct link to content (recommended)
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    -- Lets you regenerate/update title/description from the article later.

    board_id   INTEGER REFERENCES pinterest_boards(id) ON DELETE SET NULL,

    section_name TEXT,
    -- Pinterest board section name (optional).
    -- Boards can have sections like "Breakfast Recipes", "Dinner Ideas".

    image_url       TEXT NOT NULL,
    -- Final image URL (from your media system or CDN).
    -- This is what Pinterest will fetch when you import CSV.

    destination_url TEXT NOT NULL,
    -- Where the pin should send traffic (article URL or UTM-tracked version).

    title           TEXT NOT NULL,
    -- Pin title (can default from article.headline, but stored here as a snapshot).

    description     TEXT,
    -- Pin description text.

    tags_json       TEXT DEFAULT '[]' CHECK (json_valid(tags_json)),
    -- ["easy dinner","chicken","high protein"] for your own reference/filters.

    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'exported', 'published', 'failed')),
    -- Workflow status:
    --   'draft'     : Created, not yet exported.
    --   'scheduled' : Ready for next export batch.
    --   'exported'  : Included in CSV export.
    --   'published' : Confirmed live on Pinterest.
    --   'failed'    : Export/publish failed.

    pinterest_pin_id TEXT,
    -- Actual Pinterest pin ID after publishing (if available via API).
    -- Useful for tracking and analytics integration.

    exported_at     DATETIME,
    -- Last time this row was included in an export/CSV.

    export_batch_id TEXT,
    -- Optional identifier to group rows by export batch (e.g. "2025-12-17-pm").

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pinterest_pins_board
    ON pinterest_pins(board_id);

CREATE INDEX IF NOT EXISTS idx_pinterest_pins_article
    ON pinterest_pins(article_id);

CREATE INDEX IF NOT EXISTS idx_pinterest_pins_status
    ON pinterest_pins(status);

CREATE INDEX IF NOT EXISTS idx_pinterest_pins_batch
    ON pinterest_pins(export_batch_id);

CREATE TRIGGER IF NOT EXISTS update_pinterest_pins_timestamp
AFTER UPDATE ON pinterest_pins
BEGIN
    UPDATE pinterest_pins SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- Contract: Pinterest template storage; see docs/DATABASE_CONTENT_MODEL.md
CREATE TABLE IF NOT EXISTS pin_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    slug TEXT UNIQUE NOT NULL,
    -- URL-safe identifier for routing (e.g., "recipe-card-bold").
    -- Used in admin URLs: /templates/recipe-card-bold

    name TEXT NOT NULL,
    -- Template display name (e.g., "Recipe Card Bold", "Quote Minimal").

    description TEXT,
    -- Optional description for admin UI.
    -- e.g., "Bold recipe card with large title and cooking time"

    category TEXT DEFAULT 'general',
    -- Template category for filtering:
    --   'recipe', 'listicle', 'quote', 'before_after', 'general'

    background_color TEXT DEFAULT '#ffffff',
    -- Canvas background color (stored separately for quick access).
    -- Frontend uses this to render placeholders and initial canvas fill.

    thumbnail_url TEXT,
    -- Preview/thumbnail image URL for template picker in admin.
    -- Auto-generated when template is saved (WebP, ~400px wide).

    width INTEGER DEFAULT 1000,
    -- Pin width in pixels.

    height INTEGER DEFAULT 1500,
    -- Pin height in pixels (default 2:3 ratio for Pinterest).

    elements_json TEXT NOT NULL CHECK (json_valid(elements_json)),
    -- Canvas design configuration JSON.
    -- Contains layers, text boxes, image placeholders, colors, fonts, etc.
    -- Schema depends on your canvas editor implementation.

    is_active BOOLEAN DEFAULT 1,
    -- 1 = Available in template picker.
    -- 0 = Hidden (archived).

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pin_templates_slug ON pin_templates(slug);
CREATE INDEX IF NOT EXISTS idx_pin_templates_category ON pin_templates(category);
CREATE INDEX IF NOT EXISTS idx_pin_templates_active ON pin_templates(is_active);

CREATE TRIGGER IF NOT EXISTS update_pin_templates_timestamp
AFTER UPDATE ON pin_templates
BEGIN
    UPDATE pin_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- Contract: docs/REDIRECTS_TABLE_CONTRACT.md
CREATE TABLE IF NOT EXISTS redirects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    from_path TEXT UNIQUE NOT NULL,
    -- The old/source path (e.g., "/old-recipe-slug").
    -- Should NOT include domain, just the path.

    to_path TEXT NOT NULL,
    -- The new/destination path (e.g., "/recipes/new-recipe-slug").
    -- Can be relative path or full URL for external redirects.

    status_code INTEGER NOT NULL DEFAULT 301,
    -- HTTP status code:
    --   301 = Permanent Redirect (SEO-friendly, passes link equity)
    --   302 = Temporary Redirect (for A/B tests, maintenance)
    --   307 = Temporary (preserves request method)
    --   308 = Permanent (preserves request method)

    is_active BOOLEAN NOT NULL DEFAULT 1,
    -- Toggle to enable/disable without deleting.
    -- 1 = Active, 0 = Disabled.

    notes TEXT,
    -- Optional admin notes (e.g., "Renamed after rebrand").

    hit_count INTEGER NOT NULL DEFAULT 0,
    -- Track how many times this redirect was triggered.
    -- Useful for identifying if old links are still being used.

    last_hit_at DATETIME,
    -- Timestamp of the last redirect hit.

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redirects_from_path ON redirects(from_path);
CREATE INDEX IF NOT EXISTS idx_redirects_active ON redirects(is_active);

CREATE TRIGGER IF NOT EXISTS update_redirects_timestamp
AFTER UPDATE ON redirects
BEGIN
    UPDATE redirects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- ARTICLE CACHED FIELD TRIGGERS


CREATE TRIGGER IF NOT EXISTS update_cached_author_on_author_change
AFTER UPDATE OF name, slug, job_title, images_json, short_description, bio_json ON authors
WHEN (
  OLD.name != NEW.name
  OR OLD.slug != NEW.slug
  OR OLD.job_title IS NOT NEW.job_title
  OR OLD.images_json IS NOT NEW.images_json
  OR OLD.short_description != NEW.short_description
  OR OLD.bio_json IS NOT NEW.bio_json
)
BEGIN
  UPDATE articles
  SET cached_author_json = json_object(
    'id', NEW.id,
    'slug', NEW.slug,
    'name', NEW.name,
    'job_title', NEW.job_title,
    'bio', NEW.short_description,
    'avatar', json(COALESCE(json_extract(NEW.images_json, '$.avatar'), 'null')),
    'social_links', json(COALESCE(json_extract(NEW.bio_json, '$.socials'), '[]'))
  )
  WHERE author_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cached_category_on_category_change
AFTER UPDATE OF slug, label, color ON categories
WHEN (
  OLD.slug != NEW.slug
  OR OLD.label != NEW.label
  OR OLD.color IS NOT NEW.color
)
BEGIN
  UPDATE articles
  SET cached_category_json = json_object(
    'id', NEW.id,
    'slug', NEW.slug,
    'label', NEW.label,
    'color', NEW.color
  )
  WHERE category_id = NEW.id;
END;

-- AUTHOR AND CATEGORY POST COUNT TRIGGERS
-- Conditions: is_online = 1 AND deleted_at IS NULL.

CREATE TRIGGER IF NOT EXISTS update_author_count_on_insert
AFTER INSERT ON articles
BEGIN
  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = NEW.author_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = NEW.author_id;
END;

CREATE TRIGGER IF NOT EXISTS update_author_count_on_update
AFTER UPDATE OF author_id, is_online, deleted_at ON articles
BEGIN
  -- Update old author
  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = OLD.author_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = OLD.author_id;

  -- Update new author
  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = NEW.author_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = NEW.author_id;
END;

CREATE TRIGGER IF NOT EXISTS update_author_count_on_delete
AFTER DELETE ON articles
BEGIN
  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = OLD.author_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = OLD.author_id;
END;

CREATE TRIGGER IF NOT EXISTS update_category_count_on_insert
AFTER INSERT ON articles
BEGIN
  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = NEW.category_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = NEW.category_id;
END;

CREATE TRIGGER IF NOT EXISTS update_category_count_on_update
AFTER UPDATE OF category_id, is_online, deleted_at ON articles
BEGIN
  -- Update old category
  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = OLD.category_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = OLD.category_id;

  -- Update new category (if changed)
  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = NEW.category_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = NEW.category_id;
END;

CREATE TRIGGER IF NOT EXISTS update_category_count_on_delete
AFTER DELETE ON articles
BEGIN
  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = OLD.category_id
    AND is_online = 1
    AND deleted_at IS NULL
  )
  WHERE id = OLD.category_id;
END;


-- TAG POST COUNT TRIGGERS
-- Source of truth: articles_to_tags junction + articles (is_online=1, deleted_at IS NULL).

CREATE TRIGGER IF NOT EXISTS update_tag_count_on_link_insert
AFTER INSERT ON articles_to_tags
BEGIN
  UPDATE tags
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles_to_tags att
    JOIN articles a ON a.id = att.article_id
    WHERE att.tag_id = NEW.tag_id
    AND a.is_online = 1
    AND a.deleted_at IS NULL
  )
  WHERE id = NEW.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS update_tag_count_on_link_delete
AFTER DELETE ON articles_to_tags
BEGIN
  UPDATE tags
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles_to_tags att
    JOIN articles a ON a.id = att.article_id
    WHERE att.tag_id = OLD.tag_id
    AND a.is_online = 1
    AND a.deleted_at IS NULL
  )
  WHERE id = OLD.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS update_tag_counts_on_article_status
AFTER UPDATE OF is_online, deleted_at ON articles
BEGIN
  UPDATE tags
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles_to_tags att
    JOIN articles a ON a.id = att.article_id
    WHERE att.tag_id = tags.id
    AND a.is_online = 1
    AND a.deleted_at IS NULL
  )
  WHERE id IN (SELECT tag_id FROM articles_to_tags WHERE article_id = NEW.id);
END;
