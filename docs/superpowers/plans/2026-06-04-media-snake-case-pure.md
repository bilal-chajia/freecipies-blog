# Media Snake Case Pure Implementation Plan

> **STATUS — 2026-06-04: ✅ COMPLETED & VERIFIED.** Media resource fully migrated to snake_case end to end (schema → service → API → admin), including the Drizzle/handler layer completion (`cf3b0532`) and upload-variant FormData (`126b87b`). Verified green.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the media pilot for audit item #3 by removing the remaining camelCase↔snake_case compatibility layers so media data flows in `snake_case` end to end with zero casing conversion.

**Architecture:** Keep the existing media read/write pipeline, but delete the remaining compatibility seams one boundary at a time: admin client request types, validation adapters, media helper readers, and cross-module media consumers. Preserve local camelCase variables and UI-only state, but require every persisted/requested/serialized media data shape to use canonical `snake_case` keys only.

**Tech Stack:** Astro API routes, React admin SPA, TypeScript, Zod, Drizzle ORM, Vitest

---

## File Map

### Modify
- `src/admin/services/api.ts` — remove `ConfirmUploadInput` camelCase request model and `toConfirmUploadPayload`; make media confirm client send canonical snake_case payloads directly.
- `src/shared/validation/schemas/media.ts` — remove camelCase fallback preprocessing from `ConfirmUploadSchema` and `UpdateMediaSchema`; keep only snake_case request shapes; leave multipart `VariantUploadFields` untouched for now because the endpoint still uses FormData field names.
- `src/shared/validation/schemas/__tests__/media.test.ts` — align schema tests and descriptions with snake_case-only behavior.
- `src/admin/utils/helpers.ts` — remove mixed media row readers (`variantsJson`, `altText`, `aspectRatio`, `focalPointJson`) and read only canonical snake_case media fields.
- `src/admin/components/BlockEditor/utils/image-selection.ts` — stop accepting camelCase media data keys when constructing image slots from media picker items.
- `src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts` — align media fixture shapes to snake_case.
- `src/admin/components/BlockEditor/components/block-settings/helpers.ts` — stop falling back to `altText` for media items.
- `src/admin/components/BlockEditor/blocks/BeforeAfterBlock.tsx` — stop falling back to `item.altText` when using selected media.
- `src/admin/features/categories/pages/CategoryEditor.tsx` — stop reading media alt text from camelCase.
- `src/admin/features/articles/pages/shared/useContentEditor.ts` — stop reading media alt text from camelCase.
- `src/admin/features/pinterest/pages/BoardEditor.tsx` — stop reading media alt text from camelCase.
- `src/modules/authors/api/helpers.ts` — remove camelCase media/image slot fallback paths if they refer to media pilot shapes.
- `src/modules/categories/api/helpers.ts` — remove camelCase media/image slot fallback paths if they refer to media pilot shapes.
- `src/shared/images/image-contract.ts` — remove media-pilot fallback readers (`focalPoint`, `aspectRatio`) that were kept for migration compatibility if they are only there for the media resource.

### Verify carefully before editing
- `src/pages/api/media/upload-variant.ts` — uses multipart field names like `baseName`/`uploadId`; this plan treats them as endpoint-specific transport fields unless we explicitly widen the pilot scope.
- `src/admin/features/media/components/ImageUploader/index.tsx` and related uploader/editor components — local UI state may stay camelCase if it is not itself a persisted/request body type.

### Test / Verify
- `src/shared/validation/schemas/__tests__/media.test.ts`
- `src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts`
- `src/shared/images/__tests__/image-contract.test.ts`
- `src/admin/features/media/utils/__tests__/mediaHelpers.test.ts`

---

### Task 1: Remove admin media confirm request conversion

**Files:**
- Modify: `src/admin/services/api.ts`
- Test: `src/shared/validation/schemas/__tests__/media.test.ts`

- [ ] **Step 1: Update the media confirm request type to snake_case only**

