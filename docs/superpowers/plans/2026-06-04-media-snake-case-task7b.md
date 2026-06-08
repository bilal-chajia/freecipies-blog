# Media Snake Case Task 7b Implementation Plan

> **STATUS — 2026-06-04: ✅ COMPLETED.** Final media snake_case cleanup task executed as part of the media pilot completion. Verified green.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the last non-exception camelCase media-shape compatibility seams that prevented Task 7 from cleanly verifying the media pilot as snake_case-only.

**Architecture:** Finish the media pilot by deleting remaining app-owned camelCase fallbacks in shared media parsing and in the last admin/module consumers that still model media slots with camelCase data keys. Keep documented exceptions untouched: multipart upload transport fields, local UI-only state, and non-media contracts such as SEO normalization.

**Tech Stack:** Astro API routes, React admin SPA, TypeScript, shared image types/helpers, Vitest

---

## File Map

### Modify
- `src/shared/types/images.ts` — remove app-owned media fallback reads like `variantsJson`/`r2Key`/`sizeBytes` from resolved/public helper paths when they are part of the media pilot verification scope.
- `src/admin/features/categories/pages/CategoryEditor.tsx` — remove the remaining `altText` media item type fallback in the media select callback signature.
- `src/admin/features/articles/pages/shared/useContentEditor.ts` — remove the remaining `altText` media item type fallback in the local media item typing used by the image/hero selection path.
- `src/admin/components/BlockEditor/components/block-settings/helpers.ts` — remove `altText` from `MediaSelectPayload`, remove `altText` from `UploadPayload`, and decide whether `variantsJson` is a true media-pilot compat seam or an editor-internal output key that must remain.
- `src/modules/authors/api/helpers.ts` — remove `mediaId` / `aspectRatio` / `focalPoint` fallback if the path is normalizing app-owned media pilot shapes.
- `src/modules/categories/api/helpers.ts` — remove `mediaId` / `aspectRatio` / `focalPoint` fallback if the path is normalizing app-owned media pilot shapes.

### Test / Verify
- `src/shared/images/__tests__/image-contract.test.ts` — use if shared helper changes require coverage reinforcement.
- `src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts` — rerun if BlockEditor payload typing changes affect helper assumptions.
- `pnpm test -- --runInBand`
- `pnpm check:boundaries`

### Explicit non-goals
- Do not change multipart FormData transport field names such as `uploadId`, `baseName`, `variantName` in upload-variant flows.
- Do not rename local React state like `altText`, `focalPoint`, or `aspectRatio` when they are not persisted/request/serialized data-shape keys.
- Do not touch SEO camelCase compatibility in `normalizeSeoJsonObject`; it is outside the media pilot scope.

---

### Task 1: Remove the last admin media item camelCase type fallbacks

**Files:**
- Modify: `src/admin/features/categories/pages/CategoryEditor.tsx`
- Modify: `src/admin/features/articles/pages/shared/useContentEditor.ts`

- [ ] **Step 1: Write the failing grep expectation for admin media item typings**

Run:

```powershell
pnpm exec rg "altText\?:" src/admin/features/categories/pages/CategoryEditor.tsx src/admin/features/articles/pages/shared/useContentEditor.ts
```

Expected: current output includes `altText?:` in these media-selection item types.

- [ ] **Step 2: Remove `altText` from the CategoryEditor media select callback type**

In `src/admin/features/categories/pages/CategoryEditor.tsx`, replace:

```ts
const handleMediaSelect = (item: { altText?: string } & Record<string, unknown>) => {
```

With:

```ts
const handleMediaSelect = (item: Record<string, unknown>) => {
```

- [ ] **Step 3: Remove `altText` from the content editor local MediaItem type**

In `src/admin/features/articles/pages/shared/useContentEditor.ts`, replace the local media item typing block from:

```ts
interface MediaItem {
    url?: string;
    alt_text?: string;
    altText?: string;
    [key: string]: unknown;
}
```

To:

```ts
interface MediaItem {
    url?: string;
    alt_text?: string;
    [key: string]: unknown;
}
```

- [ ] **Step 4: Re-run the grep to prove the fallback typing is gone**

Run:

```powershell
pnpm exec rg "altText\?:" src/admin/features/categories/pages/CategoryEditor.tsx src/admin/features/articles/pages/shared/useContentEditor.ts
```

Expected: no matches.

- [ ] **Step 5: Commit**

```powershell
git add "src/admin/features/categories/pages/CategoryEditor.tsx" "src/admin/features/articles/pages/shared/useContentEditor.ts"
git commit -m "refactor(media): remove admin altText media typings"
```

### Task 2: Remove app-owned camelCase payload fallbacks from BlockEditor helpers

**Files:**
- Modify: `src/admin/components/BlockEditor/components/block-settings/helpers.ts`

- [ ] **Step 1: Write the failing grep expectation for BlockEditor media payload compatibility**

Run:

```powershell
pnpm exec rg "altText|variantsJson" src/admin/components/BlockEditor/components/block-settings/helpers.ts
```

