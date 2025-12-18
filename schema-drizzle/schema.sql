-- ==================================================================================
-- TABLE: SITE_SETTINGS (Global Configuration)
-- ==================================================================================
-- Purpose: Centralized storage for site-wide configurations.
-- Strategy: "Key-Value Store" within SQL.
--
-- Why D1 instead of Cloudflare KV?
-- 1. Data Integrity: Settings are backed up alongside content (Articles/Media).
-- 2. Developer Experience: Unified query interface (Drizzle ORM) for all data.
-- 3. Typing: Allows structured JSON storage for complex settings (e.g., Social Links).
-- ==================================================================================

CREATE TABLE IF NOT EXISTS site_settings (
    -- The unique identifier for the setting group.
    -- Examples: 'general_info', 'social_links', 'theme_config', 'scripts'
    key TEXT PRIMARY KEY,

    -- The configuration payload.
    -- IMPORTANT: This column stores JSON strings, not simple text.
    -- This allows nesting complex data without creating multiple columns.
    -- Example: '{"facebook": "url", "twitter": "url"}'
    value TEXT NOT NULL, 

    -- Helper text for the Admin Panel UI.
    -- Displayed to the user to explain what this setting controls.
    -- Example: "Manage links to your social media profiles footer."
    description TEXT,

    -- Timestamp for auditing changes.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



-- ==================================================================================
-- TABLE: MEDIA (Centralized Asset Library - Long Term Support)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. SEARCHABLE METADATA (Standard SQL Columns)
    -- ------------------------------------------------------------------
    -- Extracted from JSON to allow fast SQL filtering (WHERE name LIKE '%...%').
    
    -- Internal name for the editor (e.g., "Apple Pie Shoot 01").
    name TEXT NOT NULL, 
    
    -- SEO / Accessibility Text. 
    -- Kept as a separate column to allow efficient full-text search.
    alt_text TEXT, 
    
    -- [NEW] Visible Caption. 
    -- Can be displayed below the image in articles.
    caption TEXT, 

    -- [NEW] Legal / Copyright info. 
    -- Example: "© Photography by Marie Dupont" or "Source: Unsplash".
    credit TEXT,  
    
    -- Filter helper (e.g., 'image/webp', 'image/gif').
    mime_type TEXT DEFAULT 'image/webp',

    -- Optional human-readable ratio hint ("16:9", "4:5").
    -- Used mainly for layout hints; precise sizes still come from variants_json.
    -- Example values: "16:9", "4:5", "1:1"
    -- Filled at upload time (e.g. from the main/original variant).
    aspect_ratio TEXT,

    -- 2. TECHNICAL PAYLOAD (The "Plumbing")
    -- ------------------------------------------------------------------
    -- Stores the references to the physical files on R2.
    -- Read-only for the frontend.
    --
    -- SCHEMA:
    -- {
    --   "variants": {
    --     "xs": { "url": "...", "r2_key": "...", "width": 360,  "height": ... }, -- Mobile
    --     "sm": { "url": "...", "r2_key": "...", "width": 720,  "height": ... }, -- Retina
    --     "md": { "url": "...", "r2_key": "...", "width": 1200, "height": ... }, -- Desktop
    --     "lg": { "url": "...", "r2_key": "...", "width": 2048, "height": ... }  -- 4K
    --   },
    --   "placeholder": "data:image/jpeg;base64/..." (Blurhash/LQIP)
    -- }
    variants_json TEXT NOT NULL,

    -- 3. SMART DISPLAY (Design Control)
    -- ------------------------------------------------------------------
    -- [NEW] Focal Point for CSS `object-position`.
    -- Prevents the subject from being cropped out on mobile screens.
    -- SCHEMA: {"x": 50, "y": 50} (Percentages 0-100).
    focal_point_json TEXT DEFAULT '{"x": 50, "y": 50}',

    -- 4. SYSTEM METADATA
    -- ------------------------------------------------------------------
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
-- Optimized for the Admin Media Library search bar.
CREATE INDEX IF NOT EXISTS idx_media_search ON media(name, alt_text, credit);
CREATE INDEX IF NOT EXISTS idx_media_date ON media(created_at DESC);



-- ==================================================================
-- 2. TAXONOMIES (Structure du site)
-- ==================================================================

-- ==================================================================================
-- TABLE: CATEGORIES
-- ==================================================================================
-- Purpose: Defines the taxonomy, navigation structure, and landing pages.
-- Strategy: Hybrid SQL/JSON.
--           - SQL: High-frequency filtering (slug, parent, is_online).
--           - JSON: Rich content payloads (images with variants, config).
-- ==================================================================================

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. NAVIGATION & HIERARCHY
    -- ------------------------------------------------------------------
    -- URL identifier. Immutable. Lowercase, kebab-case. 
    -- Regex: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    slug TEXT UNIQUE NOT NULL,

    -- Internal/Menu label. Keep < 20 chars for UI fitness.
    label TEXT NOT NULL,

    -- Self-reference for nested menus (e.g., Recipes > Vegan > Dessert).
    -- ON DELETE SET NULL ensures children don't vanish if parent is deleted.
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,

    -- 2. DISPLAY TEXT (Landing Page)
    -- ------------------------------------------------------------------
    -- H1 Page Title. Defaults to 'label' if NULL.
    headline TEXT,

    -- Header for the post grid (e.g., "Latest Recipes"). Critical for UI structure.
    collection_title TEXT,

    -- Intro text displayed below the headline.
    short_description TEXT,

    -- 3. VISUALS (The Storefront Copy)
    -- ------------------------------------------------------------------
    -- Contains "Display-Ready" data mapped from the 'media' table.
    -- DOES NOT contain administrative keys (r2_key).
    --
    -- [spec: images_json]
    -- {
    --   "thumbnail": {                     <-- Slot 1: Menu Icons / Cards
    --     "media_id": 105,                 <-- Reference to Source Media ID
    --     "alt": "Healthy Food Icon",      <-- Copied from Media (or overridden)
    --     "placeholder": "...",            <-- Blurhash String
    --     "variants": {                    <-- FULL SET (Copied from Media)
    --        "xs": { "url": "...", "width": 360 },
    --        "sm": { "url": "...", "width": 720 },
    --        "md": { "url": "...", "width": 1200 },
    --        "lg": { "url": "...", "width": 2048 }
    --     }
    --   },
    --   "cover": {                         <-- Slot 2: Page Hero Background
    --     "media_id": 202,
    --     "variants": { "xs": {...}, "sm": {...}, "md": {...}, "lg": {...} }
    --   }
    -- }
    images_json TEXT DEFAULT '{}',

    -- 4. LOGIC & THEME
    -- ------------------------------------------------------------------
    -- UI Theme Color. Valid HEX format (e.g., #ff6600ff).
    color TEXT DEFAULT '#ff6600ff',

    -- "Featured" flag. 1 = Pin to Homepage/Sidebar. 0 = Standard.
    is_featured BOOLEAN DEFAULT 0,

    -- 5. JSON CONFIG CONTAINERS
    -- ------------------------------------------------------------------
    -- [spec: seo_json]
    -- { "metaTitle": "...", "metaDescription": "...", "noIndex": false }
    seo_json TEXT DEFAULT '{}',

    -- [spec: config_json]
    -- { "postsPerPage": 12, "layoutMode": "grid", "showSidebar": true }
    config_json TEXT DEFAULT '{}',

    -- [spec: i18n_json]
    -- { "fr": { "label": "Recettes", "headline": "..." }, "es": { ... } }
    i18n_json TEXT DEFAULT '{}',

    -- 6. SYSTEM & METRICS
    -- ------------------------------------------------------------------
    sort_order INTEGER DEFAULT 0,       -- 0 = First, 10 = Last
    is_online BOOLEAN DEFAULT 0,        -- 0 = Draft, 1 = Published
    cached_post_count INTEGER DEFAULT 0, -- Background job updates this

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft Deletes: If NOT NULL, consider record deleted.
    deleted_at DATETIME DEFAULT NULL
);

-- ==================================================================================
-- TRIGGERS & INDEXES
-- ==================================================================================

-- TRIGGER: Auto-Update Timestamp
CREATE TRIGGER IF NOT EXISTS update_categories_timestamp
AFTER UPDATE ON categories
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);                 -- Routing
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);          -- Hierarchy
CREATE INDEX IF NOT EXISTS idx_categories_display ON categories(is_online, sort_order); -- Menus
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(is_featured);      -- Home Page Widgets




