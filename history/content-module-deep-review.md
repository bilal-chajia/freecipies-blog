# Content Module Deep Review & Refactoring Plan

> **Date:** 2026-02-06  
> **Project:** Freecipies Recipe Blog  
> **Scope:** Articles, Recipes, Roundups CRUD + Block Editor + Related Modules

---

## Executive Summary

The content management system is sophisticated and well-architected but has accumulated technical debt, incomplete features, and architectural inconsistencies that need addressing. The system supports three content types (article, recipe, roundup) with a polymorphic design and includes an advanced block-based editor built on BlockNote.

**Overall Assessment:** ⭐⭐⭐☆☆ (3/5) - Functional but needs consolidation

---

## Part 1: Database Schema Analysis (articles table)

### 1.1 Field Usage Audit

| Field | Status | Used In | Notes |
|-------|--------|---------|-------|
| **id** | ✅ Active | All queries | Primary key, auto-increment |
| **slug** | ✅ Active | Routing, API | Unique index present |
| **type** | ✅ Active | Filtering, editor | `'article' \| 'recipe' \| 'roundup'` |
| **locale** | ⚠️ Partial | Schema only | Default 'en', no i18n implementation |
| **category_id** | ✅ Active | Relations, filtering | FK to categories |
| **author_id** | ✅ Active | Relations, filtering | FK to authors |
| **parent_article_id** | ❌ Unused | Schema only | For pillar/cluster pages - NOT implemented |
| **headline** | ✅ Active | Display, SEO | Main H1/title |
| **subtitle** | ✅ Active | Display | H2-style subheading |
| **short_description** | ✅ Active | Cards, meta | ~160 chars for SEO |
| **excerpt** | ⚠️ Partial | Schema, form | Longer teaser - not prominently used |
| **introduction** | ⚠️ Partial | Schema, form | Hero copy - not prominently used |
| **images_json** | ✅ Active | Cover, thumbnail | Full ImageSlot structure |
| **content_json** | ✅ Active | Block editor | Main body content |
| **recipe_json** | ✅ Active | Recipe editor | Full recipe data |
| **roundup_json** | ✅ Active | Roundup editor | List of curated items |
| **faqs_json** | ⚠️ Partial | Aggregated from blocks | Auto-populated from `faq_section` blocks |
| **seo_json** | ✅ Active | Meta tags | SEO overrides |
| **config_json** | ⚠️ Partial | Schema only | Feature toggles - limited usage |
| **workflow_status** | ✅ Active | Publishing flow | draft, in_review, scheduled, published, archived |
| **scheduled_at** | ❌ Unused | Schema only | Future publish date - NOT implemented |
| **is_online** | ✅ Active | Visibility | Published flag |
| **is_favorite** | ✅ Active | Featured content | Homepage curation |
| **access_level** | ❌ Unused | Schema only | 0=Public, 1=Members, 2=Premium - NOT implemented |
| **view_count** | ✅ Active | Analytics | Simple counter |
| **published_at** | ✅ Active | Sorting | First go-live timestamp |
| **created_at** | ✅ Active | Audit | Auto-set |
| **updated_at** | ✅ Active | Audit | Auto-updated by trigger |
| **deleted_at** | ✅ Active | Soft deletes | NULL = active |

### 1.2 Cached Fields (Zero-Join Optimization)

