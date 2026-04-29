# Zod Validation — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Zod schema validation at every API boundary (request body, query params, path params) to replace 100+ manual `typeof`/`parseInt`/`!slug` checks with typed, declarative schemas.

**Architecture:** Centralized schemas in `src/shared/validation/` per domain, consumed by a thin `validate()` helper that returns typed data or throws `AppError(VALIDATION_ERROR)`. Endpoints shrink by 30-50% — no more manual guard clauses.

**Tech Stack:** Zod 4 (`import { z } from 'zod'`), existing `AppError`/`ErrorCodes` from `@shared/utils`

---

## Context: Current State

### Numbers
- **49 API endpoints** in `src/pages/api/`
- **~100 manual validation checks** (`VALIDATION_ERROR` throws, `parseInt`, `typeof`, null checks)
- **0 Zod schemas** currently
- **Endpoints range:** 15 lines (simple GET) to 352 lines (AI models CRUD)

### Validation Patterns Found (all manual, all redundant)

| Pattern | Count | Example |
|---|---|---|
| `!slug` / `!id` param check | ~30 | `if (!slug) throw new AppError(VALIDATION_ERROR, ...)` |
| `parseInt(idParam, 10)` | ~20 | `const id = parseInt(params.id, 10)` |
| `typeof X === 'string'` | ~15 | body field type guards |
| `request.json()` + field checks | ~25 | `const body = await request.json(); if (!body.name) ...` |
| `validatePaginationParams()` | ~8 | existing helper (migrate to Zod) |

### File Structure (target)

```
src/shared/validation/
├── helpers.ts           ← validate(), validateBody(), validateParams(), validateQuery()
├── schemas/
│   ├── common.ts        ← pagination, id, slug, sortOrder, etc.
│   ├── articles.ts      ← article CRUD body schemas
│   ├── categories.ts    ← category CRUD body schemas
│   ├── authors.ts       ← author CRUD body schemas
│   ├── tags.ts          ← tag CRUD body schemas
│   ├── media.ts         ← media upload/confirm/bulk-delete schemas
│   ├── settings.ts      ← settings/menus/appearance schemas
│   ├── equipment.ts     ← equipment CRUD schemas
│   ├── ai.ts            ← AI generate/settings/model schemas
│   ├── auth.ts          ← login/refresh/verify schemas
│   ├── redirects.ts     ← redirect CRUD schemas
│   ├── templates.ts     ← template CRUD schemas
│   └── pins.ts          ← Pinterest pin schemas
└── index.ts             ← barrel export
```

---

## Phase 0: Infrastructure

### Task 0.1: Create validation helpers

**Objective:** Provide the `validate()` functions that every endpoint will use. These bridge Zod and the existing `AppError` system.

**Files:**
- Create: `src/shared/validation/helpers.ts`
- Create: `src/shared/validation/index.ts`

```typescript
// src/shared/validation/helpers.ts
import { z, ZodError, ZodSchema } from 'zod';
import { AppError, ErrorCodes } from '../utils/error-handler';

/**
 * Format ZodError into user-friendly error details.
 * Returns { field: message } map.
 */
function formatZodIssues(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    details[path] = issue.message;
  }
  return details;
}

/**
 * Validate data against a Zod schema.
 * Returns typed data on success, throws AppError(VALIDATION_ERROR) on failure.
 *
 * @example
 * const { name, slug } = validate(CreateCategorySchema, body);
 */
export function validate<T extends ZodSchema>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = formatZodIssues(result.error);
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      result.error.issues[0]?.message || 'Validation failed',
      400,
      { fields: details },
    );
  }
  return result.data;
}

/**
 * Validate request body (JSON) against a Zod schema.
 * Combines JSON parsing + validation in one step.
 *
 * @example
 * const body = validateBody(request, CreateCategorySchema);
 */
export async function validateBody<T extends ZodSchema>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400);
  }
  return validate(schema, data);
}

/**
 * Validate URL path params (string values) against a Zod schema.
 *
 * @example
 * const { id } = validateParams(params, z.object({ id: z.coerce.number().int().positive() }));
 */
export function validateParams<T extends ZodSchema>(
  params: Record<string, string | undefined>,
  schema: T,
): z.infer<T> {
  return validate(schema, params);
}

/**
 * Validate URL query params (string values) against a Zod schema.
 *
 * @example
 * const { page, limit } = validateQuery(url.searchParams, PaginationSchema);
 */
export function validateQuery<T extends ZodSchema>(
  searchParams: URLSearchParams | Record<string, string | undefined>,
  schema: T,
): z.infer<T> {
  const raw: Record<string, string | undefined> = {};
  if (searchParams instanceof URLSearchParams) {
    for (const [key, value] of searchParams) {
      raw[key] = value;
    }
  } else {
    Object.assign(raw, searchParams);
  }
  return validate(schema, raw);
}

// Re-export z for convenience
export { z };
```

