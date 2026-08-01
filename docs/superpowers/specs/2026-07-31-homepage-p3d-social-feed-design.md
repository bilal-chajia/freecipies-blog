# Homepage P3D Social Feed Design

**Date:** 2026-07-31

**Revised:** 2026-08-01

**Parent design:** `docs/superpowers/specs/2026-06-15-homepage-config-and-redesign-design.md`

## Goal

Complete P3 with an optional, editor-curated `social_feed` homepage section. It presents
selected Instagram, Facebook, and Pinterest posts in a responsive image grid with an
editor-owned fallback and optional official post embeds after a visitor grants local consent.

This is not an automatically synchronized feed: editors select the media, copy, network,
and destination URL for every card. The section remains disabled by default and uses the
existing homepage settings, save, cache, admin navigation, and public section dispatcher.

## Decisions

- Homepage settings are the only source of truth for the section.
- P3D has no social API credentials, OAuth, tokens, provider APIs, webhooks, tracking
  pixels, or automatic post synchronization.
- Before a visitor grants local consent, P3D must not load a Meta or Pinterest script,
  iframe, request, or provider markup that can initialize third-party tracking.
- A section-level `Load social posts` command grants consent only for the current browser
  session. The client records it in `sessionStorage`; no persistent consent cookie is set.
- After consent, a client-only adapter loads each necessary official provider script at most
  once per page, only for configured networks. It then hydrates the matching cards.
- Every card image is a structural media snapshot with `sm`, `md`, and `lg` variants.
  Stored settings retain `r2_key`; the admin and public representations expose local URLs.
- Public rendering uses only the already-loaded homepage settings. It makes no P3D-specific
  D1 query or media lookup.
- Card destinations must be absolute `https:` URLs. Fallback cards open them in a new tab
  with `rel="noopener noreferrer"`.
- A mix of Instagram, Facebook, and Pinterest cards is permitted in one section.
- A provider failure, blocked script, removed post, or unsupported embed must preserve the
  editor-owned fallback card and external link. It must not leave an empty visual area.
- FAQ remains the only fixed-last homepage section.

## Stored Shape

All stored keys use `snake_case`.

```json
{
  "id": "social_feed",
  "type": "social_feed",
  "enabled": false,
  "eyebrow": "Follow along",
  "title": "From our kitchen to yours",
  "items": [
    {
      "network": "instagram",
      "caption": "A simple pasta night worth repeating.",
      "href": "https://www.instagram.com/p/example/",
      "image": {
        "media_id": 73,
        "alt": "Pasta with herbs on a white plate",
        "placeholder": "data:image/jpeg;base64,...",
        "aspect_ratio": "4:5",
        "variants": {
          "sm": { "r2_key": "media/social-sm.webp", "width": 640, "height": 800 },
          "md": { "r2_key": "media/social-md.webp", "width": 960, "height": 1200 },
          "lg": { "r2_key": "media/social-lg.webp", "width": 1600, "height": 2000 }
        }
      }
    }
  ]
}
```

`network` is exactly one of `instagram`, `facebook`, or `pinterest`. `caption` is optional;
`image`, its non-empty `alt`, and `href` are required for every retained card. The item count
is zero to twelve while disabled and three to twelve while enabled. An enabled section also
requires a non-empty `title`.

The image snapshot follows the P3C structural snapshot contract: `media_id`, `alt`,
`placeholder`, optional `focal_point` and `aspect_ratio`, and exactly `sm`, `md`, and `lg`
variants with `r2_key`, dimensions, and optional `size_bytes`. It omits `caption`, `credit`,
and `original`.

## Ordering and Normalization

- A new default disabled `social_feed` is anchored immediately after `social_proof`.
- If `social_proof` is absent, it is anchored immediately before `about_author`.
- If neither anchor is present, it is inserted before `newsletter`.
- Read and update normalization add missing defaults without reordering existing sections
  other than the FAQ final-position invariant.

## Admin Experience

- Add `Social feed` to the homepage section navigation and ordered section list.
- The editor exposes an enabled toggle, optional eyebrow, required title, and an ordered
  card list.
- Each card uses the existing media picker and fields for network, optional caption, and
  public post URL.
- Cards support add, remove, and keyboard-accessible drag-and-drop reordering using the
  established homepage list pattern.
- The client sends resolved local media URLs. The server validates them, rebuilds stored
  snapshots, and never accepts or exposes `r2_key` at the admin boundary.
- Save-time validation reports invalid HTTPS URLs, unsupported networks, missing images or
  alt text, and enabled lists outside the three-to-twelve limit.
- Admin preview uses fallback cards only. It must not execute provider scripts or embeds.

## Public Experience

- Render an unframed editorial band consistent with the homepage, using its optional
  eyebrow and title above the grid.
- The grid has three columns on desktop, two on tablet, and two compact columns on mobile.
  Fallback grid items maintain their configured image aspect ratios without layout shift.
- A small accessible network label identifies Instagram, Facebook, or Pinterest; the visual
  treatment is restrained and does not imitate provider embeds.
- Before consent, each card is one external link wrapping its image and optional caption.
  It has a visible focus treatment and opens safely in a new tab.
- Before any provider loads, render a section-level `Load social posts` command that states
  that external social services will be loaded. A click persists consent only in
  `sessionStorage` and starts the deferred provider loading.
- After consent, the client replaces each fallback card with an official provider embed for
  its configured network. It reserves the fallback card's dimensions until the provider
  renders to prevent layout shift.
- When a provider cannot render a card, retain the fallback card and external link.
- Do not render the section when it is disabled, invalid after safe mapping, or has no
  valid cards. Do not load any provider script in these cases.

## Media Propagation

When a media record changes, snapshot synchronization updates every matching
`social_feed.items[].image` entry along with existing homepage structural snapshots. One
media mutation produces at most one homepage settings write and one cache invalidation.

## Validation and Tests

- Extend the settings discriminated union, defaults, read/update normalization, API DTO
  mapping, and public view-model mapping for `social_feed`.
- Test schema acceptance for all three networks and rejection for unknown networks,
  non-HTTPS URLs, malformed local image URLs, missing image alt text, and invalid counts.
- Test the three default-anchor cases and preservation of existing section ordering.
- Test immutable admin item helpers and card reordering.
- Test public mapping and renderer dispatch: no rendering for disabled or invalid content,
  local responsive media URLs, safe external-link attributes, and no P3D-specific D1/media
  access.
- Test that no provider script or embed markup appears before local consent, that consent
  uses only `sessionStorage`, and that each provider adapter is loaded once at most.
- Test targeted provider loading for mixed networks, fallback preservation when an adapter
  fails, and no provider loading for disabled or invalid sections.
- Test snapshot synchronization for all P3D image paths, including the single-write and
  single-invalidation rule.

## Canonical Contract Update

`docs/SITE_SETTINGS_TABLE_CONTRACT.md` must promote `social_feed` from reserved to active,
document its stored shape, its three-to-twelve enabled limit, its snapshot and HTTPS-link
rules, its default anchor, its media propagation path, and its fallback-first local-consent
embed behavior.

## Out of Scope

- Automatic ingestion from Instagram, Facebook, Pinterest, or any other network.
- Provider APIs, OAuth, tokens, rate limits, webhooks, or background synchronization.
- A global consent-management platform, persistent consent cookie, analytics, comments,
  likes, or live engagement metrics.
- Changes to social links in the header, JSON-LD, article pages, or media contracts.
