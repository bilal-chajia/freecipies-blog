# Design — Resolve Contract Audit #3 fully: snake_case end to end across all resources

**Date:** 2026-06-04
**Branch:** `migrate/recipe-equipment-canonical`
**Status:** Approved design — ready for implementation planning.
**Related:** `.hermes/plans/2026-06-03_contract-audit-report.md` (#3), `docs/NAMING_CONTRACT.md`, media pilot (`cf3b0532`, `e2e6bfc`).

## Problem

Contract Audit #3 found the admin/data layer serializes **camelCase** field names while
`NAMING_CONTRACT` mandates `snake_case` end to end (SQL column → Drizzle field → service →
serialized payload → React/Astro prop), with **no casing conversion at any boundary** and
**no Drizzle camelCase field aliases** (L14-20, L47-48).

The **media** resource is fully migrated (pilot). The other **9 Drizzle-backed resources still
expose camelCase** field aliases and dual-handling, which the contract currently tolerates via a
documented "migration status" clause. This design removes that debt and closes #3.

Remaining resources and their camelCase Drizzle field counts:

| Resource | camelCase fields |
| --- | --- |
| `settings` | 2 |
| `articles_to_tags` | 2 |
| `tags` | 5 |
| `templates` | 6 |
| `redirects` | 8 |
| `equipment` | 9 |
| `categories` | 12 |
| `authors` | 13 |
| `pinterest` | 17 |
| `articles` | 29 |

Note: stored JSON blobs (`content_json`, `images_json`, `recipe_json`, `seo_json`, cache fields)
are **already snake_case** (audit §2). The debt is at the **Drizzle row-field level and the admin
SPA**, not the stored JSON. Public site consumers mostly read stored snake_case JSON and are
largely unaffected.

## Goal

Apply `NAMING_CONTRACT` snake_case-end-to-end to all 9 remaining resources, then flip the
contract's migration-status note from "media only" to "all resources migrated" and remove the
tolerance clause. After this, `node scripts/local-contract-audit.mjs` reports no camelCase
data-shape violations attributable to #3.

## Per-resource migration template

Derived from the media pilot and the `e2e6bfc` regression lesson. Each resource is migrated in a
**single coherent commit** covering every layer:

1. **Drizzle schema** (`src/modules/<res>/schema/*.schema.ts`): rename JS field names from
   camelCase to snake_case. SQL column names are already snake_case — only the JS property name
   changes. Update `index(...)`, relations, and any `(table) => [...]` references.
2. **Service layer** (`src/modules/<res>/services/*.ts`): update every Drizzle field reference
   (`x.deletedAt` → `x.deleted_at`, `where`, `orderBy`, `with`, etc.).
3. **API handlers** (`src/pages/api/<res>/*` and `src/modules/<res>/api/*`): build snake_case
   payloads directly; delete any camelCase → column conversion code.
4. **Validation** (`src/shared/validation/schemas/*` Zod request/response schemas): snake_case
   keys; remove camelCase fallbacks (`value.fooBar ?? value.foo_bar`).
5. **Serializers** (if the resource has one): snake_case output, no remap layer.
6. **Admin SPA consumers** (`src/admin/features/<res>/**`, `src/admin/services/api.ts`,
   `src/admin/utils/*`): read snake_case; remove dual-fallbacks. Internal component/form state
   may stay camelCase per L21 (local identifiers), but the request payload at the boundary must be
   snake_case with no conversion of *data keys*.
7. **Site consumers** (`src/site/**`): only where they read a Drizzle row directly. Most read
   stored snake_case JSON and need no change.
8. **Shared types** (`src/shared/types/*`) and **tests/fixtures**: snake_case.

### Critical co-migration rule (e2e6bfc lesson)

Schema + serializer + consumers must move **together in the same commit**. Splitting them
reproduces the `e2e6bfc` bug: Drizzle returns camelCase-keyed rows while a snake_case-only
serializer reads `undefined`, silently producing empty/null payloads. Never land a partial-layer
commit for a resource.

## Definition of Done (per resource, gate before each commit)

- `pnpm test` passes.
- `pnpm check:boundaries` passes.
- `node scripts/local-contract-audit.mjs --summary` shows no new camelCase violation.
- Targeted grep shows zero camelCase data-shape seams for that resource
  (`\.(fooBar|...)\b` reads on its rows; no `x ?? x` / `x || x` remnants).
- Exactly one commit for the resource, covering all layers.

## Execution order

Easiest → hardest, to refine the reusable checklist on small resources before the large,
entangled `articles`:

`settings` → `articles_to_tags` → `tags` → `templates` → `redirects` → `equipment` →
`categories` → `authors` → `pinterest` → `articles`.

`articles` is last: largest, and its row fields (`slug`, `headline`, `short_description`, …) are
the migration target while its JSON blobs are already snake_case and must not be re-touched.

## Cross-cutting concerns

- `src/admin/services/api.ts`: remove each resource's conversion helper as it migrates.
- Drizzle relations: `query.<res>.findFirst({ with: { ... } })` nested shapes must also be
  snake_case.
- **Final step:** update `docs/NAMING_CONTRACT.md` — change the migration-status note to
  "all resources migrated" and remove the camelCase tolerance clause; then re-run the full
  contract audit and record the result in `.hermes/plans/2026-06-03_contract-audit-report.md`.

## Out of scope

- Audit **#4** (R2 cleanup on delete), **#5** (legacy block-type check in `useContentEditor.ts`),
  **#6** (equipment external affiliate image) — tracked separately.
- `jsonld_json` — follows external Schema.org camelCase vocabulary (allowed exception).
- Third-party provider payloads at the integration boundary (normalized before storage).

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Split-layer commit reproduces the `e2e6bfc` broken-payload bug | Co-migration rule + per-resource DoD gate |
| `articles` entanglement with content-blocks/recipe/cache JSON | JSON blobs already snake; migrate only row fields; do not touch blobs |
| Drizzle `where`/`orderBy`/`with` references missed | grep each schema's old field names to zero before commit |
| Admin SPA runtime breakage not caught by types (optional fields) | Manual save→reload smoke check on the migrated resource where feasible |