```typescript
// src/shared/validation/index.ts
export { validate, validateBody, validateParams, validateQuery, z } from './helpers';
```

**Commit:**
```
feat(validation): add Zod validation helpers (validate, validateBody, validateParams, validateQuery)
```

---

### Task 0.2: Create common schemas

**Objective:** Shared schemas reused across endpoints (pagination, IDs, slugs, etc.).

**Files:**
- Create: `src/shared/validation/schemas/common.ts`

```typescript
// src/shared/validation/schemas/common.ts
import { z } from '../helpers';

/** Positive integer ID from path param (coerces string → number) */
export const IdParam = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer'),
});

/** Slug or numeric ID from path param */
export const SlugOrIdParam = z.object({
  slug: z.string().min(1, 'Slug or ID is required'),
});

/** Pagination query params with sensible defaults */
export const PaginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
}).transform(({ page, limit }) => ({
  page,
  limit,
  offset: (page - 1) * limit,
}));

/** Generic name field (used by categories, tags, authors, etc.) */
export const LabelField = z.string().min(1, 'Label is required').max(200);
export const SlugField = z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes');
export const DescriptionField = z.string().max(2000).optional();

/** Type helper — extract inferred type from a schema */
export type InferSchema<T extends z.ZodTypeAny> = z.infer<T>;
```

**Commit:**
```
feat(validation): add common Zod schemas (IdParam, SlugOrIdParam, PaginationQuery, etc.)
```

---

## Phase 1: High-Traffic Core Endpoints

> Priority: articles + categories + tags + authors = the most-used CRUD endpoints.

### Task 1.1: Articles API schemas

**Objective:** Zod schemas for `POST /api/articles`, `PUT /api/admin/articles/:id`, and GET params.

**Files:**
- Create: `src/shared/validation/schemas/articles.ts`

**Current manual validation in `src/pages/api/articles.ts` (POST):**
```typescript
// Manual: body.type check, body.slug check, body.headline check
// Replace with:
const body = validateBody(request, CreateArticleSchema);
```

**Current manual validation in `src/pages/api/admin/articles/[id].ts` (PUT):**
```typescript
// Manual: parseArticleId(), body checks, action param check
// Replace with:
const { id } = validateParams(params, IdParam);
const body = validateBody(request, UpdateArticleSchema);
```

**Schemas to define:**

```typescript
// src/shared/validation/schemas/articles.ts
import { z } from '../helpers';

export const CreateArticleSchema = z.object({
  type: z.enum(['article', 'recipe', 'roundup']),
  slug: z.string().min(1).max(200),
  headline: z.string().min(1).max(300),
  shortDescription: z.string().max(500).optional(),
  contentJson: z.union([z.string(), z.array(z.record(z.unknown()))]).optional(),
  recipeJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  roundupJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  imagesJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  authorId: z.number().int().positive().optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  selectedTags: z.array(z.number().int().positive()).optional(),
  seoJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  configJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  isOnline: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  // Allow passthrough for any extra fields (transformArticleRequestBody handles normalization)
}).passthrough();

export const UpdateArticleSchema = CreateArticleSchema; // Same shape, all optional via passthrough

export const ArticleActionQuery = z.object({
  action: z.enum(['toggle-online', 'toggle-favorite']),
});
```

