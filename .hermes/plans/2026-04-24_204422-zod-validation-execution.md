# Zod Validation — Execution Plan

> **Status:** READY TO IMPLEMENT  
> **Reference:** `docs/plans/zod-validation-plan.md` (704-line detailed spec)  
> **Skill:** `astro-zod-api-validation` (methodology) + `subagent-driven-development` (execution)  
> **Stack:** Astro 6.1.4, Zod 4.3.6, Cloudflare D1/R2

---

## Goal

Replace **265 manual `if(!)` guards**, **24 `parseInt()` calls**, **33 `typeof` checks**, and **121 `AppError` throws** across **51 API endpoints** with declarative Zod schemas. Zero behavior change — same error format, same API contracts.

---

## Current State (Audit — April 2026)

| Metric | Count |
|---|---|
| API endpoint files | **51** |
| HTTP handlers (GET+POST+PUT+DELETE+PATCH) | 99 |
| `if (!slug) throw AppError(VALIDATION_ERROR)` | ~265 |
| `parseInt(idParam, 10)` | 24 |
| `typeof X ===` guards | 33 |
| `throw new AppError(ErrorCodes.VALIDATION_ERROR, ...)` | 121 |
| `await request.json()` (raw, unvalidated) | 32 |
| `request.formData()` (raw, unvalidated) | 8 |
| `validatePaginationParams()` calls | 2 |
| Zod imports in API layer | **0** |
| `src/shared/validation/` directory | **does not exist** |

### Key Infrastructure

- **Error handler:** `src/shared/utils/error-handler.ts` — `AppError(code, message, statusCode, details?)` + `ErrorCodes` + `formatErrorResponse` + `validatePaginationParams`
- **Transform functions:** Each module has `transformXRequestBody(body: any): any` in `src/modules/<domain>/api/helpers.ts` — these normalize JSON fields, extract R2 keys, etc. **They run AFTER validation.**
- **Path aliases:** `@shared/*` → `src/shared/*`, `@modules/*` → `src/modules/*`
- **Import pattern:** `import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils'`

---

## Execution Plan — 7 Phases, 15 Tasks

### Phase 0: Infrastructure (2 tasks)

#### Task 0.1 — Create `src/shared/validation/helpers.ts`

**Create** the core validation bridge between Zod and AppError.

**File:** `src/shared/validation/helpers.ts` (~100 lines)

Functions to create:
| Function | Purpose | Signature |
|---|---|---|
| `formatZodIssues(error)` | Convert `ZodError.issues` → `{ field: message }` map | internal |
| `validate(schema, data)` | Core — parse + throw `AppError(VALIDATION_ERROR)` on failure | `(ZodSchema, unknown) → infer<T>` |
| `validateBody(request, schema)` | JSON parse + validate in one step | `async (Request, ZodSchema) → infer<T>` |
| `validateParams(params, schema)` | Validate Astro path params | `(Record<string, string \| undefined>, ZodSchema) → infer<T>` |
| `validateQuery(searchParams, schema)` | URLSearchParams → object → validate | `(URLSearchParams \| Record, ZodSchema) → infer<T>` |

**Re-exports:** `export { z } from 'zod'` for convenience.

**Integration point:** `AppError` constructor accepts `details?: Record<string, any>` — Zod field errors go there.

**Barrel:** `src/shared/validation/index.ts` re-exports all from `./helpers`.

**Verification:** `import { validate, validateBody, validateParams, validateQuery, z } from '@shared/validation'` resolves without error.

---

#### Task 0.2 — Create `src/shared/validation/schemas/common.ts`

**Create** shared reusable schemas.

