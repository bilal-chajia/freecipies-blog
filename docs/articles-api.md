# Articles API — Conventions

## Endpoints

| Method | Endpoint | Description | Auth |
|:-------|:---------|:------------|:-----|
| GET | `/api/articles` | List articles with filters | No |
| GET | `/api/articles/:slug` | Get article by slug (public) | No |
| POST | `/api/articles` | Create new article | Editor+ |
| GET | `/api/admin/articles/:id` | Get article by ID (admin) | Editor+ |
| PUT | `/api/admin/articles/:id` | Update article | Editor+ |
| DELETE | `/api/admin/articles/:id` | Soft delete article | Editor+ |
| PATCH | `/api/admin/articles/:id?action=toggle-online` | Toggle published status | Editor+ |
| PATCH | `/api/admin/articles/:id?action=toggle-favorite` | Toggle favorite status | Editor+ |

## Convention: GET by Slug, Mutations by ID

- **Public reads** use slug (SEO-friendly URLs): `/api/articles/:slug`
- **Admin mutations** use numeric ID: `/api/admin/articles/:id`

> Slugs can change; IDs are immutable. This prevents bugs when renaming articles.

## Soft Delete

All deletes set `deletedAt` timestamp instead of removing the row.

All queries automatically filter `WHERE deletedAt IS NULL`.

## JSON Fields

| Field | Purpose | Type |
|:------|:--------|:-----|
| `imagesJson` | Cover, thumbnail, gallery | `{cover: {}, thumbnail: {}, gallery: []}` |
| `contentJson` | Block-based article body (Main content / Introduction) | Array of blocks |
| `recipeJson` | Recipe data (ingredients, instructions) | Object |
| `roundupJson` | Curated item list (articles or external links) | `{ listType: 'ItemList', items: [] }` |
| `faqsJson` | FAQ items for rich snippets | Array of `{q, a}` |
| `seoJson` | SEO overrides | Object |
| `configJson` | Feature toggles | Object |

## TypeScript Mapping

The single `articles` table maps to a polymorphic TypeScript structure in `src/modules/articles/types/articles.types.ts`:

- **`BaseContent`**: Common fields (id, slug, headline...)
- **`AnyContent`** (Union): `ArticleContent | RecipeContent | RoundupContent`

| SQL Type | TS Interface | Key JSON Field |
|:---------|:-------------|:---------------|
| `article` | `ArticleContent` | `contentJson` |
| `recipe` | `RecipeContent` | `recipeJson` |
| `roundup` | `RoundupContent` | `roundupJson` |

## Type Rules

| Type | Required Fields |
|:-----|:----------------|
| `article` | `headline`, `shortDescription`, `categoryId`, `authorId` |
| `recipe` | Above + `recipeJson` must be valid |
| `roundup` | Above + `roundupJson` must be valid |

## Query Parameters (GET /api/articles)

| Param | Description | Example |
|:------|:------------|:--------|
| `type` | Filter by type | `recipe`, `article`, `roundup` |
| `category` | Filter by category slug | `breakfast` |
| `author` | Filter by author slug | `jane-doe` |
| `status` | Filter by online status | `online`, `offline`, `all` |
| `search` | Text search | `chocolate` |
| `limit` | Items per page | `12` |
| `page` | Page number | `1` |
