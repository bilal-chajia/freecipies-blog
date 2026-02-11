# RecipeJson Structure Review

> **Context:** Food blog CMS with dual-purpose recipe data (UI display + Google rich snippets)
> **Goal:** Ensure RecipeJson serves both interactive recipe cards and SEO requirements

---

## Executive Summary

The current `recipe_json` structure in `schema.sql` is **well-designed** for a food blog CMS. Minor adjustments needed to ensure full Google rich snippet eligibility.

**Status:**
- ✅ **Required Google fields:** Covered (`name`, `image`)
- ✅ **Recommended fields:** 90% coverage
- ⚠️ **Critical gap:** `nutrition.servingSize` should be validated
- ⚠️ **Enhancement:** Video support exists but could be expanded

---

## Database Schema Alignment

The TypeScript types now exactly match `schema.sql` lines 1344-1488:

```typescript
// From schema.sql DEFAULT value
interface RecipeJson {
    // Time (numeric minutes for UI)
    prep?: number | null;
    cook?: number | null;
    total?: number | null;
    
    // Time (ISO-8601 for legacy)
    prepTime?: string | null;
    cookTime?: string | null;
    totalTime?: string | null;
    
    // Servings
    servings?: number | null;      // For UI scaling
    recipeYield?: string | null;   // For JSON-LD
    
    // Schema.org metadata
    recipeCategory?: string | null;
    recipeCuisine?: string | null;
    keywords?: string[];
    suitableForDiet?: DietType[];
    
    // Recipe info
    difficulty?: DifficultyLevel | null;
    cookingMethod?: string | null;
    estimatedCost?: string | null;
    
    // Core content
    ingredients: IngredientGroup[];
    instructions: InstructionSection[];
    tips?: string[];
    
    // Optional extras
    nutrition?: NutritionInfo;           // servingSize REQUIRED if present
    aggregateRating?: AggregateRating;
    equipment?: EquipmentRef[];
    video?: RecipeVideo | null;
}
```

---

## Google Rich Snippet Compliance

### Required Fields (Must Have)

| Field | Source | Status |
|-------|--------|--------|
| `name` | `articles.headline` | ✅ |
| `image` | `images_json.cover/thumbnail` | ✅ |

### Recommended Fields (For Rich Results)

| Field | Source | Status | Notes |
|-------|--------|--------|-------|
| `author` | `cached_author_json` | ✅ | Person type |
| `datePublished` | `articles.published_at` | ✅ | ISO 8601 |
| `description` | `articles.short_description` | ✅ | |
| `prepTime` | `recipe_json.prep` | ✅ | Auto-converted to ISO |
| `cookTime` | `recipe_json.cook` | ✅ | Auto-converted to ISO |
| `totalTime` | `recipe_json.total` | ✅ | Auto-converted to ISO |
| `recipeYield` | `recipe_json.recipeYield` | ✅ | Fallback to `servings` |
| `recipeCategory` | `recipe_json.recipeCategory` | ✅ | |
| `recipeCuisine` | `recipe_json.recipeCuisine` | ✅ | |
| `keywords` | `recipe_json.keywords` | ✅ | Joined with ", " |
| `recipeIngredient` | `recipe_json.ingredients` | ✅ | Flattened strings |
| `recipeInstructions` | `recipe_json.instructions` | ✅ | HowToStep/Section |
| `nutrition` | `recipe_json.nutrition` | ⚠️ | **servingSize required** |
| `aggregateRating` | `recipe_json.aggregateRating` | ✅ | |
| `video` | `recipe_json.video` | ✅ | Supported |
| `suitableForDiet` | `recipe_json.suitableForDiet` | ✅ | Schema.org URLs |

---

## Critical Requirements

### 1. Nutrition servingSize (VALIDATION NEEDED)

**Google Requirement:**
> If you include nutrition information, you must include `servingSize`.

**Current State:**
- `servingSize` is optional in TypeScript (to maintain flexibility)
- **BUT** JSON-LD generator skips nutrition entirely if `servingSize` is missing

**Recommendation:**
```typescript
// In admin UI, validate that servingSize is provided if any nutrition field is filled
// OR auto-populate from recipeYield

const servingSize = nutrition.servingSize || recipeYield || `Serves ${servings}`;
```

**Migration:**
```sql
-- Add default servingSize to existing recipes with nutrition but no servingSize
UPDATE articles 
SET recipe_json = json_set(
    recipe_json, 
    '$.nutrition.servingSize',
    COALESCE(
        json_extract(recipe_json, '$.recipeYield'),
        json_extract(recipe_json, '$.servings') || ' servings',
        '1 serving'
    )
)
WHERE type = 'recipe'
  AND json_extract(recipe_json, '$.nutrition') IS NOT NULL
  AND json_extract(recipe_json, '$.nutrition.servingSize') IS NULL;
```

---

### 2. Image Requirements

