# Content Module Refactoring Plan

> **Date:** 2026-02-06  
> **Project:** Freecipies Recipe Blog  
> **Related:** [Deep Review](./content-module-deep-review.md)

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Request Validation Layer

**Goal:** Add type-safe request validation to prevent data corruption

```typescript
// New file: src/modules/articles/validation/article.schema.ts
import { z } from 'zod';

export const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('heading'),
    level: z.number().min(2).max(6),
    text: z.string(),
  }),
  // ... all block types
]);

export const ArticleCreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(['article', 'recipe', 'roundup']),
  headline: z.string().min(1).max(200),
  shortDescription: z.string().min(1).max(500),
  contentJson: z.array(ContentBlockSchema),
  // ... other fields
});

export type ArticleCreateInput = z.infer<typeof ArticleCreateSchema>;
```

**Tasks:**
- [ ] Install Zod if not present
- [ ] Create validation schemas for all content types
- [ ] Add validation middleware to API routes
- [ ] Add client-side validation to forms

### 1.2 API Consistency Layer

**Goal:** Standardize all API responses and errors

```typescript
// New file: src/modules/articles/api/middleware.ts
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (context: APIContext, next: () => Promise<Response>) => {
    try {
      const body = await context.request.json();
      const validated = schema.parse(body);
      context.locals.validatedBody = validated;
      return next();
    } catch (error) {
      return formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: error.errors
        })
      );
    }
  };
}
```

**Tasks:**
- [ ] Create standardized API middleware
- [ ] Refactor all article endpoints to use middleware
- [ ] Add request logging
- [ ] Add rate limiting

### 1.3 Database Transaction Safety

**Goal:** Wrap multi-step operations in transactions

```typescript
// src/modules/articles/services/articles.service.ts
export async function updateArticleWithRelations(
  db: D1Database,
  id: number,
  data: ArticleUpdate,
  tagIds?: number[]
): Promise<boolean> {
  // D1 doesn't support transactions directly, so we implement compensating actions
  const drizzle = createDb(db);
  
  try {
    // 1. Update article
    await drizzle.update(articles).set(data).where(eq(articles.id, id));
    
    // 2. Update tags if provided
    if (tagIds !== undefined) {
      await setArticleTagsById(db, id, tagIds);
    }
    
    // 3. Sync all cached fields
    await syncAllCachedFields(db, id); // Enhanced version
    
    return true;
  } catch (error) {
    // Log for manual recovery if needed
    console.error(`Article update failed for id ${id}:`, error);
    throw error;
  }
}
```

---

## Phase 2: Cache Completeness (Week 2-3)

### 2.1 Implement Missing Cache Builders

**Current State:** Only 3 of 10 cached fields are populated

