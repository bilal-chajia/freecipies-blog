# Agent Instructions

> **Last Updated:** 2026-04-09

This document provides comprehensive guidance for AI coding agents working on the Freecipies recipes blog project.

---

## Project Overview

**Freecipies** is a modern food blog and recipe management platform built with Astro, React, and Cloudflare. It features a public-facing recipe site with an integrated admin panel for content management.

### Core Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Astro** | 6.1.4 | SSR Framework |
| **React** | 19.2.4 | Admin Panel UI |
| **TypeScript** | 6.0.2 | Type Safety |
| **TailwindCSS** | 4.2.2 | Styling |
| **Drizzle ORM** | 0.45.2 | Database ORM |

### Cloudflare Stack

| Service | Package | Purpose |
|---------|---------|---------|
| **D1** | `@astrojs/cloudflare` 13.1.7 | SQLite Database |
| **R2** | via Wrangler 4.x | Object Storage (Images) |
| **Workers** | via Wrangler 4.x | Edge Runtime |
| **KV** | Wrangler 4.x | Session Storage |

### Key Dependencies

- **UI Components**: Radix UI primitives + shadcn/ui (New York style)
- **State Management**: Zustand
- **Authentication**: jose (JWT)
- **Image Processing**: @jsquash/webp, @jsquash/avif (WASM-based)
- **Block Editor**: @blocknote/react, @blocknote/core
- **Charts**: recharts
- **Forms**: react-hook-form + zod
- **Icons**: lucide-react

---

## Build and Development Commands

```bash
# Development (Astro 6: Uses workerd runtime, includes local D1/R2 bindings via Vite)
pnpm dev

# Production build
pnpm build

# Preview built output with full Edge simulation (Crucial final test before deploy)
pnpm preview

# Database migrations (via drizzle-kit)
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Other commands
pnpm astro      # Astro CLI
```

**Package Manager**: `pnpm` (NOT npm/yarn)

---

## Project Structure

```
src/
├── modules/           # Feature-based domain modules
│   ├── articles/      # Articles, recipes, roundups
│   │   ├── api/       # API route handlers
│   │   ├── services/  # Business logic (articles.service.ts)
│   │   ├── schema/    # Drizzle schema
│   │   └── types/     # TypeScript types
│   ├── categories/    # Category taxonomy
│   ├── authors/       # Author profiles
│   ├── tags/          # Tag system
│   ├── media/         # Media library & R2 storage
│   ├── auth/          # Authentication
│   ├── settings/      # Site settings
│   ├── menus/         # Navigation menus
│   ├── pinterest/     # Pinterest integration
│   ├── templates/     # Pin templates (canvas editor)
│   └── ai/            # AI providers integration
├── shared/            # Shared utilities
│   ├── database/      # drizzle.ts, schema.ts (aggregate)
│   ├── types/         # Global types (images.ts, api.types.ts)
│   └── utils/         # Shared utilities
├── admin/             # React Admin Panel (SPA)
│   ├── components/    # React components
│   ├── pages/         # Admin page components
│   ├── services/      # API client (api.js)
│   ├── store/         # Zustand stores
│   ├── ui/            # shadcn/ui components
│   └── hooks/         # Custom React hooks
├── components/        # Public site Astro components
├── layouts/           # Astro layouts
├── lib/               # Legacy utilities (being migrated)
├── pages/             # Astro pages & API routes
│   ├── api/           # API endpoints (delegates to modules)
│   └── *.astro        # Public pages
└── styles/            # Global CSS
```

### Path Aliases (tsconfig.json)

| Alias | Path | Usage |
|-------|------|-------|
| `@/*` | `src/admin/*` | Admin panel imports |
| `@modules/*` | `src/modules/*` | Module imports |
| `@admin/*` | `src/admin/*` | Admin panel |
| `@shared/*` | `src/shared/*` | Shared utilities |
| `@components/*` | `src/components/*` | Astro components |
| `@lib/*` | `src/lib/*` | Legacy utilities |

