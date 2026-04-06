# Project Architecture

> **Last Updated:** 2026-04-06
> **Framework:** Astro 6 + React 19
> **Deployment:** Cloudflare Pages + D1 + R2 + KV

---

## 🤖 AI Agent Overview

This is a **recipe/food blog SaaS** built with:

- **Astro 6** - SSR framework with islands architecture
- **React 19** - Admin panel and interactive components
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Image storage with responsive variants
- **Cloudflare KV** - Session storage
- **Drizzle ORM** - Type-safe database access

---

## Tech Stack

| Layer          | Technology            | Purpose                  |
| -------------- | --------------------- | ------------------------ |
| **Framework**  | Astro 6               | SSR with islands         |
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
│   │   ├── components/     # Admin UI components
│   │   ├── pages/          # Admin routes
│   │   ├── services/       # API client
│   │   ├── store/          # Zustand stores
│   │   ├── ui/             # shadcn/ui components
│   │   └── AdminApp.jsx    # Admin entrypoint
│   │
│   ├── components/         # Astro/React components
│   │   ├── ArticleCard.astro
│   │   ├── CategoryCard.astro
│   │   └── ...
│   │
│   ├── layouts/            # Page layouts
│   │   └── Layout.astro
│   │
│   ├── lib/                # Utilities
│   │   ├── api.ts          # Frontend API client
│   │   ├── drizzle.ts      # DB client factory
│   │   └── utils.ts        # Helper functions
│   │
│   ├── modules/            # Domain modules (DDD)
│   │   ├── articles/       # Articles domain (recipes, articles, roundups)
│   │   ├── authors/        # Authors domain
│   │   ├── categories/     # Categories domain
│   │   ├── tags/           # Tags domain
│   │   ├── equipment/      # Kitchen equipment with affiliate links
│   │   ├── media/          # Media/uploads domain
│   │   ├── pinterest/      # Pinterest integration
│   │   ├── templates/      # Pin templates + canvas editor
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
│   ├── shared/             # Cross-cutting concerns
│   │   ├── database/       # Schema re-exports
│   │   ├── types/          # Shared TypeScript types
│   │   └── utils/          # Shared utilities
│   │
│   └── styles/             # Global styles
│       └── global.css
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
└── wrangler.toml           # Cloudflare config
```

---

## Module Structure

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
| `templates`  | Pin canvas templates + editor |
| `settings`   | Site configuration            |
| `menus`      | Navigation menus              |
| `auth`       | Admin authentication          |
| `ai`         | Multi-provider AI generation  |

### Templates Module (Self-Contained)

The `templates` module is **fully self-contained** with UI components, stores, and API handlers:

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
├── store/
│   ├── useEditorStore.ts            # Canvas state
│   └── useUIStore.ts                # Theme state
├── components/
│   ├── canvas/                      # PinCanvas, ElementPanel, toolbars
│   │   ├── hooks/                   # useKeyboardShortcuts, etc.
│   │   └── modern/                  # TopToolbar, SidePanel, etc.
│   ├── editor/                      # TemplateEditor, TemplatesList
│   └── pins/                        # TemplateSelector
├── README.md
└── index.ts                         # Barrel export
```

**Admin imports from module:**

```javascript
import { TemplateEditor, PinCanvas, useEditorStore } from "@modules/templates";
```

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
{ images_json: '{"cover":{...}}', slug: 'recipe' }

// Hydrated
{ images: { cover: {...} }, slug: 'recipe', route: '/recipes/recipe' }
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

Environment variables are configured in `wrangler.toml` for Cloudflare bindings:

```toml
# wrangler.toml
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
| `@components/*` | `src/components/*` |
| `@lib/*`        | `src/lib/*`        |
| `@admin/*`      | `src/admin/*`      |
| `@layouts/*`    | `src/layouts/*`    |

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

Articles use a block-based JSON structure (`content_json`):

| Category | Types |
|----------|-------|
| **Text** | `paragraph`, `heading`, `blockquote`, `list` |
| **Media** | `image`, `video` |
| **Callouts** | `tip_box` |
| **Embeds** | `embed`, `recipe_card`, `product_card` |
| **Layout** | `divider`, `spacer`, `ad_slot`, `table` |
| **Food Blog** | `before_after`, `ingredient_spotlight`, `faq_section`, `related_content` |

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
| `original` | >2048px | Optional, hero images only |

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
  ImageVariant,      // { url, width, height, sizeBytes }
  ImageVariants,     // { xs, sm, md, lg, original }
  ImageSlot,         // Full slot with media_id, alt, caption, variants
  ArticleImagesJson, // { cover?, thumbnail?, pinterest?, contentImages? }
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
