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
--
-- COMMON KEYS (Pre-defined for reference):
-- ┌─────────────────┬──────────────────────────────────────────────────────────────┐
-- │ Key             │ Example Value Structure                                      │
-- ├─────────────────┼──────────────────────────────────────────────────────────────┤
-- │ site_info       │ {"name": "Freecipies", "tagline": "...", "logo": {...}}      │
-- │ social_links    │ {"facebook": "...", "instagram": "...", "pinterest": "..."}  │
-- │ seo_defaults    │ {"titleSuffix": " | Freecipies", "defaultOgImage": "..."}    │
-- │ theme_config    │ {"primaryColor": "#ff6600", "darkMode": false}               │
-- │ scripts         │ {"googleAnalytics": "G-XXX", "headerScripts": "..."}         │
-- │ footer_config   │ {"copyright": "© 2025", "links": [...]}                      │
-- │ newsletter      │ {"provider": "mailchimp", "listId": "...", "enabled": true}  │
-- │ contact_info    │ {"email": "...", "address": "...", "phone": "..."}           │
-- └─────────────────┴──────────────────────────────────────────────────────────────┘
-- ==================================================================================

CREATE TABLE IF NOT EXISTS site_settings (
    -- The unique identifier for the setting group.
    -- Examples: 'site_info', 'social_links', 'theme_config', 'scripts'
    -- CONSTRAINT: Use snake_case, lowercase (e.g., 'footer_config', NOT 'FooterConfig').
    key TEXT PRIMARY KEY,

    -- The configuration payload.
    -- IMPORTANT: This column stores JSON strings, not simple text.
    -- This allows nesting complex data without creating multiple columns.
    -- Example: '{"facebook": "https://facebook.com/...", "twitter": "..."}'
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

-- INDEX: Fast lookup by category for Admin Settings page sections.
CREATE INDEX IF NOT EXISTS idx_site_settings_category 
    ON site_settings(category, sort_order);

-- TRIGGER: Auto-update timestamp on any change.
CREATE TRIGGER IF NOT EXISTS update_site_settings_timestamp
AFTER UPDATE ON site_settings
BEGIN
    UPDATE site_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;


-- ==================================================================================
-- TABLE: MEDIA (Centralized Asset Library - Long Term Support)
-- ==================================================================================
-- Purpose: Central repository for all uploaded images with responsive variants.
-- Strategy: SQL columns for searchable metadata + JSON for technical payloads.
--
-- DELETION SAFETY:
--   When deleting a media row, the backend MUST:
--   1. Read variants_json to extract r2_key for ALL variants (xs, sm, md, lg).
--   2. Send DeleteObject commands to R2 for each variant.
--   3. Only then delete (or soft-delete) the SQL row.
--   This prevents "orphaned files" (ghost files) on R2 storage.
-- ==================================================================================

CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 1. SEARCHABLE METADATA (Standard SQL Columns)
    -- ------------------------------------------------------------------
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
    caption TEXT, 

    -- Legal / Copyright info. 
    -- Example: "© Photography by Marie Dupont" or "Source: Unsplash".
    -- Displayed in image overlays or footers when attribution is required.
    credit TEXT,  
    
    -- Filter helper (e.g., 'image/webp', 'image/gif', 'video/mp4').
    -- REQUIRED: Used to filter Media Library by type.
    mime_type TEXT NOT NULL DEFAULT 'image/webp',

    -- Optional human-readable ratio hint ("16:9", "4:5", "1:1").
    -- Used for layout hints and space reservation before image loads.
    -- Calculated from the largest variant (lg) dimensions at upload time.
    aspect_ratio TEXT,

    -- 2. TECHNICAL PAYLOAD (The "Plumbing")
    -- ------------------------------------------------------------------
    -- Stores the references to the physical files on R2.
    -- Read-only for the frontend; managed by the upload pipeline.
    --
    -- BREAKPOINT STRATEGY (Width targets, height auto-calculated from aspect ratio):
    -- ┌─────────┬────────┬─────────────────────────────────────────────────┐
    -- │ Variant │ Width  │ Target Devices                                  │
    -- ├─────────┼────────┼─────────────────────────────────────────────────┤
    -- │ xs      │ 360px  │ Budget phones, 1x screens (iPhone SE = 375px)  │
    -- │ sm      │ 720px  │ Phones 2x retina (360 × 2), small tablets      │
    -- │ md      │ 1200px │ Tablets, laptops, standard desktop content     │
    -- │ lg      │ 2048px │ 4K displays, MacBook Retina, iPad Pro          │
    -- └─────────┴────────┴─────────────────────────────────────────────────┘
    --
    -- SCHEMA:
    -- {
    --   "variants": {
    --     "original": { "url": "...", "r2_key": "...", "width": 4000, "height": 3000, "sizeBytes": 412345 },  -- OPTIONAL
    --     "xs": { "url": "https://...", "r2_key": "2025/03/image-xs.webp", "width": 360,  "height": 240, "sizeBytes": 23123 },
    --     "sm": { "url": "https://...", "r2_key": "2025/03/image-sm.webp", "width": 720,  "height": 480, "sizeBytes": 54321 },
    --     "md": { "url": "https://...", "r2_key": "2025/03/image-md.webp", "width": 1200, "height": 800, "sizeBytes": 102345 },
    --     "lg": { "url": "https://...", "r2_key": "2025/03/image-lg.webp", "width": 2048, "height": 1365, "sizeBytes": 198765 }
    --   },
    --   "placeholder": "data:image/jpeg;base64,/9j/4AAQ..." (Blurhash/LQIP, <1KB)
    -- }
    --
    -- VARIANT RULES:
    --   - xs, sm, md, lg: REQUIRED. All 4 must be present.
    --   - original: OPTIONAL. Only stored when source image > 2048px.
    --               Used for Pin Creator templates and future re-processing.
    --               Preserves full quality for high-res outputs.
    --
    -- AGENT RULE: When source < 2048px, use source as "lg" and skip "original".
    -- TYPESCRIPT: Import from @shared/types/images
    --   - StorageVariant (with r2_key) for internal processing
    --   - ImageVariant (without r2_key) for API responses
    --   - MediaVariantsJson for full { variants, placeholder } structure
    
    variants_json TEXT NOT NULL,

    -- 3. SMART DISPLAY (Design Control)
    -- ------------------------------------------------------------------
    -- Focal Point for CSS `object-position`.
    -- Prevents the subject from being cropped out on mobile screens.
    -- SCHEMA: {"x": 50, "y": 50} (Percentages 0-100).
    -- DEFAULT: Center (50, 50). Updated via click-to-set in Admin UI.
    focal_point_json TEXT DEFAULT '{"x": 50, "y": 50}',

    -- 4. SYSTEM METADATA
    -- ------------------------------------------------------------------
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

-- INDEXES
-- Optimized for the Admin Media Library search bar.
CREATE INDEX IF NOT EXISTS idx_media_search ON media(name, alt_text, credit);

-- Optimized for "Most Recent" sorting in Media Library.
CREATE INDEX IF NOT EXISTS idx_media_date ON media(created_at DESC);

-- Filter out soft-deleted items efficiently.
CREATE INDEX IF NOT EXISTS idx_media_active ON media(deleted_at);

-- TRIGGER: Auto-update timestamp on any metadata change.
CREATE TRIGGER IF NOT EXISTS update_media_timestamp
AFTER UPDATE ON media
BEGIN
    UPDATE media SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;





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
--
-- FIELD REQUIREMENTS:
-- ┌─────────────────────┬──────────┬────────────────────────────────────────────┐
-- │ Field               │ Required │ Criteria / Notes                           │
-- ├─────────────────────┼──────────┼────────────────────────────────────────────┤
-- │ slug                │ ✅ YES   │ URL-safe, unique, immutable after creation │
-- │ label               │ ✅ YES   │ Menu display name, <20 chars               │
-- │ parent_id           │ ❌ NO    │ Only for subcategories                     │
-- │ headline            │ ❌ NO    │ Falls back to 'label' if NULL              │
-- │ collection_title    │ ❌ NO    │ Falls back to 'headline' or 'label'        │
-- │ short_description   │ ❌ NO    │ Recommended for SEO                        │
-- │ images_json         │ ❌ NO    │ But recommended (thumbnail + cover)        │
-- │ color               │ ❌ NO    │ Defaults to #ff6600ff                      │
-- │ icon_svg            │ ❌ NO    │ Optional menu icon                         │
-- │ is_featured         │ ❌ NO    │ Defaults to false                          │
-- │ seo_json            │ ❌ NO    │ Overrides only (falls back to label/desc)  │
-- │ config_json         │ ❌ NO    │ Defaults applied at app layer              │
-- │ i18n_json           │ ❌ NO    │ Only for multilingual sites                │
-- └─────────────────────┴──────────┴────────────────────────────────────────────┘
-- ==================================================================================

CREATE TABLE IF NOT EXISTS categories (
    -- Surrogate primary key.
    -- Used for relations (articles.category_id) and internal references.
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- =========================================================================
    -- 1. NAVIGATION & HIERARCHY
    -- =========================================================================

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

    -- =========================================================================
    -- 2. DISPLAY TEXT (Landing Page Content)
    -- =========================================================================

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

    -- =========================================================================
    -- 3. VISUALS (Display-Ready Image Data)
    -- =========================================================================
    -- Contains "Display-Ready" data mapped from the 'media' table.
    -- SECURITY: Does NOT contain administrative keys (r2_key).
    -- AGENT RULE: When selecting an image from Media Library, copy the full
    --             variant set here for zero-join rendering.
    --
    -- SCHEMA (images_json):
    -- {
    --   "thumbnail": {                     <-- Slot 1: Menu Icons / Category Cards
    --     "media_id": 105,                 <-- Reference to source Media ID
    --     "alt": "Healthy breakfast bowl", <-- Copied from Media (or overridden)
    --     "caption": "...",                <-- Optional visible caption
    --     "credit": "© Photographer",      <-- Optional attribution
    --     "placeholder": "data:image/...", <-- Blurhash/LQIP string (<1KB)
    --     "focal_point": { "x": 50, "y": 30 },  <-- Optional override for cropping
    --     "aspectRatio": "16:9",           <-- Layout hint for space reservation
    --     "variants": {                    <-- FULL SET copied from Media
    --        "original": { "url": "...", "width": 4000, "height": 3000, "sizeBytes": 50000 },  <-- OPTIONAL
    --        "lg": { "url": "...", "width": 2048, "height": 1365, "sizeBytes": 50000 },
    --        "md": { "url": "...", "width": 1200, "height": 800, "sizeBytes": 102345 },
    --        "sm": { "url": "...", "width": 720, "height": 480, "sizeBytes": 54321 },
    --        "xs": { "url": "...", "width": 360, "height": 240, "sizeBytes": 23123 }
    --     }
    --   },
    --   "cover": {                         <-- Slot 2: Hero Background Image
    --     "media_id": 202,
    --     "alt": "...",
    --     "placeholder": "...",
    --     "focal_point": { "x": 50, "y": 50 },
    --     "aspectRatio": "16:9",
    --     "variants": {
    --        "original": { "url": "...", "width": 4000, "height": 2250, "sizeBytes": 50000 },
    --        "lg": { "url": "...", "width": 2048, "height": 1152, "sizeBytes": 198765 },
    --        "md": { "url": "...", "width": 1200, "height": 675, "sizeBytes": 102345 },
    --        "sm": { "url": "...", "width": 720, "height": 405, "sizeBytes": 54321 },
    --        "xs": { "url": "...", "width": 360, "height": 203, "sizeBytes": 23123 }
    --     }
    --   }
    -- }
    --
    -- VARIANT STRUCTURE:
    --   Each variant contains:
    --   - url (string, REQUIRED): Public CDN URL
    --   - width (integer, REQUIRED): Width in pixels
    --   - height (integer, REQUIRED): Height in pixels (for CLS prevention)
    --
    -- VARIANT RULES:
    --   - xs, sm, md, lg: Always present (copied from Media).
    --   - original: Only present if source image was > 2048px.
    --               Used for Pin Creator templates and high-quality exports.
    --
    -- FUTURE FIELDS (Reserved for later):
        -- TYPESCRIPT: Import CategoryImagesJson, ImageSlot from @shared/types/images
    --
    --   - format: "webp" | "avif" | "jpeg" (for multi-format serving)
    --   - avif: { "url": "...", ... } (alternative AVIF variants)
    images_json TEXT DEFAULT '{}' CHECK (json_valid(images_json)),

    -- =========================================================================
    -- 4. LOGIC & THEME
    -- =========================================================================

    -- UI theme color for category badges, borders, and accents.
    -- FORMAT: 8-character HEX with alpha (e.g., #ff6600ff).
    -- USAGE: CSS variables, category pills, hover states.
    -- DEFAULT: Orange (#ff6600ff).
    color TEXT DEFAULT '#ff6600ff',

    -- Raw SVG code for menu icons and category badges.
    -- USAGE: Navigation menus, category cards, breadcrumbs, mobile tabs.
    -- FORMAT: Valid SVG with viewBox attribute.
    -- EXAMPLE: '<svg viewBox="0 0 24 24"><path d="M12 2L..."/></svg>'
    -- SECURITY: Must be sanitized (no <script>, no event handlers like onclick).
    -- SIZE LIMIT: Keep under 2KB. Use path-only icons, no embedded images.
    icon_svg TEXT,

    -- Featured flag for homepage and sidebar widgets.
    -- 1 = Display in "Featured Categories" section.
    -- 0 = Standard category (default).
    -- LIMIT: Recommend max 4-6 featured categories for UX.
    is_featured BOOLEAN DEFAULT 0,

    -- =========================================================================
    -- 5. JSON CONFIG CONTAINERS
    -- =========================================================================

    -- SEO overrides for the category landing page.
    -- FALLBACK: If fields are NULL, app layer uses headline/short_description.
    -- SCHEMA (seo_json):
    -- {
    --   "metaTitle": "Best Breakfast Recipes | Freecipies",  <-- <title> tag
    --   "metaDescription": "Discover 100+ easy breakfast...", <-- <meta name="description">
    --   "noIndex": false,                  <-- true = hide from search engines
    --   "canonical": null,                 <-- Override canonical URL if needed
    --   "ogImage": "https://...",          <-- Social share image (Facebook/Twitter)
    --   "ogTitle": null,                   <-- Override OG title (falls back to metaTitle)
    --   "ogDescription": null,             <-- Override OG description
    --   "twitterCard": "summary_large_image",  <-- "summary" | "summary_large_image"
    --   "robots": null                     <-- Custom robots: "nofollow,noarchive"
    -- }
    seo_json TEXT DEFAULT '{}' CHECK (json_valid(seo_json)),

    -- Layout and behavior configuration for the category page.
    -- SCHEMA (config_json):
    -- {
    --   "postsPerPage": 12,                <-- Pagination limit
    --   "layoutMode": "grid",              <-- "grid" | "list" | "masonry"
    --   "cardStyle": "full",               <-- "compact" | "full" | "minimal"
    --   "showSidebar": true,               <-- Show/hide sidebar on landing
    --   "showFilters": true,               <-- Show tag filter toggles
    --   "showBreadcrumb": true,            <-- Show breadcrumb navigation
    --   "showPagination": true,            <-- Show pagination controls
    --   "sortBy": "publishedAt",           <-- Default sort: "publishedAt" | "title" | "viewCount"
    --   "sortOrder": "desc",               <-- "asc" | "desc"
    --   "headerStyle": "hero",             <-- "hero" | "minimal" | "none"
    --   "tldr": "Quick summary text",      <-- Optional summary under the headline
    --   "showInNav": true,                 <-- Category appears in navigation menu
    --   "showInFooter": false,             <-- Category appears in footer
    --   "featuredArticleId": 123,          <-- Featured recipe ID for hero
    --   "showFeaturedRecipe": true,        <-- Show featured recipe card in hero
    --   "showHeroCta": true,               <-- Show CTA button in hero
    --   "heroCtaText": "Join My Mailing List", <-- CTA button label
    --   "heroCtaLink": "#newsletter"       <-- CTA anchor or URL
    -- }
    config_json TEXT DEFAULT '{}' CHECK (json_valid(config_json)),

    -- Internationalization overrides for multilingual sites.
    -- SCHEMA (i18n_json):
    -- {
    --   "fr": { "label": "Petit-déjeuner", "headline": "Recettes du matin" },
    --   "es": { "label": "Desayuno", "headline": "Recetas de desayuno" }
    -- }
    -- USAGE: App layer checks user locale, falls back to base fields.
    i18n_json TEXT DEFAULT '{}' CHECK (json_valid(i18n_json)),

    -- =========================================================================
    -- 6. SYSTEM & METRICS
    -- =========================================================================

    -- Display order for menus and navigation.
    -- LOGIC: Lower numbers appear first.
    -- TIP: Use increments of 10 (10, 20, 30) for easy reordering.
    sort_order INTEGER DEFAULT 0,

    -- Visibility toggle.
    -- 0 = Draft (hidden from public, visible in Admin).
    -- 1 = Published (visible to all users).
    is_online BOOLEAN DEFAULT 0,

    -- Denormalized count of published articles in this category.
    -- UPDATED BY: Background job or trigger when articles change.
    -- USAGE: Display "42 recipes" badge on category cards.
    cached_post_count INTEGER DEFAULT 0 CHECK (cached_post_count >= 0),

    -- Record creation timestamp (UTC).
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Last modification timestamp (UTC).
    -- Auto-updated by trigger on any column change.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft delete marker.
    -- NULL = Active record.
    -- NOT NULL = Logically deleted (hidden from queries, kept for recovery).
    -- AGENT RULE: All queries should include WHERE deleted_at IS NULL.
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
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(deleted_at);         -- Soft delete filter




-- ==================================================================================
-- TABLE: AUTHORS
-- ==================================================================================
-- Purpose: Defines public profiles for article bylines, "Meet the Team" pages, and guest contributors.
-- Strategy: Hybrid SQL/JSON.
--           - SQL: Identity, role-based filtering, and high-level display info.
--           - JSON: Rich assets (images, bio) mapped from the Media Library.
--
-- FIELD REQUIREMENTS:
-- ┌─────────────────────┬──────────┬────────────────────────────────────────────┐
-- │ Field               │ Required │ Criteria / Notes                           │
-- ├─────────────────────┼──────────┼────────────────────────────────────────────┤
-- │ slug                │ ✅ YES   │ URL-safe, unique, immutable after creation │
-- │ name                │ ✅ YES   │ Public display name                        │
-- │ email               │ ✅ YES   │ Unique, for admin/auth                     │
-- │ job_title           │ ❌ NO    │ Shown on article cards                     │
-- │ role                │ ❌ NO    │ Defaults to 'guest'                        │
-- │ headline            │ ❌ NO    │ Falls back to name                         │
-- │ subtitle            │ ❌ NO    │ Optional tagline                           │
-- │ short_description   │ ❌ NO    │ Falls back to bio_json.short               │
-- │ excerpt             │ ❌ NO    │ Newsletter teaser                          │
-- │ introduction        │ ❌ NO    │ Hero copy for profile page                 │
-- │ images_json         │ ❌ NO    │ But recommended (avatar + cover)           │
-- │ bio_json            │ ❌ NO    │ Bio text + social links                    │
-- │ seo_json            │ ❌ NO    │ Overrides only                             │
-- └─────────────────────┴──────────┴────────────────────────────────────────────┘
-- ==================================================================================

CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- =========================================================================
    -- 1. IDENTITY & ROUTING
    -- =========================================================================

    -- URL identifier for routing.
    -- IMMUTABLE: Should never change after creation (breaks SEO/bookmarks).
    -- FORMAT: Lowercase, kebab-case only.
    -- REGEX: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    -- EXAMPLES: "jane-doe", "chef-john", "guest-contributor-2024"
    slug TEXT UNIQUE NOT NULL,

    -- Public display name shown on article bylines and profile page.
    -- EXAMPLES: "Jane Doe", "Chef John", "The Freecipies Team"
    name TEXT NOT NULL,

    -- Internal contact email (unique per author).
    -- USAGE: Admin authentication, Gravatar fallback, notifications.
    -- SECURITY: Not exposed publicly unless bio_json contains it.
    email TEXT UNIQUE NOT NULL,

    -- =========================================================================
    -- 2. DISPLAY METADATA (Profile & Cards)
    -- =========================================================================

    -- Job title/role shown on article cards and profile page.
    -- EXAMPLES: "Senior Editor", "Guest Contributor", "Founder & Chef"
    job_title TEXT,

    -- Internal role for permissions and filtering.
    -- OPTIONS: 'guest', 'staff', 'editor', 'admin'
    -- DEFAULT: 'guest' (safety precaution for new authors)
    -- USAGE: Team page filtering, admin permissions.
    role TEXT DEFAULT 'guest' CHECK (role IN ('guest', 'staff', 'editor', 'admin')),

    -- Main H1 for the author profile page.
    -- FALLBACK: If NULL, use 'name' value.
    -- EXAMPLE: "Meet Jane Doe, Our Senior Food Editor"
    headline TEXT,

    -- Optional H2-style subheading/tagline.
    -- EXAMPLE: "Passionate about healthy Mediterranean cuisine"
    subtitle TEXT,

    -- Primary description for cards and listing pages.
    -- REQUIRED: Used for author cards and SEO.
    -- RECOMMENDED: 100-160 characters.
    short_description TEXT NOT NULL,

    -- Longer teaser for blog index and newsletter intros.
    -- EXAMPLE: "Jane has been writing about food for over 10 years..."
    excerpt TEXT,

    -- Hero/chapeau copy for the top of the profile page.
    -- Can include markdown for rich formatting.
    introduction TEXT,

    -- =========================================================================
    -- 3. VISUALS (Display-Ready Image Data)
    -- =========================================================================
    -- Standardized format matching categories table.
    --
    -- SCHEMA (images_json) - Matches ImageSlot from @shared/types/images:
    -- {
    --   "avatar": {                        <-- Slot 1: Profile photos, byline
    --     "media_id": 105,                 <-- Reference to source Media ID
    --     "alt": "Jane Doe headshot",      <-- SEO / Accessibility text
    --     "caption": "Chef Jane Doe",      <-- Optional visible caption
    --     "credit": "� Photo Studio",      <-- Optional attribution
    --     "placeholder": "data:image/...", <-- Blurhash/LQIP (<1KB)
    --     "focal_point": { "x": 50, "y": 30 },  <-- Cropping hint (0-100)
    --     "aspectRatio": "1:1",            <-- Square for avatars
    --     "variants": {                    <-- SPECIAL SIZES for avatars!
    --        "original": { "url": "...", "width": 800, "height": 800, "sizeBytes": 50000 },
    --        "lg": { "url": "...", "width": 400, "height": 400, "sizeBytes": 50000 },
    --        "md": { "url": "...", "width": 200, "height": 200, "sizeBytes": 50000 },
    --        "sm": { "url": "...", "width": 100, "height": 100, "sizeBytes": 50000 },
    --        "xs": { "url": "...", "width": 50, "height": 50, "sizeBytes": 50000 }
    --     }
    --   },
    --   "cover": {                         <-- Slot 2: Profile page hero
    --     "media_id": 202,
    --     "alt": "Jane in her kitchen",
    --     "caption": "...",
    --     "credit": "...",
    --     "placeholder": "...",
    --     "focal_point": { "x": 50, "y": 50 },
    --     "aspectRatio": "16:9",
    --     "variants": {                    <-- Standard breakpoints
    --        "lg": { "url": "...", "width": 2048, "height": 1152, "sizeBytes": 198765 },
    --        "md": { "url": "...", "width": 1200, "height": 675, "sizeBytes": 102345 },
    --        "sm": { "url": "...", "width": 720, "height": 405, "sizeBytes": 54321 },
    --        "xs": { "url": "...", "width": 360, "height": 203, "sizeBytes": 23123 }
    --     }
    --   }
    -- }
    --
    -- BREAKPOINT NOTES:
    --   AVATAR: Uses smaller widths (50, 100, 200, 400) instead of standard
    --           because avatars display at 32-120px typically (bylines, comments).
    --           Saves R2 storage. Original (800px) kept for profile page.
    --   COVER:  Uses standard breakpoints (360, 720, 1200, 2048) for hero sections.
    --
    --  AGENT WARNING: Avatar variants use DIFFERENT sizes than standard images!
    -- Standard: xs=360, sm=720, md=1200, lg=2048
    -- Avatar:   xs=50,  sm=100, md=200,  lg=400 (smaller for profile photos)
    -- Use AuthorImagesJson type which documents these special sizes.
    
    --
    -- TYPESCRIPT: Import AuthorImagesJson from @shared/types/images
    --             Use ImageSlot for avatar/cover slots (no r2_key in variants)
    
    images_json TEXT DEFAULT '{}' CHECK (json_valid(images_json)),

    -- =========================================================================
    -- 4. BIOGRAPHY & SOCIALS
    -- =========================================================================
    -- SCHEMA (bio_json):
    -- {
    --   "short": "Jane writes about healthy Mediterranean recipes...",
    --   "long": "## About Jane\n\nJane has been cooking since...",  <-- Markdown
    --   "socials": [
    --     { "network": "twitter", "url": "https://x.com/jane", "label": "@janedoe" },
    --     { "network": "instagram", "url": "https://instagram.com/jane" },
    --     { "network": "youtube", "url": "https://youtube.com/@jane" },
    --     { "network": "website", "url": "https://jane.blog", "label": "My Blog" }
    --   ]
    -- }
    -- NETWORK OPTIONS: twitter, instagram, facebook, youtube, pinterest, 
    --                  tiktok, linkedin, website, email, custom
    bio_json TEXT DEFAULT '{}' CHECK (json_valid(bio_json)),

    -- =========================================================================
    -- 5. SEO CONFIGURATION
    -- =========================================================================
    -- SCHEMA (seo_json):
    -- {
    --   "metaTitle": "Jane Doe - Senior Food Editor | Freecipies",
    --   "metaDescription": "Meet Jane Doe, our senior editor specializing in...",
    --   "noIndex": false,
    --   "canonical": null,
    --   "ogImage": "https://...",          <-- Social share image
    --   "ogTitle": null,                   <-- Override OG title
    --   "ogDescription": null,             <-- Override OG description
    --   "twitterCard": "summary_large_image"
    -- }
    seo_json TEXT DEFAULT '{}' CHECK (json_valid(seo_json)),

    -- =========================================================================
    -- 6. SYSTEM & METRICS
    -- =========================================================================

    -- Visibility toggle.
    -- 0 = Hidden/Draft (not shown on public pages).
    -- 1 = Published (visible on team page, bylines).
    is_online BOOLEAN DEFAULT 0,

    -- Featured flag for homepage "Featured Authors" section.
    -- 1 = Display in featured author widgets.
    -- 0 = Standard author (default).
    is_featured BOOLEAN DEFAULT 0,

    -- Display order for team page.
    -- LOGIC: Lower numbers appear first.
    -- TIP: Use increments of 10 (10, 20, 30) for easy reordering.
    sort_order INTEGER DEFAULT 0,

    -- Denormalized count of published articles by this author.
    -- UPDATED BY: Background job or trigger when articles change.
    -- USAGE: Display "42 articles by Jane" on profile cards.
    cached_post_count INTEGER DEFAULT 0 CHECK (cached_post_count >= 0),

    -- Record creation timestamp (UTC).
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Last modification timestamp (UTC).
    -- Auto-updated by trigger on any column change.
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete marker.
    -- CRITICAL: Never hard delete an author who has published posts.
    -- If NOT NULL, author is "archived" but posts remain linked.
    -- LOGIC: Show "Author no longer active" on their posts.
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
CREATE INDEX IF NOT EXISTS idx_authors_featured ON authors(is_featured);  -- Featured Authors Widget
CREATE INDEX IF NOT EXISTS idx_authors_display ON authors(is_online, sort_order);  -- Team Page
CREATE INDEX IF NOT EXISTS idx_authors_active ON authors(deleted_at);  -- Soft delete filter




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
--
-- FIELD REQUIREMENTS:
-- ┌─────────────────────┬──────────┬────────────────────────────────────────────┐
-- │ Field               │ Required │ Criteria / Notes                           │
-- ├─────────────────────┼──────────┼────────────────────────────────────────────┤
-- │ slug                │ ✅ YES   │ URL-safe, unique, kebab-case               │
-- │ label               │ ✅ YES   │ Display text for buttons/badges            │
-- │ description         │ ❌ NO    │ SEO/tooltip text                           │
-- │ filter_groups_json  │ ❌ NO    │ Defaults to empty array []                 │
-- │ style_json          │ ❌ NO    │ SVG icon, color, variant                   │
-- └─────────────────────┴──────────┴────────────────────────────────────────────┘
-- ==================================================================================

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- =========================================================================
    -- 1. IDENTITY & ROUTING
    -- =========================================================================

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

    -- =========================================================================
    -- 2. FILTER LOGIC (Multi-Grouping)
    -- =========================================================================
    -- Defines which "Sections" this tag appears in within the UI filter menu.
    -- Allows a single tag to belong to multiple filter contexts.
    --
    -- SCHEMA (filter_groups_json):
    -- ["Diet", "Lifestyle", "Popular"]
    --
    -- COMMON GROUPS:
    --   - "Diet": Gluten Free, Vegan, Keto, Dairy Free
    --   - "Meal": Breakfast, Lunch, Dinner, Snack
    --   - "Time": Under 15 Min, Under 30 Min, Under 1 Hour
    --   - "Difficulty": Easy, Medium, Advanced
    --   - "Occasion": Holiday, Party, Weeknight
    --
    -- AGENT RULE: Always initialize as '[]' (Empty Array). Never NULL.
    filter_groups_json TEXT DEFAULT '[]' CHECK (json_valid(filter_groups_json)),

    -- =========================================================================
    -- 3. VISUAL STYLING (Design System)
    -- =========================================================================
    -- Stores visual properties including RAW SVG code for instant rendering.
    --
    -- SCHEMA (style_json):
    -- {
    --   "svg_code": "<svg viewBox='0 0 24 24'><path d='...'/></svg>",
    --   "color": "#10b981",       <-- Hex color for badge background/text
    --   "variant": "outline"      <-- UI variant: 'solid' | 'outline' | 'ghost'
    -- }
    --
    -- SVG RULES:
    --   - Must be sanitized (no <script> tags, no event handlers)
    --   - Must have viewBox attribute
    --   - Keep under 2KB for performance
    style_json TEXT DEFAULT '{}' CHECK (json_valid(style_json)),

    -- =========================================================================
    -- 4. SYSTEM & METRICS
    -- =========================================================================

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
    -- AGENT RULE: All queries should include WHERE deleted_at IS NULL.
    deleted_at DATETIME DEFAULT NULL
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

-- INDEX: Soft Delete Filter
-- PURPOSE: Efficiently filter out deleted tags from queries.
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(deleted_at);

-- NOTE ON FILTERING:
-- We do NOT index 'filter_groups_json' because SQLite cannot efficiently index JSON arrays.
-- STRATEGY: Frontend fetches all tags (lightweight) and maps them to groups in memory.


-- ==================================================================================
-- TABLE: EQUIPMENT (Admin-Managed Kitchen Tools with Affiliate Links)
-- ==================================================================================
-- PURPOSE:
--   Centralized catalog of kitchen equipment referenced by recipes.
--   Admin can manage affiliate links globally (one update affects all recipes).
--
-- FIELD REQUIREMENTS:
-- ┌─────────────────────┬──────────┬────────────────────────────────────────────┐
-- │ Field               │ Required │ Criteria / Notes                           │
-- ├─────────────────────┼──────────┼────────────────────────────────────────────┤
-- │ slug                │ ✅ YES   │ URL-safe, unique, kebab-case               │
-- │ name                │ ✅ YES   │ Display name                               │
-- │ description         │ ❌ NO    │ Short description for tooltips             │
-- │ category            │ ❌ NO    │ "bakeware", "appliances", "utensils"       │
-- │ image_json          │ ❌ NO    │ Product image                              │
-- │ affiliate_url       │ ❌ NO    │ Primary affiliate link                     │
-- │ affiliate_provider  │ ❌ NO    │ "amazon", "williams-sonoma", etc.          │
-- └─────────────────────┴──────────┴────────────────────────────────────────────┘
-- ==================================================================================

CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- =========================================================================
    -- 1. IDENTITY
    -- =========================================================================

    -- URL identifier for routing (e.g., /equipment/stand-mixer).
    -- FORMAT: Lowercase, kebab-case only.
    slug TEXT UNIQUE NOT NULL,

    -- Display name shown in recipe cards and equipment lists.
    -- EXAMPLES: "Stand Mixer", "Sheet Pan", "Digital Thermometer"
    name TEXT NOT NULL,

    -- Short description for tooltips and equipment pages.
    -- EXAMPLE: "Essential for whipping egg whites and kneading dough."
    description TEXT,

    -- Equipment category for filtering in admin.
    -- OPTIONS: "appliances", "bakeware", "cookware", "utensils", "gadgets", "other"
    category TEXT DEFAULT 'other' CHECK (category IN ('appliances', 'bakeware', 'cookware', 'utensils', 'gadgets', 'other')),

    -- =========================================================================
    -- 2. VISUALS
    -- =========================================================================
    -- Product image (standardized format).
    -- SCHEMA: Same as other images_json fields.
    -- {
    --   "media_id": 301,
    --   "alt": "KitchenAid Stand Mixer",
    --   "variants": { "lg": {...}, "md": {...}, "sm": {...}, "xs": {...} }
    -- }
    image_json TEXT DEFAULT '{}' CHECK (json_valid(image_json)),

    -- =========================================================================
    -- 3. AFFILIATE LINKS
    -- =========================================================================

    -- Primary affiliate link.
    -- EXAMPLE: "https://www.amazon.com/dp/B00005UP2P?tag=yourtag-20"
    affiliate_url TEXT,

    -- Affiliate provider for tracking/reporting.
    -- OPTIONS: "amazon", "williams-sonoma", "target", "walmart", "custom"
    affiliate_provider TEXT,

    -- Affiliate disclosure note (optional override).
    -- DEFAULT: Use global site_settings disclosure.
    affiliate_note TEXT,

    -- Price (optional, for display only - may become stale).
    -- EXAMPLE: "$299.99"
    price_display TEXT,

    -- =========================================================================
    -- 4. SYSTEM
    -- =========================================================================

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

-- TRIGGER: Auto-Update Timestamp
CREATE TRIGGER IF NOT EXISTS update_equipment_timestamp
AFTER UPDATE ON equipment
BEGIN
    UPDATE equipment SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_equipment_slug ON equipment(slug);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_active ON equipment(is_active);


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
-- FIELD REQUIREMENTS:
-- ┌─────────────────────┬──────────┬────────────────────────────────────────────┐
-- │ Field               │ Required │ Criteria / Notes                           │
-- ├─────────────────────┼──────────┼────────────────────────────────────────────┤
-- │ slug                │ ✅ YES   │ URL-safe, unique, kebab-case               │
-- │ type                │ ✅ YES   │ 'article', 'recipe', or 'roundup'          │
-- │ category_id         │ ✅ YES   │ Must exist in categories table             │
-- │ author_id           │ ✅ YES   │ Must exist in authors table                │
-- │ headline            │ ✅ YES   │ Main H1 / recipe name                      │
-- │ short_description   │ ✅ YES   │ Card text / meta fallback                  │
-- │ locale              │ ❌ NO    │ Defaults to 'en'                           │
-- │ parent_article_id   │ ❌ NO    │ For pillar/cluster pages                   │
-- │ subtitle            │ ❌ NO    │ Optional tagline                           │
-- │ excerpt             │ ❌ NO    │ Newsletter teaser                          │
-- │ introduction        │ ❌ NO    │ Hero copy                                  │
-- │ images_json         │ ❌ NO    │ But required for publishing                │
-- │ content_json        │ ❌ NO    │ But required for publishing                │
-- │ recipe_json         │ ❌ NO    │ Required if type='recipe'                  │
-- │ roundup_json        │ ❌ NO    │ Required if type='roundup'                 │
-- │ faqs_json           │ ❌ NO    │ For FAQ rich results                       │
-- │ seo_json            │ ❌ NO    │ Overrides only                             │
-- │ config_json         │ ❌ NO    │ Feature toggles                            │
-- └─────────────────────┴──────────┴────────────────────────────────────────────┘
--
-- AGENT RULES:
--   1. RELATIONSHIPS: Always use IDs (category_id, author_id), never slugs.
--   2. CONTENT: Use the Flattened Block JSON structure (No 'data' wrapper).
--   3. ADS: Never insert 'ad_slot' blocks automatically. Only if explicitly requested.
-- ==================================================================================

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

    type TEXT NOT NULL DEFAULT 'article' CHECK (type IN ('article', 'recipe', 'roundup')),
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
    -- Standardized format matching categories/authors tables.
    --
    -- SCHEMA (images_json):
    -- {
    --   "cover": {                          <-- Hero/featured image
    --     "media_id": 105,                  <-- Reference to source Media ID
    --     "alt": "Lemon blueberry biscuits on cooling rack",
    --     "caption": "Fresh out of the oven",  <-- Optional visible caption
    --     "credit": "© Jane Doe",           <-- Optional attribution
    --     "placeholder": "data:image/...",  <-- Blurhash/LQIP string
    --     "focal_point": { "x": 50, "y": 50 },  <-- Cropping hint
    --     "aspectRatio": "16:9",            <-- Layout hint
    --     "variants": {
    --        "original": { "url": "...", "width": 4000, "height": 2250, "sizeBytes": 50000 },  <-- Optional
    --        "lg": { "url": "...", "width": 2048, "height": 1152, "sizeBytes": 198765 },
    --        "md": { "url": "...", "width": 1200, "height": 675, "sizeBytes": 102345 },
    --        "sm": { "url": "...", "width": 720, "height": 405, "sizeBytes": 54321 },
    --        "xs": { "url": "...", "width": 360, "height": 203, "sizeBytes": 23123 }
    --     }
    --   },
    --   "thumbnail": {                      <-- Optional: For cards if different from cover
    --     "media_id": 202,
    --     "alt": "...",
    --     "placeholder": "...",
    --     "aspectRatio": "4:3",
    --     "variants": { ... }
    --   },
    --   "contentImages": [                  <-- Images referenced in content_json
    --     {
    --       "media_id": 301,
    --       "alt": "Step 1: Mixing the dough",
    --       "caption": "Combine flour and sugar",
    --       "credit": "...",
    --       "placeholder": "...",
    --       "variants": { "lg": {...}, "md": {...}, "sm": {...}, "xs": {...} }
    --     }
    --   ]
    -- }
    --
    -- VARIANT RULES:
    --   - Use "url" key (not "src") for consistency across all tables.
    --   - Standard breakpoints: 360, 720, 1200, 2048 (xs, sm, md, lg).
    --   - Include height for CLS prevention.
    --   - "original" only if source > 2048px (for Pin Creator).
    --
        -- TYPESCRIPT: Import ArticleImagesJson, ImageSlot from @shared/types/images
    --
    -- NOTE: cover.variants is used by related_content block in content_json
    --       and cached_card_json for zero-join card rendering.

    -- --------------------------------------------------------------------
    -- 4. RICH CONTENT (BLOCK-BASED BODY)
    -- --------------------------------------------------------------------

    content_json TEXT DEFAULT '[]' CHECK (json_valid(content_json)),
    -- Flattened block array representing the article body.
    -- Frontend/editor interprets "type" to render React/Astro components.
    -- Avoids schema migrations when adding new block types.
    --
    -- ┌────────────────────────────────────────────────────────────────────┐
    -- │ BLOCK TYPES REFERENCE                                              │
    -- ├────────────────────────────────────────────────────────────────────┤
    -- │ ALL "text" FIELDS: Support Markdown (bold, italic, links, lists).  │
    -- │ Render with: react-markdown, marked, or remark.                    │
    -- │                                                                    │
    -- │ TEXT BLOCKS:                                                       │
    -- │ ─────────────────────────────────────────────────────────────────  │
    -- │ { "type": "paragraph", "text": "Rich text with **markdown**..." }  │
    -- │                                                                    │
    -- │ { "type": "heading", "level": 2, "text": "Section Title" }         │
    -- │   level: 2 | 3 | 4 | 5 | 6 (H1 reserved for headline)              │
    -- │                                                                    │
    -- │ { "type": "blockquote", "text": "Quote...", "cite": "Author" }     │
    -- │                                                                    │
    -- │ { "type": "list", "style": "unordered", "items": ["A", "B", "C"] } │
    -- │   style: "unordered" | "ordered" | "checklist"                     │
    -- │                                                                    │
    -- │ MEDIA BLOCKS:                                                      │
    -- │ ─────────────────────────────────────────────────────────────────  │
    -- │ { "type": "image",                                                 │
    -- │   "media_id": 123,                                                 │
    -- │   "alt": "...",                                                    │
    -- │   "caption": "...",                                                │
    -- │   "credit": "(c) Photographer",                                    │
    -- │   "variants": { "lg": {...}, "md": {...}, ... }                    │
    -- │ }                                                                  │
    -- │                                                                    │
    -- │ { "type": "video",                                                 │
    -- │   "provider": "youtube",    -- "youtube" | "vimeo" | "self"        │
    -- │   "videoId": "dQw4w9WgXcQ",                                        │
    -- │   "aspectRatio": "16:9"                                            │
    -- │ }                                                                  │
    -- │                                                                    │
    -- │ CALLOUT BLOCKS:                                                    │
    -- │ ─────────────────────────────────────────────────────────────────  │
    -- │ { "type": "tip_box",                                               │
    -- │   "variant": "tip",         -- "tip" | "warning" | "info" | "note" │
    -- │   "title": "Pro Tip",                                              │
    -- │   "text": "**Bold** and lists:\n1. Item\n2. Item"                  │
    -- │ }                                                                  │
    -- │   TEXT FIELD: Supports full Markdown (bold, lists, links).         │
    -- │   Use \n for line breaks. Render with react-markdown or marked.   │                                                                  │
    -- │                                                                    │
    -- │ }                                                                  │
    -- │                                                                    │
    -- │ EMBED BLOCKS:                                                      │
    -- │ ─────────────────────────────────────────────────────────────────  │
    -- │ { "type": "embed",                                                 │
    -- │   "provider": "instagram",  -- "instagram" | "pinterest" | "tiktok"│
    -- │   "url": "https://...",                                            │
    -- │   "html": "<blockquote>..."                                        │
    -- │ }                                                                  │
    -- │                                                                    │
    -- │ { "type": "recipe_card",                                           │
    -- │   "article_id": 456,        -- Internal recipe reference           │
    -- │   "headline": "...",                                               │
    -- │   "cover": { "variants": {...} }                                   │
    -- │ }                                                                  │
    -- │                                                                    │
    -- │ { "type": "product_card",                                          │
    -- │   "name": "KitchenAid Mixer",                                      │
    -- │   "url": "https://amazon.com/...",                                 │
    -- │   "price": "$299",                                                 │
    -- │   "image": { "variants": {...} },                                  │
    -- │   "affiliate": true                                                │
    -- │ }                                                                  │
    -- │                                                                    │
    -- │ LAYOUT BLOCKS:                                                     │
    -- │ ─────────────────────────────────────────────────────────────────  │
    -- │ { "type": "divider" }                                              │
    -- │                                                                    │
    -- │ { "type": "spacer", "size": "md" }  -- "sm" | "md" | "lg" | "xl"   │
    -- │                                                                    │
    -- │ { "type": "ad_slot", "variant": "in-content" }                     │
    -- │   variant: "in-content" | "newsletter" | "sidebar"                 │
    -- │   AGENT RULE: Never insert ad_slot blocks automatically!           │
    -- │                                                                    │
    -- │ { "type": "table",                                                 │
    -- │   "headers": ["Ingredient", "Amount"],                             │
    -- │   "rows": [["Flour", "2 cups"], ["Sugar", "1 cup"]]                │
    -- │ }                                                                  │
    -- │                                                                    │
    -- │ FOOD BLOG BLOCKS:                                                  │
    -- │ ─────────────────────────────────────────────────────────────────  │
    -- │                                                                    │
    -- │ { "type": "before_after",                                          │
    -- │   "layout": "slider",       -- "slider" | "side_by_side"           │
    -- │   "before": {                                                      │
    -- │     "media_id": 101, "alt": "Raw dough", "label": "Before",        │
    -- │     "variants": { "lg": {...}, ... }                               │
    -- │   },                                                               │
    -- │   "after": {                                                       │
    -- │     "media_id": 102, "alt": "Baked", "label": "After 12 min",      │
    -- │     "variants": { "lg": {...}, ... }                               │
    -- │   }                                                                │
    -- │ }                                                                  │
    -- │   USE CASES: Bread proofing, meat searing, caramel stages.         │
    -- │                                                                    │
    -- │ { "type": "ingredient_spotlight",                                  │
    -- │   "name": "Tahini",                                                │
    -- │   "description": "Sesame seed paste used in hummus...",            │
    -- │   "image": { "media_id": 201, "variants": {...} },                 │
    -- │   "tips": "Store in fridge after opening",                         │
    -- │   "substitutes": ["Sunflower seed butter", "Cashew butter"],       │
    -- │   "link": "/ingredients/tahini"    -- Optional internal link       │
    -- │ }                                                                  │
    -- │   USE CASES: Explain exotic ingredients, boost SEO for long-tail.  │
    -- │                                                                    │
    -- │ { "type": "faq_section",                                           │
    -- │   "title": "Common Questions",    -- Optional section heading      │
    -- │   "items": [                                                       │
    -- │     { "q": "Can I freeze the dough?", "a": "Yes, up to 3 months" },│
    -- │     { "q": "Can I use almond milk?", "a": "Yes, same ratio" }      │
    -- │   ]                                                                │
    -- │ }                                                                  │
    -- │   NOTE: All faq_section blocks are aggregated into faqs_json       │
    -- │         for easy JSON-LD FAQPage schema generation.                │
    -- │                                                                    │
    -- │ { "type": "related_content",                                       │
    -- │   "title": "You Might Also Like",  -- Optional heading             │
    -- │   "layout": "grid",                -- "grid", "carousel", "list"   │
    -- ?   "mode": "manual",                 -- "manual" | "auto"             ?
    -- ?   "limit": 4,                       -- Max items per type             ?
    -- │   "recipes": [                     -- Related recipes              │
    -- │     { "id": 42, "slug": "...", "headline": "...",                  │
    -- │       "thumbnail": {...}, "total_time": 35, "difficulty": "Easy" } │
    -- │   ],                                                               │
    -- │   "articles": [                    -- Related articles             │
    -- │     { "id": 87, "slug": "...", "headline": "...",                  │
    -- │       "thumbnail": {...}, "reading_time": 8 }                      │
    -- │   ],                                                               │
    -- │   "roundups": [                    -- Related roundups             │
    -- │     { "id": 123, "slug": "...", "headline": "...",                 │
    -- │       "thumbnail": {...}, "item_count": 15 }                       │
    -- │   ]                                                                │
    -- │ }                                                                  │
    -- │   USE CASES: Inline "related recipes" section, mid-article         │
    -- │              recommendations, "See Also" callouts.                 │
    -- │   NOTE: This is the primary way to add related content in articles.│
    -- │                                                                    │
    -- └────────────────────────────────────────────────────────────────────┘
    --
    -- RENDERING EXAMPLE (Astro/React):
    --   import ReactMarkdown from 'react-markdown'; // For "text" fields
    --
    --   content_json.map(block => {
    --     switch(block.type) {
    --       case 'paragraph': return <ReactMarkdown>{block.text}</ReactMarkdown>;
    --       case 'heading':   return <Heading level={block.level}>{block.text}</Heading>;
    --       case 'image':     return <ResponsiveImage {...block} />;
    --       case 'step_by_step': return <ProcessVis steps={block.steps} />;
    --       ...
    --     }
    --   })

    -- --------------------------------------------------------------------
    -- 5. RECIPE DATA ("GOLD KEY") for type='recipe'
    -- --------------------------------------------------------------------
    --   NOTE:
    --     - headline & short_description are the truth for name/description.
    --     - recipe_json focuses on timings, servings, structure, and extras.
    --
    -- ┌────────────────────────────────────────────────────────────────────┐
    -- │ INTERACTIVE RECIPE CARD FEATURES (Supported by this schema)        │
    -- ├────────────────────────────────────────────────────────────────────┤
    -- │ Feature              │ Data Source              │ Interaction      │
    -- │──────────────────────│──────────────────────────│──────────────────│
    -- │ Servings Adjuster    │ servings (numeric)       │ Scale recipe     │
    -- │ Ingredient Scaling   │ ingredients[].amount     │ Auto-recalculate │
    -- │ Ingredient Checkbox  │ ingredients[].items[]    │ Mark gathered    │
    -- │ Step Timers          │ instructions[].timer     │ Start/pause      │
    -- │ Star Rating          │ aggregateRating          │ Submit/display   │
    -- │ Print Recipe         │ All fields               │ Print view       │
    -- │ Jump to Section      │ Section structure        │ Anchor links     │
    -- │ Equipment Links      │ equipment[] + cache      │ Affiliate clicks │
    -- │ Share Buttons        │ headline + images_json   │ Social sharing   │
    -- │ Tips Display         │ tips[]                   │ Expandable notes │
    -- │ Substitutions        │ ingredients[].substitutes│ Alt ingredients  │
    -- │ Nutrition Facts      │ nutrition{}              │ Collapsible panel│
    -- │ Diet Badges          │ suitableForDiet[]        │ Filter/display   │
    -- │ Video Player         │ video{}                  │ Embedded player  │
    -- │ Shopping List Export │ ingredients[]            │ App-level        │
    -- │ Step-by-Step Mode    │ instructions[]           │ App-level        │
    -- └────────────────────────────────────────────────────────────────────┘
    -- --------------------------------------------------------------------

    recipe_json TEXT DEFAULT '{
      "prep": null,
      "cook": null,
      "total": null,
      "servings": null,
      "recipeYield": null,

      "recipeCategory": null,
      "recipeCuisine": null,
      "keywords": [],
      "suitableForDiet": [],

      "difficulty": null,
      "cookingMethod": null,
      "estimatedCost": null,

      "prepTime": null,
      "cookTime": null,
      "totalTime": null,

      "ingredients": [],
      "instructions": [],
      "tips": [],

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
    -- SERVINGS & YIELD:
    --   servings    : Numeric value for scaling UI (e.g., 4).
    --   recipeYield : Display string for JSON-LD (e.g., "Makes 12 cookies", "4 servings").
    --                 REQUIRED for Google Rich Results.
    --
    -- CATEGORY / CUISINE / KEYWORDS:
    --   recipeCategory : e.g. "Dessert", "Breakfast".
    --   recipeCuisine  : e.g. "Italian", "Mexican".
    --   keywords       : ["lemon","blueberry","biscuits"] for exports/search.
    --
    -- DIET SUITABILITY (schema.org RestrictedDiet):
    --   suitableForDiet : Array of diet types for JSON-LD and filter badges.
    --   VALUES: "VeganDiet", "VegetarianDiet", "GlutenFreeDiet", "DiabeticDiet",
    --           "HalalDiet", "HinduDiet", "KosherDiet", "LowCalorieDiet",
    --           "LowFatDiet", "LowLactoseDiet", "LowSaltDiet"
    --   EXAMPLE: ["VeganDiet", "GlutenFreeDiet"]
    --
    -- DIFFICULTY & METHOD:
    --   difficulty    : e.g. "Easy", "Medium", "Hard".
    --   cookingMethod : e.g. "baking", "grilling".
    --   estimatedCost : optional cost label.
    --
    -- TIPS (Chef's Notes for Recipe Card):
    --   tips : Array of markdown strings shown in recipe card.
    --   EXAMPLE: ["Let dough rest 10 min for fluffier results", "Don't overmix!"]
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
    --           "isOptional": false,
    --           "substitutes": [       -- OPTIONAL: Ingredient swaps
    --             { "name": "whole wheat flour", "ratio": "1:1", "notes": "denser result" }
    --           ]
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
    -- EQUIPMENT (References centralized equipment table):
    --   [
    --     { "equipment_id": 1, "required": true },
    --     { "equipment_id": 5, "required": false, "notes": "or use hand mixer" }
    --   ]
    --   NOTE: Admin manages equipment names/affiliate links in `equipment` table.
    --         Frontend joins to get name, image, affiliate_url for display.
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
    -- 7. STRUCTURED FAQ (SEO CACHE)
    -- --------------------------------------------------------------------

    faqs_json TEXT DEFAULT '[]' CHECK (json_valid(faqs_json)),
    -- CACHE: Aggregated FAQs from all faq_section content blocks.
    -- Used for JSON-LD FAQPage schema generation (no content scanning needed).
    -- [
    --   { "q": "Can I freeze the dough?", "a": "Yes, up to 3 months..." },
    --   { "q": "Can I use almond milk?", "a": "Yes, but texture changes..." }
    -- ]
    -- UPDATE STRATEGY: Rebuild on article save by scanning content_json
    --                  for all blocks where type = 'faq_section'.

    -- --------------------------------------------------------------------
    -- 8. SNAPSHOTS & CACHES (ZERO-JOIN RENDERING)
    -- --------------------------------------------------------------------


    cached_tags_json TEXT DEFAULT '[]' CHECK (json_valid(cached_tags_json)),
    -- Flattened label set for fast tag filters & card badges.
    -- Example: ["Vegan", "Gluten-Free", "Under 30 Minutes"].

    cached_category_json TEXT DEFAULT '{}' CHECK (json_valid(cached_category_json)),
    -- Category snapshot for zero-join card rendering.
    -- {
    --   "id": 3,
    --   "slug": "desserts",
    --   "name": "Desserts",
    --   "icon_svg": "<svg>..."    -- Optional category icon
    -- }
    -- UPDATE STRATEGY: Refresh when category updates or article changes category.

    cached_author_json TEXT DEFAULT '{}' CHECK (json_valid(cached_author_json)),
    -- Author snapshot for zero-join card rendering.
    -- {
    --   "id": 5,
    --   "slug": "jane-doe",
    --   "name": "Jane Doe",
    --   "job_title": "Recipe Developer",
    --   "avatar": {
    --     "url": "...",
    --     "alt": "Jane Doe"
    --   }
    -- }
    -- UPDATE STRATEGY: Refresh when author updates profile or avatar.

    cached_equipment_json TEXT DEFAULT '[]' CHECK (json_valid(cached_equipment_json)),
    -- Equipment snapshot with affiliate links for zero-join rendering.
    -- [
    --   {
    --     "id": 1,
    --     "name": "Stand Mixer",
    --     "slug": "stand-mixer",
    --     "affiliate_url": "https://amazon.com/...",
    --     "image_url": "...",
    --     "required": true
    --   }
    -- ]
    -- UPDATE STRATEGY: Refresh when equipment table updates or recipe saves.

    cached_rating_json TEXT DEFAULT '{}' CHECK (json_valid(cached_rating_json)),
    -- Optional denormalized rating snapshot for cards/lists:
    -- {
    --   "ratingValue": 4.8,
    --   "ratingCount": 55
    -- }
    -- Source of truth should be recipe_json.aggregateRating.

    reading_time_minutes INTEGER DEFAULT 0,
    -- Approximate reading time (whole minutes) for long-form articles.

    cached_toc_json TEXT DEFAULT '[]' CHECK (json_valid(cached_toc_json)),
    -- Table of Contents generated from content_json headings at save time.
    -- [
    --   { "id": "ingredients", "text": "Ingredients", "level": 2 },
    --   { "id": "dry-ingredients", "text": "Dry Ingredients", "level": 3 },
    --   { "id": "instructions", "text": "Instructions", "level": 2 }
    -- ]
    --
    -- IMPLEMENTATION LOGIC (run on article save):
    -- ─────────────────────────────────────────────────────────────────────
    -- function generateTOC(content_json) {
    --   return content_json
    --     .filter(block => block.type === 'heading' && block.level >= 2)
    --     .map(heading => ({
    --       id: slugify(heading.text),           // "dry-ingredients"
    --       text: heading.text,                  // "Dry Ingredients"
    --       level: heading.level                 // 2-6
    --     }));
    -- }
    --
    -- function slugify(text) {
    --   return text
    --     .toLowerCase()
    --     .replace(/[^a-z0-9]+/g, '-')
    --     .replace(/^-|-$/g, '');
    -- }
    -- ─────────────────────────────────────────────────────────────────────
    --
    -- RENDERING (frontend):
    -- cached_toc_json.map(item => (
    --   <a href={`#${item.id}`} style={{ marginLeft: (item.level - 2) * 16 }}>
    --     {item.text}
    --   </a>
    -- ))
    --
    -- UPDATE STRATEGY: Rebuild on article save when content_json changes.

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

    cached_card_json TEXT DEFAULT '{}' CHECK (json_valid(cached_card_json)),
    -- Pre-computed card data for related article pickers and listing cards.
    -- This eliminates need to query/process fields when selecting related content.
    -- Structure varies by article type:
    --
    -- FOR type="recipe":
    -- {
    --   "id": 42,
    --   "type": "recipe",
    --   "slug": "lemon-blueberry-biscuits",
    --   "headline": "Lemon Blueberry Biscuits",
    --   "short_description": "Flaky buttery biscuits...",
    --   "thumbnail": {
    --     "alt": "Lemon Blueberry Biscuits",
    --     "variants": {
    --       "xs": { "url": "...", "width": 360, "height": 0, "sizeBytes": 0 },
    --       "sm": { "url": "...", "width": 720, "height": 0, "sizeBytes": 0 },
    --       "md": { "url": "...", "width": 1200, "height": 0, "sizeBytes": 0 },
    --       "lg": { "url": "...", "width": 2048, "height": 0, "sizeBytes": 0 }
    --     }
    --   },
    --   "total_time": 35,
    --   "difficulty": "Easy",
    --   "servings": 12,
    --   "rating": { "value": 4.8, "count": 55 }
    -- }
    --
    -- FOR type="article":
    -- {
    --   "id": 87,
    --   "type": "article",
    --   "slug": "how-to-bake-better",
    --   "headline": "How to Bake Better Bread",
    --   "short_description": "Tips for perfect loaves...",
    --   "thumbnail": { "alt": "...", "variants": {...} },
    --   "reading_time": 8,
    --   "category": "Baking Tips"
    -- }
    --
    -- FOR type="roundup":
    -- {
    --   "id": 123,
    --   "type": "roundup",
    --   "slug": "best-breakfast-ideas",
    --   "headline": "15 Best Breakfast Ideas",
    --   "short_description": "Start your day right...",
    --   "thumbnail": { "alt": "...", "variants": {...} },
    --   "item_count": 15
    -- }
    --
    -- UPDATE STRATEGY: Rebuild on every article save.
    -- USAGE: Used by related_content blocks in content_json for inline recommendations.

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
      "ogImage": null,
      "ogTitle": null,
      "ogDescription": null,
      "twitterCard": "summary_large_image"
    }' CHECK (json_valid(seo_json)),
    -- Per-article SEO overrides (standardized with categories/authors):
    --   metaTitle       : Custom <title>; fallback is headline.
    --   metaDescription : SEO meta description; fallback is short_description.
    --   noIndex         : true to exclude from search engines.
    --   canonical       : Canonical URL to avoid duplicate content issues.
    --   ogImage         : Social share image URL override.
    --   ogTitle         : Override Open Graph title (falls back to metaTitle).
    --   ogDescription   : Override OG description (falls back to metaDescription).
    --   twitterCard     : "summary" | "summary_large_image" (default).

    jsonld_json TEXT DEFAULT '[]' CHECK (json_valid(jsonld_json)),
    -- Pre-generated JSON-LD structured data for SEO rich results.
    -- Generated once at save time to avoid expensive runtime computation.
    --
    -- SCHEMA TYPES STORED:
    --   - Recipe         : type='recipe' articles (Google Recipe cards)
    --   - HowTo          : Step-by-step tutorials
    --   - ItemList       : type='roundup' articles (listicles)
    --   - FAQPage        : Built from faqs_json cache
    --   - Article        : Standard article schema
    --   - BreadcrumbList : Navigation path
    --
    -- EXAMPLE:
    -- [
    --   {
    --     "@context": "https://schema.org",
    --     "@type": "Recipe",
    --     "name": "Lemon Blueberry Biscuits",
    --     "image": ["https://..."],
    --     "author": { "@type": "Person", "name": "Jane Doe" },
    --     "prepTime": "PT15M",
    --     "cookTime": "PT20M",
    --     "recipeYield": "12 biscuits",
    --     "recipeIngredient": ["2 cups flour", "1/2 cup sugar"],
    --     "recipeInstructions": [{ "@type": "HowToStep", "text": "..." }],
    --     "nutrition": { "@type": "NutritionInformation", "calories": "320" }
    --   },
    --   {
    --     "@context": "https://schema.org",
    --     "@type": "FAQPage",
    --     "mainEntity": [{ "@type": "Question", "name": "...", "acceptedAnswer": {...} }]
    --   }
    -- ]
    --
    -- UPDATE STRATEGY: Rebuild on article save using recipe_json, faqs_json,
    --                  cached_author_json, and images_json as sources.

    -- --------------------------------------------------------------------
    -- 10. CONFIG, WORKFLOW, EXPERIMENTS
    -- --------------------------------------------------------------------

    config_json TEXT DEFAULT '{
      "allowComments": true,
      "showTableOfContents": true,
      "manualRelatedIds": [],
      "experimentKey": null,
      "experimentVariant": null
    }' CHECK (json_valid(config_json)),
    -- Per-article feature toggles and A/B test hooks:
    --   allowComments       : Enable/disable comments for this article.
    --   showTableOfContents : Show/hide TOC (uses cached_toc_json).
    --   manualRelatedIds    : Hard-coded related article IDs (override auto).
    --   experimentKey       : Identifier for experiments ("headline-test-2025-01").
    --   experimentVariant   : "A","B","control", etc.

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

CREATE INDEX IF NOT EXISTS idx_articles_active
    ON articles(deleted_at);
-- Soft delete filter: efficiently exclude deleted articles.

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
-- Includes headline, metadata, tags, author, category, and flattened JSON content
CREATE VIRTUAL TABLE IF NOT EXISTS idx_articles_search USING fts5(
    headline,
    subtitle,
    short_description,
    body_content,    -- Flattened text from content_json + recipe_json
    tag_labels,      -- Flattened from cached_tags_json (e.g., "Vegan Gluten-Free Quick")
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

-- Trigger: Sync Articles on INSERT
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
        -- 1. Extract plain text from content_json blocks (paragraphs)
        SELECT json_extract(value, '$.text') as txt 
        FROM json_each(NEW.content_json) 
        WHERE json_extract(value, '$.text') IS NOT NULL
        
        UNION ALL
        
        -- 2. Extract heading text from content_json
        SELECT json_extract(value, '$.text')
        FROM json_each(NEW.content_json)
        WHERE json_extract(value, '$.type') = 'heading'
        
        UNION ALL
        
        -- 3. Extract ingredient names from recipe_json
        SELECT json_extract(i.value, '$.name') 
        FROM json_each(NEW.recipe_json, '$.ingredients') as g, 
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'
      )
    ),
    -- 4. Flatten tag labels
    (SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.cached_tags_json)),
    -- 5. Author name
    json_extract(NEW.cached_author_json, '$.name'),
    -- 6. Category name
    json_extract(NEW.cached_category_json, '$.name')
  );
