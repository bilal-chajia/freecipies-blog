# Content JSON Contract

> **Last Updated:** 2026-05-11

This is the canonical contract for `articles.content_json`.

For naming rules, use `docs/NAMING_CONTRACT.md`.

For the full `articles` table contract, use `docs/ARTICLE_TABLE_CONTRACT.md`.
For the official block vocabulary, use `docs/CONTENT_BLOCKS_CONTRACT.md`.

## Stored Shape

`content_json` is stored as a versioned document object, never as a raw array.

```json
{
  "version": 1,
  "kind": "content_document",
  "blocks": []
}
```

`docs/CONTENT_BLOCKS_CONTRACT.md` is the normative source for block vocabulary.
`src/modules/content-blocks` implements the types, validation, normalization,
and extraction helpers that must align with that contract.

## Format Boundaries

| Layer | Format | Rule |
| --- | --- | --- |
| Admin editor | BlockNote/AppBlock | Never store directly in DB |
| Database/API | `ContentDocument` | Official persisted contract |
| Site renderer | normalized `ContentDocument.blocks` | Renderer reads canonical block names only |

Compatibility behavior for old drafts or editor names is documented in `docs/IMPLEMENTATION_GAPS.md`, not in this contract.

## Naming Rules

Use exactly these content names by layer:

| Layer | Name |
| --- | --- |
| SQL/schema column | `content_json` |
| Stored document keys | `kind`, `blocks` |
| Stored block `type` values | `main_recipe`, `main_roundup`, `main_faq` |

The official block vocabulary, marker blocks, related-content reference rules,
and reserved block names are defined in `docs/CONTENT_BLOCKS_CONTRACT.md`.

## Minimum Examples

```json
{
  "version": 1,
  "kind": "content_document",
  "blocks": [
    {
      "id": "intro",
      "type": "paragraph",
      "text": "Intro with **markdown**."
    },
    {
      "id": "recipe",
      "type": "main_recipe"
    },
    {
      "id": "faq",
      "type": "main_faq"
    }
  ]
}
```

## Implementation Rules

- API create/update validates the content document before saving.
- DB triggers and search indexes read blocks from `$.blocks`.
- Cached TOC and FAQ data are extracted through `src/modules/content-blocks`.
- Visual components must not invent stored block names.
- Documentation that describes `content_json` as `ContentBlock[]` is obsolete.
