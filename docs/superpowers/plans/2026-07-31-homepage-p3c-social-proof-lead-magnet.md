# Homepage P3C Social Proof and Lead Magnet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-configured `social_proof` and `lead_magnet` homepage sections backed by cached structural image snapshots and rendered without section-specific D1 reads.

**Architecture:** Extend the existing strict homepage section union, defaults, admin API image boundary, and ordered dispatcher. Known homepage image locations use the same stored `r2_key` snapshot and admin/public `url` representation; media propagation patches all matching snapshots in the single cached settings row. The admin receives focused immutable editors while public Astro components consume validated settings-only view models.

**Tech Stack:** Astro 6.3.3, React 19, TypeScript 6 strict, Zod 4, Vitest, dnd-kit, Drizzle ORM, Cloudflare D1/KV/R2, Tailwind 4 admin styles, scoped Astro CSS.

## Global Constraints

- Follow `docs/SITE_SETTINGS_TABLE_CONTRACT.md`, `docs/IMAGE_JSON_CONTRACT.md`, `docs/MEDIA_TABLE_CONTRACT.md`, and `docs/NAMING_CONTRACT.md`.
- SQL and stored/API JSON use `snake_case`; TypeScript implementation identifiers use `camelCase`.
- Image types come only from `@shared/images/image-contract`; stored snapshots use `r2_key`, admin/public payloads use `url`, and public HTML never exposes `r2_key`.
- Homepage structural snapshots contain exactly `sm`, `md`, and `lg`; omit `caption`, `credit`, and `original`.
- Public rendering performs no media lookup and no P3C-specific D1 query.
- Both sections are disabled by default; FAQ remains fixed last.
- CTA URLs accept internal paths beginning with `/` except `//`, or absolute `https:` URLs only.
- All public `<img>` elements include `width`, `height`, and `loading="lazy"`.
- Use existing public design tokens; add no hardcoded colors or fonts.
- Do not modify the user-owned changes in `NutritionFacts.astro`, `TocHeader.astro`, or `docs/superpowers/plans/2026-07-29-recipes-pages-fixes.md`.
- Do not run `pnpm build` without explicit permission.

---

### Task 1: Canonical Contract, Settings Types, Defaults, Validation, and Image Boundary

**Files:**
- Modify: `docs/SITE_SETTINGS_TABLE_CONTRACT.md`
- Modify: `src/modules/settings/types/settings.types.ts`
- Modify: `src/modules/settings/services/settings.service.ts`
- Modify: `src/modules/settings/services/homepage-settings-images.ts`
- Modify: `src/modules/settings/services/__tests__/homepage-settings-service.test.ts`
- Modify: `src/modules/settings/services/__tests__/homepage-settings-images.test.ts`
- Modify: `src/shared/validation/schemas/settings.ts`
- Modify: `src/shared/validation/schemas/__tests__/settings.test.ts`
- Modify: `src/admin/features/homepage/pages/sections/SeasonalSpotlightSection.tsx`

**Interfaces:**
- Produces: `HomepageSocialProofSection`, `HomepageLeadMagnetSection`, their admin-resolved counterparts, and P3C item types.
- Produces: `buildHomepageImageFromAdminMedia(media: AdminMediaPayload): HomepageResolvedImageSnapshot`.
- Produces: generalized `presentHomepageSettingsForAdmin` and `normalizeHomepageSettingsFromAdmin` handling all known homepage image locations.
- Preserves: `HomepageStoredImageSnapshot` and `HomepageResolvedImageSnapshot` as the shared snapshot contracts.

- [ ] **Step 1: Write failing default-normalization tests**

Add legacy and partial-section cases asserting this normalized order:

```ts
[
  'stories', 'hero', 'quick_filters', 'featured', 'categories', 'collections',
  'seasonal_spotlight', 'latest', 'social_proof', 'about', 'lead_magnet',
  'newsletter', 'faq',
]
```

Assert P3C defaults occur once, are disabled, contain empty content, and FAQ remains last while existing non-FAQ relative order is preserved. Add an update round-trip case proving direct saves are normalized before persistence and in the returned value.

