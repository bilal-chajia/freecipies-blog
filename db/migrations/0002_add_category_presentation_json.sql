-- Migration: add per-category editorial presentation_json column.
-- Apply on prod D1 at deploy. Additive; existing rows default to '{}'.
ALTER TABLE categories ADD COLUMN presentation_json TEXT DEFAULT '{}' CHECK (json_valid(presentation_json));