-- ==================================================================================
-- TABLE: AUTHORS
-- ==================================================================================
-- Purpose: Defines public profiles for article bylines, "Meet the Team" pages, and guest contributors.
-- Strategy: Hybrid SQL/JSON.
--           - SQL: Identity, role-based filtering, and high-level display info.
--           - JSON: Rich assets (images, bio) mapped from the Media Library.
-- ==================================================================================

CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. IDENTITY & ROUTING
    -- ------------------------------------------------------------------
    -- URL identifier. Immutable. Lowercase, kebab-case. 
    -- Regex: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    slug TEXT UNIQUE NOT NULL,

    -- Public Display Name (e.g., "Jane Doe").
    -- VALIDATION: Must not be empty.
    name TEXT NOT NULL,

    -- Internal Contact. MUST be unique to prevent duplicate accounts.
    -- LOGIC: Used for admin authentication or Gravatar fallbacks.
    email TEXT UNIQUE NOT NULL,

    -- 2. DISPLAY METADATA (Top-Level)
    -- ------------------------------------------------------------------
    -- Shown on Article Cards (e.g., "Senior Editor", "Guest Contributor").
    job_title TEXT,

    -- Used for Team Page filtering/sorting.
    -- OPTIONS: 'guest', 'staff', 'editor', 'admin'.
    -- DEFAULT: 'guest' (Safety precaution).
    role TEXT DEFAULT 'guest',

    -- 3. DISPLAY METADATA (SOURCE OF TRUTH FOR TITLE & DESCRIPTION)
    -- Main H1 for the article page (Recipe name if type='recipe').
    headline TEXT NOT NULL,
    -- Optional H2-style subheading near the headline.
    subtitle TEXT,
    -- Primary description used for Cards, Listing pages, and fallback SEO meta.
    short_description TEXT NOT NULL,
    -- Slightly longer teaser for Blog index pages and Newsletter intros.
    excerpt TEXT,
    -- Hero / "chapeau" copy near the top of the article for context/storytelling.
    introduction TEXT,

    -- [spec: images_json]
    -- [
    --   -- Example image slot JSON (for images_json in articles/categories/authors)
-- {
--   -- Slot key describing WHERE this image is used in the layout.
--   -- Common values: "featuredImage", "hero", "thumbnail", "stepImage".
--   "slot": "featuredImage",
--
--   -- Reference to the source asset in the `media` table.
--   -- Used to re-hydrate or update from the central Media Library.
--   "media_id": 105,
--
--   -- Accessible alt text for screen readers and SEO.
--   -- Prefer a concise, descriptive sentence over keyword stuffing.
--   "alt": "Accessible alt text",
--
--   -- Optional visible caption shown under the image on the page.
--   -- Can override the generic `media.caption` for this specific usage.
--   "caption": "Lemon blueberry biscuits on a cooling rack",
--
--   -- Optional credit / attribution line.
--   -- Example: "© Jane Doe Photography" or "Source: Unsplash".
--   "credit": "© Jane Doe Photography",
--
--   -- Low-quality image placeholder (LQIP / blurhash / Base64).
--   -- Used for progressive loading before high-res variants load.
--   "placeholder": "...",
--
--   -- Optional focal point override for this specific usage.
--   -- Percentages in the 0–100 range used for CSS `object-position`
--   -- or for smart cropping in the front-end.
--   "focal_point": { "x": 50, "y": 40 },
--
--   -- Optional aspect ratio hint for layout decisions.
--   -- Examples: "16:9", "4:5". Helps reserve correct space before image loads.
--   "aspectRatio": "16:9",
--
--   -- Responsive image variants copied from `media.variants_json`.
--   -- These should be fully display-ready URLs and dimensions.
--   "variants": {
--     -- Extra-small: mobile cards / small thumbnails.
--     "xs": { "src": "...", "width": 320,  "height": ... },
--
--     -- Small: retina mobile or small inline images.
--     "sm": { "src": "...", "width": 640,  "height": ... },
--
--     -- Medium: standard desktop content width.
--     "md": { "src": "...", "width": 1024, "height": ... },
--
--     -- Large: hero sections / full-width banners.
--     "lg": { "src": "...", "width": 1600, "height": ... }
--   }
-- },
--   {
--   "slot": "mainContentImages",
--   "items": [
--     {
--       "media_id": 123,       -- OPTIONAL: link back to media table
--   "variants": {
--     "xs": { "src": "...", "width": 320,  "height": ... },
--     "sm": { "src": "...", "width": 640,  "height": ... },
--     "md": { "src": "...", "width": 1024, "height": ... },
--     "lg": { "src": "...", "width": 1600, "height": ... }
--   }
--       "alt": "...",          -- accessible description
--       "caption": "...",      -- optional visible caption
--
--       "credit": "© Jane Doe",-- OPTIONAL: per-image credit
--       "focal_point": {       -- OPTIONAL: override default focal point
--         "x": 50,
--         "y": 50
--       },
--       "role": "process"      -- OPTIONAL: "process","hero-detail","step"
--     }
--   ]
-- }
    -- ]
    images_json TEXT DEFAULT '[]',

    -- 4. BIOGRAPHY & SOCIALS
    -- ------------------------------------------------------------------
    -- [spec: bio_json]
    -- {
    --   "short": "Jane writes about tech...",
    --   "long": "## About Jane...",
    --   "socials": [                                 <-- CHANGED TO ARRAY
    --      { 
    --        "network": "twitter",                   -- Icon Key (slug)
    --        "url": "https://x.com/jane",            -- The Link
    --        "label": "@janedoe"                     -- (Optional) Display Text
    --      },
    --      { 
    --        "network": "custom", 
    --        "url": "https://jane.blog", 
    --        "label": "My Personal Blog" 
    --      }
    --   ]
    -- }
    bio_json TEXT DEFAULT '{}',

    -- 5. CONFIGURATION
    -- ------------------------------------------------------------------
    -- SEO Overrides for the Author Profile Page.
    -- [spec: seo_json]
    -- { "metaTitle": "...", "metaDescription": "...", "noIndex": false }
    seo_json TEXT DEFAULT '{}',

    -- 6. SYSTEM
    -- ------------------------------------------------------------------
    -- Visibility Toggle. 0 = Hidden/Draft, 1 = Public Profile.
    is_online BOOLEAN DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Soft Deletes.
    -- CRITICAL: Never hard delete an author who has published posts.
    -- LOGIC: If NOT NULL, author is "archived" but posts remain linked.
    deleted_at DATETIME DEFAULT NULL
);