| Schema | Definition | Used by |
|---|---|---|
| `IdParam` | `z.object({ id: z.coerce.number().int().positive() })` | 10+ endpoints with `/api/:id` |
| `SlugOrIdParam` | `z.object({ slug: z.string().min(1) })` | 8+ endpoints with `/api/:slug` |
| `PaginationQuery` | `z.object({ page, limit }).transform({ page, limit, offset })` | Replaces `validatePaginationParams()` |
| `LabelField` | `z.string().min(1).max(200)` | Categories, tags, authors |
| `SlugField` | `z.string().min(1).max(200).regex(...)` | Any slug |
| `DescriptionField` | `z.string().max(2000).optional()` | Common description |

**Verification:** TypeScript compiles without errors.

---

### Phase 1: Core CRUD Endpoints (4 tasks)

> These are the most-used endpoints. Articles alone has 265 `if(!)` checks across the API layer.

#### Task 1.1 — Articles schemas + endpoint migration

**Create:** `src/shared/validation/schemas/articles.ts`

| Schema | Fields |
|---|---|
| `CreateArticleSchema` | `type` (enum), `slug`, `headline`, `shortDescription?`, `contentJson?`, `recipeJson?`, `roundupJson?`, `imagesJson?`, `authorId?`, `categoryId?`, `selectedTags?`, `seoJson?`, `configJson?`, `isOnline?`, `isFavorite?` — `.passthrough()` |
| `UpdateArticleSchema` | Same as Create — `.passthrough()` |
| `ArticleActionQuery` | `action: z.enum(['toggle-online', 'toggle-favorite'])` |
| `ArticleListQuery` | `slug?`, `category?`, `author?`, `tag?`, `type?` (enum), `status?` (enum), `search?`, `dateFrom?`, `dateTo?` + `PaginationQuery` merge |

**Modify:**
- `src/pages/api/articles.ts` (162 lines) — Replace `validatePaginationParams()` + raw `request.json()` with `validateQuery()` + `validateBody()`
- `src/pages/api/admin/articles/[id].ts` — Replace `parseArticleId()` with `validateParams(params, IdParam)`

**Pattern:**
```typescript
// BEFORE:
const paginationValidation = validatePaginationParams(url.searchParams.get('limit'), url.searchParams.get('page'));
const { limit, page, offset } = paginationValidation;

// AFTER:
const { page, limit, offset } = validateQuery(url.searchParams, ArticleListQuery);
```

```typescript
// BEFORE:
const reqBody = await request.json();
const { selectedTags, ...rest } = reqBody ?? {};

// AFTER:
const reqBody = await validateBody(request, CreateArticleSchema);
const { selectedTags, ...rest } = reqBody;
```

**Lines saved:** ~30

---

#### Task 1.2 — Categories schemas + endpoint migration

**Create:** `src/shared/validation/schemas/categories.ts`

| Schema | Fields |
|---|---|
| `CreateCategorySchema` | `slug`, `label`, `shortDescription`, `color?` (hex regex), `parentId?`, `isOnline?`, `isFeatured?`, `sortOrder?`, `iconSvg?`, `imagesJson?`, `seoJson?`, `configJson?` — `.passthrough()` |
| `UpdateCategorySchema` | Same — `.passthrough()` |

**Modify:**
- `src/pages/api/categories.ts` (68 lines) — Replace raw `request.json()` with `validateBody()`
- `src/pages/api/categories/[slug].ts` — Replace 3x `if (!slug) throw AppError(...)` with `validateParams(params, SlugOrIdParam)`

**Lines saved:** ~20

---

#### Task 1.3 — Tags schemas + endpoint migration

**Create:** `src/shared/validation/schemas/tags.ts`

**Modify:**
- `src/pages/api/tags.ts` — Replace raw `request.json()`
- `src/pages/api/tags/[slug].ts` — Replace `if (!slug)` guards + `parseInt()`

**Lines saved:** ~15

---

#### Task 1.4 — Authors schemas + endpoint migration

**Create:** `src/shared/validation/schemas/authors.ts`

**Modify:**
- `src/pages/api/authors/index.ts` — Replace raw `request.json()`
- `src/pages/api/authors/[slug].ts` — Replace 3x `if (!slug)` + 2x `parseInt(slug)` with `validateParams(params, SlugOrIdParam)`

