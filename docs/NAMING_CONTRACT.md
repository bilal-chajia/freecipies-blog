# Naming Contract

> **Last Updated:** 2026-05-11

This document is the canonical naming contract for schema, stored JSON,
serialized JSON, and TypeScript/TSX implementation names.

## Core Rule

- SQL schema names use `snake_case`.
- Stored JSON keys use `snake_case`.
- Serialized API/admin/server-render JSON keys use `snake_case`.
- TypeScript/TSX variable, constant, and property names use `camelCase` in implementation code only.

## Boundaries

Implementation names do not change persisted or serialized names.

Example:

| Layer | Name |
| --- | --- |
| SQL column | `content_json` |
| Stored JSON key | `size_bytes` |
| Serialized JSON key | `size_bytes` |
| TypeScript variable/property | `contentJson`, `sizeBytes` |

## Allowed Exceptions

- Public/resolved image payloads replace stored `r2_key` with public `url`.
- `jsonld_json` follows the external Schema.org vocabulary exactly.
- HTML output is not JSON; it uses normal HTML attributes such as `src`,
  `srcset`, `width`, `height`, `loading`, and `alt`.

## Migration Drift

Older implementation or stored names such as `sizeBytes`, `aspectRatio`,
`contentJson`, or `recipeJson` are not contract names when they appear inside
stored or serialized JSON. Treat them as migration drift and normalize them
before persistence or public/admin serialization.