```typescript
// Enhanced: src/modules/articles/services/cache-builders.ts

export async function buildCachedEquipmentJson(
  db: D1Database,
  recipeJson: RecipeJson
): Promise<CachedEquipmentJson> {
  if (!recipeJson.equipment?.length) return [];
  
  const drizzle = createDb(db);
  const equipmentIds = recipeJson.equipment.map(e => e.equipment_id);
  
  const equipment = await drizzle
    .select()
    .from(equipmentTable)
    .where(inArray(equipmentTable.id, equipmentIds));
  
  return recipeJson.equipment.map(ref => {
    const item = equipment.find(e => e.id === ref.equipment_id);
    return {
      id: ref.equipment_id,
      name: item?.name || 'Unknown Equipment',
      slug: item?.slug || '',
      affiliate_url: item?.affiliate_url,
      image_url: item?.image_json ? extractFirstUrl(item.image_json) : undefined,
      required: ref.required,
    };
  });
}

export async function buildCachedRecipeJson(
  recipeJson: RecipeJson
): Promise<CachedRecipeJson> {
  const nutrition = recipeJson.nutrition;
  
  return {
    isRecipe: true,
    totalTimeMinutes: recipeJson.total || null,
    difficulty: recipeJson.difficulty || null,
    servings: recipeJson.servings || null,
    caloriesPerServing: nutrition?.calories || null,
    primaryDietLabels: extractDietLabels(recipeJson.suitableForDiet),
    primaryOccasionLabels: extractOccasionLabels(recipeJson.keywords),
    mainIngredients: extractMainIngredients(recipeJson.ingredients),
    isQuick: (recipeJson.total || 0) <= 30,
    isHealthy: calculateHealthScore(nutrition) >= 7,
    isBudget: recipeJson.estimatedCost === 'Budget',
  };
}

export async function buildCachedCardJson(
  article: Article,
  recipeJson?: RecipeJson
): Promise<CachedCardJson> {
  const images = safeParseJson<ArticleImagesJson>(article.imagesJson);
  
  const base: CachedCardJson = {
    id: article.id,
    type: article.type as ContentType,
    slug: article.slug,
    headline: article.headline,
    short_description: article.shortDescription,
    thumbnail: images?.thumbnail,
  };
  
  if (article.type === 'recipe' && recipeJson) {
    return {
      ...base,
      total_time: recipeJson.total || undefined,
      difficulty: recipeJson.difficulty || undefined,
      servings: recipeJson.servings || undefined,
      rating: recipeJson.aggregateRating || undefined,
    };
  }
  
  if (article.type === 'article') {
    return {
      ...base,
      reading_time: article.readingTimeMinutes || undefined,
    };
  }
  
  if (article.type === 'roundup') {
    const roundup = safeParseJson<RoundupJson>(article.roundupJson);
    return {
      ...base,
      item_count: roundup?.items.length || 0,
    };
  }
  
  return base;
}

export async function buildJsonLdJson(
  article: Article,
  recipeJson?: RecipeJson,
  author?: Author,
  category?: Category
): Promise<unknown[]> {
  const jsonld: unknown[] = [];
  
  // Base article schema
  jsonld.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.shortDescription,
    author: author ? { '@type': 'Person', name: author.name } : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
  });
  
  // Recipe schema
  if (article.type === 'recipe' && recipeJson) {
    jsonld.push(buildRecipeSchema(article, recipeJson));
  }
  
  // FAQ schema
  const faqs = safeParseJson<FAQsJson>(article.faqsJson);
  if (faqs?.length) {
    jsonld.push(buildFaqSchema(faqs));
  }
  
  return jsonld;
}
```

### 2.2 Enhanced Cache Sync

```typescript
// Replace syncCachedFields with comprehensive version
export async function syncAllCachedFields(
  db: D1Database,
  id: number
): Promise<boolean> {
  const drizzle = createDb(db);
  
  const article = await drizzle
    .select({
      ...getTableColumns(articles),
      authorName: authors.name,
      authorSlug: authors.slug,
      authorImagesJson: authors.imagesJson,
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      categoryIconSvg: categories.iconSvg,
    })
    .from(articles)
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.id, id))
    .get();
  
  if (!article) return false;
  
  const recipeJson = safeParseJson<RecipeJson>(article.recipeJson);
  
  const updateData: Partial<Article> = {
    // Existing caches
    cachedAuthorJson: JSON.stringify({
      id: article.authorId,
      name: article.authorName,
      slug: article.authorSlug,
      avatar: extractImage(article.authorImagesJson, 'avatar'),
    }),
    cachedCategoryJson: JSON.stringify({
      id: article.categoryId,
      label: article.categoryLabel,
      slug: article.categorySlug,
      color: article.categoryColor,
      icon_svg: article.categoryIconSvg,
    }),
    cachedTocJson: JSON.stringify(extractTocFromContent(article.contentJson)),
    
    // NEW: Complete the cache picture
    cachedRecipeJson: JSON.stringify(await buildCachedRecipeJson(recipeJson)),
    cachedCardJson: JSON.stringify(await buildCachedCardJson(article, recipeJson)),
    cachedEquipmentJson: recipeJson 
      ? JSON.stringify(await buildCachedEquipmentJson(db, recipeJson))
      : '[]',
    jsonldJson: JSON.stringify(await buildJsonLdJson(
      article, 
      recipeJson,
      // Pass full author/category objects if needed
    )),
    
    // Scalar helpers
    totalTimeMinutes: recipeJson?.total || null,
    difficultyLabel: recipeJson?.difficulty || null,
    readingTimeMinutes: calculateReadingTime(article.contentJson),
  };
  
  await drizzle.update(articles).set(updateData).where(eq(articles.id, id));
  
  return true;
}
```

