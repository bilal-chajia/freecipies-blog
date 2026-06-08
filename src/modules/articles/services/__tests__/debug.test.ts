import { describe, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { generateJsonLd } from '../../utils/jsonld';
import { normalizeRecipeJson } from '../../utils/article-json-contract';
import { safeParseJson } from '@shared/utils/hydration';

describe('Debug Avocado Toast', () => {
  it('loads and debugs the database record', () => {
    const dbPath = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', 'd3e041905f05e515c70eeff7a19bb719b7fd5943de6f9e0a4f0dad6a65e8bfec.sqlite');
    const db = new DatabaseSync(dbPath);
    const row = db.prepare("SELECT * FROM articles WHERE slug = 'avocado-toast'").get() as any;
    
    console.log("AVOCADO TOAST ROW ID:", row.id);
    console.log("headline:", row.headline);
    console.log("type:", row.type);
    console.log("recipe_json:", row.recipe_json);
    console.log("images_json:", row.images_json);
    console.log("faqs_json:", row.faqs_json);
    console.log("cached_author_json:", row.cached_author_json);
    console.log("cached_category_json:", row.cached_category_json);
    
    try {
      console.log("Generating JSON-LD...");
      const schemas = generateJsonLd({
        id: row.id,
        type: row.type,
        headline: row.headline,
        slug: row.slug,
        short_description: row.short_description,
        published_at: row.published_at,
        updated_at: row.updated_at,
        recipe_json: row.recipe_json,
        roundup_json: row.roundup_json,
        images_json: row.images_json,
        faqs_json: row.faqs_json,
        cached_author_json: row.cached_author_json,
        cached_category_json: row.cached_category_json,
      }, 'http://localhost:4321');
      console.log("Generated successfully:", JSON.stringify(schemas, null, 2));
    } catch (e) {
      console.error("ERROR generating JSON-LD:", e);
      throw e;
    }
  });
});
