# Homepage P3D Social Feed Embeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a configurable Instagram, Facebook, and Pinterest social feed whose own media cards render immediately and whose official embeds load only after session-local consent.

**Architecture:** `homepage_settings` owns every card's network, safe post URL, caption, and structural snapshot. Server rendering maps the cached settings only and emits a provider-free fallback grid. A browser-only module records consent in `sessionStorage`, loads a provider at most once, and replaces a fallback only after the provider initializer succeeds.

**Tech Stack:** Astro 6.3.3, React 19, TypeScript 6 strict, Zod 4, Drizzle/D1, Vitest, dnd-kit, native browser APIs.

## Global Constraints

- Stored JSON/API uses `snake_case`; TypeScript uses `camelCase`.
- Networks are exactly `instagram`, `facebook`, and `pinterest`.
- Enabled sections require a title and 3-12 valid cards; disabled sections permit 0-12 cards.
- Cards require an HTTPS post URL and a structural `sm`/`md`/`lg` snapshot with non-empty alt text.
- Stored snapshots use `r2_key`; admin/public values use local `/api/images/` URLs only.
- SSR makes no P3D D1/media/social request and emits no provider markup, script, iframe, or URL.
- Consent is `sessionStorage` key `homepage-social-feed-consent`, not a cookie or global CMP.
- Each provider is loaded once at most, only after consent and only if configured. Errors preserve the fallback link.
- Insert after `social_proof`, otherwise before `about_author`, otherwise before `newsletter`; FAQ remains final.
- No OAuth, provider API, token, synchronization, analytics, metrics, or unrelated third-party code.
- Use `pnpm`; do not run `pnpm build` without explicit permission.

## File Structure

| File | Purpose |
|---|---|
| `docs/SITE_SETTINGS_TABLE_CONTRACT.md` | Active shape, placement, snapshot, fallback and consent rules. |
| `src/modules/settings/types/settings.types.ts` | Stored/resolved section types and default. |
| `src/shared/validation/schemas/settings.ts` | Strict API validation. |
| `src/modules/settings/services/settings.service.ts` | Read/update normalization. |
| `src/modules/settings/services/homepage-settings-images.ts` | Snapshot presentation and normalization. |
| `src/modules/media/services/snapshot-sync.service.ts` | Media propagation. |
| `src/admin/features/homepage/utils/social-feed-items.ts` | Immutable transforms. |
| `src/admin/features/homepage/components/SocialFeedItemList.tsx` | dnd-kit card list. |
| `src/admin/features/homepage/pages/sections/SocialFeedSection.tsx` | Editor and media dialog. |
| `src/site/utils/home-data.ts` | Safe social-feed VM. |
| `src/site/components/home/SocialFeed.astro` | Fallback grid/consent command. |
| `src/site/scripts/social-feed-embed-support.ts` | Pure provider/consent helpers. |
| `src/site/scripts/social-feed-embeds.ts` | Deferred hydration. |

## Interface Contract

```ts
export type HomepageSocialNetwork = 'instagram' | 'facebook' | 'pinterest';
export interface HomepageSocialFeedItem {
  network: HomepageSocialNetwork;
  caption: string;
  href: string;
  image: HomepageStoredImageSnapshot | null;
}
export interface HomepageResolvedSocialFeedItem extends Omit<HomepageSocialFeedItem, 'image'> {
  image: HomepageResolvedImageSnapshot | null;
}
export interface HomepageSocialFeedSection extends HomepageSectionBase {
  type: 'social_feed'; eyebrow: string; title: string; items: HomepageSocialFeedItem[];
}
export interface HomepageAdminSocialFeedSection extends Omit<HomepageSocialFeedSection, 'items'> {
  items: HomepageResolvedSocialFeedItem[];
}
```

### Task 1: Settings Contract, Schema, Defaults, and Placement

**Files:**
- Modify: `docs/SITE_SETTINGS_TABLE_CONTRACT.md:399-438`
- Modify: `src/modules/settings/types/settings.types.ts:115-470`
- Modify: `src/shared/validation/schemas/settings.ts:225-500`
- Modify: `src/modules/settings/services/settings.service.ts:381-471`
- Test: `src/shared/validation/schemas/__tests__/settings.test.ts`
- Test: `src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

**Interfaces:** Produces `HomepageSocialNetwork`, stored/admin social feed types, active Zod discriminant, and normalized default order for Tasks 2-5.

- [ ] **Step 1: Write failing tests**

```ts
expect(HomepageSettingsSchema.safeParse({ sections: [{
  id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
  items: [instagramItem, facebookItem, pinterestItem],
}] }).success).toBe(true);
expect(HomepageSettingsSchema.safeParse(enabledWithTwoItems).success).toBe(false);
expect(HomepageSettingsSchema.safeParse(unknownNetwork).success).toBe(false);
expect(HomepageSettingsSchema.safeParse(nonHttpsPost).success).toBe(false);
expect(normalizeHomepageSections([latest, socialProof, about, newsletter, faq]))
  .toMatchObject([latest, socialProof, { type: 'social_feed' }, about, newsletter, faq]);