Expected: output currently includes `altText` in `MediaSelectPayload` / `UploadPayload` and `variantsJson` in helper output.

- [ ] **Step 2: Remove `altText` from media payload types and use snake_case-only input**

In `src/admin/components/BlockEditor/components/block-settings/helpers.ts`, replace:

```ts
interface MediaSelectPayload {
    id?: string | number | null;
    url?: string;
    altText?: string;
    alt_text?: string;
    name?: string;
    caption?: string;
    credit?: string | Record<string, unknown>;
    credit_text?: string;
    variants?: Record<string, unknown>;
}

interface UploadPayload {
    id?: string | number | null;
    url?: string;
    altText?: string;
    caption?: string;
    credit?: string | Record<string, unknown>;
    width?: number;
    height?: number;
    variants?: Record<string, unknown>;
}
```

With:

```ts
interface MediaSelectPayload {
    id?: string | number | null;
    url?: string;
    alt_text?: string;
    name?: string;
    caption?: string;
    credit?: string | Record<string, unknown>;
    credit_text?: string;
    variants?: Record<string, unknown>;
}

interface UploadPayload {
    id?: string | number | null;
    url?: string;
    alt_text?: string;
    caption?: string;
    credit?: string | Record<string, unknown>;
    width?: number;
    height?: number;
    variants?: Record<string, unknown>;
}
```

Then replace:

```ts
alt: data.altText || '',
```

With:

```ts
alt: data.alt_text || '',
```

- [ ] **Step 3: Decide whether `variantsJson` is a real compat seam or an editor-internal output key**

Read the surrounding file and verify whether `variantsJson` is being emitted as a BlockEditor prop contract rather than a media-row input fallback.

If it is an editor-internal prop contract, leave it unchanged and record that in your Task 7b final summary.

If it is a media input fallback, replace it with the canonical snake_case output key expected by the downstream consumer.

- [ ] **Step 4: Re-run the grep and record the remaining intentional result**

Run:

```powershell
pnpm exec rg "altText|variantsJson" src/admin/components/BlockEditor/components/block-settings/helpers.ts
```

Expected:
- `altText` no longer appears.
- `variantsJson` remains only if it is confirmed to be an editor-internal prop/output contract rather than media-row compatibility.

- [ ] **Step 5: Commit**

```powershell
git add "src/admin/components/BlockEditor/components/block-settings/helpers.ts"
git commit -m "refactor(media): remove block settings altText fallback"
```

### Task 3: Remove app-owned camelCase media slot normalization fallbacks in module helpers

**Files:**
- Modify: `src/modules/authors/api/helpers.ts`
- Modify: `src/modules/categories/api/helpers.ts`

- [ ] **Step 1: Write the failing grep expectation for app-owned slot fallback reads**

Run:

```powershell
pnpm exec rg "mediaId|aspectRatio|focalPoint" src/modules/authors/api/helpers.ts src/modules/categories/api/helpers.ts
```

Expected: matches currently show camelCase slot fallback reads.

- [ ] **Step 2: Remove `mediaId` / `aspectRatio` / `focalPoint` fallback from author image slot normalization**

In `src/modules/authors/api/helpers.ts`, replace the normalization block from:

```ts
const normalized: StoredImageSlot = {
    ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
    ...(typeof slot.mediaId === 'number' ? { media_id: slot.mediaId } : {}),
    alt: typeof slot.alt === 'string' && slot.alt.trim() ? slot.alt : '',
    placeholder: typeof slot.placeholder === 'string' ? slot.placeholder : '',
    aspect_ratio: typeof slot.aspect_ratio === 'string'
        ? slot.aspect_ratio
        : typeof slot.aspectRatio === 'string'
            ? slot.aspectRatio
            : fallbackAspectRatio,
    variants,
};

if (slot.focal_point && typeof slot.focal_point === 'object') normalized.focal_point = slot.focal_point as StoredImageSlot['focal_point'];
if (slot.focalPoint && typeof slot.focalPoint === 'object') normalized.focal_point = slot.focalPoint as StoredImageSlot['focal_point'];
```

To:

```ts
const normalized: StoredImageSlot = {
    ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
    alt: typeof slot.alt === 'string' && slot.alt.trim() ? slot.alt : '',
    placeholder: typeof slot.placeholder === 'string' ? slot.placeholder : '',
    aspect_ratio: typeof slot.aspect_ratio === 'string'
        ? slot.aspect_ratio
        : fallbackAspectRatio,
    variants,
};

if (slot.focal_point && typeof slot.focal_point === 'object') normalized.focal_point = slot.focal_point as StoredImageSlot['focal_point'];
```

- [ ] **Step 3: Remove `mediaId` / `aspectRatio` / `focalPoint` fallback from category image slot normalization**

In `src/modules/categories/api/helpers.ts`, replace:

