# Project Architecture

> **Last Updated:** 2025-12-26
> **Framework:** Astro 5 + React 19
> **Deployment:** Cloudflare Pages + D1 + R2

---

## 🤖 AI Agent Overview

This is a **recipe/food blog SaaS** built with:

- **Astro** - Static site generation with islands architecture
- **React** - Admin panel and interactive components
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Image storage with responsive variants
- **Drizzle ORM** - Type-safe database access

---

## Tech Stack

| Layer          | Technology            | Purpose                  |
| -------------- | --------------------- | ------------------------ |
| **Framework**  | Astro 5               | SSG/SSR with islands     |
| **UI Library** | React 19              | Interactive components   |
| **Styling**    | Tailwind CSS 4        | Utility-first CSS        |
| **Components** | shadcn/ui + Radix     | Accessible UI primitives |
| **Database**   | Cloudflare D1         | Edge SQLite              |
| **ORM**        | Drizzle               | Type-safe queries        |
| **Storage**    | Cloudflare R2         | Image CDN                |
| **State**      | Zustand               | React state management   |
| **Forms**      | React Hook Form + Zod | Validation               |
| **Tables**     | TanStack Table        | Data grids               |
| **Charts**     | Recharts              | Analytics                |
| **Animation**  | Framer Motion         | UI animations            |

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
│   │   ├── articles/       # Articles domain
│   │   ├── authors/        # Authors domain
│   │   ├── categories/     # Categories domain
│   │   ├── media/          # Media/uploads domain
│   │   ├── tags/           # Tags domain
│   │   ├── pinterest/      # Pinterest integration
│   │   ├── templates/      # Pin templates
│   │   ├── settings/       # Site settings
│   │   └── auth/           # Authentication
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
| `media`      | Image library and variants    |
| `pinterest`  | Boards and pins               |
| `templates`  | Pin canvas templates + editor |
| `settings`   | Site configuration            |
| `auth`       | Admin authentication          |

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
├── media/
│   ├── index.ts          # GET (list)
│   ├── [id].ts           # GET, PUT, DELETE
│   └── upload.ts         # POST (multipart)
├── search.ts             # Full-text search
└── settings/
    └── [key].ts          # GET, PUT
```

---

## Environment Variables

```bash
# .env
CF_D1_DATABASE_ID=xxx     # D1 database binding
CF_R2_BUCKET=xxx          # R2 bucket binding
CF_AI_BINDING=xxx         # Workers AI (optional)
JWT_SECRET=xxx            # Admin auth secret
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
| `@modules/*`    | `src/modules/*`    |
| `@shared/*`     | `src/shared/*`     |
| `@components/*` | `src/components/*` |
| `@lib/*`        | `src/lib/*`        |
| `@admin/*`      | `src/admin/*`      |

---

## Admin Panel

The admin panel is a **React SPA** embedded in Astro at `/admin/*`.

### Key Features

- Article/Recipe editor with rich content blocks
- Media library with image cropping
- Pinterest pin creator with canvas editor
- Category/Author/Tag management
- Site settings editor
- Analytics dashboard

### Technology

- React 19 + React Router
- Zustand for state
- shadcn/ui + Radix for components
- TanStack Table for data grids
- React Konva for pin canvas
