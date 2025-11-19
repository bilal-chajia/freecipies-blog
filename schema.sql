-- Freecipies Blog Platform - Flexible Database Schema
-- Supports: Articles with recipes, Articles without recipes, Full JSON management

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    headline TEXT NOT NULL,
    meta_title TEXT NOT NULL,
    meta_description TEXT NOT NULL,
    short_description TEXT NOT NULL,
    tldr TEXT NOT NULL,
    image_url TEXT,
    image_alt TEXT,
    image_width INTEGER,
    image_height INTEGER,
    collection_title TEXT NOT NULL,
    num_entries_per_page INTEGER DEFAULT 12,
    is_online BOOLEAN DEFAULT 0,
    is_favorite BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Authors Table
CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    alternate_name TEXT,
    email TEXT NOT NULL,
    job TEXT,
    meta_title TEXT NOT NULL,
    meta_description TEXT NOT NULL,
    short_description TEXT NOT NULL,
    tldr TEXT NOT NULL,
    image_url TEXT,
    image_alt TEXT,
    image_width INTEGER,
    image_height INTEGER,
    bio_json TEXT, -- JSON: paragraphs, networks, etc.
    is_online BOOLEAN DEFAULT 0,
    is_favorite BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    headline TEXT NOT NULL,
    meta_title TEXT NOT NULL,
    meta_description TEXT NOT NULL,
    short_description TEXT NOT NULL,
    tldr TEXT NOT NULL,
    image_url TEXT,
    image_alt TEXT,
    collection_title TEXT NOT NULL,
    num_entries_per_page INTEGER DEFAULT 12,
    is_online BOOLEAN DEFAULT 0,
    is_favorite BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Articles Table (Flexible: with or without recipes)
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'article', -- 'article' or 'recipe'
    
    -- Basic Info
    category_slug TEXT NOT NULL,
    author_slug TEXT NOT NULL,
    label TEXT NOT NULL,
    headline TEXT NOT NULL,
    
    -- SEO
    meta_title TEXT NOT NULL,
    meta_description TEXT NOT NULL,
    canonical_url TEXT,
    
    -- Content
    short_description TEXT NOT NULL,
    tldr TEXT NOT NULL,
    introduction TEXT,
    summary TEXT,
    
    -- Images
    image_url TEXT,
    image_alt TEXT,
    image_width INTEGER,
    image_height INTEGER,
    cover_url TEXT,
    cover_alt TEXT,
    cover_width INTEGER,
    cover_height INTEGER,
    
    -- JSON Data Fields (Flexible Content)
    content_json TEXT, -- JSON: paragraphs, sections, custom content
    recipe_json TEXT, -- JSON: ingredients, instructions, nutrition (only for recipes)
    faqs_json TEXT, -- JSON: FAQ array
    keywords_json TEXT, -- JSON: keyword array
    references_json TEXT, -- JSON: references/sources
    media_json TEXT, -- JSON: youtube, videos, galleries
    
    -- Metadata
    is_online BOOLEAN DEFAULT 0,
    is_favorite BOOLEAN DEFAULT 0,
    published_at DATETIME,
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_slug) REFERENCES categories(slug) ON DELETE CASCADE,
    FOREIGN KEY (author_slug) REFERENCES authors(slug) ON DELETE CASCADE
);

-- Article Tags Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Pinterest Boards Table
CREATE TABLE IF NOT EXISTS pinterest_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    board_url TEXT, -- Pinterest board URL
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pinterest Pins Table (Multiple pins per article)
CREATE TABLE IF NOT EXISTS pinterest_pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    board_id INTEGER, -- Pinterest board assignment
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_alt TEXT,
    image_width INTEGER DEFAULT 1000,
    image_height INTEGER DEFAULT 1500,
    pin_url TEXT, -- Pinterest URL after pinning
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT 0, -- Primary pin for the article
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES pinterest_boards(id) ON DELETE SET NULL
);