- [ ] **Step 2: Run the default tests and confirm RED**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

Expected: FAIL because P3C types/defaults do not exist.

- [ ] **Step 3: Add stored and admin-resolved P3C types and defaults**

Add exact stored fields:

```ts
interface HomepageSocialProofStat { value: string; label: string }
interface HomepageSocialProofTestimonial { quote: string; name: string; role?: string }
interface HomepageSocialProofLogo { name: string; image: HomepageStoredImageSnapshot | null }
interface HomepageResolvedSocialProofLogo { name: string; image: HomepageResolvedImageSnapshot | null }

interface HomepageSocialProofSection extends HomepageSectionBase {
  type: 'social_proof';
  eyebrow: string;
  title: string;
  stats: HomepageSocialProofStat[];
  testimonials: HomepageSocialProofTestimonial[];
  logos: HomepageSocialProofLogo[];
}

interface HomepageLeadMagnetSection extends HomepageSectionBase {
  type: 'lead_magnet';
  eyebrow: string;
  title: string;
  body: string;
  image: HomepageStoredImageSnapshot | null;
  cta: HomepageCta;
}
```

Add resolved admin section variants using public image contracts. Insert disabled `social_proof` after `latest` and disabled `lead_magnet` after `about`. Update `normalizeHomepageSections` to insert each missing default exactly once at its anchor before moving FAQ last. Apply the same normalizer inside `updateHomepageSettings` before persistence so direct API saves cannot store a missing P3C catalog or a non-final FAQ.

- [ ] **Step 4: Run default tests and confirm GREEN**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing strict Zod tests**

Cover valid disabled defaults, disabled incomplete draft rows, and valid enabled sections. Reject:

- enabled social proof with blank title or no stats/testimonials/logos;
- more than 4 stats, 6 testimonials, or 6 logos;
- blank stat/testimonial/logo required fields in enabled sections;
- logo or lead image missing `sm`, `md`, or `lg`;
- enabled lead magnet with blank eyebrow/title/body/CTA or null image;
- `http:`, `javascript:`, `data:`, and protocol-relative CTA URLs;
- unknown fields and caller-provided `r2_key` in admin payloads.

Run: `pnpm test -- src/shared/validation/schemas/__tests__/settings.test.ts`

Expected: FAIL because both discriminated-union members are absent.

- [ ] **Step 6: Implement strict P3C schemas**

Reuse the resolved image schema and the existing safe-CTA predicate. Apply `.max(4)`, `.max(6)`, and `.strict()` at every object boundary. Use `superRefine` so incomplete disabled sections remain storable while enabled sections require complete content.

Run: `pnpm test -- src/shared/validation/schemas/__tests__/settings.test.ts`

Expected: PASS.

- [ ] **Step 7: Write failing generalized image-boundary tests**