---

## Database Schema (Source of Truth)

> **CRITICAL:** `db/schema.sql` is the **SINGLE SOURCE OF TRUTH** for the database schema.

- **Source of truth:** `db/schema.sql`
- **Documentation:** `db/DATABASE_SCHEMA.md`
- **Drizzle schemas:** `src/modules/*/schema/*.schema.ts` (keep in sync)

### Key Tables

| Table | Purpose |
|-------|---------|
| `site_settings` | Global configuration key-value store |
| `media` | Centralized asset library with responsive variants |
| `categories` | Hierarchical taxonomy (recipes, articles) |
| `authors` | Content creator profiles |
| `tags` | Flexible labeling for filtering |
| `equipment` | Kitchen tools with affiliate links |
| `articles` | Core content (recipes, articles, roundups) |
| `articles_to_tags` | Many-to-many junction |
| `pinterest_boards` | Pinterest board targets |
| `pinterest_pins` | Pin assets for export |
| `pin_templates` | Reusable canvas templates |
| `redirects` | 301/302 redirects |

### Database Rules

1. **Always use IDs for relationships**, never slugs in foreign key columns
2. **JSON fields must be valid JSON** - use `JSON.stringify()` before inserting
3. **Soft deletes only** - set `deleted_at` instead of hard deleting records
4. **All queries must filter** `WHERE deleted_at IS NULL` unless explicitly requested
5. **Timestamps are UTC** - use `CURRENT_TIMESTAMP` or ISO-8601 strings

---

## Content Architecture

### Article Types (Polymorphic)

The `articles` table supports three content types:

| Type | Description | Required JSON |
|------|-------------|---------------|
| `article` | Editorial/blog content | `content_json` |
| `recipe` | Structured recipe | `content_json` + `recipe_json` |
| `roundup` | Curated listicles | `content_json` + `roundup_json` |

### Content Blocks (content_json)

Articles use a block-based JSON structure. Valid block types:

| Category | Types |
|----------|-------|
| **Text** | `paragraph`, `heading`, `blockquote`, `list` |
| **Media** | `image`, `video` |
| **Callouts** | `tip_box` |
| **Embeds** | `embed`, `recipe_card`, `product_card` |
| **Layout** | `divider`, `spacer`, `ad_slot`, `table` |
| **Food Blog** | `before_after`, `ingredient_spotlight`, `faq_section`, `related_content` |

### TypeScript Content Types

```typescript
// Import from @modules/articles/types
import type { 
  AnyContent,      // Union type for mixed lists
  RecipeContent,   // When type is known
  RoundupContent,
  ArticleContent,
  ContentBlock     // Block union type
} from '@modules/articles/types';
```

---

## Image System

### Unified Image Types

> **CRITICAL:** Import ALL image types from `@shared/types/images` (single source of truth).

**Public Types (Consumer code, API responses):**
```typescript
import type { 
  ImageVariant,      // url, width, height, sizeBytes
  ImageVariants,     // xs, sm, md, lg, original
  ImageSlot,         // Full slot: media_id, alt, caption, variants, etc.
  ArticleImagesJson, // { cover?, thumbnail?, pinterest?, contentImages? }
  ContentImageBlock, // { type: 'image', media_id, alt, variants, ... }
} from '@shared/types/images';
```

**Storage Types (Media module ONLY):**
```typescript
import type { 
  StorageVariant,    // Extends ImageVariant with r2_key
  MediaVariantsJson, // { variants: StorageVariants, placeholder }
} from '@shared/types/images';
```

### Image Breakpoints

| Variant | Width | Use Case |
|---------|-------|----------|
| `xs` | 360px | Mobile thumbnails |
| `sm` | 720px | Mobile full-width |
| `md` | 1200px | Tablet / small desktop |
| `lg` | 2048px | Full desktop / retina |
| `original` | >2048px | Optional, hero images only |

**Avatar exception:** 50, 100, 200, 400 (smaller for profile images)