Replace the current camelCase `ConfirmUploadInput` and delete `toConfirmUploadPayload` in `src/admin/services/api.ts`.

```ts
interface UploadVariantInput {
  upload_key?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
}

interface ConfirmUploadInput {
  upload_id?: string;
  base_name?: string;
  name?: string;
  alt_text?: string;
  caption?: string;
  credit?: Record<string, unknown> | null;
  aspect_ratio?: string | null;
  focal_point?: { x: number; y: number };
  mime_type?: string;
  variants?: {
    original?: UploadVariantInput;
    lg?: UploadVariantInput;
    md?: UploadVariantInput;
    sm?: UploadVariantInput;
    xs?: UploadVariantInput;
  };
  placeholder?: string;
}
```

- [ ] **Step 2: Post the payload directly without conversion**

In `src/admin/services/api.ts`, replace the existing `confirmUpload` implementation.

```ts
confirmUpload: async (payload: ConfirmUploadInput, config: AxiosRequestConfig = {}) =>
  api.post('/media/confirm', payload, config),
```

Expected change: `toConfirmUploadPayload` no longer exists anywhere in the file.

- [ ] **Step 3: Run a targeted search to confirm the conversion layer is gone**

Run: `pnpm exec rg "toConfirmUploadPayload|uploadId|baseName|altText|mimeType" src/admin/services/api.ts`

Expected: no matches for `toConfirmUploadPayload`, `uploadId`, `baseName`, `altText`, or `mimeType` inside the media confirm client path.

- [ ] **Step 4: Commit the client-boundary cleanup**

Run:

```powershell
git add "src/admin/services/api.ts"
git commit -m "refactor(media): remove admin confirm casing conversion"
```

Expected: one commit containing only the request-type / request-send cleanup.

### Task 2: Make media validation schemas snake_case only

**Files:**
- Modify: `src/shared/validation/schemas/media.ts`
- Test: `src/shared/validation/schemas/__tests__/media.test.ts`

- [ ] **Step 1: Remove camelCase fallback from confirm/update preprocessors**

In `src/shared/validation/schemas/media.ts`, replace the migration adapters with snake_case-only pass-through normalization.

```ts
const normalizeConfirmUploadInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    upload_id: value.upload_id,
    base_name: value.base_name,
    name: value.name,
    alt_text: value.alt_text,
    caption: value.caption,
    credit: value.credit,
    aspect_ratio: value.aspect_ratio,
    focal_point: value.focal_point,
    mime_type: value.mime_type,
    variants: value.variants,
    placeholder: value.placeholder,
  };
};

const normalizeUpdateMediaInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    name: value.name,
    alt_text: value.alt_text,
    caption: value.caption,
    credit: value.credit,
    focal_point: value.focal_point,
    aspect_ratio: value.aspect_ratio,
  };
};
```

- [ ] **Step 2: Fix the top-of-file naming comment so it matches reality**

Replace the stale header note in `src/shared/validation/schemas/media.ts:6-10` with:

```ts
 * API JSON payloads use snake_case.
 * Media validation schemas accept and return canonical snake_case data shapes.
 * They do not normalize data-shape keys to camelCase.
```

- [ ] **Step 3: Update schema tests to expect snake_case outputs**

In `src/shared/validation/schemas/__tests__/media.test.ts`, replace the two test descriptions and the update-schema expectation.

```ts
it('keeps snake_case confirm payloads in canonical snake_case form', () => {
  // existing payload stays the same
  expect(result.upload_id).toBe('upload-1');
  expect(result.base_name).toBe('avocado-toast');
  expect(result.alt_text).toBe('Avocado toast on a plate');
  expect(result.aspect_ratio).toBe('3:2');
  expect(result.focal_point).toEqual({ x: 50, y: 45 });
  expect(result.mime_type).toBe('image/webp');
});

it('keeps snake_case update payloads in canonical snake_case form', () => {
  const result = UpdateMediaSchema.parse({
    alt_text: 'Updated alt',
    focal_point: { x: 25, y: 75 },
    aspect_ratio: '16:9',
    caption: 'Updated caption',
  });

  expect(result).toEqual({
    alt_text: 'Updated alt',
    focal_point: { x: 25, y: 75 },
    aspect_ratio: '16:9',
    caption: 'Updated caption',
  });
});
```