```ts
return {
  ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
  ...(typeof slot.mediaId === 'number' ? { media_id: slot.mediaId } : {}),
  alt: typeof slot.alt === 'string' ? slot.alt : '',
  placeholder: typeof slot.placeholder === 'string' ? slot.placeholder : '',
  aspect_ratio: typeof slot.aspect_ratio === 'string'
    ? slot.aspect_ratio
    : typeof slot.aspectRatio === 'string'
      ? slot.aspectRatio
      : fallbackAspectRatio,
  ...(slot.focal_point && typeof slot.focal_point === 'object' ? { focal_point: slot.focal_point } : {}),
  ...(slot.focalPoint && typeof slot.focalPoint === 'object' ? { focal_point: slot.focalPoint } : {}),
  variants,
};
```

With:

```ts
return {
  ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
  alt: typeof slot.alt === 'string' ? slot.alt : '',
  placeholder: typeof slot.placeholder === 'string' ? slot.placeholder : '',
  aspect_ratio: typeof slot.aspect_ratio === 'string'
    ? slot.aspect_ratio
    : fallbackAspectRatio,
  ...(slot.focal_point && typeof slot.focal_point === 'object' ? { focal_point: slot.focal_point } : {}),
  variants,
};
```

- [ ] **Step 4: Re-run the grep to prove the app-owned slot fallbacks are gone**

Run:

```powershell
pnpm exec rg "mediaId|aspectRatio|focalPoint" src/modules/authors/api/helpers.ts src/modules/categories/api/helpers.ts
```

Expected: no matches in these files.

- [ ] **Step 5: Commit**

```powershell
git add "src/modules/authors/api/helpers.ts" "src/modules/categories/api/helpers.ts"
git commit -m "refactor(media): remove module slot camel case fallbacks"
```

### Task 4: Reclassify shared image-type helper leftovers and rerun final verification

**Files:**
- Modify: `src/shared/types/images.ts` (only if the current camelCase support is truly a media-pilot compat seam)
- Modify: `docs/superpowers/plans/2026-06-04-media-snake-case-pure.md` only if you need to correct the stale Task 4 path reference during wrap-up; otherwise leave plan docs untouched

- [ ] **Step 1: Inspect `src/shared/types/images.ts` and classify each camelCase support path**

Review these current compat points in `src/shared/types/images.ts`:

- `resolveVariantUrl(variant: { url?: string; r2_key?: string; r2Key?: string } ... )`
- any `variants_json || variantsJson` read path
- any `size_bytes || sizeBytes` read path

Decide per item:
- keep if it is a documented external/legacy boundary outside the media pilot,
- remove if it is an app-owned media-pilot compat seam still masking drift.

- [ ] **Step 2: If `variantsJson` is still used in shared type helpers for app-owned media pilot input, remove it**

If the file contains code like:

```ts
const json = item.variants_json || item.variantsJson;
```

And `item.variantsJson` is only legacy app-owned media compatibility, replace it with:

```ts
const json = item.variants_json;
```

Do the same for any app-owned `r2Key` / `sizeBytes` fallback that is not a documented exception.

- [ ] **Step 3: Run the focused Task 7 search again and inspect every remaining match**

Run:

```powershell
pnpm exec rg "toConfirmUploadPayload|uploadId|baseName|altText \?\? item\.alt_text|item\.altText|variantsJson \|\| item\?\.variants_json|focalPointJson|aspectRatio \?\? item\.aspect_ratio|value\.altText|value\.uploadId|value\.baseName|value\.aspectRatio|value\.focalPoint" src/admin src/shared src/modules src/pages/api/media
```

Expected remaining matches should be limited to:
- multipart upload transport fields such as `uploadId`, `baseName`, `variantName`
- local UI-only camelCase state/variables
- documented exception-boundary helpers you deliberately kept and can justify against `docs/NAMING_CONTRACT.md`

- [ ] **Step 4: Run full verification**

Run:

```powershell
pnpm test -- --runInBand
pnpm check:boundaries
```

Expected:
- tests pass
- boundaries pass

- [ ] **Step 5: Write the final exception summary in your handoff / PR notes and commit**

Record this exact structure in your notes:

```md
Remaining intentional exceptions after Task 7b:
- multipart FormData transport fields in media upload-variant (`uploadId`, `baseName`, `variantName`)
- local UI-only camelCase variables/state that are not persisted/request/serialized data-shape keys
- documented external or legacy exception-boundary helpers explicitly allowed by `docs/NAMING_CONTRACT.md`
```

Then commit only the code changes from this task batch:

```powershell
git add -A
git commit -m "refactor(media): finish snake case pilot verification"
```

## Self-Review

- Spec coverage: this plan covers every leftover called out by the failed Task 7 review — admin media item typings, BlockEditor helper payload types, author/category slot normalization fallbacks, and shared image-type helper classification before the final verification rerun.
- Placeholder scan: every task includes exact files, exact searches, exact replacements, exact verification commands, and exact commit messages.
- Type consistency: all data-shape properties remain `snake_case`; camelCase is only preserved where explicitly classified as transport/UI-only/documented exceptions.
