-- ============================================================================
-- TRIGGERS: Auto-refresh cached fields in articles
-- ============================================================================
-- These triggers automatically update cached_author_json and cached_category_json
-- in the articles table when authors or categories are modified.
--
-- Run: npx wrangler d1 execute DB --local --file=db/triggers-cached-fields.sql
-- ============================================================================

-- Drop existing triggers if they exist (for re-running)
DROP TRIGGER IF EXISTS update_cached_author_on_author_change;
DROP TRIGGER IF EXISTS update_cached_category_on_category_change;

-- ============================================================================
-- Trigger: Refresh cached_author_json when an author is updated
-- ============================================================================
-- Fires when: authors.name, authors.job_title, or authors.images_json changes
-- Updates: All articles with author_id = NEW.id
--
-- IMPORTANT: Handles both 'url' and 'r2_key' formats:
--   1. If url exists in variants, use it directly
--   2. If only r2_key exists, construct URL: /api/images/{r2_key}

DROP TRIGGER IF EXISTS update_cached_author_on_author_change;

CREATE TRIGGER update_cached_author_on_author_change
AFTER UPDATE ON authors
WHEN (
  OLD.name != NEW.name 
  OR OLD.job_title IS NOT NEW.job_title 
  OR OLD.images_json IS NOT NEW.images_json
)
BEGIN
  UPDATE articles 
  SET cached_author_json = json_object(
    'name', NEW.name,
    'slug', NEW.slug,
    'role', NEW.job_title,
    'avatar',
      CASE
        WHEN json_extract(NEW.images_json, '$.avatar.variants.md.r2_key') IS NOT NULL
          THEN '/api/images/' || json_extract(NEW.images_json, '$.avatar.variants.md.r2_key')
        WHEN json_extract(NEW.images_json, '$.avatar.variants.sm.r2_key') IS NOT NULL
          THEN '/api/images/' || json_extract(NEW.images_json, '$.avatar.variants.sm.r2_key')
        WHEN json_extract(NEW.images_json, '$.avatar.variants.lg.r2_key') IS NOT NULL
          THEN '/api/images/' || json_extract(NEW.images_json, '$.avatar.variants.lg.r2_key')
        ELSE NULL
      END
  )
  WHERE author_id = NEW.id;
END;

-- ============================================================================
-- Trigger: Refresh cached_category_json when a category is updated
-- ============================================================================
-- Fires when: categories.label, categories.color, or categories.images_json changes
-- Updates: All articles with category_id = NEW.id

CREATE TRIGGER update_cached_category_on_category_change
AFTER UPDATE ON categories
WHEN (
  OLD.label != NEW.label
  OR OLD.color IS NOT NEW.color
  OR OLD.images_json IS NOT NEW.images_json
)
BEGIN
  UPDATE articles
  SET cached_category_json = json_object(
    'id', NEW.id,
    'slug', NEW.slug,
    'label', NEW.label,
    'color', NEW.color,
    'icon_svg', NEW.icon_svg
  )
  WHERE category_id = NEW.id;
END;

-- ============================================================================
-- Trigger: Update article count when articles are published/unpublished
-- ============================================================================
-- Fires when: articles.is_online changes
-- Updates: cached_post_count in both authors and categories

DROP TRIGGER IF EXISTS update_author_post_count;
DROP TRIGGER IF EXISTS update_category_post_count;

CREATE TRIGGER update_author_post_count
AFTER UPDATE OF is_online ON articles
WHEN OLD.is_online != NEW.is_online
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

CREATE TRIGGER update_category_post_count
AFTER UPDATE OF is_online ON articles
WHEN OLD.is_online != NEW.is_online
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

-- ============================================================================
-- Trigger: Update cached_equipment_json when equipment is modified
-- ============================================================================
-- Fires when: equipment.name, affiliate_url, or image_json changes
-- Updates: All articles where cached_equipment_json contains this equipment_id

-- Note: This is more complex because equipment is stored as an array in recipe_json
-- and cached_equipment_json. For now, we skip this trigger as it requires
-- JSON array manipulation which SQLite doesn't support well.
-- The app layer should rebuild cached_equipment_json on article save.

-- ============================================================================
-- Verification queries (run after applying triggers)
-- ============================================================================

-- Check triggers exist
SELECT name, type, tbl_name FROM sqlite_master WHERE type = 'trigger' AND name LIKE '%cached%';

-- Test: Update an author and verify articles are updated
-- UPDATE authors SET name = 'Test Name' WHERE id = 3;
-- SELECT headline, cached_author_json FROM articles WHERE author_id = 3;
