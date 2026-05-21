# Project Architecture

> **Last Updated:** 2026-05-11
> **Framework:** Astro 6.3.3 + React 19
> **Deployment:** Cloudflare Pages + D1 + R2 + KV

---

## 🤖 AI Agent Overview

This is a **recipe/food blog SaaS** built with:

- **Astro 6.3.3** - SSR framework with islands architecture
- **React 19** - Admin panel and interactive components
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Image storage with responsive variants
- **Cloudflare KV** - Session storage
- **Drizzle ORM** - Type-safe database access

---

## Tech Stack

| Layer          | Technology            | Purpose                  |
| -------------- | --------------------- | ------------------------ |
| **Framework**  | Astro 6.3.3           | SSR with islands         |
| **UI Library** | React 19              | Interactive components   |
| **Styling**    | Tailwind CSS 4        | Utility-first CSS        |
| **Components** | shadcn/ui + Radix     | Accessible UI primitives |
| **Database**   | Cloudflare D1         | Edge SQLite              |
| **ORM**        | Drizzle               | Type-safe queries        |
| **Storage**    | Cloudflare R2         | Image CDN                |
| **Session**    | Cloudflare KV         | Session storage          |
| **State**      | Zustand               | React state management   |
| **Forms**      | React Hook Form + Zod | Validation               |
| **Tables**     | TanStack Table        | Data grids               |
| **Charts**     | Recharts              | Analytics                |
| **Animation**  | Framer Motion         | UI animations            |
| **Block Editor** | @blocknote/react    | Rich content editing     |
| **Canvas**     | Konva + react-konva   | Pin template designer    |
| **AI**         | OpenAI, Anthropic, Gemini | Content generation   |

---

## Directory Structure

```
recipes-saas/
├── src/
│   ├── admin/              # React Admin Panel (SPA)
│   │   ├── app/            # Admin app shell and routing entrypoint
│   │   │   └── routes.jsx  # Admin route registry
│   │   ├── features/       # Admin feature modules with routeable pages
│   │   ├── components/     # Admin shared shell/components only
│   │   ├── styles/         # Admin dashboard visual theme
│   │   ├── services/       # API client
│   │   ├── store/          # Zustand stores
│   │   ├── ui/             # shadcn/ui components
│   │   └── AdminApp.jsx    # Compatibility re-export
│   │
│   ├── site/               # Public blog/frontend surface
│   │   ├── components/     # Astro site components
│   │   ├── layouts/        # Public page layouts
│   │   └── styles/         # Public global styles
│   │
│   ├── server/             # Request handlers and server-only boundaries
│   │   ├── api/            # API route handlers called by src/pages/api
│   │   ├── cloudflare/     # Binding/env helpers
│   │   └── site-data/      # Server loaders for public Astro pages
│   │
│   ├── modules/            # Domain modules (DDD)
│   │   ├── articles/       # Articles domain (recipes, articles, roundups)
│   │   ├── authors/        # Authors domain
│   │   ├── categories/     # Categories domain
│   │   ├── tags/           # Tags domain
│   │   ├── equipment/      # Kitchen equipment with affiliate links
│   │   ├── media/          # Media/uploads domain
│   │   ├── pinterest/      # Pinterest integration
│   │   ├── templates/      # Pin template domain
│   │   ├── settings/       # Site settings
│   │   ├── menus/          # Navigation menus
│   │   ├── auth/           # Authentication
│   │   └── ai/             # AI content generation
│   │
│   ├── pages/              # Astro routes
│   │   ├── index.astro     # Homepage
│   │   ├── recipes/        # Recipe pages
│   │   ├── categories/     # Category pages
│   │   ├── authors/        # Author pages
│   │   ├── tags/           # Tag pages
│   │   └── api/            # API endpoints
│   │
│   └── shared/             # Cross-cutting concerns
│       ├── database/       # Schema re-exports
│       ├── types/          # Shared TypeScript types
│       ├── design-tokens.css # Neutral CSS primitives only
│       └── utils/          # Shared utilities
│
├── db/
│   ├── schema.sql          # Full SQL schema
│   └── DATABASE_SCHEMA.md  # Schema documentation
│
├── docs/
│   ├── API.md              # API documentation
│   └── ARCHITECTURE.md     # This file
│
├── public/                 # Static assets
│
├── astro.config.mjs        # Astro configuration
├── drizzle.config.ts       # Drizzle configuration
├── tsconfig.json           # TypeScript config
└── wrangler.jsonc           # Cloudflare config
```

