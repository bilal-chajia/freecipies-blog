-- Migration script: replace is_online with workflow_status for categories, authors, and articles

-- 1. Add workflow_status column to categories and authors
ALTER TABLE categories ADD COLUMN workflow_status TEXT DEFAULT 'draft' CHECK (workflow_status IN ('draft', 'published', 'archived'));
ALTER TABLE authors ADD COLUMN workflow_status TEXT DEFAULT 'draft' CHECK (workflow_status IN ('draft', 'published', 'archived'));

-- 2. Migrate existing values from is_online to workflow_status
UPDATE categories SET workflow_status = 'published' WHERE is_online = 1;
UPDATE categories SET workflow_status = 'draft' WHERE is_online = 0 OR is_online IS NULL;

UPDATE authors SET workflow_status = 'published' WHERE is_online = 1;
UPDATE authors SET workflow_status = 'draft' WHERE is_online = 0 OR is_online IS NULL;

UPDATE articles SET workflow_status = 'published' WHERE is_online = 1;
UPDATE articles SET published_at = CURRENT_TIMESTAMP WHERE workflow_status = 'published' AND published_at IS NULL;

-- 3. Rebuild indexes
DROP INDEX IF EXISTS idx_categories_display;
CREATE INDEX IF NOT EXISTS idx_categories_display ON categories(workflow_status, sort_order);

DROP INDEX IF EXISTS idx_authors_display;
CREATE INDEX IF NOT EXISTS idx_authors_display ON authors(workflow_status, sort_order);

DROP INDEX IF EXISTS idx_articles_feed;
CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(workflow_status, published_at DESC);

-- 4. Recreate Triggers

-- Recreate set published_at trigger for articles
DROP TRIGGER IF EXISTS trg_articles_set_published_at;
CREATE TRIGGER IF NOT EXISTS trg_articles_set_published_at
AFTER UPDATE ON articles
WHEN NEW.workflow_status = 'published'
  AND (OLD.workflow_status IS NULL OR OLD.workflow_status != 'published')
  AND NEW.published_at IS NULL
BEGIN
  UPDATE articles
  SET published_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

-- Remove trg_articles_online_workflow since is_online is removed
DROP TRIGGER IF EXISTS trg_articles_online_workflow;

-- Recreate author post counts triggers
DROP TRIGGER IF EXISTS update_author_count_on_insert;
CREATE TRIGGER IF NOT EXISTS update_author_count_on_insert
AFTER INSERT ON articles
BEGIN
  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = NEW.author_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = NEW.author_id;
END;

DROP TRIGGER IF EXISTS update_author_count_on_update;
CREATE TRIGGER IF NOT EXISTS update_author_count_on_update
AFTER UPDATE OF author_id, workflow_status, deleted_at ON articles
BEGIN
  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = OLD.author_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = OLD.author_id;

  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = NEW.author_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = NEW.author_id;
END;

DROP TRIGGER IF EXISTS update_author_count_on_delete;
CREATE TRIGGER IF NOT EXISTS update_author_count_on_delete
AFTER DELETE ON articles
BEGIN
  UPDATE authors
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE author_id = OLD.author_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = OLD.author_id;
END;

-- Recreate category post counts triggers
DROP TRIGGER IF EXISTS update_category_count_on_insert;
CREATE TRIGGER IF NOT EXISTS update_category_count_on_insert
AFTER INSERT ON articles
BEGIN
  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = NEW.category_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = NEW.category_id;
END;

DROP TRIGGER IF EXISTS update_category_count_on_update;
CREATE TRIGGER IF NOT EXISTS update_category_count_on_update
AFTER UPDATE OF category_id, workflow_status, deleted_at ON articles
BEGIN
  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = OLD.category_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = OLD.category_id;

  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = NEW.category_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = NEW.category_id;
END;

DROP TRIGGER IF EXISTS update_category_count_on_delete;
CREATE TRIGGER IF NOT EXISTS update_category_count_on_delete
AFTER DELETE ON articles
BEGIN
  UPDATE categories
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles
    WHERE category_id = OLD.category_id
    AND workflow_status = 'published'
    AND deleted_at IS NULL
  )
  WHERE id = OLD.category_id;
END;

-- Recreate tag post counts triggers
DROP TRIGGER IF EXISTS update_tag_count_on_link_insert;
CREATE TRIGGER IF NOT EXISTS update_tag_count_on_link_insert
AFTER INSERT ON articles_to_tags
BEGIN
  UPDATE tags
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles_to_tags att
    JOIN articles a ON a.id = att.article_id
    WHERE att.tag_id = NEW.tag_id
    AND a.workflow_status = 'published'
    AND a.deleted_at IS NULL
  )
  WHERE id = NEW.tag_id;
END;

DROP TRIGGER IF EXISTS update_tag_count_on_link_delete;
CREATE TRIGGER IF NOT EXISTS update_tag_count_on_link_delete
AFTER DELETE ON articles_to_tags
BEGIN
  UPDATE tags
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles_to_tags att
    JOIN articles a ON a.id = att.article_id
    WHERE att.tag_id = OLD.tag_id
    AND a.workflow_status = 'published'
    AND a.deleted_at IS NULL
  )
  WHERE id = OLD.tag_id;
END;

DROP TRIGGER IF EXISTS update_tag_counts_on_article_status;
CREATE TRIGGER IF NOT EXISTS update_tag_counts_on_article_status
AFTER UPDATE OF workflow_status, deleted_at ON articles
BEGIN
  UPDATE tags
  SET cached_post_count = (
    SELECT COUNT(*) FROM articles_to_tags att
    JOIN articles a ON a.id = att.article_id
    WHERE att.tag_id = tags.id
    AND a.workflow_status = 'published'
    AND a.deleted_at IS NULL
  )
  WHERE id IN (SELECT tag_id FROM articles_to_tags WHERE article_id = NEW.id);
END;