Construct settings containing one spotlight image, two social-proof logos, and one lead-magnet image. Assert presentation converts all twelve variants to local public URLs and serialized output contains no `r2_key`. Assert normalization restores the original stored snapshots and rejects foreign or incomplete URLs. Assert the Media Library builder preserves `media_id`, alt, placeholder, focal point, aspect ratio, and exactly `sm`/`md`/`lg`.

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-images.test.ts`

Expected: FAIL because only spotlight is transformed.

- [ ] **Step 8: Generalize the image boundary**

Rename the builder to `buildHomepageImageFromAdminMedia`, update the spotlight editor import, and map only these known image locations:

```ts
seasonal_spotlight.image
social_proof.logos[].image
lead_magnet.image
```

Copy every settings object/array before modification. Keep local `/api/images/` URL enforcement and never trust caller-provided storage keys.

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/shared/validation/schemas/__tests__/settings.test.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

Expected: PASS.

- [ ] **Step 9: Update the canonical Homepage Settings contract**

Promote `quick_filters`, `seasonal_spotlight`, `social_proof`, and `lead_magnet` to active types. Add their exact stored shapes, default placement, structural snapshot rules, API `url` boundary, and media synchronization rule. Keep `popular`, `social_feed`, and `banner` reserved.

- [ ] **Step 10: Commit Task 1**

```bash
git add docs/SITE_SETTINGS_TABLE_CONTRACT.md src/modules/settings/types/settings.types.ts src/modules/settings/services/settings.service.ts src/modules/settings/services/homepage-settings-images.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/shared/validation/schemas/settings.ts src/shared/validation/schemas/__tests__/settings.test.ts src/admin/features/homepage/pages/sections/SeasonalSpotlightSection.tsx
git commit -m "feat(homepage): add P3C settings contracts"
```

---

### Task 2: Social Proof Admin Editor

**Files:**
- Create: `src/admin/features/homepage/utils/social-proof-items.ts`
- Create: `src/admin/features/homepage/utils/__tests__/social-proof-items.test.ts`
- Create: `src/admin/features/homepage/components/SocialProofStatList.tsx`
- Create: `src/admin/features/homepage/components/SocialProofTestimonialList.tsx`
- Create: `src/admin/features/homepage/components/SocialProofLogoList.tsx`
- Create: `src/admin/features/homepage/pages/sections/SocialProofSection.tsx`
- Modify: `src/admin/features/homepage/components/index.ts`
- Modify: `src/admin/features/homepage/pages/sections/index.ts`
- Modify: `src/admin/features/homepage/pages/Homepage.tsx`
- Modify: `src/admin/features/homepage/components/HomepageLayout.tsx`
- Modify: `src/admin/features/homepage/types.ts`

**Interfaces:**
- Consumes: P3C admin-resolved types and `buildHomepageImageFromAdminMedia` from Task 1.
- Produces: immutable add/update/remove/reorder helpers with `MAX_SOCIAL_PROOF_STATS = 4`, `MAX_SOCIAL_PROOF_TESTIMONIALS = 6`, and `MAX_SOCIAL_PROOF_LOGOS = 6`.
- Produces: `SocialProofSection` routed by section id `social_proof`.

- [ ] **Step 1: Write failing immutable transformation tests**

For each item group, assert add does not mutate input, enforces its maximum, update targets one index, remove ignores invalid indexes, and reorder uses valid source/target indexes without mutating input.

Run: `pnpm test -- src/admin/features/homepage/utils/__tests__/social-proof-items.test.ts`

Expected: FAIL because the utility does not exist.

- [ ] **Step 2: Implement the transformations**

New row defaults are exact:

```ts
{ value: '', label: '' }
{ quote: '', name: '', role: '' }
{ name: '', image: null }
```

Stored and admin draft logo rows may use `image: null`; enabled-save validation still requires a complete image.

Run: `pnpm test -- src/admin/features/homepage/utils/__tests__/social-proof-items.test.ts`

Expected: PASS.

- [ ] **Step 3: Build sortable focused list components**

Follow `QuickFilterList.tsx`: stable local row ids, pointer and keyboard sensors, icon buttons with tooltips, no index-based React keys, and controlled `onChange` values. The logo list uses one Media Library dialog owned by `SocialProofSection`; selecting media updates the requested logo through `buildHomepageImageFromAdminMedia`.

- [ ] **Step 4: Wire the section editor and navigation**

Add eyebrow/title fields and the three lists to `SocialProofSection`. Add navigation label `Social Proof`, route the section in `Homepage.tsx`, export all components, and include the id in homepage form types. Extend `cloneSettings` to deep-copy stats, testimonials, logo objects, nested images, variants, and focal points so reset/dirty snapshots cannot alias form state. Preserve FAQ fixed-last behavior.

- [ ] **Step 5: Run focused verification**

Run: `pnpm test -- src/admin/features/homepage/utils/__tests__/social-proof-items.test.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/admin/features/homepage/utils/social-proof-items.ts src/admin/features/homepage/utils/__tests__/social-proof-items.test.ts src/admin/features/homepage/components/SocialProofStatList.tsx src/admin/features/homepage/components/SocialProofTestimonialList.tsx src/admin/features/homepage/components/SocialProofLogoList.tsx src/admin/features/homepage/pages/sections/SocialProofSection.tsx src/admin/features/homepage/components/index.ts src/admin/features/homepage/pages/sections/index.ts src/admin/features/homepage/pages/Homepage.tsx src/admin/features/homepage/components/HomepageLayout.tsx src/admin/features/homepage/types.ts
git commit -m "feat(homepage-admin): add social proof editor"
```

---

### Task 3: Lead Magnet Admin Editor

**Files:**
- Create: `src/admin/features/homepage/pages/sections/LeadMagnetSection.tsx`
- Modify: `src/admin/features/homepage/pages/sections/index.ts`
- Modify: `src/admin/features/homepage/pages/Homepage.tsx`
- Modify: `src/admin/features/homepage/components/HomepageLayout.tsx`
- Modify: `src/admin/features/homepage/types.ts`

**Interfaces:**
- Consumes: `HomepageAdminLeadMagnetSection` and `buildHomepageImageFromAdminMedia` from Task 1.
- Produces: `LeadMagnetSection` routed by id `lead_magnet`.

- [ ] **Step 1: Build the controlled editor**

Follow `SeasonalSpotlightSection.tsx` for Media Library type guarding, toast errors, preview, replacement, and removal. Add eyebrow, title, multiline body, CTA label, and CTA URL fields. Use icon buttons and tooltips for image actions.

- [ ] **Step 2: Wire navigation and routing**

Add navigation label `Lead Magnet`, export the section, route it in `Homepage.tsx`, and include its id in homepage form types. Extend `cloneSettings` to deep-copy its image, variants, focal point, and CTA. It participates in ordinary reorder/toggle behavior; FAQ remains fixed last.

- [ ] **Step 3: Run type-focused tests**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/shared/validation/schemas/__tests__/settings.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/admin/features/homepage/pages/sections/LeadMagnetSection.tsx src/admin/features/homepage/pages/sections/index.ts src/admin/features/homepage/pages/Homepage.tsx src/admin/features/homepage/components/HomepageLayout.tsx src/admin/features/homepage/types.ts
git commit -m "feat(homepage-admin): add lead magnet editor"
```

