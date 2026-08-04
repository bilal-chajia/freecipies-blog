# Homepage P3B Quick Filters and Seasonal Spotlight Implementation Plan

## Current Status (2026-08-03)

- [x] P3B implementation is complete: settings, admin editors, safe public view models/components, and media snapshot synchronization.
- [x] Focused verification and review are complete.
- [ ] Browser verification of editor save/reload and public responsive rendering remains pending.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional admin-configured homepage quick filters and a seasonal spotlight that uses a cached structural media snapshot, without a D1 media lookup at public render time.

**Architecture:** `homepage_settings` remains the source of truth and KV cache payload. Stored spotlight images use `r2_key`; the homepage admin API translates those snapshots to public `url` values at its boundary and converts them back before persistence. The public homepage reads the existing cached settings then renders both section VMs directly from configuration.

**Tech Stack:** Astro 6, React 19, TypeScript strict, Zod 4, Drizzle ORM, Cloudflare D1/KV, Vitest, dnd-kit, existing MediaDialog.

## Global Constraints

- Use `pnpm` only; do not run `pnpm build` or `pnpm preview` without explicit approval.
- Stored JSON and API payload keys use `snake_case`; implementation identifiers use `camelCase`.
- Do not modify canonical `docs/*_CONTRACT.md` files.
- The browser never receives, submits, or renders `r2_key`.
- `seasonal_spotlight.image` is a structural snapshot with only `sm`, `md`, and `lg`; omit `caption`, `credit`, and `original`.
- Public homepage rendering must not query media/D1 solely to hydrate a spotlight image.
- Keep FAQ as the only fixed-last homepage section.
- Do not modify the user-owned changes in `src/site/components/content/NutritionFacts.astro` or `src/site/components/content/toc/TocHeader.astro`.

---

## File Structure

- `src/modules/settings/types/settings.types.ts`: stored and resolved homepage section types plus disabled defaults.
- `src/modules/settings/services/homepage-settings-images.ts`: converts a stored spotlight snapshot to its admin-safe resolved form and validates the reverse conversion from URLs.
- `src/modules/settings/services/settings.service.ts`: normalizes missing P3B sections without duplicate defaults.
- `src/shared/validation/schemas/settings.ts`: admin request validation for quick filters and resolved spotlight image payloads.
- `src/pages/api/settings/homepage.ts`: presents resolved settings to admin and normalizes validated saves back to storage settings.
- `src/admin/features/homepage/utils/quick-filters.ts`: immutable quick-filter transformations.
- `src/admin/features/homepage/components/QuickFilterList.tsx`: sortable editor rows for filters.
- `src/admin/features/homepage/pages/sections/QuickFiltersSection.tsx`: quick-filter section editor.
- `src/admin/features/homepage/pages/sections/SeasonalSpotlightSection.tsx`: spotlight editor and MediaDialog owner.
- `src/admin/features/homepage/pages/Homepage.tsx`, `components/HomepageLayout.tsx`, `components/index.ts`, `pages/sections/index.ts`, `types.ts`: section routing, navigation, form typing, and component exports.
- `src/site/components/home/QuickFilters.astro`, `SeasonalSpotlight.astro`: public section presentation.
- `src/site/utils/home-data.ts`, `src/site/components/home/HomeSections.astro`: public VMs and section dispatch.
- `src/modules/media/services/snapshot-sync.service.ts`, `src/pages/api/media/[id].ts`: cached homepage snapshot update and cache invalidation after media edits.

## Task 1: Settings Shapes, Safe API Boundary, and Defaults

**Files:**
- Modify: `src/modules/settings/types/settings.types.ts`
- Create: `src/modules/settings/services/homepage-settings-images.ts`
- Create: `src/modules/settings/services/__tests__/homepage-settings-images.test.ts`
- Modify: `src/modules/settings/services/settings.service.ts`
- Modify: `src/modules/settings/services/__tests__/homepage-settings-service.test.ts`
- Modify: `src/shared/validation/schemas/settings.ts`
- Modify: `src/shared/validation/schemas/__tests__/settings.test.ts`
- Modify: `src/pages/api/settings/homepage.ts`

**Interfaces:**
- Produces stored `HomepageQuickFiltersSection` and `HomepageSeasonalSpotlightSection` members of `HomepageSection`.
- Produces `HomepageAdminSettings`, whose spotlight variants contain `{ url, width, height, size_bytes? }` and never `r2_key`.
- Produces `presentHomepageSettingsForAdmin(settings: HomepageSettings): HomepageAdminSettings` and `normalizeHomepageSettingsFromAdmin(input: HomepageAdminSettings): HomepageSettings`.
- Consumes `extractR2KeyFromUrl` and `resolveVariantUrl` from shared image contracts.