```

- [ ] **Step 2: Verify failure**

Run: `pnpm exec vitest run src/shared/validation/schemas/__tests__/settings.test.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

Expected: FAIL because `social_feed` is reserved.

- [ ] **Step 3: Implement the minimum contract**

Promote `social_feed` in the canonical contract; document item shape, 3-12 enabled limit, exact network enum, snapshot path, HTTPS-only href, three anchors, SSR fallback, session consent, and failure fallback. Add the interface contract above to the type unions and default:

```ts
{ id: 'social_feed', type: 'social_feed', enabled: false, eyebrow: '', title: '', items: [] }
```

Add `isSafeExternalHttpsHref` using `new URL(href).protocol === 'https:'`; do not accept internal CTA paths. Add a strict item schema and super-refine title, count, href, image, and image-alt only when enabled. Extend the existing default insertion helper, not FAQ logic.

- [ ] **Step 4: Verify and commit**

Run: `pnpm exec vitest run src/shared/validation/schemas/__tests__/settings.test.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts; pnpm typecheck`

Expected: PASS.

```powershell
git add docs/SITE_SETTINGS_TABLE_CONTRACT.md src/modules/settings/types/settings.types.ts src/shared/validation/schemas/settings.ts src/modules/settings/services/settings.service.ts src/shared/validation/schemas/__tests__/settings.test.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts
git commit -m "feat(homepage): add P3D social feed contracts"
```

### Task 2: Admin Image Boundary and Media Propagation

**Files:**
- Modify: `src/modules/settings/services/homepage-settings-images.ts`
- Test: `src/modules/settings/services/__tests__/homepage-settings-images.test.ts`
- Modify: `src/modules/media/services/snapshot-sync.service.ts`
- Test: `src/modules/media/services/__tests__/snapshot-sync.service.test.ts`

**Interfaces:** Consumes Task 1 types. Produces resolved admin images and single-write propagation through `social_feed.items[].image`.

- [ ] **Step 1: Write failing tests**