**Lines saved:** ~25

---

### Phase 2: Media & Upload Endpoints (2 tasks)

> **Highest security surface** — file uploads, URL proxying, bulk operations.

#### Task 2.1 — Media API schemas

**Create:** `src/shared/validation/schemas/media.ts`

| Schema | Fields |
|---|---|
| `BulkDeleteSchema` | `ids: z.array(z.number().int().positive()).min(1).max(100)` |
| `ConfirmUploadSchema` | `r2Key`, `fileName`, `fileSize?`, `mimeType?` |
| `UploadUrlsSchema` | `files: z.array({fileName, fileType, fileSize}).min(1).max(10)` |
| `MediaListQuery` | `limit?`, `offset?`, `search?`, `mimeType?` |

**Modify:** 6 files:
- `src/pages/api/media.ts` — Replace 2x `parseInt()` with `validateQuery()`
- `src/pages/api/media/[id].ts` — Replace 2x `parseInt(idStr)` with `validateParams(params, IdParam)`
- `src/pages/api/media/bulk-delete.ts` — Replace `ids.map((id: any) => parseInt(id))` with `validateBody()`
- `src/pages/api/media/confirm.ts` — Replace raw `request.json()`
- `src/pages/api/media/upload-urls.ts` — Replace raw `request.json()`
- `src/pages/api/media/upload-variant.ts` — Replace 2x `parseInt(formData.get(...))`

**Lines saved:** ~40

---

#### Task 2.2 — Upload & proxy endpoint schemas

**Modify:** 5 files:
- `src/pages/api/upload-image.ts`
- `src/pages/api/upload-from-url.ts` — URL validation
- `src/pages/api/upload-thumbnail.ts`
- `src/pages/api/upload-font.ts`
- `src/pages/api/proxy-image.ts` — URL + width/quality coercion

**Lines saved:** ~25

---

### Phase 3: Settings & Configuration (3 tasks)

#### Task 3.1 — Settings API schemas

**Create:** `src/shared/validation/schemas/settings.ts`

| Schema | Fields |
|---|---|
| `MenuItemSchema` | Recursive: `id`, `label`, `url`, `target?`, `children?` |
| `MenuSchema` | `id`, `label`, `location?` (enum), `items: MenuItemSchema[]` |
| `SaveMenusSchema` | `menus: MenuSchema[]` |
| `AppearanceSchema` | CSS/design token fields |
| `ImageUploadSchema` | Upload config fields |

**Modify:** 3 files:
- `src/pages/api/settings/menus.ts` (251 lines — complex nested structure)
- `src/pages/api/settings/appearance.ts`
- `src/pages/api/settings/image-upload.ts`

**Lines saved:** ~35

---

#### Task 3.2 — Equipment & Templates schemas

**Create:** 
- `src/shared/validation/schemas/equipment.ts`
- `src/shared/validation/schemas/templates.ts`

**Modify:** 3 files:
- `src/pages/api/equipment.ts`
- `src/pages/api/templates.ts`
- `src/pages/api/templates/[slug].ts`

**Lines saved:** ~20

---

#### Task 3.3 — Redirects schemas

**Create:** `src/shared/validation/schemas/redirects.ts`

| Schema | Fields |
|---|---|
| `CreateRedirectSchema` | `source` (starts with `/`), `destination` (URL or `/path`), `statusCode?`, `isPermanent?` |
| `UpdateRedirectSchema` | Partial of Create |
| `IdParam` | Reuse from common |

**Modify:** 2 files:
- `src/pages/api/redirects/index.ts`
- `src/pages/api/redirects/[id].ts`

**Lines saved:** ~15

---

### Phase 4: Auth & AI Endpoints (2 tasks)

#### Task 4.1 — Auth API schemas

**Create:** `src/shared/validation/schemas/auth.ts`