---

### Task 4: Public View Models and Astro Components

**Files:**
- Modify: `src/site/utils/home-data.ts`
- Modify: `src/site/utils/__tests__/home-data.test.ts`
- Create: `src/site/components/home/SocialProof.astro`
- Create: `src/site/components/home/LeadMagnet.astro`
- Modify: `src/site/components/home/HomeSections.astro`

**Interfaces:**
- Produces: `getRenderableSocialProof(section): HomepageSocialProofSection | null`.
- Produces: `getRenderableLeadMagnet(section): HomepageLeadMagnetSection | null`.
- Extends: `HomeSectionVM` with `social_proof` and `lead_magnet` settings-only members.

- [ ] **Step 1: Write failing renderability and no-query tests**

Assert trimming and invalid-item omission, enabled social proof with at least one valid group, complete lead magnet with safe internal/HTTPS CTA, rejection of incomplete images and unsafe URLs, and no calls to article/category/author/media loaders when resolving arrays containing only P3C sections.

Run: `pnpm test -- src/site/utils/__tests__/home-data.test.ts`

Expected: FAIL because P3C view models do not exist.

- [ ] **Step 2: Implement reusable validation helpers and P3C VMs**

Generalize the current spotlight-only helpers to `isSafeHomepageCtaHref` and `isCompleteHomepageImageSnapshot`. Reuse them for spotlight, logos, and lead magnet. Filter invalid social proof entries independently; return null only when the title is blank or all groups become empty.

Run: `pnpm test -- src/site/utils/__tests__/home-data.test.ts`

Expected: PASS.

- [ ] **Step 3: Build `SocialProof.astro`**

Render one unframed section with optional eyebrow, `h2`, compact stats row, testimonial grid, and logo row. Resolve logo variants locally from snapshots; each logo image includes responsive source data and fixed dimensions. Use only site tokens, no nested cards, no client JS, and `data-fade-up`.