**Files to modify (consume schemas):**
- Modify: `src/pages/api/articles.ts` — replace manual validation with `validateBody`
- Modify: `src/pages/api/admin/articles/[id].ts` — replace `parseArticleId` + manual checks

**Commit:**
```
feat(validation): add article schemas + migrate articles API endpoints
```

---

### Task 1.2: Categories API schemas

**Files:**
- Create: `src/shared/validation/schemas/categories.ts`
- Modify: `src/pages/api/categories.ts`
- Modify: `src/pages/api/categories/[slug].ts`

```typescript
// src/shared/validation/schemas/categories.ts
import { z } from '../helpers';

export const CreateCategorySchema = z.object({
  slug: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  shortDescription: z.string().min(1).max(500),
  color: z.string().regex(/^#[0-9a-f]{6,8}$/i, 'Invalid hex color').optional(),
  parentId: z.number().int().positive().optional().nullable(),
  isOnline: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  iconSvg: z.string().optional(),
  imagesJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  seoJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  configJson: z.union([z.string(), z.record(z.unknown())]).optional(),
}).passthrough();

export const UpdateCategorySchema = CreateCategorySchema;
```

**Pattern for each endpoint:**
```typescript
// BEFORE (repeated 3x in categories/[slug].ts):
if (!slug) {
  throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug or ID is required', 400);
}

// AFTER:
const { slug } = validateParams(params, SlugOrIdParam);
```

**Commit:**
```
feat(validation): add category schemas + migrate categories API endpoints
```

---

### Task 1.3: Tags API schemas

**Files:**
- Create: `src/shared/validation/schemas/tags.ts`
- Modify: `src/pages/api/tags.ts`
- Modify: `src/pages/api/tags/[slug].ts`

**Commit:**
```
feat(validation): add tag schemas + migrate tags API endpoints
```

---

### Task 1.4: Authors API schemas

**Files:**
- Create: `src/shared/validation/schemas/authors.ts`
- Modify: `src/pages/api/authors/index.ts`
- Modify: `src/pages/api/authors/[slug].ts`

**Commit:**
```
feat(validation): add author schemas + migrate authors API endpoints
```

---

## Phase 2: Media & Upload Endpoints

> These have the highest security surface — file uploads, URL proxying, bulk operations.

### Task 2.1: Media API schemas

**Files:**
- Create: `src/shared/validation/schemas/media.ts`
- Modify: `src/pages/api/media.ts` (GET list)
- Modify: `src/pages/api/media/[id].ts` (GET/PUT/DELETE)
- Modify: `src/pages/api/media/upload-urls.ts`
- Modify: `src/pages/api/media/confirm.ts`
- Modify: `src/pages/api/media/bulk-delete.ts`
- Modify: `src/pages/api/media/upload-variant.ts`

```typescript
// src/shared/validation/schemas/media.ts
export const BulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one ID required').max(100),
});

export const ConfirmUploadSchema = z.object({
  r2Key: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

export const UploadUrlsSchema = z.object({
  files: z.array(z.object({
    fileName: z.string().min(1),
    fileType: z.string().min(1),
    fileSize: z.number().int().positive().max(50 * 1024 * 1024, 'Max 50MB per file'),
  })).min(1).max(10, 'Max 10 files at once'),
});
```

**Commit:**
```
feat(validation): add media schemas + migrate media API endpoints
```

---

### Task 2.2: Upload & proxy endpoint schemas

**Files:**
- Modify: `src/pages/api/upload-image.ts`
- Modify: `src/pages/api/upload-from-url.ts`
- Modify: `src/pages/api/upload-thumbnail.ts`
- Modify: `src/pages/api/upload-font.ts`
- Modify: `src/pages/api/proxy-image.ts`

**Key schemas:**
```typescript
export const UploadFromUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  fileName: z.string().optional(),
  folder: z.enum(['thumbnails', 'covers', 'content', 'authors', 'categories', 'equipment']).optional(),
});

export const ProxyImageSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  width: z.coerce.number().int().min(1).max(4000).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
});
```

**Commit:**
```
feat(validation): add upload/proxy schemas + migrate upload endpoints
```

---

## Phase 3: Settings & Configuration Endpoints

### Task 3.1: Settings API schemas

