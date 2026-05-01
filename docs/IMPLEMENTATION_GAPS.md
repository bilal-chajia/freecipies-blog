# Implementation Gaps

> **Last Updated:** 2026-04-29

This document tracks temporary mismatches between the current codebase and the official contracts.

The contract documents must describe the target canonical format only. Legacy names, current implementation gaps, and temporary normalizer behavior belong here.

## Content Blocks

- The normalizer may read old raw block arrays, but save paths must persist `ContentDocument v1`.
- Legacy editor names may still appear in older admin code or local drafts: `alert`, `customImage`, `faqSection`, `relatedContent`, `roundupList`, and `mainRecipe`.
- New BlockEditor, API, DB, and renderer code must use canonical `snake_case` block types.

Mapping for compatibility-only normalizers:

| Legacy editor block | Canonical block | Compatibility rule |
| --- | --- | --- |
| `alert` | `tip_box` | Convert `props.type` to `variant`; content becomes `text`. |
| `customImage` | `image` | Convert selected media to `media_id`, `alt`, and image metadata. |
| `faqSection` | `faq_section` | Convert editor FAQ items to `{ question, answer }[]`. |
| `relatedContent` | `related_content` | Convert editor selection/settings to canonical related content payload. |
| `roundupList` | `roundup_item` | Flatten each editor item into one stored `roundup_item` block. |
| `mainRecipe` | `main_recipe` | Save only the marker block; never duplicate `recipe_json`. |

## Article JSON

- Some local drafts or old code paths may still contain camelCase recipe/cache fields.
- `roundup_json` remains a legacy compatibility field while new roundup item content moves toward `content_json.blocks[]` with `roundup_item`.
- Legacy FAQ cache items using `q`/`a` may be normalized to `question`/`answer`.
- Legacy rating cache items using `ratingValue`/`ratingCount` may be normalized to `rating_value`/`rating_count`.
- Legacy article image containers may use `contentImages`; the target contract removes this registry and stores normal body images directly in `content_json` image blocks.
- Legacy roundup/config article JSON may use `listType`, `allowComments`, `showTableOfContents`, `manualRelatedIds`, `experimentKey`, and `experimentVariant`; the target stored keys are snake_case.

## Recipe JSON

- Current code may still contain camelCase recipe names such as `recipeYield`, `recipeCategory`, `suitableForDiet`, `aggregateRating`, and `cookingMethod`.
- Current frontend/card paths may still read legacy timing fields in some contexts.
- Current `cached_recipe_json` code may still write camelCase keys; the target contract is `snake_case`.
- Current code may still use direct step image URLs; the target contract resolves step images through `images_json.recipe_steps`.
- Current equipment cache generation may still match by `name`; the target contract uses `equipment_id` when available.

## Media JSON

- Legacy stored payloads may contain `sizeBytes`; readers may normalize to `size_bytes`.
- Legacy stored image slots may contain `aspectRatio`; readers may normalize to `aspect_ratio`.
- Legacy `media.credit` plain text may be displayed in admin, but new writes should store an author credit snapshot.

## Table Maintenance

- `authors.cached_post_count` and `tags.cached_post_count` are denormalized; refresh may be handled by app logic or SQL automation.
- `categories.cached_post_count` is maintained by SQL triggers, while rich article snapshots are application-managed.
- Earlier schema drafts had duplicate `redirects` table definitions; the canonical schema should keep one declaration aligned with the redirects module.

## Site Settings

- `toc_settings` currently uses camelCase keys: `defaultOpen`, `showJumpButton`, `accentColor`, and `maxDepth`.
- The target stored contract in `docs/SITE_SETTINGS_TABLE_CONTRACT.md` is `snake_case`: `default_open`, `show_jump_button`, `accent_color`, and `max_depth`.
- Do not silently rename existing stored values during documentation cleanup. Migrate deliberately across SQL seeds, settings service defaults/normalizers, admin forms, and APIs during the settings refactor.
