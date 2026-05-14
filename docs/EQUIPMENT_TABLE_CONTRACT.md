# Equipment Table Contract

> **Last Updated:** 2026-05-13

This document is the product/data contract for the `equipment` table. The executable SQL source remains `db/schema.sql`.

## Scope

`equipment` is the admin-managed catalog of kitchen tools used by recipes. It owns affiliate metadata, active/inactive product state, and product imagery.

Related contracts:

- `docs/RECIPE_JSON_CONTRACT.md` for `recipe_json.equipment`
- `docs/ARTICLE_JSON_CONTRACTS.md` for article JSON field ownership
- `docs/IMAGE_JSON_CONTRACT.md` for `image_json`

## Source Of Truth

The `equipment` row is the source of truth for product/affiliate metadata.

`recipe_json.equipment` is the source of truth for the complete recipe equipment checklist.

When an article uses a catalog equipment row, the render snapshot is copied into
`recipe_json.equipment[]` at article save time.

## Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `id` | yes | DB | Internal numeric identity. Referenced by `recipe_json.equipment[*].equipment_id`. |
| `slug` | yes | Admin/API | Unique route/admin identifier. Lowercase kebab-case. |
| `name` | yes | Admin/API | Public display name for product/tool cards. |
| `brand` | no | Admin/affiliate | Brand/manufacturer display name. |
| `description` | no | Admin/editorial | Short product/tool description for cards or tooltips. |
| `keywords` | no | Admin/AI/search | JSON array of lowercase aliases for matching and search. |
| `category` | no | Admin/filtering | Controlled category: `appliances`, `bakeware`, `cookware`, `utensils`, `gadgets`, `other`. |
| `image_json` | no | Admin/media | Product image slot. See `docs/IMAGE_JSON_CONTRACT.md`. |
| `affiliate_url` | no | Admin/affiliate | Primary affiliate URL. |
| `affiliate_provider` | no | Admin/affiliate | Provider name such as `amazon`, `williams-sonoma`, `target`, `walmart`, `custom`. |
| `affiliate_note` | no | Admin/legal | Optional disclosure override. Defaults to global disclosure when empty. |
| `price_display` | no | Admin/affiliate | Optional display-only price. Treat as stale display copy. |
| `is_active` | no | Admin/workflow | `1` means eligible for rich recipe equipment cards. |
| `sort_order` | no | Admin/UI | Ordering for equipment lists. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |
| `deleted_at` | no | App | Soft delete marker. Active queries must filter `deleted_at IS NULL`. |

## JSON Fields

### `keywords`

Purpose: aliases for admin search, matching, and possible AI-assisted suggestions.

```json
["stand mixer", "mixer", "kitchenaid", "robot patissier"]
```

Rules:

- Always a JSON array.
- Values should be lowercase strings.
- Include the normalized `name` itself.
- Keywords are matching hints, not public SEO keywords.

### `image_json`

Purpose: product image snapshot copied from `media`.

```json
{
  "media_id": 301,
  "alt": "KitchenAid stand mixer",
  "variants": {
    "xs": { "r2_key": "media/mixer-xs.webp", "width": 360, "height": 360 },
    "sm": { "r2_key": "media/mixer-sm.webp", "width": 720, "height": 720 }
  }
}
```

Rules:

- `media.variants_json` remains the complete asset source.
- Equipment cards are small UI/card contexts, so `xs` and `sm` are usually enough.
- Internal snapshots contain `r2_key`; public props must convert to URLs.
- Do not store absolute CDN/domain URLs when a media reference can be resolved dynamically.

## Recipe Integration

`recipe_json.equipment` complete checklist shape:

```json
[
  {
    "id": "eq-stand-mixer",
    "equipment_id": 12,
    "label": "Stand mixer",
    "required": true,
    "notes": "A hand mixer also works.",
    "source_type": "catalog",
    "snapshot": {
      "slug": "stand-mixer",
      "name": "Stand Mixer",
      "brand": "KitchenAid",
      "description": "Useful for whipping and kneading.",
      "image": {
        "media_id": 301,
        "alt": "KitchenAid stand mixer",
        "variants": {
          "xs": { "r2_key": "media/mixer-xs.webp", "width": 360, "height": 360 },
          "sm": { "r2_key": "media/mixer-sm.webp", "width": 720, "height": 720 }
        }
      },
      "affiliate_url": "https://example.com/product?tag=saas-blog",
      "affiliate_provider": "amazon",
      "affiliate_note": null,
      "price_display": "$299.99"
    }
  },
  {
    "id": "eq-large-bowl",
    "equipment_id": null,
    "label": "Large mixing bowl",
    "required": true,
    "notes": null,
    "source_type": "manual",
    "snapshot": null
  }
]
```

Rules:

- `equipment_id` is required and is either an active `equipment.id` or `null`.
- `label` is required because unmapped or inactive items still render as plain checklist items.
- `source_type = "catalog"` requires `equipment_id` and a copied `snapshot`.
- `source_type = "manual"` requires `equipment_id: null` and `snapshot: null`.
- If `equipment_id` maps to an active, non-deleted `equipment` row, article
  save copies the render fields into `recipe_json.equipment[].snapshot`.
- If `equipment_id` is inactive, deleted, or not found at save time, the editor
  must either save the item as `manual` or block the catalog reference.

## Runtime Usage

Admin:

- Equipment list/editor manages product metadata and active state.
- Recipe editor references equipment rows by `equipment_id` when a canonical equipment row exists.
- Save logic copies active equipment render snapshots into `recipe_json.equipment[]`.

Public Astro:

- Full recipe renderer reads only `recipe_json.equipment[]` for equipment display.
- Catalog items render from their saved `snapshot`.
- Manual items render as plain bullets/checklist items.
- Affiliate disclosure appears when at least one rendered catalog snapshot has an affiliate URL.

## Validation Rules

- `slug`: required, unique, lowercase kebab-case.
- `name`: required.
- `keywords`: valid JSON array.
- `category`: one of `appliances`, `bakeware`, `cookware`, `utensils`, `gadgets`, `other`.
- `image_json`: valid JSON object.
- `affiliate_url`: valid URL when present.
- `affiliate_provider`: controlled provider string when present.
- Public/rich-card source rows require `deleted_at IS NULL` and `is_active = 1`.
- `is_active = 0` prevents new catalog snapshot selection. Existing saved recipe snapshots remain until article refresh.