**Files:**
- Create: `src/shared/validation/schemas/settings.ts`
- Modify: `src/pages/api/settings/menus.ts` (251 lines — complex menu structure)
- Modify: `src/pages/api/settings/appearance.ts`
- Modify: `src/pages/api/settings/image-upload.ts`

```typescript
// src/shared/validation/schemas/settings.ts
export const MenuItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  url: z.string().min(1).max(500),
  target: z.enum(['_self', '_blank']).optional(),
  children: z.lazy(() => z.array(MenuItemSchema)).optional(),
});

export const MenuSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  location: z.enum(['header', 'footer', 'sidebar']).optional(),
  items: z.array(MenuItemSchema),
});

export const SaveMenusSchema = z.object({
  menus: z.array(MenuSchema),
});
```

**Commit:**
```
feat(validation): add settings schemas + migrate settings API endpoints
```

---

### Task 3.2: Equipment & Templates schemas

**Files:**
- Create: `src/shared/validation/schemas/equipment.ts`
- Create: `src/shared/validation/schemas/templates.ts`
- Modify: `src/pages/api/equipment.ts`
- Modify: `src/pages/api/templates.ts`
- Modify: `src/pages/api/templates/[slug].ts`

**Commit:**
```
feat(validation): add equipment + templates schemas + migrate endpoints
```

---

### Task 3.3: Redirects schemas

**Files:**
- Create: `src/shared/validation/schemas/redirects.ts`
- Modify: `src/pages/api/redirects/index.ts`
- Modify: `src/pages/api/redirects/[id].ts`

```typescript
export const CreateRedirectSchema = z.object({
  source: z.string().min(1).startsWith('/', 'Source must start with /'),
  destination: z.string().min(1).url('Destination must be a valid URL').or(z.string().startsWith('/')),
  statusCode: z.enum(['301', '302']).optional(),
  isPermanent: z.boolean().optional(),
});
```

**Commit:**
```
feat(validation): add redirect schemas + migrate redirect endpoints
```

---

## Phase 4: Auth & AI Endpoints

### Task 4.1: Auth API schemas

**Files:**
- Create: `src/shared/validation/schemas/auth.ts`
- Modify: `src/pages/api/auth/login.ts`
- Modify: `src/pages/api/auth/refresh.ts`
- Modify: `src/pages/api/auth/verify.ts`

```typescript
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
});

export const RefreshSchema = z.object({
  token: z.string().min(1, 'Token required'),
});
```

**Security note:** Currently `auth/login.ts` uses `await request.json()` with no validation —
crash on malformed body. Zod fixes this.

**Commit:**
```
feat(validation): add auth schemas + migrate auth endpoints
```

---

### Task 4.2: AI API schemas

**Files:**
- Create: `src/shared/validation/schemas/ai.ts`
- Modify: `src/pages/api/admin/ai/generate.ts`
- Modify: `src/pages/api/admin/ai/settings.ts`
- Modify: `src/pages/api/admin/ai/models/[provider]/[modelId].ts` (352 lines → target ~200)

```typescript
export const GenerateSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(10000),
  contentType: z.enum(['recipe', 'article', 'roundup']),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8000).optional(),
});

export const ProviderModelParam = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'meta', 'mistral', 'deepseek']),
  modelId: z.string().min(1),
});

export const UpsertModelSchema = z.object({
  id: z.string().min(1, 'Model ID required'),
  name: z.string().min(1, 'Model name required'),
  provider: z.string().min(1),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});
```

**This is the biggest endpoint (352 lines, 11 VALIDATION_ERROR throws).**
Zod should cut ~100 lines.

**Commit:**
```
feat(validation): add AI schemas + migrate AI endpoints (biggest reduction)
```

---

## Phase 5: Pinterest & Remaining Endpoints

### Task 5.1: Pinterest pins schemas

**Files:**
- Create: `src/shared/validation/schemas/pins.ts`
- Modify: `src/pages/api/pins.ts`
- Modify: `src/pages/api/pins/upload-image.ts`
- Modify: `src/pages/api/pinterest-boards.ts`

**Commit:**
```
feat(validation): add Pinterest schemas + migrate pin endpoints
```

