# Implementation Gaps

> **Last Updated:** 2026-05-14

This document tracks temporary mismatches between the current codebase and the official contracts.

The contract documents must describe the target canonical format only. Legacy names, current implementation gaps, and temporary normalizer behavior belong here.

## Content Blocks

- The normalizer reads old raw block arrays only as a transition path; save paths must persist `ContentDocument v1`.
- Legacy editor names still appear in older admin code or local drafts: `alert`, `customImage`, `faqSection`, `relatedContent`, `roundupList`, and `mainRecipe`.
- New BlockEditor, API, DB, and renderer code must use canonical `snake_case` block types.
- `src/modules/content-blocks` still needs to align with `docs/CONTENT_BLOCKS_CONTRACT.md` for the `main_roundup` marker and removal of `roundup_item` as a target stored block.
- `src/modules/content-blocks` still needs to align with `docs/CONTENT_BLOCKS_CONTRACT.md` for the `main_faq` marker and removal of `faq_section` as a target stored block.

Mapping for compatibility-only normalizers:

| Legacy editor block | Canonical block | Compatibility rule |
| --- | --- | --- |
| `alert` | `tip_box` | Convert `props.type` to `variant`; content becomes `text`. |
| `customImage` | `image` | Convert selected media to `media_id`, `alt`, and image metadata. |
| `faqSection` | `main_faq` + `faqs_json` | Store one placement marker in `content_json`; keep FAQ items in `faqs_json`. |
| `relatedContent` | `related_content` | Convert editor selection/settings to canonical related content payload. |
| `roundupList` | `main_roundup` + `roundup_json.items[]` | Store one placement marker in `content_json`; keep item data in `roundup_json`. |
| `mainRecipe` | `main_recipe` | Save only the marker block; never duplicate `recipe_json`. |

## Article JSON

- Some local drafts or old code paths still contain non-canonical stored recipe/cache field names.
- `roundup_json` remains the structured roundup item source; `content_json` should store only the `main_roundup` placement marker.
- Legacy FAQ cache items using `q`/`a` normalize to `question`/`answer`.
- Legacy rating cache items using `ratingValue`/`ratingCount` normalize to `rating_value`/`rating_count`.
- Legacy article image containers use `contentImages`; the target contract removes this registry and stores normal body images directly in `content_json` image blocks.
- Legacy roundup/config article JSON uses non-canonical stored keys; the target stored keys are `snake_case`.

## Recipe JSON

- Current code still contains non-canonical recipe field names.
- Current frontend/card paths still read legacy timing fields in some contexts.
- Current `cached_recipe_json` code still writes non-canonical keys; the target contract is `snake_case`.
- Current code still uses direct step image URLs; the target contract resolves step images through `images_json.recipe_steps`.
- Current equipment cache generation still matches by `name`; the target contract uses `equipment_id` when available.

## Media JSON

- Legacy stored payloads contain `sizeBytes`; readers normalize to `size_bytes`.
- Legacy stored image slots contain `aspectRatio`; readers normalize to `aspect_ratio`.
- Legacy `media.credit` plain text displays in admin only as a transition path; new writes store an author credit snapshot.

## Table Maintenance

- `authors.cached_post_count` and `tags.cached_post_count` are denormalized; refresh is handled by app logic or SQL automation.
- `categories.cached_post_count` is maintained by SQL triggers, while rich article snapshots are application-managed.
- `idx_media_search` has been removed in favor of FTS5 for better search performance.

## Site Settings

- `toc_settings` currently uses non-canonical keys in some code paths.
- The target stored contract in `docs/SITE_SETTINGS_TABLE_CONTRACT.md` is `snake_case`: `default_open`, `show_jump_button`, `accent_color`, and `max_depth`.
- Do not silently rename existing stored values during documentation cleanup. Migrate deliberately across SQL seeds, settings service defaults/normalizers, admin forms, and APIs during the settings refactor.