-- ==================================================================================
-- TRIGGERS & INDEXES
-- ==================================================================================

-- TRIGGER: Auto-Update Timestamp
CREATE TRIGGER IF NOT EXISTS update_authors_timestamp
AFTER UPDATE ON authors
BEGIN
    UPDATE authors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);     -- Routing
CREATE INDEX IF NOT EXISTS idx_authors_role ON authors(role);     -- Team Page Filtering
CREATE INDEX IF NOT EXISTS idx_authors_email ON authors(email);   -- Admin Lookups




-- ==================================================================================
-- TABLE: TAGS (Utility & Filtering)
-- ==================================================================================
-- PURPOSE: 
--   Lightweight descriptors used primarily for filtering content (Sidebar Facets).
--   Designed for high-performance "Tag Clouds" and "Multi-Select" UI logic.
--
-- STRATEGY: "Hybrid SQL/JSON"
--   1. SQL Columns: used for Identity, Sorting (Popularity), and Autocomplete.
--   2. JSON Columns: used for flexible Grouping and visual Customization (SVG).
-- ==================================================================================

CREATE TABLE IF NOT EXISTS tags (
    -- ------------------------------------------------------------------
    -- 1. IDENTITY & ROUTING
    -- ------------------------------------------------------------------
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- URL Identifier. 
    -- CONSTRAINT: Lowercase, kebab-case (e.g., 'gluten-free').
    -- USAGE: Used in URL query params (e.g., ?filters=gluten-free).
    slug TEXT UNIQUE NOT NULL,

    -- Display Label.
    -- USAGE: The text shown on the button (e.g., "Gluten Free").
    label TEXT NOT NULL,

    -- ------------------------------------------------------------------
    -- 2. FILTER LOGIC (Multi-Grouping)
    -- ------------------------------------------------------------------
    -- Defines which "Sections" this tag appears in within the UI filter menu.
    -- Allows a single tag to belong to multiple contexts.
    --
    -- [SPECIFICATION: filter_groups_json]
    -- TYPE: JSON Array of Strings.
    -- EXAMPLE: ["Diet", "Lifestyle", "Popular"]
    -- AGENT RULE: Always initialize as '[]' (Empty Array). Never NULL.
    filter_groups_json TEXT DEFAULT '[]',

    -- ------------------------------------------------------------------
    -- 3. VISUAL STYLING (Design System)
    -- ------------------------------------------------------------------
    -- Stores visual properties including RAW SVG code for instant rendering.
    --
    -- [SPECIFICATION: style_json]
    -- {
    --   "svg_code": "<svg viewBox='0 0 24 24'><path d='...'/></svg>", -- Raw Sanitized SVG
    --   "color": "#10b981",       -- Hex Color for Badge Background/Text
    --   "variant": "outline"      -- UI Variant: 'solid' | 'outline' | 'ghost'
    -- }
    -- AGENT RULE: Ensure 'svg_code' is sanitized (No <script> tags) and has a viewBox.
    style_json TEXT DEFAULT '{}',

    -- ------------------------------------------------------------------
    -- 4. SYSTEM & METRICS
    -- ------------------------------------------------------------------
    -- Metric: Number of active posts using this tag.
    -- USAGE: Critical for sorting the "Tag Cloud" (Most popular tags first).
    -- LOGIC: Updated via background job or trigger on the posts_tags relation table.
    cached_post_count INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================================
-- TRIGGERS & INDEXES
-- ==================================================================================

-- TRIGGER: Auto-Update Timestamp
CREATE TRIGGER IF NOT EXISTS update_tags_timestamp
AFTER UPDATE ON tags
BEGIN
    UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- INDEX: Routing Lookup
-- PURPOSE: Fast lookups when a user hits a URL like /tags/vue-js
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- INDEX: Popularity Sorting (Tag Clouds)
-- PURPOSE: Essential for widgets like "Trending Topics".
-- LOGIC: Sorts by count DESCENDING (High to Low).
CREATE INDEX IF NOT EXISTS idx_tags_popular ON tags(cached_post_count DESC);

-- INDEX: Admin Autocomplete
-- PURPOSE: Makes the Admin UI snappy when searching for existing tags by name.
CREATE INDEX IF NOT EXISTS idx_tags_label ON tags(label);

-- NOTE ON FILTERING:
-- We do NOT index 'filter_groups_json' because SQLite cannot efficiently index JSON arrays.
-- STRATEGY: Frontend fetches all tags (lightweight) and maps them to groups in memory.


-- ==================================================================================
-- TABLE: ARTICLES (The Core Content)
-- ==================================================================================
-- PURPOSE:
--   Stores the main editorial content (Posts, Recipes, Tutorials).
--   Acts as the central node connecting Authors, Categories, and Media.
--
-- STRATEGY: "Hybrid SQL/JSON"
--   1. SQL Columns: Used for Relations (FKs), Sorting, and High-Speed Filtering.
--   2. JSON Columns: Used for flexible Content Blocks and Structured Data.
--
-- AGENT RULES:
--   1. RELATIONSHIPS: Always use IDs (category_id, author_id), never slugs.
--   2. CONTENT: Use the Flattened Block JSON structure (No 'data' wrapper).
--   3. ADS: Never insert 'ad_slot' blocks automatically. Only if explicitly requested.
-- ==================================================================================

-- ========================================================================
-- TABLE: articles
-- PURPOSE:
--   Unified content table for:
--     - Long-form articles
--     - Recipes (with interactive scaling/timers)
--     - Roundup/list posts
-- STRATEGY:
--   - Relational columns for routing, permissions, fast filtering, feeds.
--   - JSON (TEXT) columns for flexible, nested, UI-driven structures.
--   - Minimal, intentional redundancy for fast recipe cards and SEO.
-- NOTE:
--   All timestamps should be stored in UTC; convert in the app/UI.
-- ========================================================================

CREATE TABLE IF NOT EXISTS articles (
    -- --------------------------------------------------------------------
    -- 1. IDENTITY & ROUTING
    -- --------------------------------------------------------------------

    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Surrogate key for internal use, relations, and snapshots.

    slug TEXT UNIQUE NOT NULL,
    -- URL handle used in routes (e.g. "/recipes/{slug}").
    -- Globally unique; if you want to reuse slugs after soft delete,
    -- handle that logic at the app layer for D1.

    type TEXT NOT NULL DEFAULT 'article',
    -- Content kind:
    --   'article' = generic editorial content
    --   'recipe'  = structured recipe
    --   'roundup' = curated list of recipes/articles
    -- Used to switch editor UI and front-end rendering.

    locale TEXT DEFAULT 'en',
    -- Language/locale code for i18n (e.g. "en", "en-US", "fr").
    -- Enables localized routing, indexing, and search.

    -- --------------------------------------------------------------------
    -- 2. RELATIONSHIPS
    -- --------------------------------------------------------------------

    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    -- Main taxonomy bucket (e.g. "Breakfast", "Desserts").
    -- Kept relational for filtering, navigation, and stats.

    author_id   INTEGER NOT NULL REFERENCES authors(id)   ON DELETE RESTRICT,
    -- Primary author/owner for attribution and author archives.

    parent_article_id INTEGER NULL REFERENCES articles(id) ON DELETE SET NULL,
    -- Optional parent for topic clusters / pillar pages.
    -- Example: pillar guide as parent of multiple child recipes.

    -- --------------------------------------------------------------------
    -- 3. DISPLAY METADATA (SOURCE OF TRUTH FOR TITLE & DESCRIPTION)
    -- --------------------------------------------------------------------

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
    -- Primary imagery definition for the article.
    -- Recommended structure:
    -- {
    --   "cover": {
    --     "variants": {
    --       "xs": { "src": "...", "width": 320, "height": 200 },
    --       "sm": { "src": "...", "width": 640, "height": 400 },
    --       "md": { "src": "...", "width": 1024, "height": 640 },
    --       "lg": { "src": "...", "width": 1600, "height": 900 }
    --     },
    --     "alt": "Accessible alt text for the hero image",
    --     "placeholder": "Base64 or low-res placeholder"
    --   },
    --   "gallery": [
    --     { "src": "...", "alt": "...", "caption": "..." }
    --   ]
    -- }
    -- NOTE: cover.variants is mirrored into related_articles_json
    --       for zero-join card rendering.

    -- --------------------------------------------------------------------
    -- 4. RICH CONTENT (BLOCK-BASED BODY)
    -- --------------------------------------------------------------------

    content_json TEXT DEFAULT '[]' CHECK (json_valid(content_json)),
    -- Flattened block array representing the article body.
    -- Example:
    -- [
    --   { "type": "paragraph", "text": "Intro..." },
    --   { "type": "heading", "level": 2, "text": "Ingredients" },
    --   { "type": "ad_slot", "variant": "newsletter" },
    --   { "type": "tip_box", "title": "Pro Tip", "text": "..." }
    -- ]
    -- Frontend/editor interprets "type" to render components.
    -- Avoids schema migrations when adding new block types.

    -- --------------------------------------------------------------------
    -- 5. RECIPE DATA ("GOLD KEY") for type='recipe'
    --   NOTE:
    --     - headline & short_description are the truth for name/description.
    --     - recipe_json focuses on timings, servings, structure, and extras.
    -- --------------------------------------------------------------------

    recipe_json TEXT DEFAULT '{
      "prep": null,
      "cook": null,
      "total": null,
      "servings": null,

      "recipeCategory": null,
      "recipeCuisine": null,
      "keywords": [],

      "difficulty": null,
      "cookingMethod": null,
      "estimatedCost": null,

      "prepTime": null,
      "cookTime": null,
      "totalTime": null,

      "ingredients": [],
      "instructions": [],

      "nutrition": {},
      "aggregateRating": { "ratingValue": null, "ratingCount": 0 },
      "equipment": [],
      "video": null
    }' CHECK (json_valid(recipe_json)),
    -- TIME FIELDS:
    --   prep / cook / total : numeric minutes for internal UX (timers, filters).
    --   prepTime / cookTime / totalTime :
    --     ISO-8601 duration strings (e.g. "PT15M", "PT1H15M") for schema.org.
    --
    -- SERVINGS:
    --   servings : numeric value used for scaling and display.
    --   "recipeYield" string can be derived as e.g. "4 servings" in the app.
    --
    -- CATEGORY / CUISINE / KEYWORDS:
    --   recipeCategory : e.g. "Dessert", "Breakfast".
    --   recipeCuisine  : e.g. "Italian", "Mexican".
    --   keywords       : ["lemon","blueberry","biscuits"] for exports/search.
    --
    -- DIFFICULTY & METHOD:
    --   difficulty    : e.g. "Easy", "Medium", "Hard".
    --   cookingMethod : e.g. "baking", "grilling".
    --   estimatedCost : optional cost label.
    --
    -- INGREDIENTS (GROUPED, SCALABLE):
    --   [
    --     {
    --       "group_title": "Dough",
    --       "items": [
    --         {
    --           "id": "dough-flour",    -- optional stable ID for UI/shopping lists
    --           "amount": 315.0,       -- FLOAT; REQUIRED for scaling logic
    --           "unit": "grams",
    --           "name": "all-purpose flour",
    --           "notes": "sifted",
    --           "isOptional": false
    --         }
    --       ]
    --     },
    --     {
    --       "group_title": "Glaze",
    --       "items": [ ... ]
    --     }
    --   ]
    -- AGENT RULE:
    --   - Ingredients must be grouped.
    --   - Each item must include "amount" as FLOAT + "unit" + "name".
    --
    -- INSTRUCTIONS (GROUPED, WITH TIMERS):
    --   [
    --     {
    --       "section_title": "Make the dough",
    --       "steps": [
    --         {
    --           "name": "Mix dry ingredients",  -- optional step title
    --           "text": "Whisk flour and sugar together.",
    --           "image": null,                  -- optional step image URL
    --           "timer": null                   -- INTEGER seconds or null
    --         },
    --         {
    --           "name": "Bake",
    --           "text": "Bake until golden.",
    --           "image": null,
    --           "timer": 1200                   -- e.g. 20 minutes
    --         }
    --       ]
    --     }
    --   ]
    -- AGENT RULE:
    --   - Instructions must be grouped into sections.
    --   - Each step has "text" and optional "timer" as INTEGER seconds.
    --
    -- NUTRITION:
    --   {
    --     "calories": 320,
    --     "fatContent": "15g",
    --     "carbohydrateContent": "40g",
    --     "proteinContent": "4g",
    --     "sugarContent": "12g",
    --     "sodiumContent": "220mg",
    --     "servingSize": "1 biscuit (80g)"
    --   }
    --
    -- AGGREGATE RATING (truth for rating values):
    --   {
    --     "ratingValue": 4.8,
    --     "ratingCount": 55
    --   }
    --
    -- EQUIPMENT:
    --   ["Oven", "Mixing bowl", "Sheet pan"]
    --
    -- VIDEO:
    --   {
    --     "url": "https://...",
    --     "name": "How to Make Lemon Biscuits",
    --     "description": "Step-by-step video tutorial.",
    --     "thumbnailUrl": "https://...",
    --     "duration": "PT2M30S"    -- ISO-8601 duration
    --   }

    -- --------------------------------------------------------------------
    -- 6. ROUNDUP / LIST DATA for type='roundup'
    -- --------------------------------------------------------------------

    roundup_json TEXT DEFAULT '{
      "items": [],
      "listType": "ItemList"
    }' CHECK (json_valid(roundup_json)),
    -- Roundup / collection structure.
    -- {
    --   "listType": "ItemList",
    --   "items": [
    --     {
    --       "position": 1,
    --       "article_id": 123,         -- internal reference (optional)
    --       "external_url": null,      -- external link if not internal
    --       "title": "Best Lemon Biscuits",
    --       "subtitle": "Crisp edges, fluffy center",
    --       "note": "Great for brunch.",
    --       "cover": {
    --         "variants": { ... }      -- same shape as images_json.cover.variants
    --       }
    --     }
    --   ]
    -- }
    -- Supports:
    --   - Reordering via "position".
    --   - Mixed internal/external items.
    --   - Pre-baked covers for fast card rendering.

    -- --------------------------------------------------------------------
    -- 7. STRUCTURED FAQ (SEO)
    -- --------------------------------------------------------------------

    faqs_json TEXT DEFAULT '[]' CHECK (json_valid(faqs_json)),
    -- FAQ entries for FAQPage markup and on-page accordions.
    -- [
    --   { "q": "Can I freeze the dough?", "a": "Yes, up to 3 months..." },
    --   { "q": "Can I use almond milk?", "a": "Yes, but texture changes..." }
    -- ]

    -- --------------------------------------------------------------------
    -- 8. SNAPSHOTS & CACHES (ZERO-JOIN RENDERING)
    -- --------------------------------------------------------------------

    related_articles_json TEXT DEFAULT '[]' CHECK (json_valid(related_articles_json)),
    -- Snapshot of related articles/recipes for sidebars and "More like this".
    -- [
    --   {
    --     "id": 42,
    --     "slug": "lemon-blueberry-biscuits",
    --     "headline": "Lemon Blueberry Biscuits",
    --     "cover": {
    --       "variants": {
    --         "xs": {...},
    --         "sm": {...},
    --         "md": {...},
    --         "lg": {...}
    --       }
    --     }
    --   }
    -- ]
    -- AGENT RULE:
    --   Always copy full cover.variants set from the target article's
    --   images_json so related cards stay visually consistent.

    cached_tags_json TEXT DEFAULT '[]' CHECK (json_valid(cached_tags_json)),
    -- Flattened label set for fast tag filters & card badges.
    -- Example: ["Vegan", "Gluten-Free", "Under 30 Minutes"].

    cached_comment_count INTEGER DEFAULT 0,
    -- Denormalized total comment count for quick display.

    cached_rating_json TEXT DEFAULT '{}' CHECK (json_valid(cached_rating_json)),
    -- Optional denormalized rating snapshot for cards/lists:
    -- {
    --   "ratingValue": 4.8,
    --   "ratingCount": 55
    -- }
    -- Source of truth should be recipe_json.aggregateRating.

    reading_time_minutes INTEGER DEFAULT 0,
    -- Approximate reading time (whole minutes) for long-form articles.

    cached_recipe_json TEXT DEFAULT '{
      "isRecipe": false,
      "totalTimeMinutes": null,
      "difficulty": null,
      "servings": null,
      "caloriesPerServing": null,
      "primaryDietLabels": [],
      "primaryOccasionLabels": [],
      "mainIngredients": [],
      "isQuick": false,
      "isHealthy": false,
      "isBudget": false
    }' CHECK (json_valid(cached_recipe_json)),
    -- Trimmed recipe snapshot optimized for listing cards & filters:
    --   isRecipe             : quick flag to choose recipe vs article card.
    --   totalTimeMinutes     : for "30 min" badges & "Under X minutes" filters.
    --   difficulty           : "Easy","Medium","Hard".
    --   servings             : show "Serves 4".
    --   caloriesPerServing   : show "320 cal".
    --   primaryDietLabels    : ["Vegan","Gluten-Free"].
    --   primaryOccasionLabels: ["Christmas","Weeknight"].
    --   mainIngredients      : ["Chicken","Lemon"].
    --   isQuick              : boolean for quick recipes lane.
    --   isHealthy            : boolean based on nutrition rules.
    --   isBudget             : boolean based on cost rules.

    total_time_minutes INTEGER,
    -- Scalar helper for D1 indexing & fast filters (mirrors totalTimeMinutes).

    difficulty_label   TEXT,
    -- Scalar helper for indexing/filters (mirrors recipe_json.difficulty
    -- or cached_recipe_json.difficulty).

    -- --------------------------------------------------------------------
    -- 9. SEO & STRUCTURED DATA
    -- --------------------------------------------------------------------

    seo_json TEXT DEFAULT '{
      "metaTitle": null,
      "metaDescription": null,
      "noIndex": false,
      "canonical": null,
      "ogImage": null
    }' CHECK (json_valid(seo_json)),
    -- Per-article SEO overrides:
    --   metaTitle       : custom <title>; fallback is headline.
    --   metaDescription : SEO meta description; fallback is short_description.
    --   noIndex         : true to exclude from search engines.
    --   canonical       : canonical URL to avoid duplicate content issues.
    --   ogImage         : social share image override (URL/key).

    jsonld_json TEXT DEFAULT '[]' CHECK (json_valid(jsonld_json)),
    -- Pre-generated JSON-LD blobs (Recipe, HowTo, ItemList, FAQPage, ...).
    -- Lets you do expensive schema generation once at save time.

    -- --------------------------------------------------------------------
    -- 10. CONFIG, WORKFLOW, EXPERIMENTS
    -- --------------------------------------------------------------------

    config_json TEXT DEFAULT '{
      "allowComments": true,
      "manualRelatedIds": [],
      "experimentKey": null,
      "experimentVariant": null
    }' CHECK (json_valid(config_json)),
    -- Per-article feature toggles and A/B test hooks:
    --   allowComments    : enable/disable comments for this article.
    --   manualRelatedIds : hard-coded related article IDs (override auto).
    --   experimentKey    : identifier for experiments ("headline-test-2025-01").
    --   experimentVariant: "A","B","control", etc.

    workflow_status TEXT DEFAULT 'draft',
    -- Editorial workflow:
    --   'draft'      : in progress.
    --   'in_review'  : awaiting editor approval.
    --   'scheduled'  : approved, will go live at scheduled_at.
    --   'published'  : live.
    --   'archived'   : not actively promoted, but still accessible.

    scheduled_at DATETIME NULL,
    -- Optional scheduled publish date/time (UTC).
    -- Your app can flip is_online + workflow_status when this time is reached.

    -- --------------------------------------------------------------------
    -- 11. SYSTEM & ACCESS CONTROL
    -- --------------------------------------------------------------------

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