```ts
const presented = presentHomepageSettingsForAdmin(storedWithSocialFeed);
expect(JSON.stringify(presented)).not.toContain('r2_key');
expect(normalizeHomepageSettingsFromAdmin(presented)).toEqual(storedWithSocialFeed);
expect(homepageSettingsWrite).toHaveBeenCalledTimes(1);
expect(cacheDelete).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Verify failure**

Run: `pnpm exec vitest run src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts`

Expected: FAIL because item images are not recognized.

- [ ] **Step 3: Implement explicit branches**

In both boundary functions, add only a `social_feed` branch:

```ts
items: section.items.map((item) => ({ ...item, image: presentImage(item.image) }))
```

Mirror with `normalizeImage`. In snapshot synchronization, iterate only `homepageSection.items`, patch matching `item.image`, and retain the existing one-write/one-invalidation flow.

- [ ] **Step 4: Verify and commit**

Run: `pnpm exec vitest run src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts; pnpm typecheck; pnpm check:boundaries`

Expected: PASS.

```powershell
git add src/modules/settings/services/homepage-settings-images.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/modules/media/services/snapshot-sync.service.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts
git commit -m "feat(media): sync P3D social feed snapshots"
```

### Task 3: Admin Social Feed Editor

**Files:**
- Create: `src/admin/features/homepage/utils/social-feed-items.ts`
- Test: `src/admin/features/homepage/utils/__tests__/social-feed-items.test.ts`
- Create: `src/admin/features/homepage/components/SocialFeedItemList.tsx`
- Create: `src/admin/features/homepage/pages/sections/SocialFeedSection.tsx`
- Modify: `src/admin/features/homepage/components/index.ts`
- Modify: `src/admin/features/homepage/pages/sections/index.ts`
- Modify: `src/admin/features/homepage/pages/Homepage.tsx`

**Interfaces:** Consumes Tasks 1-2 types and snapshot builder. Produces a complete saveable admin payload.

- [ ] **Step 1: Write failing immutable helper tests**

```ts
expect(addSocialFeedItem(items)).toEqual([...items, {
  network: 'instagram', caption: '', href: '', image: null,
}]);
expect(addSocialFeedItem(Array.from({ length: 12 }, blankItem))).toHaveLength(12);
expect(updateSocialFeedItem(items, 1, { network: 'pinterest' })[1].network).toBe('pinterest');
expect(removeSocialFeedItem(items, -1)).toBe(items);
expect(reorderSocialFeedItems(items, 2, 0)).toEqual([items[2], items[0], items[1]]);
```

- [ ] **Step 2: Verify failure**

Run: `pnpm exec vitest run src/admin/features/homepage/utils/__tests__/social-feed-items.test.ts`

Expected: FAIL because helper module does not exist.

- [ ] **Step 3: Implement editor units**

Implement `MAX_SOCIAL_FEED_ITEMS = 12` and immutable add/update/remove/reorder helpers using the social-proof pattern. Create the dnd-kit list with keyboard sensors, network select, caption/URL fields, media select/replace/remove controls, icon tooltips, stable row IDs, and disabled add at 12. Create the section by reusing only SocialProof's safe MediaDialog lifecycle. Add deep cloning, nav label, and route rendering in `Homepage.tsx`. Never load a provider in admin.

- [ ] **Step 4: Verify and commit**

Run: `pnpm exec vitest run src/admin/features/homepage/utils/__tests__/social-feed-items.test.ts; pnpm typecheck`

Expected: PASS.

```powershell
git add src/admin/features/homepage/utils/social-feed-items.ts src/admin/features/homepage/utils/__tests__/social-feed-items.test.ts src/admin/features/homepage/components/SocialFeedItemList.tsx src/admin/features/homepage/components/index.ts src/admin/features/homepage/pages/sections/SocialFeedSection.tsx src/admin/features/homepage/pages/sections/index.ts src/admin/features/homepage/pages/Homepage.tsx
git commit -m "feat(homepage-admin): add social feed editor"
```

### Task 4: Server Fallback Grid and View Model

**Files:**
- Modify: `src/site/utils/home-data.ts`
- Test: `src/site/utils/__tests__/home-data.test.ts`
- Create: `src/site/components/home/SocialFeed.astro`
- Modify: `src/site/components/home/HomeSections.astro`

**Interfaces:** Produces `{ kind: 'social_feed'; section: HomepageSocialFeedSection }` and provider-free markup consumed by Task 5.

- [ ] **Step 1: Write failing mapping/dispatcher tests**

```ts
const vms = await resolveHomeData([validMixedSocialFeed], { db: DB, stories: [] });
expect(vms).toEqual([expect.objectContaining({ kind: 'social_feed' })]);
expect(getArticles).not.toHaveBeenCalled();
expect(getArticlesByIds).not.toHaveBeenCalled();
expect(getRenderableSocialFeed(sectionWithTwoCards)).toBeNull();
expect(getRenderableSocialFeed(sectionWithUnsafeHref)).toBeNull();
```

Assert `HomeSections.astro` imports and dispatches `SocialFeed`.

- [ ] **Step 2: Verify failure**

Run: `pnpm exec vitest run src/site/utils/__tests__/home-data.test.ts`

Expected: FAIL because no social-feed VM exists.

- [ ] **Step 3: Implement SSR fallback**

Add `getRenderableSocialFeed`, trimming values, filtering to exact networks, complete snapshots and HTTPS URLs, returning `null` unless three cards remain. Add VM/resolver without a DB/media call. Build an unframed 3/2/2 responsive grid; each fallback is a safe external link and owns the fixed image dimensions:

```astro
<li data-social-feed-card data-social-network={item.network} data-social-post-href={item.href}>
  <a data-social-feed-fallback href={item.href} target="_blank" rel="noopener noreferrer">
    <img src={src} alt={image.alt} width={image.variants.md.width} height={image.variants.md.height} loading="lazy" />
    {item.caption && <span>{item.caption}</span>}
  </a>
  <div data-social-feed-mount hidden aria-live="polite"></div>
</li>
```

Add a `data-social-feed-consent` command and disclosure. Initial HTML contains no provider URL, script, iframe, or provider element.

- [ ] **Step 4: Verify and commit**

Run: `pnpm exec vitest run src/site/utils/__tests__/home-data.test.ts; pnpm typecheck`

Expected: PASS.

```powershell
git add src/site/utils/home-data.ts src/site/utils/__tests__/home-data.test.ts src/site/components/home/SocialFeed.astro src/site/components/home/HomeSections.astro
git commit -m "feat(home): render P3D social feed fallback"
```

### Task 5: Session Consent and Deferred Official Embeds

**Files:**
- Create: `src/site/scripts/social-feed-embed-support.ts`
- Test: `src/site/scripts/__tests__/social-feed-embed-support.test.ts`
- Create: `src/site/scripts/social-feed-embeds.ts`
- Modify: `src/site/components/home/HomeSections.astro`
- Modify: `src/site/utils/__tests__/home-data.test.ts`

**Interfaces:** Consumes Task 4 data attributes. Produces consented per-network hydration.

- [ ] **Step 1: Write failing helper/source tests**

```ts
expect(collectSocialFeedNetworks(['instagram', 'pinterest', 'instagram']))
  .toEqual(['instagram', 'pinterest']);