- [ ] **Step 1: Write failing settings service tests for P3B defaults**

Add cases to `homepage-settings-service.test.ts` that load a legacy cached section array and assert these exact IDs after normalization:

```ts
expect(result.sections.map((section) => section.id)).toEqual([
  'hero', 'quick_filters', 'seasonal_spotlight', 'faq',
]);
expect(result.sections.find((section) => section.type === 'quick_filters')).toMatchObject({
  enabled: false, filters: [],
});
expect(result.sections.find((section) => section.type === 'seasonal_spotlight')).toMatchObject({
  enabled: false, image: null,
});
```

Add one case where both types are already present and assert each occurs once.

- [ ] **Step 2: Run the service test and verify RED**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

Expected: FAIL because the normalizer currently appends only FAQ.

- [ ] **Step 3: Add stored and admin-safe TypeScript types plus defaults**

In `settings.types.ts`, import snapshot variant types only from `@shared/images/image-contract`. Add these stored shapes and append disabled P3B defaults immediately before FAQ:

```ts
export interface HomepageQuickFilter { label: string; href: string; }
export interface HomepageQuickFiltersSection extends HomepageSectionBase {
  type: 'quick_filters'; title: string; filters: HomepageQuickFilter[];
}
export interface HomepageSeasonalSpotlightSection extends HomepageSectionBase {
  type: 'seasonal_spotlight'; title: string; body: string;
  image: HomepageStoredImageSnapshot | null;
  cta: { label: string; href: string };
}
```

`HomepageStoredImageSnapshot` requires `media_id`, nonempty `alt` and `placeholder`, optional focal point/aspect ratio, and exactly `sm`, `md`, `lg` stored variants. `HomepageAdminSettings` mirrors `HomepageSettings` but uses `HomepageResolvedImageSnapshot` containing `url` variants. Do not widen stored image fields to `unknown` or `any`.

Update `normalizeHomepageSections` so a non-empty stored list receives missing P3B defaults once, then moves FAQ to the final position without changing the relative order of every other section.

- [ ] **Step 4: Run the settings service test and verify GREEN**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing image-boundary tests**

Create `homepage-settings-images.test.ts` with a stored spotlight image using three `r2_key` variants. Assert presentation converts each to `/api/images/...` URLs and has no serialized `r2_key`. Then pass the resolved object back to normalization and assert it restores the original stored snapshot. Add failures for a foreign absolute URL, a missing `lg`, and a URL that cannot produce an image storage key.

```ts
expect(JSON.stringify(presented)).not.toContain('r2_key');
expect(normalizeHomepageSettingsFromAdmin(presented)).toEqual(stored);
```

- [ ] **Step 6: Run the image-boundary test and verify RED**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-images.test.ts`

Expected: FAIL because the presenter module does not exist.

- [ ] **Step 7: Implement server-side snapshot presentation and normalization**

Create `homepage-settings-images.ts`. It must recursively copy settings/sections, alter only `seasonal_spotlight.image`, and preserve all other section values. On storage-to-admin conversion use `resolveVariantUrl`. On admin-to-storage conversion use `extractR2KeyFromUrl`, enforce `sm`/`md`/`lg`, and throw a descriptive error when an image URL cannot map to a local image route. Never accept a caller-provided `r2_key`.

Change `GET /api/settings/homepage` to return `presentHomepageSettingsForAdmin(settings)`. Change `PUT` to validate an admin-facing request, call `normalizeHomepageSettingsFromAdmin`, persist the stored object, and return its freshly presented admin form.

- [ ] **Step 8: Write and run failing schema tests for P3B input**

Add tests to `settings.test.ts` that accept a complete resolved spotlight image using `url` variants and reject: whitespace title/body/CTA label, `http:` external CTA, a quick filter outside `/recipes`, a `r2_key` in the request, and an image missing a required variant.

Run: `pnpm test -- src/shared/validation/schemas/__tests__/settings.test.ts`

Expected: FAIL before the two new discriminated schema members exist.

- [ ] **Step 9: Implement strict Zod schemas and verify Task 1**

Add strict `quick_filters` and `seasonal_spotlight` schemas. Require quick-filter `href` to begin `/recipes` and require `cta.href` to be an internal absolute path or `https:` URL. Use `.trim().min(1)` for editor copy. The spotlight API schema accepts only resolved `{ url, width, height, size_bytes? }` variants.

Run:

```bash
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/shared/validation/schemas/__tests__/settings.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit Task 1**