---

### Task 5.2: Remaining endpoints (branding, content, images, stats, views, recipes)

**Files:**
- Modify: `src/pages/api/branding/[...slug].ts`
- Modify: `src/pages/api/content/index.ts`
- Modify: `src/pages/api/images/[...path].ts`
- Modify: `src/pages/api/stats/dashboard.ts`
- Modify: `src/pages/api/stats/popular.ts`
- Modify: `src/pages/api/views/[slug].ts`
- Modify: `src/pages/api/recipes/index.ts`
- Modify: `src/pages/api/recipes/[slug].ts`
- Modify: `src/pages/api/recipes/rate.ts`
- Modify: `src/pages/api/roundups/index.ts`
- Modify: `src/pages/api/roundups/[slug].ts`
- Modify: `src/pages/api/seed-images.ts`

**These are mostly GET endpoints with slug/id params — use `IdParam`/`SlugOrIdParam` + `PaginationQuery`.**

**Commit:**
```
feat(validation): migrate all remaining endpoints to Zod schemas
```

---

## Phase 6: Cleanup

### Task 6.1: Remove `validatePaginationParams` + dead helpers

**Files:**
- Modify: `src/shared/utils/error-handler.ts` — remove `validatePaginationParams()` (replaced by `PaginationQuery` schema)
- Search: `grep -rn 'validatePaginationParams' src/` — update all callers

**Commit:**
```
chore: remove validatePaginationParams (replaced by Zod PaginationQuery)
```

---

### Task 6.2: Verify — no manual validation left

**Verification:**
```bash
# Should return 0 results for manual validation in API endpoints
grep -rn "throw new AppError(ErrorCodes.VALIDATION_ERROR" src/pages/api/ | wc -l
# Expected: 0

# Should return 0 for raw parseInt in endpoints (Zod coerces instead)
grep -rn "parseInt(" src/pages/api/ | wc -l
# Expected: 0

# All endpoints should import from @shared/validation
grep -rL "@shared/validation" src/pages/api/ --include='*.ts' | wc -l
# Expected: 0 (except seed-images.ts if it has no validation)
```

**Commit:**
```
chore: final Zod migration cleanup
```

---

## Execution Order & Impact

| Phase | Endpoints | Lines Saved | Risk | Priority |
|---|---|---|---|---|
| 0 (infra) | 0 | +150 (new) | LOW | CRITICAL |
| 1 (core CRUD) | 8 | ~-120 | MEDIUM | HIGH |
| 2 (media/upload) | 11 | ~-80 | MEDIUM (security) | HIGH |
| 3 (settings) | 7 | ~-60 | LOW | MEDIUM |
| 4 (auth/AI) | 5 | ~-130 | MEDIUM | HIGH |
| 5 (remaining) | 18 | ~-70 | LOW | LOW |
| 6 (cleanup) | 0 | ~-20 | LOW | FINAL |

**Total estimated:** ~-330 lines of manual validation removed, ~+400 lines of schemas added (but all declarative, typed, reusable).

**Risk strategy:** Phase by phase. Each phase is independently deployable. If a schema is wrong, only that endpoint breaks (not a runtime crash in a shared validator).

---

## Key Design Decisions

1. **`passthrough()` on body schemas** — Admin frontend sends many fields. We validate the critical ones (type, slug, headline) and let `transformArticleRequestBody()` handle normalization. Strict mode can be added later.

2. **`z.coerce.number()` for params** — URL params are always strings. Coercion is the right default (replaces `parseInt`).

3. **Separate helpers from schemas** — `helpers.ts` is infrastructure (validate, validateBody, etc.). Schemas are domain-specific. Endpoints import both from `@shared/validation`.

4. **Don't validate JSON fields deeply** — `contentJson`, `recipeJson`, etc. are validated at the application layer (ContentRenderer, RecipeBuilder). Zod only ensures they're valid JSON/objects, not their internal structure.

5. **Keep `AppError` as error format** — Zod validation errors are converted to `AppError(VALIDATION_ERROR)` with `{ fields: { path: message } }` details. Frontend already handles this format.

---

*Plan v1 — Zod validation at all API boundaries.*