| Field | Status | Updated By | Usage |
|-------|--------|------------|-------|
| **cached_tags_json** | ✅ Active | `setArticleTagsById()` | Tag labels for display |
| **cached_category_json** | ✅ Active | `syncCachedFields()` | Category snapshot |
| **cached_author_json** | ✅ Active | `syncCachedFields()` | Author snapshot |
| **cached_equipment_json** | ❌ Unused | - | Equipment with affiliate links - NOT populated |
| **cached_rating_json** | ⚠️ Partial | - | Denormalized rating - NOT auto-updated |
| **cached_toc_json** | ✅ Active | `syncCachedFields()` | Table of contents |
| **cached_recipe_json** | ❌ Unused | - | Recipe summary for cards - NOT populated |
| **cached_card_json** | ❌ Unused | - | Pre-computed card data - NOT populated |
| **reading_time_minutes** | ⚠️ Partial | - | Calculated but not stored reliably |
| **jsonld_json** | ❌ Unused | - | Pre-generated structured data - NOT implemented |
| **total_time_minutes** | ✅ Active | Manual set | Scalar for indexing |
| **difficulty_label** | ✅ Active | Manual set | Scalar for indexing |

### 1.3 Schema Deficiencies

1. **Missing Indexes:** No full-text search index on headline/description
2. **Unused Features:** access_level, parent_article_id, scheduled_at are schema-only
3. **Cache Incompleteness:** Most cached_* fields exist but aren't populated
4. **No Content Validation:** JSON fields have no schema validation at DB level

---

## Part 2: Block Editor Analysis

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Block Editor Stack                        │
├─────────────────────────────────────────────────────────────┤
│  UI Layer    │ GutenbergRecipeEditor, GutenbergRoundupEditor│
├─────────────────────────────────────────────────────────────┤
│  Editor Core │ BlockNoteViewWithPortal (BlockNote-based)    │
├─────────────────────────────────────────────────────────────┤
│  Custom Blocks│ JSX components in blocks/ folder            │
├─────────────────────────────────────────────────────────────┤
│  Data Layer  │ useContentEditor hook                        │
├─────────────────────────────────────────────────────────────┤
│  API Layer   │ articlesAPI service                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Supported Block Types

| Block | Implemented | In Schema | Description |
|-------|-------------|-----------|-------------|
| **paragraph** | ✅ | ✅ | Text with markdown |
| **heading** | ✅ | ✅ | H2-H6 with anchors |
| **blockquote** | ✅ | ✅ | Quote with attribution |
| **list** | ✅ | ✅ | ordered/unordered/checklist |
| **image** | ✅ | ✅ | Media with variants |
| **video** | ✅ | ✅ | YouTube/Vimeo/self-hosted |
| **tip_box** (alert) | ✅ | ✅ | Callout boxes |
| **embed** | ⚠️ | ✅ | Social embeds - partial |
| **recipe_card** | ⚠️ | ✅ | Inline recipe embed - partial |
| **product_card** | ❌ | ✅ | Affiliate products - NOT implemented |
| **divider** | ✅ | ✅ | Horizontal separator |
| **spacer** | ❌ | ✅ | Vertical spacing - NOT implemented |
| **ad_slot** | ❌ | ✅ | Ad placeholders - NOT implemented |
| **table** | ✅ | ✅ | Simple tables |
| **before_after** | ✅ | ✅ | Image comparison |
| **ingredient_spotlight** | ❌ | ✅ | Ingredient explainer - NOT implemented |
| **faq_section** | ✅ | ✅ | FAQ accordion |
| **related_content** | ✅ | ✅ | Related recipes/articles |

### 2.3 Editor Issues

1. **Dual Editor Problem:** Two editor implementations exist:
   - `GutenbergRecipeEditor.jsx` (new, BlockNote-based)
   - `RecipeEditor.jsx` (old, likely legacy)
   
2. **JSON Round-trip Complexity:** Content transforms through multiple formats:
   ```
   DB (JSON string) → API (parsed) → Hook (stringified) → Editor (BlockNote objects) → User Edit → Reverse
   ```

3. **No Block Validation:** Invalid blocks can be saved without error

4. **Image Block Limitations:**
   - No focal point editing in editor
   - No aspect ratio controls
   - Variants are read-only after media selection