END;

-- Trigger: Sync Articles on UPDATE (including soft-delete handling)
CREATE TRIGGER IF NOT EXISTS trg_articles_search_au AFTER UPDATE ON articles 
BEGIN
  -- Clean up old index entry (include all columns for proper deletion)
  INSERT INTO idx_articles_search(
    idx_articles_search, rowid, headline, subtitle, short_description, 
    body_content, tag_labels, author_name, category_name
  )
  VALUES('delete', OLD.id, OLD.headline, OLD.subtitle, OLD.short_description, '', '', '', '');
  
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
        -- 1. Extract plain text from content_json blocks (paragraphs)
        SELECT json_extract(value, '$.text') as txt 
        FROM json_each(NEW.content_json) 
        WHERE json_extract(value, '$.text') IS NOT NULL
        
        UNION ALL
        
        -- 2. Extract heading text from content_json
        SELECT json_extract(value, '$.text')
        FROM json_each(NEW.content_json)
        WHERE json_extract(value, '$.type') = 'heading'
        
        UNION ALL
        
        -- 3. Extract ingredient names from recipe_json
        SELECT json_extract(i.value, '$.name') 
        FROM json_each(NEW.recipe_json, '$.ingredients') as g, 
             json_each(g.value, '$.items') as i
        WHERE NEW.type = 'recipe'
      )
    ),
    -- 4. Flatten tag labels
    (SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.cached_tags_json)),
    -- 5. Author name
    json_extract(NEW.cached_author_json, '$.name'),
    -- 6. Category name
    json_extract(NEW.cached_category_json, '$.name')
  WHERE NEW.deleted_at IS NULL;  -- Only index if NOT soft-deleted