**Google Requirements:**
- At least 1 image (✅ covered)
- Multiple aspect ratios recommended:
  - 1:1 (square) - Google Discover
  - 4:3 (standard) - Search results
  - 16:9 (widescreen) - Video previews

**Current Implementation:**
```astro
<!-- RecipeLayout.astro extracts cover + thumbnail -->
const cover = extractImage(recipe.imagesJson, 'cover', 1200);
const thumbnail = extractImage(recipe.imagesJson, 'thumbnail', 800);
```

**Recommendation:**
Use `images_json.pinterest` slot for 2:3 ratio images (Pinterest-optimized):
```json
{
  "pinterest": {
    "variants": { "lg": { "url": "...", "width": 1000, "height": 1500 } }
  }
}
```

---

### 3. Video Enhancement (Optional but High Impact)

**Current Structure:**
```typescript
interface RecipeVideo {
    url: string;
    name: string;
    description?: string;
    thumbnailUrl?: string;
    duration: string;  // ISO-8601
}
```

**Google VideoObject supports:**
- `contentUrl` - Direct MP4 (preferred)
- `embedUrl` - YouTube/Vimeo embed
- `uploadDate` - ISO 8601
- `interactionStatistic` - View count

**Recommendation:** Enhance when adding video:
```typescript
interface RecipeVideo {
    // ... existing fields ...
    
    // For better Google visibility:
    contentUrl?: string;      // Direct MP4
    embedUrl?: string;        // YouTube embed
    uploadDate?: string;      // ISO 8601
}
```

---

## Files Updated

| File | Changes |
|------|---------|
| `src/modules/articles/types/recipes.types.ts` | Aligned with schema.sql, added conversion utilities |
| `src/lib/recipe-jsonld.ts` | New focused JSON-LD generator |
| `docs/RECIPE_JSON_REVIEW.md` | This documentation |

---

## Usage in Templates

### RecipeLayout.astro

Replace inline JSON-LD with generator:

```astro
---
import { generateRecipeJsonLd } from '@lib/recipe-jsonld';

const jsonLd = generateRecipeJsonLd({
    article: recipe,
    recipeJson: recipeJson,
    author,
    category,
    siteUrl: Astro.site?.toString() || Astro.url.origin,
    canonicalUrl: new URL(Astro.url.pathname, siteUrl).toString()
});
---

{jsonLd && (
    <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
)}
```

### Ingredient Display

```astro
---
import { formatIngredient } from '@modules/articles/types/recipes.types';

// Format for display
const displayText = formatIngredient({
    amount: 2.5,
    unit: 'cups',
    name: 'flour',
    notes: 'sifted'
});
// -> "2.5 cups flour, sifted"
---
```

### Nutrition Display

```typescript
import { toSchemaOrgNutrition } from '@modules/articles/types/recipes.types';

// Convert to Google format
const schemaNutrition = toSchemaOrgNutrition({
    servingSize: '1 cookie (80g)',
    calories: 320,
    fatContent: 15
});
// -> { '@type': 'NutritionInformation', servingSize: '1 cookie (80g)', calories: '320 calories', fatContent: '15g' }
```

---

## Validation Checklist

Before publishing recipes:

- [ ] `headline` is set (becomes `name`)
- [ ] `images_json.cover` has valid image (becomes `image`)
- [ ] `short_description` is set (becomes `description`)
- [ ] `published_at` is set (becomes `datePublished`)
- [ ] `author` is assigned (becomes `author`)
- [ ] `recipeYield` OR `servings` is set
- [ ] If nutrition is filled: `servingSize` is provided
- [ ] `ingredients` has at least one group with items
- [ ] `instructions` has at least one section with steps

**Validate with:**
- https://search.google.com/test/rich-results
- https://validator.schema.org/

---

## Migration Notes

### For Existing Recipes

1. **Add missing `recipeYield`:**
   ```sql
   UPDATE articles 
   SET recipe_json = json_set(recipe_json, '$.recipeYield', 
       json_extract(recipe_json, '$.servings') || ' servings'
   )
   WHERE type = 'recipe'
     AND json_extract(recipe_json, '$.recipeYield') IS NULL
     AND json_extract(recipe_json, '$.servings') IS NOT NULL;
   ```

2. **Add missing `servingSize` for nutrition:**
   ```sql
   -- Run the servingSize migration SQL above
   ```

### For New Recipes

Admin UI should enforce:
- `recipeYield` is recommended if nutrition is added
- `servingSize` is required if any nutrition field is filled

---

## Summary

The existing `recipe_json` structure is **well-suited** for a food blog CMS. Key takeaways:

1. **Keep current structure** - It's aligned with both UI needs and Google requirements
2. **Validate `servingSize`** - Critical for nutrition-rich snippets
3. **Use the new JSON-LD generator** - Ensures consistent, valid output
4. **Test with Google's tools** - Validate before publishing

The dual-purpose design (UI + SEO) is maintained without over-engineering.