5. **Missing Block Controls:**
   - No drag-and-drop reordering (structure panel has it, canvas doesn't)
   - No block duplication in canvas
   - No block grouping/nesting beyond lists

---

## Part 3: Related Modules Analysis

### 3.1 Categories Module

| Aspect | Status | Notes |
|--------|--------|-------|
| Schema | ✅ Complete | Well-designed with images_json, seo_json |
| Service | ✅ Complete | CRUD operations |
| API | ✅ Complete | REST endpoints |
| Admin UI | ✅ Complete | List and editor |
| Usage | ✅ Active | Article categorization |

**Issues:**
- `depth` field exists but no hierarchy enforcement
- `cached_post_count` not auto-updated
- `i18n_json` unused

### 3.2 Authors Module

| Aspect | Status | Notes |
|--------|--------|-------|
| Schema | ✅ Complete | images_json, bio_json, seo_json |
| Service | ✅ Complete | CRUD operations |
| API | ✅ Complete | REST endpoints |
| Admin UI | ✅ Complete | List and editor |
| Usage | ✅ Active | Article attribution |

**Issues:**
- `cached_post_count` not auto-updated
- No author archive page implementation found

### 3.3 Tags Module

| Aspect | Status | Notes |
|--------|--------|-------|
| Schema | ✅ Complete | filter_groups_json, style_json |
| Service | ✅ Complete | CRUD operations |
| API | ✅ Complete | REST endpoints |
| Admin UI | ✅ Complete | List and editor |
| Usage | ✅ Active | Article tagging |

**Issues:**
- `cached_post_count` not auto-updated
- `filter_groups_json` not used for UI organization

### 3.4 Media Module

| Aspect | Status | Notes |
|--------|--------|-------|
| Schema | ✅ Complete | variants_json with R2 keys |
| Service | ✅ Complete | Upload, resize, variants |
| R2 Integration | ✅ Complete | Cloudflare R2 storage |
| Admin UI | ✅ Complete | Media library dialog |
| Usage | ✅ Active | Image selection |

**Issues:**
- No image cropping in admin
- No focal point visualization
- No batch operations

### 3.5 Equipment Module

| Aspect | Status | Notes |
|--------|--------|-------|
| Schema | ✅ Complete | affiliate links, categories |
| Service | ❓ Unknown | Not reviewed |
| Admin UI | ❓ Unknown | Not reviewed |
| Usage | ❌ Unused | Referenced in schema but not integrated |

**Critical Gap:** Equipment is defined in recipe_json but NOT linked to the equipment table. Affiliate links are stored directly in recipe_json instead of being resolved from the equipment table.

---

## Part 4: API Layer Analysis

### 4.1 Endpoints Structure

```
/api/articles              # Public articles (GET)
/api/articles?slug=xxx     # Get single article
/api/admin/articles/:id    # Admin CRUD (GET, PUT, DELETE, PATCH)
```

### 4.2 API Issues

1. **Inconsistent Response Formats:**
   - Public API uses `formatSuccessResponse()` / `formatErrorResponse()`
   - Some endpoints may return different structures

2. **No Request Validation:**
   - No Zod schemas for request body validation
   - JSON fields aren't validated against types

3. **Missing Endpoints:**
   - No bulk operations
   - No duplicate article endpoint
   - No article templates endpoint

4. **Cache Synchronization Issues:**
   - `syncCachedFields()` only syncs author, category, TOC
   - Missing: tags, equipment, recipe summary, card data

---

## Part 5: Data Flow Analysis

### 5.1 Save Flow

```
User Edit
    ↓
useContentEditor (hook)
    ↓
articlesAPI.update(id, data)
    ↓
PUT /api/admin/articles/:id
    ↓
transformArticleRequestBody()
    ↓
updateArticleById()
    ↓
setArticleTagsById() ──┐
    ↓                  │
syncCachedFields() ◄───┘
    ↓
Return updated article
```

### 5.2 Data Flow Issues

1. **Race Condition Risk:** Tags and article updated in separate queries
2. **Double JSON Encoding:** Fields sometimes get double-stringified
3. **No Transaction Safety:** Partial failures leave data inconsistent
4. **Missing Cache Invalidation:** No CDN/cache purging on update

---

## Part 6: Critical Bugs & Technical Debt

### 6.1 High Priority

| Issue | Impact | Location |
|-------|--------|----------|
| `cached_equipment_json` never populated | Equipment links don't auto-update | articles.service.ts |
| `cached_card_json` never populated | Related content cards need extra queries | articles.service.ts |
| `jsonld_json` never generated | No structured data for SEO | articles.service.ts |
| Recipe equipment stored inline | Affiliate link changes don't propagate | recipeJson.equipment |
| No request validation | Invalid data can corrupt articles | API routes |

### 6.2 Medium Priority

| Issue | Impact | Location |
|-------|--------|----------|
| `parent_article_id` unused | Can't create content clusters | Schema only |
| `scheduled_at` unused | No scheduled publishing | Schema only |
| `access_level` unused | No paywall capability | Schema only |
| No image focal point editor | Images may crop poorly | Admin UI |
| No block validation | Invalid blocks can break frontend | Block editor |

### 6.3 Code Quality Issues

1. **Type Safety Gaps:**
   - `any` types used in several places
   - JSON fields typed as `string | null` instead of structured types

2. **Naming Inconsistencies:**
   - `cached_*_json` vs `*Json` in TypeScript
   - snake_case in DB vs camelCase in TS (not always mapped)

3. **Duplicated Logic:**
   - JSON parsing in multiple places
   - Image extraction logic in both hydration and components

---

## Part 7: Unused/Dead Code

### 7.1 Confirmed Dead Code

```
src/admin/pages/articles/RecipeEditor.jsx          # Replaced by GutenbergRecipeEditor
src/admin/pages/articles/ArticleEditor.jsx         # Likely replaced
src/admin/pages/articles/RoundupEditor.jsx         # Likely replaced
src/admin/components/BlockEditor/blocks/TitleBlock.jsx      # Meta block not used
src/admin/components/BlockEditor/blocks/HeadlineBlock.jsx   # Meta block not used
src/admin/components/BlockEditor/blocks/FeaturedImageBlock.jsx # Meta block not used
```

### 7.2 Potentially Unused

- `keywordsJson` field in useContentEditor - not in schema
- `referencesJson` field in useContentEditor - not in schema
- `mediaJson` field in useContentEditor - not in schema
- `tldr` field in formData - not in schema
- `summary` field in formData - not in schema

---

## Part 8: Performance Analysis

### 8.1 Database Performance

| Query Pattern | Index Status | Risk |
|---------------|--------------|------|
| `slug` lookups | ✅ Indexed | Low |
| `is_online + published_at` | ✅ Composite | Low |
| `category_id` | ✅ Indexed | Low |
| `author_id` | ✅ Indexed | Low |
| `type` filtering | ⚠️ Single column | Medium (low cardinality) |
| Full-text search | ❌ No index | HIGH (table scan) |
| Tag filtering | ⚠️ Subquery | Medium |

### 8.2 Frontend Performance

| Issue | Impact | Solution |
|-------|--------|----------|
| BlockNote full library | Large bundle | Consider lazy loading |
| Monaco editor loaded always | Large bundle | Lazy load for JSON mode only |
| No virtualization | Slow for long articles | Virtualize block list |
| Image variants all loaded | Bandwidth waste | Use srcset properly |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total articles table fields | 42 |
| Actively used fields | ~28 |
| Unused/schema-only fields | ~14 |
| Cached fields | 10 |
| Working cached fields | 3 |
| Block types defined | 18 |
| Block types implemented | 13 |
| Content types | 3 (article, recipe, roundup) |
| API endpoints | 4 |
| Editor implementations | 2 (1 likely dead) |

---

## Next Steps

See [Refactoring Plan](./content-module-refactoring-plan.md) for detailed recommendations.