---

## Module Structure

## Runtime Boundaries

The app stays as one Astro 6.3.3 application and one Cloudflare deployment, but the
internal runtime boundaries are strict:

- `src/pages` owns Astro file-based routes. Public pages call server data
  loaders, and API route files should stay as thin adapters.
- `src/site` owns public Astro UI only. Components and layouts must not import
  `cloudflare:workers` or access `env.DB`, `env.IMAGES`, or `env.SESSION`
  directly.
- `src/server` owns request handlers, Cloudflare binding helpers, auth guards,
  R2/D1/KV access, and server-side site data loaders.
- `src/modules` owns domain logic only: schemas, services, transforms,
  validation, and domain types. It must not import admin/site UI.
- `src/admin` owns the React 19 admin SPA. It calls API endpoints and must not
  import server runtime code or Cloudflare bindings.
- `src/shared` remains universal and pure: shared types, validation, response
  helpers, image DTOs, constants, and storage-neutral utilities.

Cloudflare storage note: the project uses a Cloudflare R2 bucket binding named
`IMAGES` in `wrangler.jsonc`. This is not the Cloudflare Images product. Code
and docs should refer to it as the R2 bucket binding `IMAGES` unless the infra
binding is intentionally renamed in a separate migration.

API route convention: new or migrated API logic belongs in
`src/server/api/**/*.handler.ts`; `src/pages/api/**` keeps the public URL and
delegates to the handler. Resource collection endpoints with sibling subroutes
use `src/pages/api/{resource}/index.ts` instead of
`src/pages/api/{resource}.ts`.

Boundary checks can be run with:

```bash
pnpm check:boundaries
```

Each domain module follows this pattern:

```
src/modules/{module}/
├── schema/
│   └── {module}.schema.ts    # Drizzle table definition
├── types/
│   └── {module}.types.ts     # TypeScript interfaces
├── services/
│   └── {module}.service.ts   # CRUD operations
└── index.ts                  # Barrel export
```

### Available Modules

| Module       | Purpose                       |
| ------------ | ----------------------------- |
| `articles`   | Blog posts, recipes, roundups |
| `categories` | Taxonomy and navigation       |
| `authors`    | Content creators              |
| `tags`       | Filtering and discovery       |
| `equipment`  | Kitchen tools with affiliate links |
| `media`      | Image library and variants    |
| `pinterest`  | Boards and pins               |
| `templates`  | Pin template schema, types, services, and utilities |
| `settings`   | Site configuration            |
| `menus`      | Navigation menus              |
| `auth`       | Admin authentication          |
| `ai`         | Multi-provider AI generation  |

### Templates Module Boundary

The `templates` module is server-safe domain code. React/Konva editor UI and editor stores live under `src/admin/features/templates/`.

```
src/modules/templates/
├── schema/templates.schema.ts       # Drizzle table
├── types/
│   ├── elements.types.ts            # TextElement, ImageElement, etc.
│   └── templates.types.ts           # Template, ArticleData
├── services/templates.service.ts    # Drizzle CRUD
├── api/handlers.ts                  # D1 request handlers
├── utils/
│   ├── placeholders.ts              # {{article.title}} substitution
│   └── fontLoader.ts                # Google Fonts loader
├── README.md
└── index.ts                         # Barrel export
```

```
src/admin/features/templates/
├── components/
│   ├── canvas/                      # PinCanvas, ElementPanel, toolbars
│   ├── editor/                      # TemplateEditor, TemplatesList
│   └── pins/                        # TemplateSelector
└── store/                           # Canvas/editor Zustand stores
```

```
src/admin/features/pins/
└── components/
    ├── PinCreator.jsx               # Quick pin creation workflow
    ├── TemplateSelector.jsx         # Template picker for pin creation
    └── index.js                     # Feature component exports
```

