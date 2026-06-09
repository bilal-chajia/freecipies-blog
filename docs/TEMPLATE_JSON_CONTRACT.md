# TEMPLATE JSON CONTRACT

Source of truth for the `pin_templates` table and the element JSON stored in
`pin_templates.elements_json`. All data shapes are snake_case end-to-end
(DB JSON, API payloads, TypeScript) per NAMING_CONTRACT.md. There is NO
camelCase<->snake_case conversion layer: the in-memory editor shape IS the
stored shape.

## Table: pin_templates

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| slug | TEXT UNIQUE NOT NULL | kebab-case, e.g. `"recipe-card-bold"` |
| name | TEXT NOT NULL | |
| description | TEXT NULL | |
| category | TEXT DEFAULT `'general'` | `'recipe'`, `'listicle'`, `'quote'`, `'before_after'`, `'general'` |
| background_color | TEXT DEFAULT `'#ffffff'` | hex |
| width | INTEGER DEFAULT 1000 | canvas px |
| height | INTEGER DEFAULT 1500 | canvas px, default 2:3 ratio |
| thumbnail_url | TEXT NULL | public URL, never an r2_key |
| elements_json | TEXT NOT NULL | JSON array of elements (below); `CHECK (json_valid(elements_json))` |
| is_active | BOOLEAN DEFAULT 1 | 1 = available in template picker, 0 = archived |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | ISO 8601 UTC |
| updated_at | DATETIME DEFAULT CURRENT_TIMESTAMP | auto-updated by trigger |

## elements_json

A JSON array of element objects. Order = z-order (first = back, last = front).

### Base (all elements)

| Key | Type | Req | Notes |
|---|---|---|---|
| id | string | yes | `<type>-<uuid>`, e.g. `"text-abc123"` |
| type | `"text" \| "image_slot" \| "shape" \| "logo" \| "overlay"` | yes | discriminator |
| x | number | yes | px, canvas space |
| y | number | yes | px, canvas space |
| width | number | yes | px |
| height | number | yes | px |
| rotation | number | yes | degrees |
| locked | boolean | yes | |
| visible | boolean | no | default true |
| opacity | number | no | 0–1 |
| name | string | no | layer display name |

### type: `"text"`

| Key | Type | Notes |
|---|---|---|
| content | string | static text content |
| binding | string | placeholder resolved at pin-generation time (see Bindings) |
| font_family | string | |
| font_size | number | |
| font_weight | number \| string | e.g. `400`, `"bold"` |
| font_style | string | e.g. `"italic"` |
| color | string | hex or rgba |
| text_align | `"left" \| "center" \| "right" \| "justify"` | |
| vertical_align | `"top" \| "middle" \| "bottom"` | |
| line_height | number | |
| letter_spacing | number | |
| text_transform | `"none" \| "uppercase" \| "lowercase" \| "capitalize"` | |
| text_decoration | string | e.g. `"underline"` |
| auto_fit | boolean | shrink text to fit bounds |
| wrap | string | |
| ellipsis | boolean | |
| stroke | string | color |
| stroke_width | number | |
| shadow | TextShadow | see sub-object below |
| effect | TextEffect | see sub-object below |
| background | TextBackground | see sub-object below |

#### TextShadow

```json
{
  "enabled": true,
  "color": "#000000",
  "blur": 4,
  "offset_x": 2,
  "offset_y": 2
}
```

#### TextEffect

```json
{
  "type": "none | shadow | lift | hollow | outline | echo | glitch | neon | splice",
  "color": "#000000",
  "offset": 2,
  "direction": 45,
  "blur": 4,
  "transparency": 0.5,
  "thickness": 1
}
```

#### TextBackground

```json
{
  "color": "#ffffff",
  "opacity": 0.8,
  "padding": 8,
  "border_radius": 4
}
```

### type: `"image_slot"`

| Key | Type | Notes |
|---|---|---|
| image_url | string | resolved public image URL |
| src | string | alternative source URL |
| binding | string | e.g. `{{article.image}}` |
| fit | `"cover" \| "contain" \| "fill"` | |
| clip_radius | number | |
| image_offset | `{ x: number, y: number }` | |
| image_scale | number | |
| placeholder | string | blurhash or LQIP |
| border_radius | number | |
| source_type | string | |

### type: `"shape"`

| Key | Type | Notes |
|---|---|---|
| shape_type | `"rect" \| "circle" \| "ellipse"` | |
| fill | string | hex or rgba |
| stroke | string | color |
| stroke_width | number | |
| border_radius | number | |

### type: `"logo"`

| Key | Type | Notes |
|---|---|---|
| src | string | public URL of logo image |
| fit | `"cover" \| "contain" \| "fill"` | |

### type: `"overlay"`

| Key | Type | Notes |
|---|---|---|
| fill | string | rgba string, e.g. `"rgba(0,0,0,0.4)"` |

## Bindings & placeholders

`binding` holds a placeholder resolved at pin-generation time:

- `{{article.title}}`
- `{{article.image}}`
- `{{author.name}}`
- `{{author.avatar}}`
- `{{category.label}}`

## Rules

1. snake_case only — no camelCase key may ever be written to `elements_json`.
2. Unknown keys are preserved on read, never silently dropped.
3. `image_url` / `src` / `thumbnail_url` are public URLs; `r2_key` never
   appears in template JSON.
4. Canonical TypeScript types live in `src/modules/templates/types/elements.types.ts`
   and must mirror this contract 1:1.
5. The store (`useEditorStore`) currently uses camelCase internally (pre-migration);
   a serialisation layer must convert to snake_case before writing to DB and
   deserialise on read.