END;

-- Trigger: Sync Articles on DELETE (hard delete)
CREATE TRIGGER IF NOT EXISTS trg_articles_search_ad AFTER DELETE ON articles 
BEGIN
  INSERT INTO idx_articles_search(
    idx_articles_search, rowid, headline, subtitle, short_description, 
    body_content, tag_labels, author_name, category_name
  )
  VALUES('delete', OLD.id, OLD.headline, OLD.subtitle, OLD.short_description, '', '', '', '');
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

-- INDEX: Filter active boards
CREATE INDEX IF NOT EXISTS idx_pinterest_boards_active ON pinterest_boards(is_active);



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


-- =====================================================================
-- TABLE: pin_templates
-- PURPOSE:
--   - Store reusable canvas templates for the Pinterest pin generator.
--   - Admin can select templates when creating new pins.
-- =====================================================================

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


-- =====================================================================
-- TABLE: redirects
-- PURPOSE:
--   - Manage 301/302 redirects for SEO and broken link handling.
--   - Essential for preserving link equity when URLs change.
-- =====================================================================

CREATE TABLE IF NOT EXISTS redirects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    from_path TEXT UNIQUE NOT NULL,
    -- The old/source path (e.g., "/old-recipe-slug").
    -- Should NOT include domain, just the path.

    to_path TEXT NOT NULL,
    -- The new/destination path (e.g., "/recipes/new-recipe-slug").
    -- Can be relative path or full URL for external redirects.

    status_code INTEGER DEFAULT 301,
    -- HTTP status code:
    --   301 = Permanent Redirect (SEO-friendly, passes link equity)
    --   302 = Temporary Redirect (for A/B tests, maintenance)
    --   307 = Temporary (preserves request method)
    --   308 = Permanent (preserves request method)

    is_active BOOLEAN DEFAULT 1,
    -- Toggle to enable/disable without deleting.
    -- 1 = Active, 0 = Disabled.

    notes TEXT,
    -- Optional admin notes (e.g., "Renamed after rebrand").

    hit_count INTEGER DEFAULT 0,
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


-- ==================================================================================
-- CATEGORY POST COUNT TRIGGERS
-- ==================================================================================
-- Purpose: Automatically maintain cached_post_count in categories table.
-- conditions: is_online = 1 AND deleted_at IS NULL

-- Trigger: Update category post count after INSERT
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

-- Trigger: Update category post count after UPDATE
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

-- Trigger: Update category post count after DELETE
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