**Tasks:**
- [ ] Create `cache-builders.ts` with all builder functions
- [ ] Update `syncCachedFields` to `syncAllCachedFields`
- [ ] Add migration to populate missing caches for existing articles
- [ ] Add cache validation on read

---

## Phase 3: Block Editor Improvements (Week 3-4)

### 3.1 Missing Block Implementations

```typescript
// New: src/admin/components/BlockEditor/blocks/ProductCardBlock.jsx
export const ProductCardBlock = createReactBlockSpec({
  type: 'product_card',
  propSchema: {
    name: { default: '' },
    url: { default: '' },
    price: { default: '' },
    image: { default: null },
    affiliate: { default: false },
  },
  containsInlineContent: false,
  render: ({ block, editor }) => (
    <ProductCardEditor
      {...block.props}
      onChange={(props) => editor.updateBlock(block, { props })}
    />
  ),
});

// New: src/admin/components/BlockEditor/blocks/IngredientSpotlightBlock.jsx
export const IngredientSpotlightBlock = createReactBlockSpec({
  type: 'ingredient_spotlight',
  propSchema: {
    name: { default: '' },
    description: { default: '' },
    image: { default: null },
    tips: { default: '' },
    substitutes: { default: '[]' },
    link: { default: '' },
  },
  render: ({ block, editor }) => (
    <IngredientSpotlightEditor
      {...block.props}
      onChange={(props) => editor.updateBlock(block, { props })}
    />
  ),
});
```

### 3.2 Block Validation

```typescript
// New: src/admin/components/BlockEditor/validation/blockValidator.js
import { ContentBlockSchema } from '@modules/articles/validation/article.schema';

export function validateBlocks(blocks) {
  const errors = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const result = ContentBlockSchema.safeParse(block);
    
    if (!result.success) {
      errors.push({
        index: i,
        block: block.type,
        errors: result.error.errors,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeBlocks(blocks) {
  // Remove invalid blocks or fix common issues
  return blocks.filter(block => {
    if (!block.type) return false;
    if (typeof block.type !== 'string') return false;
    return true;
  });
}
```

### 3.3 Editor Performance

```typescript
// Optimize useContentEditor
export function useContentEditor({ slug, contentType }) {
  // ... existing code ...
  
  // Add debouncing for auto-save
  const debouncedSave = useDebounce(async (data) => {
    if (isEditMode && articleId) {
      await articlesAPI.update(articleId, data);
      showToast('Auto-saved');
    }
  }, 30000); // 30 second auto-save
  
  // Add block count limit
  const MAX_BLOCKS = 500;
  const blockCount = useMemo(() => {
    try {
      return JSON.parse(contentJson).length;
    } catch {
      return 0;
    }
  }, [contentJson]);
  
  useEffect(() => {
    if (blockCount > MAX_BLOCKS) {
      showWarning('Article is very long. Consider splitting into multiple articles.');
    }
  }, [blockCount]);
  
  // ... rest of hook ...
}
```

**Tasks:**
- [ ] Implement missing block types
- [ ] Add block validation layer
- [ ] Add auto-save functionality
- [ ] Add editor performance limits
- [ ] Remove dead editor code (old RecipeEditor, ArticleEditor)

---

## Phase 4: Equipment Integration (Week 4)

### 4.1 Link Recipe Equipment to Equipment Table