- [ ] **Step 4: Run the schema test to verify the contract**

Run: `pnpm test src/shared/validation/schemas/__tests__/media.test.ts`

Expected: PASS, with no test name or assertion still referring to camelCase normalization.

- [ ] **Step 5: Commit the schema-boundary cleanup**

Run:

```powershell
git add "src/shared/validation/schemas/media.ts" "src/shared/validation/schemas/__tests__/media.test.ts"
git commit -m "refactor(media): enforce snake case validation shapes"
```

### Task 3: Remove media helper dual-casing inside admin utilities

**Files:**
- Modify: `src/admin/utils/helpers.ts`
- Test: `src/admin/features/media/utils/__tests__/mediaHelpers.test.ts`

- [ ] **Step 1: Narrow the media helper input shape to snake_case data keys**

In `src/admin/utils/helpers.ts`, replace the mixed `MediaItem` interface properties.

```ts
interface MediaItem {
  id?: number;
  variants_json?: string | object;
  variants?: object;
  alt_text?: string;
  alt?: string;
  placeholder?: string;
  aspect_ratio?: string;
  focal_point_json?: string | object;
}

interface ImageSlotOverrides {
  alt?: string;
  placeholder?: string;
  aspect_ratio?: string;
  focal_point?: string | object;
  variant_keys?: string[];
  media_id?: number;
}
```

- [ ] **Step 2: Remove camelCase fallback reads in `buildImageSlotFromMedia`**

In the same file, replace the mixed readers.

```ts
const parsed = parseVariantsJson(item?.variants_json);
// ...
const alt = overrides.alt ?? item?.alt_text ?? item?.alt ?? '';
const placeholder = (overrides.placeholder ?? (parsed as Record<string, unknown>)?.placeholder ?? item?.placeholder ?? '') as string;
const aspectRatio = overrides.aspect_ratio ?? item?.aspect_ratio;
const focalPointRaw = overrides.focal_point ?? item?.focal_point_json;
```

Expected change: no `variantsJson`, `altText`, `aspectRatio`, or `focalPointJson` references remain in this file.

- [ ] **Step 3: Run targeted tests for media helper behavior**

Run: `pnpm test src/admin/features/media/utils/__tests__/mediaHelpers.test.ts`

Expected: PASS, proving media helper consumers still build slots correctly from snake_case media rows.

- [ ] **Step 4: Commit the helper cleanup**

Run:

```powershell
git add "src/admin/utils/helpers.ts" "src/admin/features/media/utils/__tests__/mediaHelpers.test.ts"
git commit -m "refactor(media): drop mixed casing in admin helpers"
```

### Task 4: Remove mixed media casing from BlockEditor media consumers

**Files:**
- Modify: `src/admin/components/BlockEditor/utils/image-selection.ts`
- Modify: `src/admin/components/BlockEditor/components/block-settings/helpers.ts`
- Modify: `src/admin/components/BlockEditor/blocks/BeforeAfterBlock.tsx`
- Test: `src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts`

- [ ] **Step 1: Make `image-selection.ts` read only snake_case media keys**

In `src/admin/components/BlockEditor/utils/image-selection.ts`, replace the mixed readers.

```ts
const source = item.focal_point;
// ...
const alt = item.alt_text ?? item.alt ?? item.name ?? '';
const aspectRatio = item.aspect_ratio ?? undefined;
```

Also remove `aspectRatio?` / `focalPoint?` camelCase properties from the media item type used in this file if they exist only for media-row compatibility.

- [ ] **Step 2: Update the image selection test fixtures to snake_case**

In `src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts`, replace camelCase fixture fields such as:

```ts
aspect_ratio: '3:2',
focal_point: { x: 45, y: 55 },
alt_text: 'Replacement',
```