expect(isSupportedSocialFeedNetwork('facebook')).toBe(true);
expect(isSupportedSocialFeedNetwork('youtube')).toBe(false);
expect(SOCIAL_FEED_CONSENT_KEY).toBe('homepage-social-feed-consent');
expect(getProviderScriptSrc('instagram')).toBe('https://www.instagram.com/embed.js');
expect(getProviderScriptSrc('pinterest')).toBe('https://assets.pinterest.com/js/pinit.js');
```

Assert `SocialFeed.astro` contains no `sessionStorage` or provider URL and `HomeSections.astro` imports the one browser module.

- [ ] **Step 2: Verify failure**

Run: `pnpm exec vitest run src/site/scripts/__tests__/social-feed-embed-support.test.ts src/site/utils/__tests__/home-data.test.ts`

Expected: FAIL because support/browser modules do not exist.

- [ ] **Step 3: Implement bounded hydration**

Export the consent key, network helpers, and exact provider source map:

```ts
export const SOCIAL_FEED_PROVIDER_SOURCES = {
  instagram: 'https://www.instagram.com/embed.js',
  facebook: 'https://connect.facebook.net/en_US/sdk.js',
  pinterest: 'https://assets.pinterest.com/js/pinit.js',
} as const;
```

The client no-ops without `[data-social-feed]`. It writes consent on click and resumes only when the key is `granted`. Hold `Map<HomepageSocialNetwork, Promise<void>>`; append an async provider script only after consent, resolving on load and rejecting on error. Build every provider node with DOM APIs and `setAttribute`, never interpolated HTML. Only after successful initializer (`instgrm.Embeds.process`, `FB.XFBML.parse`, or `PinUtils.build`) reveal the mount and hide its fallback. Any exception clears/hides the mount and leaves fallback usable. Import the module once from HomeSections.

- [ ] **Step 4: Verify and commit**

Run: `pnpm exec vitest run src/site/scripts/__tests__/social-feed-embed-support.test.ts src/site/utils/__tests__/home-data.test.ts; pnpm typecheck; pnpm check:boundaries`

Expected: PASS.

```powershell
git add src/site/scripts/social-feed-embed-support.ts src/site/scripts/__tests__/social-feed-embed-support.test.ts src/site/scripts/social-feed-embeds.ts src/site/components/home/HomeSections.astro src/site/utils/__tests__/home-data.test.ts
git commit -m "feat(home): hydrate social embeds after consent"
```

### Task 6: Integrated Verification

**Files:** Modify only P3D files if verification exposes a defect.

**Interfaces:** Consumes Tasks 1-5 and produces complete evidence without a production build.

- [ ] **Step 1: Run focused P3D tests**

Run: `pnpm exec vitest run src/shared/validation/schemas/__tests__/settings.test.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/modules/settings/services/__tests__/homepage-settings-images.test.ts src/modules/media/services/__tests__/snapshot-sync.service.test.ts src/admin/features/homepage/utils/__tests__/social-feed-items.test.ts src/site/utils/__tests__/home-data.test.ts src/site/scripts/__tests__/social-feed-embed-support.test.ts`

Expected: PASS.

- [ ] **Step 2: Run static and full-suite checks**

Run: `pnpm typecheck; pnpm check:boundaries; git diff --check; pnpm test`

Expected: all exit 0. Do not run `pnpm build`.

- [ ] **Step 3: Browser verification after explicit permission**

```text
Before consent: fallback cards/command visible, no provider request.
After consent: configured providers load once and cards hydrate without collapse.
Same session reload: hydration resumes without another click.
Blocked provider: only that card remains a usable fallback.
Admin: media picker, validation, ordering, save/reload, and disabled state work.
```

- [ ] **Step 4: Record the outcome without scope creep**

If a P3D defect is found, stop this verification task and create a new focused TDD task
for that defect before making a correction. If no defect is found, do not create an empty
commit.

## Plan Self-Review

- Spec coverage: Task 1 handles contract/settings/order, Task 2 snapshots, Task 3 admin, Task 4 SSR fallback, Task 5 consent/embed behavior, and Task 6 focused/full/browser verification.
- Placeholder scan: no unresolved placeholder or undefined interface remains.
- Type consistency: Task 1 defines the section/item types consumed unchanged by Tasks 2-5; Task 5 owns the consent key and provider helpers.