```typescript
// Update: src/modules/articles/services/articles.service.ts

export async function resolveRecipeEquipment(
  db: D1Database,
  equipmentRefs: EquipmentRef[]
): Promise<ResolvedEquipment[]> {
  if (!equipmentRefs?.length) return [];
  
  const drizzle = createDb(db);
  const ids = equipmentRefs.map(r => r.equipment_id);
  
  const items = await drizzle
    .select()
    .from(equipment)
    .where(and(
      inArray(equipment.id, ids),
      isNull(equipment.deletedAt),
      eq(equipment.isActive, true)
    ));
  
  return equipmentRefs.map(ref => {
    const item = items.find(i => i.id === ref.equipment_id);
    return {
      ...ref,
      resolved: item || null,
    };
  });
}

// In save flow, validate equipment references
export async function validateRecipeEquipment(
  db: D1Database,
  recipeJson: RecipeJson
): Promise<{ valid: boolean; errors: string[] }> {
  if (!recipeJson.equipment?.length) return { valid: true, errors: [] };
  
  const drizzle = createDb(db);
  const ids = recipeJson.equipment.map(e => e.equipment_id);
  
  const existing = await drizzle
    .select({ id: equipment.id })
    .from(equipment)
    .where(inArray(equipment.id, ids));
  
  const existingIds = new Set(existing.map(e => e.id));
  const errors: string[] = [];
  
  for (const ref of recipeJson.equipment) {
    if (!existingIds.has(ref.equipment_id)) {
      errors.push(`Equipment ID ${ref.equipment_id} not found`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 4.2 Equipment Selector in Recipe Editor

```typescript
// New component: src/admin/components/RecipeBuilder/EquipmentSelector.jsx
export function EquipmentSelector({ value = [], onChange }) {
  const [equipment, setEquipment] = useState([]);
  
  useEffect(() => {
    equipmentAPI.getAll().then(res => {
      if (res.data.success) setEquipment(res.data.data);
    });
  }, []);
  
  return (
    <div className="equipment-selector">
      {value.map((ref, index) => (
        <EquipmentRow
          key={index}
          ref={ref}
          equipment={equipment.find(e => e.id === ref.equipment_id)}
          onChange={(updated) => {
            const next = [...value];
            next[index] = updated;
            onChange(next);
          }}
          onRemove={() => {
            onChange(value.filter((_, i) => i !== index));
          }}
        />
      ))}
      <AddEquipmentButton
        equipment={equipment}
        onSelect={(item) => {
          onChange([...value, { equipment_id: item.id, required: true }]);
        }}
      />
    </div>
  );
}
```

**Tasks:**
- [ ] Create EquipmentSelector component
- [ ] Add equipment validation to save flow
- [ ] Migrate inline equipment data to references
- [ ] Update cached_equipment_json builder

---

## Phase 5: Cleanup & Consolidation (Week 5)

### 5.1 Remove Dead Code

```bash
# Files to delete:
src/admin/pages/articles/RecipeEditor.jsx
src/admin/pages/articles/ArticleEditor.jsx
src/admin/pages/articles/RoundupEditor.jsx
src/admin/components/BlockEditor/blocks/TitleBlock.jsx
src/admin/components/BlockEditor/blocks/HeadlineBlock.jsx
src/admin/components/BlockEditor/blocks/FeaturedImageBlock.jsx
```

### 5.2 Remove Unused Form Fields

```typescript
// In useContentEditor - remove these:
// - keywordsJson (not in schema)
// - referencesJson (not in schema)
// - mediaJson (not in schema)
// - tldr (not in schema, use introduction)
// - summary (not in schema, use shortDescription)
```

### 5.3 Consolidate Image Handling

```typescript
// Single source of truth: src/shared/types/images.ts
// Remove duplicates from:
// - src/modules/articles/types/images.types.ts (already re-exports)
// - Any hardcoded image types in components
```

---

## Phase 6: Advanced Features (Week 6-8)

### 6.1 Scheduled Publishing

```typescript
// Enable scheduled_at field
// Add cron trigger in Cloudflare to check scheduled articles

// src/modules/articles/services/scheduler.service.ts
export async function publishScheduledArticles(db: D1Database): Promise<number> {
  const drizzle = createDb(db);
  const now = new Date().toISOString();
  
  const scheduled = await drizzle
    .select()
    .from(articles)
    .where(and(
      eq(articles.workflowStatus, 'scheduled'),
      sql`${articles.scheduledAt} <= ${now}`,
      isNull(articles.deletedAt)
    ));
  
  for (const article of scheduled) {
    await drizzle
      .update(articles)
      .set({
        isOnline: true,
        workflowStatus: 'published',
        publishedAt: now,
      })
      .where(eq(articles.id, article.id));
  }
  
  return scheduled.length;
}
```

### 6.2 Parent-Child Content (Pillar Pages)

```typescript
// Enable parent_article_id
// Add UI for selecting parent article
// Add validation to prevent circular references