| Schema | Fields |
|---|---|
| `LoginSchema` | `username: z.string().min(1)`, `password: z.string().min(1)` |
| `RefreshSchema` | `token: z.string().min(1)` |

**Modify:** 3 files — all currently use raw `request.json()` with NO validation.

**Security impact:** Currently crashes on malformed body. Zod prevents this.

**Lines saved:** ~10

---

#### Task 4.2 — AI API schemas ⭐ BIGGEST REDUCTION

**Create:** `src/shared/validation/schemas/ai.ts`

| Schema | Fields |
|---|---|
| `GenerateSchema` | `prompt` (3–10000 chars), `contentType` (enum), `provider?`, `model?`, `temperature?` (0–2), `maxTokens?` (1–8000) |
| `ProviderModelParam` | `provider` (enum), `modelId: z.string().min(1)` |
| `UpsertModelSchema` | `id`, `name`, `provider`, `enabled?`, `config?` |

**Modify:** 4 files:
- `src/pages/api/admin/ai/generate.ts` — 11 validation throws → 2 validate calls
- `src/pages/api/admin/ai/settings.ts`
- `src/pages/api/admin/ai/models/[provider]/[modelId].ts` — **352 lines → ~250** (biggest file, 11 VALIDATION_ERROR throws across 5 HTTP methods)
- `src/pages/api/admin/ai/providers.ts`

**Lines saved:** ~100

---

### Phase 5: Pinterest & Remaining Endpoints (2 tasks)

#### Task 5.1 — Pinterest schemas

**Create:** `src/shared/validation/schemas/pins.ts`

**Modify:** 3 files:
- `src/pages/api/pins.ts`
- `src/pages/api/pins/upload-image.ts`
- `src/pages/api/pinterest-boards.ts`

**Lines saved:** ~20

---

#### Task 5.2 — All remaining endpoints

These are mostly GET endpoints — use `IdParam`/`SlugOrIdParam` + `PaginationQuery`.

**Modify:** 12 files:
- `src/pages/api/branding/[...slug].ts`
- `src/pages/api/content/index.ts`
- `src/pages/api/images/[...path].ts`
- `src/pages/api/stats/dashboard.ts`
- `src/pages/api/stats/popular.ts`
- `src/pages/api/views/[slug].ts`
- `src/pages/api/recipes/index.ts`
- `src/pages/api/recipes/[slug].ts`
- `src/pages/api/recipes/rate.ts`
- `src/pages/api/roundups/index.ts`
- `src/pages/api/roundups/[slug].ts`
- `src/pages/api/seed-images.ts` (may skip — utility endpoint)

**Lines saved:** ~50

---

### Phase 6: Cleanup (2 tasks)

#### Task 6.1 — Remove `validatePaginationParams()` + dead code

**Modify:** `src/shared/utils/error-handler.ts` — delete the function (replaced by `PaginationQuery` schema)

**Update callers:** `grep -rn 'validatePaginationParams' src/` — update `articles.ts` imports

---

#### Task 6.2 — Final verification

```bash
# Manual validation throws should be 0
grep -rn "throw new AppError(ErrorCodes.VALIDATION_ERROR" src/pages/api/ | wc -l   # Expected: 0

# parseInt should be 0 in API
grep -rn "parseInt(" src/pages/api/ | wc -l   # Expected: 0

# All endpoints should import from @shared/validation
grep -rL "@shared/validation" src/pages/api/ --include='*.ts' | wc -l   # Expected: 0-1 (seed-images)
```

---

## File Inventory

### New files (17)