### Utility Functions

```typescript
import { 
  getBestVariantUrl,    // Get best available URL
  getSrcSet,            // Generate srcset string
  stripStorageKeys      // Remove r2_key for API responses
} from '@shared/types/images';
```

**DO NOT:**
- Create new image type definitions
- Import from `modules/articles/types/images.types.ts` (re-exports only)
- Expose `r2_key` to frontend code

---

## API Patterns

### Standard Response Format

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string, code: string, details?: Record<string, string[]> }

// Paginated
{ success: true, data: T[], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
```

### API Endpoint Structure

```typescript
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from "@lib/error-handler";
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const data = await getArticles(env.DB, { limit: 10 });
    const { body, status, headers } = formatSuccessResponse(data);
    return new Response(body, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed", 500)
    );
    return new Response(body, { status, headers });
  }
};
```

### Smart Routing Pattern

```typescript
// For [slug].ts that handles both IDs and slugs
const { slug } = params;
const isNumeric = /^\d+$/.test(slug);
const item = isNumeric 
  ? await getById(db, parseInt(slug)) 
  : await getBySlug(db, slug);
```

---

## Drizzle Query Patterns

### Listing Pages (Minimal fields for cards)

```typescript
const listingFields = {
  slug: articles.slug,
  headline: articles.headline,
  images_json: articles.images_json,
  cached_recipe_json: articles.cached_recipe_json,
  cached_author_json: articles.cached_author_json,
  cached_category_json: articles.cached_category_json,
  cached_tags_json: articles.cached_tags_json,
  published_at: articles.published_at,
};

const recipes = await db
  .select(listingFields)
  .from(articles)
  .where(and(
    eq(articles.is_online, true),
    isNull(articles.deleted_at)
  ))
  .orderBy(desc(articles.published_at))
  .limit(20);
```

### Full Article Page

```typescript
const article = await db
  .select()
  .from(articles)
  .where(eq(articles.slug, slug))
  .get();
```

---

## Cache Rebuild Triggers

When saving an article, rebuild these cached fields:

| Cached Field | Rebuild When |
|--------------|--------------|
| `faqs_json` | content_json changes (scan for faq_section blocks) |
| `cached_toc_json` | content_json changes (scan for heading blocks) |
| `cached_tags_json` | articles_to_tags changes |
| `cached_category_json` | category_id changes OR category table updates |
| `cached_author_json` | author_id changes OR authors table updates |
| `cached_equipment_json` | recipe_json.equipment changes OR equipment table updates |
| `cached_rating_json` | recipe_json.aggregateRating changes |
| `cached_recipe_json` | recipe_json changes |
| `reading_time_minutes` | content_json changes |
| `jsonld_json` | Any SEO-relevant field changes |

---

## Code Style Guidelines

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `RecipeCard.astro` |
| Utilities | camelCase | `errorHandler.ts` |
| API routes | kebab-case folders | `/api/pinterest-boards/` |
| CSS classes | kebab-case | Tailwind classes |
| Slugs | lowercase, kebab-case | `chocolate-chip-cookies` |
| JSON keys | camelCase | `mediaId`, `focalPoint` |
| SQL columns | snake_case | `created_at`, `is_online` |
| Boolean columns | `is_` prefix | `is_online`, `is_featured` |

### TypeScript Rules

1. **Strict mode** - no `any` types unless absolutely necessary
2. **Import types** from `src/shared/types/index.ts`
3. **Use existing patterns** - check `src/lib/` for utilities before creating new ones

### CSS & Responsiveness Rules

1. **Container Queries First** - Use `@container` (`container-type: inline-size`) for component internals so they adapt to their parent container's width, not just the viewport.
2. **Intrinsic Web Design** - Favor fluid layouts using `clamp()`, `min()`, `max()`, and CSS Grid `minmax()`.
3. **Logical Properties** - Use `margin-inline`, `padding-block`, etc., instead of physical properties.
4. **Minimal Media Queries** - Only use `@media` for major structural changes that Container Queries cannot handle.

### Null Handling

```typescript
// CORRECT: Convert null to undefined for optional props
recipeDetails = recipe.recipeJson || undefined;
publishedTime={recipe.publishedAt || undefined}

