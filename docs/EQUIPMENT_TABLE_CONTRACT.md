# Equipment Table Contract

> **Last Updated:** 2026-05-14

This document is the product/data contract for the `equipment` table. The executable SQL source remains `db/schema.sql`.

## Scope

`equipment` is the admin-managed catalog of kitchen tools used by recipes. It owns product/tool identity, affiliate metadata, active/inactive state, and product imagery.

Related contracts:

- `docs/RECIPE_JSON_CONTRACT.md` for `recipe_json.equipment`
- `docs/ARTICLE_JSON_CONTRACTS.md` for article JSON field ownership
- `docs/IMAGE_JSON_CONTRACT.md` for `image_json`

## Source Of Truth

The `equipment` row is the source of truth for reusable product/tool metadata.

`recipe_json.equipment` is the source of truth for the complete recipe equipment checklist.

When a recipe uses a catalog equipment row, the render snapshot is copied into
`recipe_json.equipment[]` at article save time. Public recipe rendering reads
that saved recipe snapshot, not the `equipment` table.

The `equipment` table does not own plain one-off checklist tools. Simple tools
such as a bowl, spoon, knife, parchment paper, or saucepan can live only in
`recipe_json.equipment[]` as manual items when they do not need catalog metadata
or affiliate metadata.

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

Purpose: equipment product image. It is a **discriminated union** on `source`,
because equipment is an affiliate catalog: some images are owned photos uploaded
to `media`, while others are external affiliate product images (e.g. Amazon)
that cannot be re-hosted.

**(a) `source: "media"`** — owned photo, snapshot copied from `media`:

```json
{
  "source": "media",
  "media_id": 301,
  "alt": "KitchenAid stand mixer",
  "placeholder": "data:image/jpeg;base64,...",
  "variants": {
    "xs": { "r2_key": "media/images/stand-mixer-xs-a91c3f2b.webp", "width": 360, "height": 360 },
    "sm": { "r2_key": "media/images/stand-mixer-sm-a91c3f2b.webp", "width": 720, "height": 720 }
  }
}
```

**(b) `source: "external"`** — external affiliate product image (no re-hosting):

```json
{
  "source": "external",
  "url": "https://m.media-amazon.com/images/I/71zmya-XiNL._AC_SX679_.jpg",
  "alt": "KitchenAid stand mixer",
  "width": 679,
  "height": 679
}
```

Rules:

- `image_json.source` is `"media"` or `"external"` and selects the shape.
- **media:** `media_id`, `alt`, `placeholder`, and `xs`+`sm` `r2_key` variants are
  required. Internal snapshots contain `r2_key`; public/admin resolved payloads
  expose `url`, not `r2_key`. `media.variants_json` remains the complete asset
  source. R2 keys follow `docs/NAMING_CONTRACT.md`. Do not store absolute
  CDN/domain URLs when a media reference can be resolved dynamically.
- **external:** `url` (absolute) is required; `alt` is required; `width`/`height`
  are optional. This is the single documented place a stored image keeps an
  absolute `url` (see `docs/IMAGE_JSON_CONTRACT.md` "Allowed Exceptions"). No
  `media_id`, `r2_key`, or `variants`.
- Equipment `image_json` must not store `caption`, `credit`, or `original`.
- Prefer `source: "media"` for images you own; use `source: "external"` only for
  affiliate images that may not be re-hosted.

## Recipe Integration

`recipe_json.equipment` is the complete ordered checklist rendered inside the
full recipe card.

Catalog equipment items copy a render snapshot from the selected active
`equipment` row at article save time.

Complete checklist shape:

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
      "category": "appliances",
      "image": {
        "media_id": 301,
        "alt": "KitchenAid stand mixer",
        "placeholder": "data:image/jpeg;base64,...",
        "variants": {
          "xs": {
            "r2_key": "media/images/stand-mixer-xs-a91c3f2b.webp",
            "width": 360,
            "height": 360
          },
          "sm": {
            "r2_key": "media/images/stand-mixer-sm-a91c3f2b.webp",
            "width": 720,
            "height": 720
          }
        }
      },
      "affiliate_url": "https://example.com/product?tag=saas-blog",
      "affiliate_provider": "amazon",
      "affiliate_note": null
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