```
src/shared/validation/helpers.ts              ← Task 0.1
src/shared/validation/index.ts                ← Task 0.1
src/shared/validation/schemas/common.ts       ← Task 0.2
src/shared/validation/schemas/articles.ts     ← Task 1.1
src/shared/validation/schemas/categories.ts   ← Task 1.2
src/shared/validation/schemas/tags.ts         ← Task 1.3
src/shared/validation/schemas/authors.ts      ← Task 1.4
src/shared/validation/schemas/media.ts        ← Task 2.1
src/shared/validation/schemas/settings.ts     ← Task 3.1
src/shared/validation/schemas/equipment.ts    ← Task 3.2
src/shared/validation/schemas/templates.ts    ← Task 3.2
src/shared/validation/schemas/redirects.ts    ← Task 3.3
src/shared/validation/schemas/auth.ts         ← Task 4.1
src/shared/validation/schemas/chemas/ai.ts    ← Task 4.2
src/shared/validation/schemas/pins.ts         ← Task 5.1
```

### Modified files (~45)

All 51 endpoint files under `src/pages/api/` minus `seed-images.ts` (utility, may skip), plus:
- `src/shared/utils/error-handler.ts` — remove `validatePaginationParams()`

---

## Execution Strategy

### Subagent Assignment

Using `subagent-driven-development`:

| Wave | Tasks | Subagent | Rationale |
|---|---|---|---|
| **Wave 1** | 0.1, 0.2 | Agent A | Infrastructure — must complete before everything else |
| **Wave 2** | 1.1, 1.2, 1.3, 1.4 | Agents B+C+D (parallel) | Core CRUD — independent domains |
| **Wave 3** | 2.1, 2.2 | Agents E+F (parallel) | Media — independent of Phase 1 |
| **Wave 4** | 3.1, 3.2, 3.3 | Agents G+H+I (parallel) | Settings — independent |
| **Wave 5** | 4.1, 4.2 | Agents J+K (parallel) | Auth + AI — independent |
| **Wave 6** | 5.1, 5.2 | Agents L+M (parallel) | Remaining — catch-all |
| **Wave 7** | 6.1, 6.2 | Agent N | Cleanup — after all waves |

**Wave 1 is blocking** — everything else depends on `helpers.ts` and `common.ts`.

**Waves 2–6 can run in parallel** (except within each wave, tasks are independent).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `.passthrough()` lets unexpected fields through | LOW — transform functions already handle normalization | Can tighten schemas later |
| Zod v4 API differences from v3 | MEDIUM — `z.coerce` syntax changed | Skill `astro-zod-api-validation` has v4 patterns |
| `request.formData()` endpoints need different handling | MEDIUM — 8 endpoints | Create `validateFormData()` helper if needed |
| Transform functions expect `any` input | LOW — they run AFTER validation | No change needed to transforms |
| Cloudflare Workers bundle size increase | LOW — Zod is tree-shakeable | Monitor with `pnpm build` |
| Breaking existing error messages | MEDIUM — frontend may parse specific messages | Zod messages match existing `AppError` messages |

---

## Validation Criteria

1. ✅ `src/shared/validation/` exists with `helpers.ts`, `index.ts`, `schemas/`
2. ✅ All schemas are in `src/shared/validation/schemas/` — one file per domain
3. ✅ All 51 endpoints import from `@shared/validation`
4. ✅ Zero `parseInt()` in API endpoints
5. ✅ Zero manual `VALIDATION_ERROR` throws in API endpoints
6. ✅ `validatePaginationParams()` removed from `error-handler.ts`
7. ✅ `pnpm build` succeeds (TypeScript strict)
8. ✅ Error format unchanged: `AppError(VALIDATION_ERROR, message, 400, { fields })`

---

## Estimated Impact

| Metric | Before | After | Delta |
|---|---|---|---|
| Manual validation lines | ~330 | 0 | **-330** |
| Schema lines (new) | 0 | ~400 | **+400** |
| Helper lines (new) | 0 | ~100 | **+100** |
| Net LOC in endpoints | — | — | **-330** (removed) |
| Total new code | — | — | **+170** (schemas are declarative, reusable) |
| Type safety | `any` everywhere | Full `z.infer<T>` | 🎯 |
| Runtime crash on bad input | Yes (32 unvalidated `.json()` calls) | No | 🛡️ |

---

*Plan generated April 24, 2026 — ready for subagent-driven execution.*