```bash
git add src/modules/settings/types/settings.types.ts src/modules/settings/services/homepage-settings-images.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/modules/settings/services/settings.service.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/shared/validation/schemas/settings.ts src/shared/validation/schemas/__tests__/settings.test.ts src/pages/api/settings/homepage.ts
git commit -m "feat(homepage): add P3B settings contracts"
```

## Task 2: Quick Filters Admin Editor

**Files:**
- Create: `src/admin/features/homepage/utils/quick-filters.ts`
- Create: `src/admin/features/homepage/utils/__tests__/quick-filters.test.ts`
- Create: `src/admin/features/homepage/components/QuickFilterList.tsx`
- Create: `src/admin/features/homepage/pages/sections/QuickFiltersSection.tsx`
- Modify: `src/admin/features/homepage/components/index.ts`
- Modify: `src/admin/features/homepage/pages/sections/index.ts`
- Modify: `src/admin/features/homepage/pages/Homepage.tsx`
- Modify: `src/admin/features/homepage/components/HomepageLayout.tsx`
- Modify: `src/admin/features/homepage/types.ts`

**Interfaces:**
- Produces immutable `addQuickFilter`, `updateQuickFilter`, `removeQuickFilter`, and `reorderQuickFilters` helpers.
- `QuickFilterList` consumes `HomepageQuickFilter[]` and calls `onChange(nextFilters)`.

- [ ] **Step 1: Write failing quick-filter helper tests**

Create `quick-filters.test.ts` with one test proving add, update, reorder, and removal do not mutate the original array, and one test proving invalid indexes return the input identity.

```ts
const original = [{ label: 'Quick', href: '/recipes?tag=quick' }];
const added = addQuickFilter(original);
const edited = updateQuickFilter(added, 1, { label: 'Dinner', href: '/recipes?category=dinner' });
expect(reorderQuickFilters(edited, 1, 0)).toEqual([
  { label: 'Dinner', href: '/recipes?category=dinner' },
  original[0],
]);
expect(original).toHaveLength(1);
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `pnpm test -- src/admin/features/homepage/utils/__tests__/quick-filters.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement immutable helpers**

Mirror the focused FAQ transforms: append `{ label: '', href: '/recipes' }`, map one item for updates, filter for removal, and use `arrayMove` only for valid indexes.

- [ ] **Step 4: Run the helper test and verify GREEN**

Run: `pnpm test -- src/admin/features/homepage/utils/__tests__/quick-filters.test.ts`

Expected: PASS.

- [ ] **Step 5: Build the Quick Filters editor and wire navigation**

`QuickFilterList` follows `FaqItemList` interaction patterns: stable row IDs, pointer/keyboard drag sensors, a drag-handle `aria-label`, controlled Label and Recipe URL inputs, icon-only delete buttons with tooltips, and one Add Filter command. Use compact divided rows, not nested cards.

`QuickFiltersSection` wraps this editor in `SectionCard`, exposes the enabled switch and title, and updates only the `quick_filters` section. Add a `quick_filters` route, label, and lucide `SlidersHorizontal` icon to `Homepage`, `HomepageLayout`, `types.ts`, and exports.

- [ ] **Step 6: Verify Task 2 and commit**

Run:

```bash
pnpm test -- src/admin/features/homepage/utils/__tests__/quick-filters.test.ts
pnpm typecheck
pnpm check:boundaries
```

Then commit:

```bash
git add src/admin/features/homepage/utils/quick-filters.ts src/admin/features/homepage/utils/__tests__/quick-filters.test.ts src/admin/features/homepage/components/QuickFilterList.tsx src/admin/features/homepage/pages/sections/QuickFiltersSection.tsx src/admin/features/homepage/components/index.ts src/admin/features/homepage/pages/sections/index.ts src/admin/features/homepage/pages/Homepage.tsx src/admin/features/homepage/components/HomepageLayout.tsx src/admin/features/homepage/types.ts
git commit -m "feat(homepage-admin): add quick filters editor"
```

## Task 3: Seasonal Spotlight Admin Editor