-- Images/Media Table (R2 storage tracking)
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    r2_key TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    attribution TEXT,
    uploaded_by TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Site Settings Table (KV-like storage for site-wide settings)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON value
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SEO Redirects Table
CREATE TABLE IF NOT EXISTS redirects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_path TEXT UNIQUE NOT NULL,
    to_path TEXT NOT NULL,
    status_code INTEGER DEFAULT 301,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(type);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_slug);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_slug);
CREATE INDEX IF NOT EXISTS idx_articles_online ON articles(is_online);
CREATE INDEX IF NOT EXISTS idx_articles_favorite ON articles(is_favorite);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_views ON articles(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_online ON categories(is_online);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);
CREATE INDEX IF NOT EXISTS idx_authors_online ON authors(is_online);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_online ON tags(is_online);

CREATE INDEX IF NOT EXISTS idx_media_r2_key ON media(r2_key);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);

CREATE INDEX IF NOT EXISTS idx_boards_slug ON pinterest_boards(slug);
CREATE INDEX IF NOT EXISTS idx_boards_active ON pinterest_boards(is_active);

CREATE INDEX IF NOT EXISTS idx_pins_article ON pinterest_pins(article_id);
CREATE INDEX IF NOT EXISTS idx_pins_board ON pinterest_pins(board_id);
CREATE INDEX IF NOT EXISTS idx_pins_primary ON pinterest_pins(is_primary);
CREATE INDEX IF NOT EXISTS idx_pins_order ON pinterest_pins(sort_order);
CREATE INDEX IF NOT EXISTS idx_pins_created ON pinterest_pins(created_at);

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
AFTER UPDATE ON categories
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_authors_timestamp 
AFTER UPDATE ON authors
BEGIN
    UPDATE authors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tags_timestamp 
AFTER UPDATE ON tags
BEGIN
    UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_articles_timestamp 
AFTER UPDATE ON articles
BEGIN
    UPDATE articles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_boards_timestamp 
AFTER UPDATE ON pinterest_boards
BEGIN
    UPDATE pinterest_boards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_pins_timestamp 
AFTER UPDATE ON pinterest_pins
BEGIN
    UPDATE pinterest_pins SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Views for easier querying
CREATE VIEW IF NOT EXISTS v_articles_full AS
SELECT 
    a.*,
    c.label as category_label,
    c.image_url as category_image,
    au.name as author_name,
    au.image_url as author_image,
    -- Use JSON aggregation for structured tag data
    json_group_array(
        json_object('slug', t.slug, 'label', t.label)
    ) FILTER (WHERE t.id IS NOT NULL) as tags_json
FROM articles a
LEFT JOIN categories c ON a.category_slug = c.slug
LEFT JOIN authors au ON a.author_slug = au.slug
LEFT JOIN article_tags at ON a.id = at.article_id
LEFT JOIN tags t ON at.tag_id = t.id
GROUP BY a.id;

-- View for online articles only
CREATE VIEW IF NOT EXISTS v_articles_online AS
SELECT * FROM v_articles_full
WHERE is_online = 1
ORDER BY published_at DESC;

-- View for recipe articles only
CREATE VIEW IF NOT EXISTS v_recipes AS
SELECT * FROM v_articles_full
WHERE type = 'recipe' AND is_online = 1
ORDER BY published_at DESC;

-- View for blog articles only
CREATE VIEW IF NOT EXISTS v_blog_articles AS
SELECT * FROM v_articles_full
WHERE type = 'article' AND is_online = 1
ORDER BY published_at DESC;

-- Insert default site settings
INSERT OR IGNORE INTO site_settings (key, value, description) VALUES
('site_name', '"Freecipies"', 'Site name'),
('site_description', '"Discover delicious recipes from around the world"', 'Site description'),
('site_url', '"https://freecipies.com"', 'Site URL'),
('contact_email', '"contact@freecipies.com"', 'Contact email'),
('items_per_page', '12', 'Items per page for listings'),
('enable_comments', 'false', 'Enable/disable comments'),
('analytics_id', '""', 'Google Analytics ID'),
('social_twitter', '""', 'Twitter handle'),
('social_facebook', '""', 'Facebook page'),
('social_instagram', '""', 'Instagram handle');