- `recipe_json.equipment` stores the complete recipe equipment checklist.
- Item order is the public render order.
- `id` is required and stable inside the recipe editor.
- `equipment_id` is required and is either an active `equipment.id` or `null`.
- `label` is required because manual or unresolved items still render as plain
  checklist items.
- `required` is required and boolean.
- `notes` is required and is either a short recipe-specific note or `null`.
- `source_type` is required and is either `catalog` or `manual`.
- `snapshot` is required and is either a copied catalog snapshot object or
  `null`.
- `required` and `notes` stay in `recipe_json` because they are recipe-specific.
- `source_type = "catalog"` requires `equipment_id` and a copied `snapshot`.
- `source_type = "manual"` requires `equipment_id: null` and `snapshot: null`.
- If `equipment_id` maps to an active, non-deleted `equipment` row, article save
  copies the render fields into `recipe_json.equipment[].snapshot`.
- If `equipment_id` is inactive, deleted, or not found at save time, the editor
  must either save the item as `manual` or block the catalog reference.
- Catalog snapshots may include `slug`, `name`, `brand`, `description`,
  `category`, `image`, `affiliate_url`, `affiliate_provider`, and
  `affiliate_note`.
- Catalog snapshots must not include `price_display`.
- Snapshot images follow the equipment `image_json` rules: `xs` and `sm`,
  `r2_key` storage, no `caption`, no `credit`, no `original`.
- `recipe_json.equipment[]` must not depend on `cached_equipment_json`.

## Affiliate Rules

- Affiliate metadata belongs to the `equipment` row.
- Affiliate links are copied into `recipe_json.equipment[].snapshot` only for
  catalog items.
- Manual equipment items must not store affiliate fields.
- `affiliate_url` is optional. When present, it must be a valid public URL.
- `affiliate_provider` is optional but required when the admin needs provider
  filtering/reporting.
- `affiliate_note` is optional and overrides the global disclosure text only for
  this equipment item.
- If `affiliate_note` is `null`, rendering uses the global affiliate disclosure.
- Do not store prices in the equipment contract.
- Do not store payment, checkout, inventory, commission, or tracking secrets in
  the equipment table.

## Runtime Usage

Admin:

- Equipment list/editor manages product metadata and active state.
- Recipe editor references equipment rows by `equipment_id` when a canonical equipment row exists.
- Save logic copies active equipment render snapshots into `recipe_json.equipment[]`.
- Updating an equipment row does not automatically change already-published
  recipe snapshots unless the application refreshes the affected articles.
- If an equipment row becomes inactive, it is no longer selectable for new
  catalog snapshots.

Public Astro:

- Full recipe renderer reads only `recipe_json.equipment[]` for equipment display.
- Catalog items render from their saved `snapshot`.
- Manual items render as plain bullets/checklist items.
- Affiliate disclosure appears when at least one rendered catalog snapshot has an affiliate URL.
- Public recipe rendering must not join the `equipment` table.
- Public recipe rendering must not read `cached_equipment_json`.

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
- `price_display` is not part of the contract.

## Lifecycle Rules

- Active equipment queries must filter `deleted_at IS NULL`.
- Public selectable equipment queries must also filter `is_active = 1`.
- Soft delete marks `deleted_at`; do not hard-delete rows that can be referenced
  by saved recipe snapshots.
- Existing recipe snapshots remain renderable after an equipment row is updated,
  deactivated, or soft-deleted.
- Application/service refresh logic can rebuild affected recipe snapshots from
  current active equipment rows.
- SQL triggers should not rebuild `recipe_json.equipment[]` because the payload
  includes recipe-specific fields and editor decisions.