-- ========================================================================
-- INDEXES
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_articles_slug
    ON articles(slug);
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

CREATE INDEX IF NOT EXISTS idx_articles_total_time
    ON articles(total_time_minutes);
-- Fast "Under X minutes" recipe filters.

CREATE INDEX IF NOT EXISTS idx_articles_difficulty
    ON articles(difficulty_label);
-- Fast "Easy/Medium/Hard" recipe filters.

-- ========================================================================
-- TRIGGERS
-- ========================================================================

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
CREATE TABLE IF NOT EXISTS articles_to_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);
CREATE INDEX idx_tag_to_article ON articles_to_tags(tag_id);


-- ==================================================================
-- 4. RECHERCHE (FTS5)
-- ==================================================================

-- Search Index for Articles and Recipes
-- Includes headline, metadata, and flattened JSON content
CREATE VIRTUAL TABLE IF NOT EXISTS idx_articles_search USING fts5(
    headline,
    subtitle,
    short_description,
    body_content, -- Flattened text from content_json + recipe_json
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

-- Trigger: Sync Articles on INSERT
CREATE TRIGGER IF NOT EXISTS trg_articles_search_ai AFTER INSERT ON articles 
BEGIN
  INSERT INTO idx_articles_search(rowid, headline, subtitle, short_description, body_content)
  VALUES (
    NEW.id, 
    NEW.headline, 
    NEW.subtitle, 
    NEW.short_description, 
    (
      SELECT GROUP_CONCAT(txt, ' ') FROM (
        -- 1. Extract plain text from the content_json blocks
        SELECT json_extract(value, '$.text') as txt 
        FROM json_each(NEW.content_json) 
        WHERE json_extract(value, '$.text') IS NOT NULL
        
        UNION ALL
        
        -- 2. Extract ingredient names from recipe_json (for deep searching)
        SELECT json_extract(i.value, '$.name') 
        FROM json_each(NEW.recipe_json, '$.ingredients') as g, 
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'
      )
    )
  );
END;

-- Trigger: Sync Articles on UPDATE
CREATE TRIGGER IF NOT EXISTS trg_articles_search_au AFTER UPDATE ON articles 
BEGIN
  -- Clean up old index entry
  INSERT INTO idx_articles_search(idx_articles_search, rowid, headline, subtitle, short_description, body_content)
  VALUES('delete', OLD.id, OLD.headline, OLD.subtitle, OLD.short_description, '');
  
  -- Insert fresh index entry
  INSERT INTO idx_articles_search(rowid, headline, subtitle, short_description, body_content)
  VALUES (
    NEW.id, 
    NEW.headline, 
    NEW.subtitle, 
    NEW.short_description, 
    (
      SELECT GROUP_CONCAT(txt, ' ') FROM (
        SELECT json_extract(value, '$.text') as txt FROM json_each(NEW.content_json)
        WHERE json_extract(value, '$.text') IS NOT NULL
        UNION ALL
        SELECT json_extract(i.value, '$.name') 
        FROM json_each(NEW.recipe_json, '$.ingredients') as g, 
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'
      )
    )
  );
END;

-- Trigger: Sync Articles on DELETE (Handles Soft Delete Logic)
CREATE TRIGGER IF NOT EXISTS trg_articles_search_ad AFTER DELETE ON articles 
BEGIN
  INSERT INTO idx_articles_search(idx_articles_search, rowid, headline, subtitle, short_description, body_content)
  VALUES('delete', OLD.id, OLD.headline, OLD.subtitle, OLD.short_description, '');
END;


-- =====================================================================
-- TABLE: pinterest_boards
-- PURPOSE:
--   - Store your Pinterest boards as selectable targets in the admin.
--   - Provide metadata (URL, locale, status) for organizing pins.
-- =====================================================================

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

    board_url TEXT,
    -- Full Pinterest board URL, e.g.:
    --   "https://www.pinterest.com/your_profile/quick-dinners/"
    -- Used for quick access from the admin and for reference.

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



-- =====================================================================
-- TABLE: pinterest_pins
-- PURPOSE:
--   - Store everything needed to manually upload pins (via CSV, etc.).
--   - Independent of any social_posts table.
--   - One row = one pin-ready asset + metadata for a given board/section.
-- =====================================================================

CREATE TABLE IF NOT EXISTS pinterest_pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Optional direct link to content (recommended)
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    -- Lets you regenerate/update title/description from the article later.

    board_id   INTEGER REFERENCES pinterest_boards(id) ON DELETE SET NULL,

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

    exported_at     DATETIME,
    -- Last time this row was included in an export/CSV.

    export_batch_id TEXT,
    -- Optional identifier to group rows by export batch (e.g. "2025-12-17-pm").

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pinterest_pins_board
    ON pinterest_pins(board_id);

CREATE INDEX IF NOT EXISTS idx_pinterest_pins_batch
    ON pinterest_pins(export_batch_id);

CREATE TRIGGER IF NOT EXISTS update_pinterest_pins_timestamp
AFTER UPDATE ON pinterest_pins
BEGIN
    UPDATE pinterest_pins SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- Templates pour le générateur d'images Admin (Canvas)
CREATE TABLE IF NOT EXISTS pin_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    elements_json TEXT NOT NULL, -- Configuration JSON du design
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