Do not keep `aspectRatio` or `focalPoint` in media-row fixtures.

- [ ] **Step 3: Remove `altText` fallback in other BlockEditor media readers**

Apply these exact replacements:

`src/admin/components/BlockEditor/components/block-settings/helpers.ts`
```ts
alt: item.alt_text || item.name || '',
```

`src/admin/components/BlockEditor/blocks/BeforeAfterBlock.tsx`
```ts
alt: existing?.alt || item.alt_text || item.name || '',
```

- [ ] **Step 4: Run the focused BlockEditor test**

Run: `pnpm test src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts`

Expected: PASS, proving media picker → image slot conversion still works with snake_case-only media rows.

- [ ] **Step 5: Commit the BlockEditor media cleanup**

Run:

```powershell
git add "src/admin/components/BlockEditor/utils/image-selection.ts" "src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts" "src/admin/components/BlockEditor/components/block-settings/helpers.ts" "src/admin/components/BlockEditor/blocks/BeforeAfterBlock.tsx"
git commit -m "refactor(media): align block editor media reads to snake case"
```

### Task 5: Remove mixed media casing from non-media admin consumers

**Files:**
- Modify: `src/admin/features/categories/pages/CategoryEditor.tsx`
- Modify: `src/admin/features/articles/pages/shared/useContentEditor.ts`
- Modify: `src/admin/features/pinterest/pages/BoardEditor.tsx`

- [ ] **Step 1: Replace camelCase media alt reads in category/article/pinterest consumers**

Apply these exact replacements:

`src/admin/features/categories/pages/CategoryEditor.tsx`
```ts
alt: item.alt_text || prev.label || '',
```

`src/admin/features/articles/pages/shared/useContentEditor.ts`
```ts
imageAlt: slot?.alt || item.alt_text || prev.imageAlt
heroAlt: slot?.alt || item.alt_text || prev.heroAlt
```

`src/admin/features/pinterest/pages/BoardEditor.tsx`
```ts
alt: item.alt_text || formData.name || '',
```

- [ ] **Step 2: Run a targeted search to confirm media alt camelCase fallback is gone from admin consumers**

Run: `pnpm exec rg "item\.altText|media\.altText|altText \|\| item\.alt_text|item\.altText \?\?" src/admin`

Expected: no matches in category/article/pinterest/media consumer paths that are part of the media pilot.

- [ ] **Step 3: Commit the cross-feature cleanup**

Run:

```powershell
git add "src/admin/features/categories/pages/CategoryEditor.tsx" "src/admin/features/articles/pages/shared/useContentEditor.ts" "src/admin/features/pinterest/pages/BoardEditor.tsx"
git commit -m "refactor(media): remove camel case media fallbacks"
```

### Task 6: Remove media-pilot migration fallbacks from shared image helpers

**Files:**
- Modify: `src/shared/images/image-contract.ts`
- Test: `src/shared/images/__tests__/image-contract.test.ts`

- [ ] **Step 1: Remove camelCase media-pilot fallback reads that only exist for migration**

In `src/shared/images/image-contract.ts`, replace mixed focal-point / aspect-ratio reads used for media data shapes.

```ts
function readFocalPoint(record: Record<string, unknown>): { x: number; y: number } | undefined {
  const source = readRecord(record, 'focal_point');
  if (!source) return undefined;

  const x = readNumber(source, 'x');
  const y = readNumber(source, 'y');
  if (typeof x !== 'number' || typeof y !== 'number') return undefined;
  return { x, y };
}
```

And in `normalizeSnapshotSlot` keep only:

```ts
const focalPoint = readFocalPoint(source);
if (focalPoint) slot.focal_point = focalPoint;

const aspectRatio = readString(source, 'aspect_ratio');
if (aspectRatio !== undefined) slot.aspect_ratio = aspectRatio;
```

Do not remove camelCase fallback that belongs to external exception boundaries documented in `NAMING_CONTRACT.md` unless you confirm it is only for app-owned media shapes.