```
src/admin/features/{feature}/
├── pages/                           # Routeable dashboard screens
└── components/                      # Feature-owned UI components
```

Current admin feature modules include:

| Feature      | Owns |
| ------------ | ---- |
| `articles`   | Article list/editors and article preview |
| `auth`       | Login screen |
| `authors`    | Author editor/list and author editor panels |
| `categories` | Category list/editor |
| `dashboard`  | Dashboard landing screen |
| `equipment`  | Equipment list |
| `homepage`   | Homepage editor and homepage section cards |
| `media`      | Media library, media dialog, image editor, image uploader |
| `pins`       | Quick pin creation workflow |
| `pinterest`  | Pinterest board list/editor |
| `recipes`    | Recipe list |
| `redirects`  | Redirect list |
| `roundups`   | Roundup list |
| `settings`   | Settings screen, tabs, and settings UI components |
| `tags`       | Tag list/editor |
| `templates`  | Pin template editor/canvas/stores |

**Admin imports UI from admin features:**

```javascript
import { TemplateEditor, PinCanvas } from "@admin/features/templates/components";
import { useEditorStore } from "@admin/features/templates/store";
import { PinCreator } from "@admin/features/pins/components";
import { MediaDialog, ImageUploader } from "@admin/features/media/components";
```

### Admin App Boundary

The admin shell is a React SPA mounted by `src/pages/admin/[...path].astro`.
Astro owns the route entrypoint, while React owns the admin dashboard routing.

```
src/pages/admin/[...path].astro
└── mounts src/admin/AdminApp.jsx
    └── re-exports src/admin/app/AdminApp.jsx
        ├── AdminLayout / auth boundary
        └── routes.jsx
            ├── fullScreenAdminRoutes  # editors that bypass AdminLayout
            └── adminLayoutRoutes      # dashboard modules inside AdminLayout
```

Admin pages live under `src/admin/features/{feature}/pages`. New admin modules
should expose routeable screens through `src/admin/app/routes.jsx`.

### Design Surface Boundary

The admin dashboard and public food blog use separate visual systems.

```
src/shared/design-tokens.css      # Neutral primitives only
src/site/styles/site-theme.css    # Public food blog identity
src/site/styles/global.css        # Public site CSS entrypoint
src/admin/styles/admin-theme.css  # Admin dashboard identity
src/admin/index.css               # Admin CSS entrypoint
```