**Files:**
- Create: `src/admin/features/homepage/pages/sections/SeasonalSpotlightSection.tsx`
- Modify: `src/admin/features/homepage/pages/Homepage.tsx`
- Modify: `src/admin/features/homepage/pages/sections/index.ts`
- Modify: `src/admin/features/homepage/components/HomepageLayout.tsx`
- Modify: `src/admin/features/homepage/types.ts`

**Interfaces:**
- `SeasonalSpotlightSection` consumes the resolved admin snapshot type and writes only the `seasonal_spotlight` form section.
- `MediaDialog.onSelect` receives an admin media payload with public URLs; it does not expose storage keys.

- [ ] **Step 1: Write a failing resolved-snapshot builder test**

Extend `homepage-settings-images.test.ts` with an admin media payload returned by `serializeAdminMediaPayload`. Assert the admin-only builder selects exactly `sm`, `md`, and `lg`, preserves `media_id`, alt text, placeholder, focal point, and aspect ratio, and contains public URLs only.

- [ ] **Step 2: Run the image-boundary test and verify RED**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-images.test.ts`

Expected: FAIL because the builder is missing.

- [ ] **Step 3: Implement the resolved admin snapshot builder**

Add `buildHomepageSpotlightImageFromAdminMedia` in `homepage-settings-images.ts`. It accepts the public admin media payload, requires `sm`/`md`/`lg`, and returns the resolved snapshot used by the React form. It must not call `buildImageSlotFromMedia`, because that generic helper is not a typed homepage API boundary.

- [ ] **Step 4: Run the image-boundary test and verify GREEN**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-images.test.ts`

Expected: PASS.

- [ ] **Step 5: Build and route the spotlight editor**

Create a `SectionCard` with enabled switch, title input, body textarea, a responsive thumbnail preview, Media Library selection/removal controls, and CTA label/URL inputs. Own `MediaDialog` state in this section. The thumbnail is a preview of resolved public URLs, while persistence happens through the server conversion from Task 1.

Add `seasonal_spotlight` to the section navigation with the `Sun` icon and preserve normal drag ordering. The component must not render a save button or make its own API call; page-level Homepage save/revert owns persistence.

- [ ] **Step 6: Verify Task 3 and commit**

Run:

```bash
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-images.test.ts
pnpm typecheck
pnpm check:boundaries
```

Then commit:

```bash
git add src/modules/settings/services/homepage-settings-images.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/admin/features/homepage/pages/sections/SeasonalSpotlightSection.tsx src/admin/features/homepage/pages/Homepage.tsx src/admin/features/homepage/pages/sections/index.ts src/admin/features/homepage/components/HomepageLayout.tsx src/admin/features/homepage/types.ts
git commit -m "feat(homepage-admin): add seasonal spotlight editor"
```

## Task 4: Public Homepage Rendering

**Files:**
- Create: `src/site/components/home/QuickFilters.astro`
- Create: `src/site/components/home/SeasonalSpotlight.astro`
- Modify: `src/site/utils/home-data.ts`
- Modify: `src/site/utils/__tests__/home-data.test.ts`
- Modify: `src/site/components/home/HomeSections.astro`

**Interfaces:**
- Adds `{ kind: 'quick_filters'; section: HomepageQuickFiltersSection; filters: HomepageQuickFilter[] }` and `{ kind: 'seasonal_spotlight'; section: HomepageSeasonalSpotlightSection }` to `HomeSectionVM`.
- `getRenderableQuickFilters(section)` returns trimmed, complete links.
- `getRenderableSeasonalSpotlight(section)` returns the section only when its copy, CTA, and stored image snapshot are complete.

- [ ] **Step 1: Write failing home-data tests**

Add one enabled quick-filter section containing one blank filter and assert the VM retains only the valid item. Add one complete spotlight section and assert its VM exists without calling any media service. Add incomplete image/CTA cases and assert no spotlight VM is emitted.

- [ ] **Step 2: Run the home-data test and verify RED**

Run: `pnpm test -- src/site/utils/__tests__/home-data.test.ts`

Expected: FAIL because the resolver does not recognize the new section types.

- [ ] **Step 3: Implement pure renderable VMs**

Add only trim/filter/presence checks. Do not import media services or add a D1 query. Preserve enabled configured order and let the existing HomeSections FAQ-last handling remain unchanged.

- [ ] **Step 4: Run the home-data test and verify GREEN**

Run: `pnpm test -- src/site/utils/__tests__/home-data.test.ts`

Expected: PASS.

- [ ] **Step 5: Build the two Astro components and dispatch them**