- [ ] **Step 4: Build `LeadMagnet.astro`**

Render an unframed responsive split band. Resolve `sm`/`md`/`lg`, emit `srcset`, `sizes`, fixed dimensions, lazy loading, focal-point object position, and safe external link attributes. Use compact editorial heading scale and existing tokens.

- [ ] **Step 5: Dispatch both new VM kinds**

Import both Astro components and add exhaustive cases in `HomeSections.astro`. Do not classify either as a carousel.

- [ ] **Step 6: Run focused verification**

Run: `pnpm test -- src/site/utils/__tests__/home-data.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/site/utils/home-data.ts src/site/utils/__tests__/home-data.test.ts src/site/components/home/SocialProof.astro src/site/components/home/LeadMagnet.astro src/site/components/home/HomeSections.astro
git commit -m "feat(home): render P3C editorial sections"
```

---

### Task 5: Homepage Snapshot Synchronization

**Files:**
- Modify: `src/modules/media/services/snapshot-sync.service.ts`
- Modify: `src/modules/media/services/__tests__/snapshot-sync.service.test.ts`

**Interfaces:**
- Extends: existing private `patchHomepageSettings(value, mediaId, patch): string | null`.
- Preserves: one `homepage_settings` read, at most one settings update, and at most one KV invalidation per media update.

- [ ] **Step 1: Write failing multi-location synchronization tests**

Use one settings document containing matching and nonmatching spotlight, social-proof logo, and lead-magnet images. Assert every matching snapshot is patched with `sm`/`md`/`lg`, nonmatching snapshots remain byte-equivalent, caption/credit/original stay absent, one settings update occurs, and one cache deletion targets `site_settings:v1:homepage_settings`. Keep the no-match case at zero writes and zero invalidations.

Run: `pnpm test -- src/modules/media/services/__tests__/snapshot-sync.service.test.ts`

Expected: FAIL because only spotlight is patched.

- [ ] **Step 2: Generalize known homepage snapshot traversal**

Patch the three explicit image locations from the spec. Apply `HERO_ALLOWED_VARIANTS` with `{ omitCaptionCredit: true }`. Set `changed` for each match but serialize once after traversal. Do not recursively patch arbitrary objects.

- [ ] **Step 3: Run synchronization tests**

Run: `pnpm test -- src/modules/media/services/__tests__/snapshot-sync.service.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit Task 5**

```bash
git add src/modules/media/services/snapshot-sync.service.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts
git commit -m "feat(media): sync P3C homepage snapshots"
```

---

### Task 6: Integrated Verification

**Files:**
- Modify only files required to correct verification failures introduced by Tasks 1-5.

**Interfaces:**
- Verifies the complete P3C slice; produces no new feature surface.

- [ ] **Step 1: Run all P3C and adjacent regression tests**

```bash
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/shared/validation/schemas/__tests__/settings.test.ts src/admin/features/homepage/utils/__tests__/social-proof-items.test.ts src/site/utils/__tests__/home-data.test.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run static verification**

```bash
pnpm typecheck
pnpm check:boundaries
pnpm astro check
```

Expected: all commands exit 0.

- [ ] **Step 3: Inspect scope and leakage**

Run `git diff --check` and search changed P3C code for serialized `r2_key` use outside stored server-side snapshot paths. Confirm user-owned dirty files are unchanged and unstaged.

- [ ] **Step 4: Browser verification when an existing approved browser/server session is available**

Verify admin enable/edit/reorder/save/reload, image select/replace/remove, external CTA behavior, and public desktop/tablet/mobile layouts. Confirm network/admin payloads contain URLs rather than `r2_key`, public HTML contains no `r2_key`, and the console has no new errors. Do not start a browser without explicit permission.

- [ ] **Step 5: Commit verification-only fixes if any**

Stage only the P3C files corrected during verification, then commit them with message
`fix(homepage): close P3C verification gaps`. Skip this commit when verification required
no changes.