export async function getArticleChildren(
  db: D1Database,
  parentId: number
): Promise<Article[]> {
  const drizzle = createDb(db);
  return drizzle
    .select()
    .from(articles)
    .where(and(
      eq(articles.parentArticleId, parentId),
      eq(articles.isOnline, true),
      isNull(articles.deletedAt)
    ))
    .orderBy(desc(articles.publishedAt));
}
```

### 6.3 Content Templates

```typescript
// New table: article_templates
// New endpoints: /api/admin/templates

export interface ArticleTemplate {
  id: number;
  name: string;
  type: ContentType;
  contentJson: ContentBlock[];
  recipeJson?: RecipeJson;
  configJson?: ConfigJson;
}

// In editor, add "Create from Template" option
```

---

## Implementation Priority Matrix

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| 🔴 P0 | Request validation | High | Medium |
| 🔴 P0 | Complete cache sync | High | Medium |
| 🟡 P1 | Equipment integration | High | Medium |
| 🟡 P1 | Block validation | Medium | Low |
| 🟡 P1 | Dead code removal | Medium | Low |
| 🟢 P2 | Missing blocks | Medium | Medium |
| 🟢 P2 | Scheduled publishing | Medium | Medium |
| 🟢 P2 | Parent-child content | Low | Medium |
| 🔵 P3 | Content templates | Low | High |
| 🔵 P3 | Performance optimization | Medium | High |

---

## Migration Strategy

### Database Migrations

```sql
-- Migration: Populate missing cached fields
-- Run after deploying cache builder updates

-- 1. Backfill cached_recipe_json
UPDATE articles
SET cached_recipe_json = json_object(
  'isRecipe', CASE WHEN type = 'recipe' THEN 1 ELSE 0 END,
  'totalTimeMinutes', json_extract(recipe_json, '$.total'),
  'difficulty', json_extract(recipe_json, '$.difficulty'),
  'servings', json_extract(recipe_json, '$.servings')
)
WHERE cached_recipe_json IS NULL OR cached_recipe_json = '{}';

-- 2. Backfill total_time_minutes and difficulty_label
UPDATE articles
SET 
  total_time_minutes = json_extract(recipe_json, '$.total'),
  difficulty_label = json_extract(recipe_json, '$.difficulty')
WHERE type = 'recipe';
```

### Code Migration

1. **Backward Compatibility:** Keep old API responses working during transition
2. **Feature Flags:** Use flags to enable new features gradually
3. **Monitoring:** Add logging to catch migration issues

---

## Testing Strategy

### Unit Tests

```typescript
// src/modules/articles/services/__tests__/cache-builders.test.ts
describe('buildCachedRecipeJson', () => {
  it('should calculate isQuick correctly', () => {
    const recipe = { total: 25 };
    expect(buildCachedRecipeJson(recipe).isQuick).toBe(true);
  });
  
  it('should calculate isQuick correctly for long recipes', () => {
    const recipe = { total: 45 };
    expect(buildCachedRecipeJson(recipe).isQuick).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Test full save flow with all caches
// Test equipment resolution
// Test block validation
```

### E2E Tests

```typescript
// Test editor block creation
// Test article publishing flow
// Test media selection
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Fields actively used | 28/42 | 35/42 |
| Cached fields working | 3/10 | 10/10 |
| Block types implemented | 13/18 | 17/18 |
| API validation coverage | 0% | 100% |
| Test coverage | ? | >70% |
| Bundle size (editor) | ? | -20% |

---

## Appendix: Code Location Reference

| Component | Path |
|-----------|------|
| Article Service | `src/modules/articles/services/articles.service.ts` |
| Article Schema | `src/modules/articles/schema/articles.schema.ts` |
| Block Editor | `src/admin/components/BlockEditor/index.jsx` |
| Recipe Editor Page | `src/admin/pages/articles/GutenbergRecipeEditor.jsx` |
| Content Editor Hook | `src/admin/pages/articles/shared/useContentEditor.js` |
| Hydration Utils | `src/shared/utils/hydration.ts` |
| Image Types | `src/shared/types/images.ts` |
| API Routes | `src/pages/api/articles.ts`, `src/pages/api/admin/articles/[id].ts` |