`QuickFilters.astro` renders a labelled responsive chip/link row only when filters exist. `SeasonalSpotlight.astro` renders an unframed editorial band with a semantic `<h2>`, lazy responsive image, proper `srcset`/`sizes`, stable dimensions, and external-link safety based on the CTA URL. Use only existing site tokens, no hardcoded palette, gradients, decorative cards, or nested cards. Stack on mobile and use a restrained two-column composition on larger screens.

Import and dispatch both components in `HomeSections.astro` using the same configured order as other normal sections.

- [ ] **Step 6: Verify Task 4 and commit**

Run:

```bash
pnpm test -- src/site/utils/__tests__/home-data.test.ts
pnpm typecheck
pnpm check:boundaries
```

Then commit:

```bash
git add src/site/components/home/QuickFilters.astro src/site/components/home/SeasonalSpotlight.astro src/site/utils/home-data.ts src/site/utils/__tests__/home-data.test.ts src/site/components/home/HomeSections.astro
git commit -m "feat(home): render P3B editorial sections"
```

## Task 5: Media Snapshot Synchronization and Integration

**Files:**
- Modify: `src/modules/media/services/snapshot-sync.service.ts`
- Create: `src/modules/media/services/__tests__/snapshot-sync.service.test.ts`
- Modify: `src/pages/api/media/[id].ts`

**Interfaces:**
- Extends `SnapshotSyncResult` with `homepageSettingsUpdated: boolean`.
- Extends `propagateMediaUpdate(db, mediaId, options?)` with optional `cache: Pick<KVNamespace, 'delete'> | null`.
- Uses the existing `siteSettings` Drizzle schema and `invalidateSettingCache(cache, 'homepage_settings')`.

- [ ] **Step 1: Write a failing homepage snapshot-sync test**

Mock a stored `homepage_settings` row that contains two seasonal snapshots, one matching the changed `media_id`. Assert that only the matching one is patched with `sm`/`md`/`lg`, caption/credit remain absent, `homepageSettingsUpdated` is true, and the cache delete receives `site_settings:v1:homepage_settings`. Add a no-match case that performs no settings update and no cache delete.

- [ ] **Step 2: Run the snapshot-sync test and verify RED**

Run: `pnpm test -- src/modules/media/services/__tests__/snapshot-sync.service.test.ts`

Expected: FAIL because snapshot synchronization currently ignores `site_settings`.

- [ ] **Step 3: Implement homepage snapshot patching**

In `snapshot-sync.service.ts`, read only the `homepage_settings` row, safely parse `value`, locate `seasonal_spotlight.image.media_id`, and apply `applyPatchToSlot(image, patch, HERO_ALLOWED_VARIANTS, { omitCaptionCredit: true })`. Update the row with Drizzle only when it changed. Call `invalidateSettingCache` after that successful update. Keep all errors best-effort in `result.errors`.

Change `PATCH /api/media/[id]` to call `propagateMediaUpdate(env.DB, id, { cache: env?.SETTINGS_CACHE ?? env?.SESSION ?? null })`.

- [ ] **Step 4: Run the snapshot-sync test and verify GREEN**

Run: `pnpm test -- src/modules/media/services/__tests__/snapshot-sync.service.test.ts`

Expected: PASS.

- [ ] **Step 5: Run integration verification**

Run:

```bash
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/shared/validation/schemas/__tests__/settings.test.ts src/admin/features/homepage/utils/__tests__/quick-filters.test.ts src/site/utils/__tests__/home-data.test.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts
pnpm typecheck
pnpm check:boundaries
git diff --check
```

Expected: all commands PASS.

- [ ] **Step 6: Browser verification after explicit permission**

Verify desktop and mobile: enable/save/reload quick filters and spotlight; select/replace/remove spotlight media; inspect public homepage order, responsive layout, external CTA attributes, browser-network payloads without `r2_key`, and no new console errors.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/modules/media/services/snapshot-sync.service.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts src/pages/api/media/[id].ts
git commit -m "feat(media): sync homepage spotlight snapshots"
```

## Plan Self-Review

- Spec coverage: Task 1 implements cache-safe shapes, API boundaries, defaults, validation, and no-R2 exposure; Tasks 2-3 implement the requested admin controls; Task 4 renders without media reads; Task 5 refreshes the cached snapshot after a media change.
- Placeholder scan: every task declares concrete files, test commands, expected RED/GREEN evidence, interfaces, and commit scope.
- Type consistency: stored settings use `HomepageSettings`; admin controls use `HomepageAdminSettings`; only the API boundary converts image variants.
