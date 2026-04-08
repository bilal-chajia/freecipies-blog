-- ============================================================
-- Local Dev Migration: Add missing columns to existing tables
-- Run with: wrangler d1 execute DB --local --file=db/migrate-local-dev.sql
--
-- This is safe to run multiple times (ALTER TABLE ADD COLUMN IF NOT EXISTS)
-- It does NOT delete any existing data.
-- ============================================================

-- ── Articles: new columns added over time ───────────────────
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_favorite INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS difficulty_label TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cached_recipe_json TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cached_card_json TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cached_equipment_json TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cached_rating_json TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'draft';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_at TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS faqs_json TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS related_articles_json TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS parent_article_id INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS introduction TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS jsonld_json TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS config_json TEXT;

-- ── Indexes for new columns (IF NOT EXISTS is safe) ─────────
CREATE INDEX IF NOT EXISTS idx_articles_favorite ON articles(is_favorite);
CREATE INDEX IF NOT EXISTS idx_articles_workflow ON articles(workflow_status);
CREATE INDEX IF NOT EXISTS idx_articles_time ON articles(total_time_minutes);
CREATE INDEX IF NOT EXISTS idx_articles_difficulty ON articles(difficulty_label);