// WRONG: Passing null when undefined expected
recipeDetails = recipe.recipeJson; // may be null
```

---

## Testing Instructions

### Pre-Commit Checklist

Before marking any task complete:

- [ ] `pnpm build` passes with no errors
- [ ] All images have `width` and `height` attributes
- [ ] API responses use `formatSuccessResponse`/`formatErrorResponse`
- [ ] No `any` types unless documented reason
- [ ] No hardcoded secrets or sensitive data
- [ ] Commit message follows convention

### Testing Commands

```bash
# Build check (required before commits)
pnpm build

# Full Cloudflare simulation
pnpm preview
```

---

## Security Considerations

### NEVER Do

- ❌ Commit `.env` files or secrets
- ❌ Log sensitive data (tokens, passwords, emails)
- ❌ Expose internal error messages to users
- ❌ Use `eval()` or dynamic code execution
- ❌ Trust user input without validation

### Environment Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `JWT_SECRET` | Auth token signing | Cloudflare Secrets |
| `DB` | D1 Database binding | wrangler.toml |
| `IMAGES` | R2 Storage binding | wrangler.toml |
| `SESSION` | KV namespace binding | wrangler.toml |

### Secrets Access

```typescript
// CORRECT: Access via env
const secret = env.JWT_SECRET;

// WRONG: Hardcoded
const secret = "my-secret-key"; // NEVER DO THIS
```

---

## Performance Guidelines

1. **No client-side hydration** on public pages unless absolutely necessary
2. **Always add `width` and `height`** to `<img>` tags to prevent CLS
3. **Use `loading="lazy"`** for below-fold images, `fetchpriority="high"` for hero images
4. **Minimize DOM size** - use global JS objects instead of data attributes for large data
5. **Target Lighthouse 90+** on all public pages

### Image Rendering (Astro)

```astro
<!-- CORRECT: Always include dimensions -->
<img
  src={recipe.imageUrl}
  alt={recipe.imageAlt || ""}
  width={recipe.imageWidth || 1200}
  height={recipe.imageHeight || 675}
  loading="lazy"
/>

<!-- WRONG: Missing dimensions causes CLS -->
<img src={recipe.imageUrl} alt="" />
```

---

## Git & Commit Conventions

### Commit Message Format

```
<type>: <short description>

[optional body]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Build process, dependencies, tooling

**Examples:**
```
feat: add image cropping to admin editor
fix: resolve null pointer in RecipeLayout
perf: optimize StoriesBar DOM size
```

### Branch Naming

- `feature/<description>` - New features
- `fix/<description>` - Bug fixes
- `refactor/<description>` - Code improvements

---

## AI Planning Documents

AI assistants often create planning and design documents during development:
- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Recommended approach:**
- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in history/
- Keep the repository root clean and focused on permanent project files
- Only access history/ when explicitly asked to review past planning

---

## Key Reference Files

| Purpose | File |
|---------|------|
| Database schema source | `db/schema.sql` |
| Database documentation | `db/DATABASE_SCHEMA.md` |
| Drizzle client | `src/shared/database/drizzle.ts` |
| Schema aggregate | `src/shared/database/schema.ts` |
| Type definitions | `src/shared/types/index.ts` |
| Image types | `src/shared/types/images.ts` |
| Error handling | `src/lib/error-handler.ts` |
| Auth utilities | `src/lib/auth.ts` |
| API helpers | `src/lib/api.ts` |
| Astro config | `astro.config.mjs` |
| Wrangler config | `wrangler.toml` |

---

## Additional Resources

- **CLAUDE.md** - Additional project guidelines for Claude AI
- **components.json** - shadcn/ui configuration
- **pnpm-workspace.yaml** - Workspace configuration