- [ ] **Step 2: Update / add a focused test for snake_case-only media shape handling**

In `src/shared/images/__tests__/image-contract.test.ts`, add or update a test like this:

```ts
it('reads focal_point and aspect_ratio from canonical snake_case media slots', () => {
  const slot = normalizeSnapshotSlot({
    alt: 'Hero image',
    focal_point: { x: 30, y: 70 },
    aspect_ratio: '16:9',
    variants: {
      sm: { r2_key: 'media/images/hero-sm.webp', width: 640, height: 360 },
      md: { r2_key: 'media/images/hero-md.webp', width: 960, height: 540 },
      lg: { r2_key: 'media/images/hero-lg.webp', width: 1280, height: 720 },
    },
  }, 'hero');

  expect(slot.focal_point).toEqual({ x: 30, y: 70 });
  expect(slot.aspect_ratio).toBe('16:9');
});
```

- [ ] **Step 3: Run the shared image contract test**

Run: `pnpm test src/shared/images/__tests__/image-contract.test.ts`

Expected: PASS, confirming the media pilot keeps working with canonical snake_case image-slot metadata.

- [ ] **Step 4: Commit the shared-image cleanup**

Run:

```powershell
git add "src/shared/images/image-contract.ts" "src/shared/images/__tests__/image-contract.test.ts"
git commit -m "refactor(media): remove migration fallbacks from image contract"
```

### Task 7: Verify the media pilot is now snake_case-only

**Files:**
- Modify: none expected unless a final targeted fix is needed
- Test: existing test files above plus repo checks

- [ ] **Step 1: Run a focused repository search for remaining media-pilot compat markers**

Run:

```powershell
pnpm exec rg "toConfirmUploadPayload|uploadId|baseName|altText \?\? item\.alt_text|item\.altText|variantsJson \|\| item\?\.variants_json|focalPointJson|aspectRatio \?\? item\.aspect_ratio|value\.altText|value\.uploadId|value\.baseName|value\.aspectRatio|value\.focalPoint" src/admin src/shared src/modules src/pages/api/media
```

Expected: only legitimate UI-local variables or multipart transport field names remain; no app-owned media data-shape compatibility reads/writes remain.

- [ ] **Step 2: Run typecheck**

Run: `pnpm test -- --runInBand`

Expected: PASS. If this repo separates typecheck elsewhere in your normal workflow, also run the project’s usual typecheck command before claiming completion.

- [ ] **Step 3: Run boundaries check**

Run: `pnpm check:boundaries`

Expected: PASS.

- [ ] **Step 4: Summarize the remaining intentional exceptions before committing the verification checkpoint**

Record these intentionally out-of-scope exceptions in your PR notes / handoff:

```md
- `src/pages/api/media/upload-variant.ts` still uses multipart FormData field names (`baseName`, `uploadId`) because this task only covers JSON/media data-shape casing.
- Local UI state names such as `altText`, `focalPoint`, and `aspectRatio` inside purely local React component state remain camelCase by contract; they are not data-shape keys.
- Any remaining camelCase at third-party or documented exception boundaries must match `docs/NAMING_CONTRACT.md`.
```

- [ ] **Step 5: Commit the verification checkpoint**

Run:

```powershell
git add -A
git commit -m "test(media): verify snake case pilot end to end"
```

## Self-Review

- Spec coverage: this plan covers the remaining media pilot conversion seams identified in the current codebase — admin client request conversion, validation-schema compatibility adapters, admin helper mixed reads, BlockEditor mixed reads, cross-feature media consumers, and shared image-contract fallback readers.
- Placeholder scan: removed generic “fix remaining issues” wording; each task names exact files, exact replacements, exact searches, exact test commands, and exact commit messages.
- Type consistency: the plan consistently uses `snake_case` for data-shape properties (`upload_id`, `base_name`, `alt_text`, `aspect_ratio`, `focal_point`, `mime_type`, `variants_json`) and reserves camelCase only for local variables / component state.