- Public pages are rendered with `data-surface="site"` from `src/site/layouts/Layout.astro`.
- Admin pages are rendered with `data-surface="admin"` from `src/pages/admin/[...path].astro`.
- `src/shared` must not own visual identity. It can expose spacing, neutral colors, type scale, motion, z-index, and feedback primitives only.
- Admin visual components stay in `src/admin/ui`, `src/admin/components`, or `src/admin/features/*`.
- Public visual components stay in `src/site/components`, `src/site/components/ui`, or `src/site/layouts`.
- Do not import `site-theme.css` from admin code, and do not import `admin-theme.css` from public site code.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE EDGE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Astro     │    │   D1        │    │   R2        │     │
│  │   Pages     │◄──►│   (SQLite)  │    │   (Images)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                                     ▲             │
│         │                                     │             │
│         ▼                                     │             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Routes (/api/*)                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │Articles │ │Authors  │ │Media    │ │Settings │    │   │
│  │  │Service  │ │Service  │ │Service  │ │Service  │    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       CLIENT                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │   Public Site       │    │   Admin Panel       │        │
│  │   (Astro SSG)       │    │   (React SPA)       │        │
│  │                     │    │                     │        │
│  │ • Recipe pages      │    │ • CRUD interfaces   │        │
│  │ • Category pages    │    │ • Media library     │        │
│  │ • Author pages      │    │ • Pin creator       │        │
│  │ • Search            │    │ • Settings          │        │
│  └─────────────────────┘    └─────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Patterns

### 1. Hydration Pattern

Raw database rows → Hydrated objects with parsed JSON and computed fields.

```typescript
// Raw DB row
{ images_json: '{"hero":{...}}', slug: 'recipe' }

// Hydrated
{ images: { hero: {...} }, slug: 'recipe', route: '/recipes/recipe' }
```

### 2. Zero-Join Rendering

Cached JSON fields (`cached_*`) store denormalized data for instant rendering without JOINs.

### 3. Soft Deletes

All entities use `deleted_at` for soft deletes. Queries filter `WHERE deleted_at IS NULL`.

### 4. Module Imports

```typescript
// Use module aliases
import { getArticles } from "@modules/articles";
import { Env } from "@shared/types";

// Not relative paths
import { getArticles } from "../../../modules/articles";
```

---

## API Structure

```
/api/
├── articles/
│   ├── index.ts          # GET (list), POST (create)
│   └── [slug].ts         # GET, PUT, DELETE
├── categories/
├── authors/
├── tags/
├── equipment/
├── media/
│   ├── index.ts          # GET (list)
│   ├── [id].ts           # GET, PUT, DELETE
│   └── upload.ts         # POST (multipart)
├── pinterest/
│   ├── boards.ts         # Pinterest boards
│   └── pins.ts           # Pin management
├── templates/
│   └── [id].ts           # Template CRUD
├── settings/
│   └── [key].ts          # GET, PUT
├── auth/
│   └── login.ts          # Authentication
├── search.ts             # Full-text search
├── redirects.ts          # Redirect management
└── ai/
    └── generate.ts       # AI content generation
```

---

## Environment Variables

Environment variables are configured in `wrangler.jsonc` for Cloudflare bindings:

```toml
# wrangler.jsonc
[[d1_databases]]
binding = "DB"
database_name = "freecipies-db"
database_id = "xxx"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "freecipies-images"

[[kv_namespaces]]
binding = "SESSION"
id = "xxx"
```

Secrets (set via Cloudflare dashboard or Wrangler CLI):
```bash
wrangler secret put JWT_SECRET   # Admin auth secret
```

Local development (`.env`):
```bash
JWT_SECRET=your-local-secret-for-development
```

---

## Build & Deploy

```bash
# Development
pnpm dev

# Build for production
pnpm build

# Preview with Wrangler
pnpm preview

# Deploy to Cloudflare
wrangler pages deploy dist
```

---

## Path Aliases

Defined in `tsconfig.json`:

| Alias           | Path               |
| --------------- | ------------------ |
| `@/*`           | `src/admin/*`      |
| `@modules/*`    | `src/modules/*`    |
| `@shared/*`     | `src/shared/*`     |
| `@site/*`       | `src/site/*`       |
| `@server/*`     | `src/server/*`     |
| `@components/*` | `src/site/components/*` |
| `@lib/*`        | `src/lib/*`        |
| `@admin/*`      | `src/admin/*`      |
| `@layouts/*`    | `src/site/layouts/*` |

---

## Content Types

### Polymorphic Articles

The `articles` table supports three content types:

| Type | Description | Required JSON Fields |
|------|-------------|---------------------|
| `article` | Blog/editorial content | `content_json` |
| `recipe` | Structured recipes | `content_json` + `recipe_json` |
| `roundup` | Curated listicles | `content_json` + `roundup_json` |

### Content Blocks

Articles use a versioned block document in `content_json`. The container contract is documented in `docs/CONTENT_JSON_CONTRACT.md`; the block vocabulary contract is documented in `docs/CONTENT_BLOCKS_CONTRACT.md` and implemented by `src/modules/content-blocks`.

Database and JSON documentation is split by responsibility:

- `docs/DATABASE_CONTENT_MODEL.md`: tables, relationships, source fields, caches, and runtime usage.
- `docs/ARTICLE_JSON_CONTRACTS.md`: article JSON fields except `content_json`.
- `docs/ARTICLE_TABLE_CONTRACT.md`: complete `articles` table contract.
- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`: cached field contracts for `articles`.
- `docs/CONTENT_JSON_CONTRACT.md`: only the `articles.content_json` container document.
- `docs/CONTENT_BLOCKS_CONTRACT.md`: block vocabulary stored in `articles.content_json.blocks`.
- `docs/MEDIA_TABLE_CONTRACT.md`: complete `media` table contract.
- `docs/IMAGE_JSON_CONTRACT.md`: media variants, image slots, and public/private image rules.
- `docs/CATEGORIES_TABLE_CONTRACT.md`: complete `categories` table contract.
- `docs/AUTHORS_TABLE_CONTRACT.md`: complete `authors` table contract.
- `docs/TAGS_TABLE_CONTRACT.md`: complete `tags` and `articles_to_tags` contract.
- `docs/SITE_SETTINGS_TABLE_CONTRACT.md`: complete `site_settings` table contract.
- `docs/EQUIPMENT_TABLE_CONTRACT.md`: complete `equipment` table contract.
- `docs/REDIRECTS_TABLE_CONTRACT.md`: complete `redirects` table contract.

```json
{
  "version": 1,
  "kind": "content_document",
  "blocks": []
}
```

Naming rule: `docs/NAMING_CONTRACT.md` is canonical. Stored `block.type` values follow `docs/CONTENT_BLOCKS_CONTRACT.md`. Compatibility mappings for older editor names live in `docs/IMPLEMENTATION_GAPS.md`.

Source file rule: new logic uses `.ts`, React components use `.tsx`, and new `.js`/`.jsx` files should not be introduced.

| Category | Types |
|----------|-------|
| **Text** | `paragraph`, `heading`, `blockquote`, `list` |
| **Media** | `image`, `video` |
| **Callouts** | `tip_box` |
| **Layout** | `divider`, `table`, `main_recipe` |
| **Food Blog** | `before_after`, `main_faq`, `related_content`, `main_roundup` |
| **Reserved Future** | `embed`, `product_card`, `ingredient_spotlight` |
| **Reserved System/Layout** | `spacer`, `ad_slot` |

---

## 🖼️ Image System

The project features a sophisticated responsive image system:

### Breakpoints

| Variant | Width | Use Case |
|---------|-------|----------|
| `xs` | 360px | Mobile thumbnails |
| `sm` | 720px | Mobile full-width |
| `md` | 1200px | Tablet / small desktop |
| `lg` | 2048px | Full desktop / retina |
| `original` | source size | Required in `media.variants_json` for Pinterest generation; not used for normal public rendering |

### Key Features

- **WASM Encoding**: `@jsquash/webp` and `@jsquash/avif` for client-side encoding
- **Focal Point Selection**: CSS `object-position` control per image
- **Blur Placeholders**: Base64 LQIP for progressive loading
- **Storage Isolation**: `r2_key` stripped from API responses (never exposed to frontend)
- **Unified Types**: Single source of truth at `@shared/types/images.ts`

### Type Structure

```typescript
// Public types (consumer code, API responses)
import type { 
  ImageVariant,      // public/runtime shape; storage JSON uses size_bytes
  ImageVariants,     // { xs, sm, md, lg, original }
  ImageSlot,         // Full slot with media_id, alt, caption, variants
  ArticleImagesJson, // { hero?, thumbnail?, recipe_steps? }
} from '@shared/types/images';

// Storage types (media module ONLY)
import type { 
  StorageVariant,    // Extends ImageVariant with r2_key
  MediaVariantsJson, // { variants, placeholder }
} from '@shared/types/images';
```

---

## Admin Panel

The admin panel is a **React SPA** embedded in Astro at `/admin/*`.

### Key Features

- **Dashboard** - Analytics with recharts
- **Article/Recipe/Roundup Editor** - Block-based editor with @blocknote/react
- **Media Library** - Image upload with crop, responsive variant generation, focal point selection
- **Category Management** - Hierarchical taxonomy with color/icon configuration
- **Author Management** - Profile management with social links
- **Tag Management** - Inline editing with filter groups
- **Equipment Catalog** - Kitchen tools with affiliate links
- **Pinterest Integration** - Board management, pin creation, CSV export
- **Template Editor** - Canvas-based pin template designer (Konva) with draggable elements, text binding (`{{article.title}}`)
- **Site Settings** - JSON editor for global configuration
- **Homepage Builder** - Hero section customization
- **Authentication** - JWT-based login with session management

### Technology

- React 19 + React Router DOM 7
- Zustand for state management
- shadcn/ui + Radix for components
- TanStack Table for data grids
- React Konva for pin canvas
- @blocknote/react for rich content editing
- @dnd-kit for drag and drop
- Framer Motion for animations
