# Freecipies Project Guidelines for AI Agents

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads) for issue tracking. Use bd commands instead of markdown TODOs. See AGENTS.md for workflow details.

> **Read this file before making any code changes.**

## Project Overview

### Core Stack

| Technology      | Version | Purpose        |
| :-------------- | :------ | :------------- |
| **Astro**       | 5.16.4  | SSR Framework  |
| **React**       | 18.3.1  | Admin Panel UI |
| **TailwindCSS** | 4.0.0   | Styling        |
| **TypeScript**  | 5.7.3   | Type Safety    |
| **Drizzle ORM** | 0.45.1  | Database ORM   |

### Cloudflare Stack

| Service     | Package                           | Purpose         |
| :---------- | :-------------------------------- | :-------------- |
| **D1**      | via `@astrojs/cloudflare` 12.6.12 | SQLite Database |
| **R2**      | via Wrangler 4.43.0               | Object Storage  |
| **Workers** | via Wrangler                      | Edge Runtime    |

### Key Dependencies

| Package            | Version | Purpose             |
| :----------------- | :------ | :------------------ |
| `react-router-dom` | 6.27.0  | Admin SPA Routing   |
| `zustand`          | 5.0.0   | State Management    |
| `jose`             | 5.9.6   | JWT Auth            |
| `react-hook-form`  | 7.53.0  | Form Management     |
| `react-easy-crop`  | 5.5.6   | Image Cropping      |
| `recharts`         | 2.13.0  | Analytics Charts    |
| `@radix-ui/*`      | 1.x-2.x | UI Primitives       |
| `lucide-react`     | 0.454.0 | Icons               |
| `sonner`           | 1.5.0   | Toast Notifications |

### Dev Dependencies

| Package       | Version | Purpose        |
| :------------ | :------ | :------------- |
| `drizzle-kit` | 0.31.8  | DB Migrations  |
| `wrangler`    | 4.43.0  | Cloudflare CLI |

- **Package Manager**: `pnpm` (NOT npm)
- **Rendering**: SSR for public pages, CSR for Admin Panel

---

## � Current Project State

### Image Upload Module (Recently Refactored)

**Location**: `src/admin/components/ImageUploader/`

| File                      | Purpose                                               |
| :------------------------ | :---------------------------------------------------- |
| `index.jsx`               | Single-step upload dialog with crop + metadata        |
| `config.js`               | Centralized constants (sizes, quality, aspect ratios) |
| `errors.js`               | Custom error types with user-friendly messages        |
| `DropZone.jsx`            | Drag & drop with particle effects                     |
| `VariantProgress.jsx`     | Visual upload progress with variant cards             |
| `CropEditor.jsx`          | Standalone crop editor (imports from config)          |
| `hooks/useImageUpload.js` | Upload logic with retry and parallel uploads          |

**Key Features**:

- WebP/AVIF encoding via `@jsquash/webp` and `@jsquash/avif`
- Parallel variant uploads (lg, md, sm, xs) with concurrency limit
- Retry mechanism with exponential backoff
- Memory management for canvas/blob URLs
- Focal point selection for responsive images

### Utility Files

| File                                | Purpose                                |
| :---------------------------------- | :------------------------------------- |
| `src/admin/utils/retry.js`          | Generic retry with exponential backoff |
| `src/admin/utils/fileValidation.js` | File/URL validation utilities          |
| `src/admin/utils/urlHelpers.js`     | Safe object URL management             |

### Known Issues (Fixed)

- ✅ Infinite loop in focal point measurement (throttled, dependencies fixed)
- ✅ Duplicate upload dialogs (old inline dialog removed)
- ✅ Duplicate ASPECT_RATIOS constants (consolidated in config.js)

---

## �🚨 Critical Rules

### Performance First

1. **No client-side hydration** on public pages unless absolutely necessary
2. **Always add `width` and `height`** to `<img>` tags to prevent CLS
3. **Use `loading="lazy"`** for below-fold images, `fetchpriority="high"` for hero images
4. **Minimize DOM size** - use global JS objects instead of data attributes for large data
5. **Target Lighthouse 90+** on all public pages

### Database (Cloudflare D1)

1. **Use Drizzle ORM** - never raw SQL unless optimizing specific queries
2. **Flat schema** - `imageUrl`, `imageWidth`, `imageHeight` directly on records, NOT nested objects
3. **Parse JSON fields** - `recipeJson` and `faqsJson` are stored as TEXT, parse with `safeParseJson()` in `src/shared/utils/hydration.ts`
4. **Handle nulls** - Convert `null` to `undefined` with `|| undefined` for component props

### TypeScript

1. **Strict mode** - no `any` types unless absolutely necessary
2. **Import types** from `src/shared/types/index.ts`
3. **Use existing patterns** - check `src/lib/` for utilities before creating new ones

### Agent Behavior

1. **No browser without permission** - NEVER use browser tools to navigate websites without explicit user approval
2. **Ask before browsing** - If you need to visit a URL, ask the user first
3. **Prefer MCP over browser** - Use MCP tools to read documentation instead of opening browsers
4. **NO automatic builds** - Do NOT run `pnpm build` automatically. User will run builds manually. Only run `pnpm dev` as needed.

### Research Requirements

1. **Read docs via MCP first** - Before implementing any feature using a library, use MCP tools to read its documentation
2. **Use MCP for latest features** - Always query MCP servers (shadcn, context7, etc.) to ensure using the most current API patterns and features before writing code
3. **Check existing code** - Always search the codebase for existing patterns before writing new code
4. **Verify versions** - Ensure any code examples match the versions listed in this file
5. **Reference key files** - Read `src/shared/database/drizzle.ts`, `src/shared/types/index.ts`, and `src/shared/database/schema.ts` before database work

---

## 📁 Project Structure

```
src/
├── modules/           # Feature-based modules (NEW)
│   ├── media/         # Media/Images module
│   │   ├── api/       # API route handlers
│   │   ├── services/  # r2.service.ts, media.service.ts
│   │   ├── schema/    # Drizzle schema
│   │   └── types/     # TypeScript types
│   ├── articles/      # Articles module
│   ├── categories/    # Categories module
│   ├── authors/       # Authors module
│   ├── tags/          # Tags module
│   ├── auth/          # Authentication module
│   ├── pinterest/     # Pinterest integration
│   ├── templates/     # Pin templates
│   └── settings/      # Site settings
├── shared/            # Shared utilities (NEW)
│   ├── database/      # drizzle.ts, schema.ts
│   ├── utils/         # error-handler.ts, logging.ts, cache.ts
│   └── types/         # Env types
├── admin/             # React Admin Panel (MOVED from components/admin)
│   ├── components/    # React components
│   ├── pages/         # Admin pages
│   ├── services/      # API client (api.js)
│   ├── store/         # Zustand stores
│   └── ui/            # shadcn components
├── components/        # Public site Astro components
│   └── *.astro        # Header, Footer, Cards, etc.
├── layouts/           # Page layouts (RecipeLayout, Layout)
├── lib/               # Legacy utilities (being migrated to modules)
│   ├── drizzle.ts     # Drizzle helpers (re-export)
│   ├── api.ts         # API fetch helpers
│   ├── auth.ts        # JWT authentication
│   └── error-handler.ts # Standardized API responses
├── pages/
│   ├── api/           # API routes (delegates to modules)
│   └── *.astro        # Public pages
└── types/             # TypeScript type definitions
```

### Path Aliases (tsconfig.json)

| Alias           | Path               | Usage               |
| :-------------- | :----------------- | :------------------ |
| `@/*`           | `src/admin/*`      | Admin panel imports |
| `@modules/*`    | `src/modules/*`    | Module imports      |
| `@admin/*`      | `src/admin/*`      | Admin panel         |
| `@shared/*`     | `src/shared/*`     | Shared utilities    |
| `@components/*` | `src/components/*` | Astro components    |
| `@lib/*`        | `src/lib/*`        | Legacy utilities    |

---

## ✅ Coding Patterns to Follow

### API Endpoints

```typescript
// Always use standardized responses
import {
  formatSuccessResponse,
  formatErrorResponse,
  AppError,
  ErrorCodes,
} from "../../lib/error-handler";

export const GET: APIRoute = async ({ locals }) => {
  try {
    const env = locals.runtime.env as Env;
    const data = await getArticles(env.DB, { limit: 10 });
    const { body, status, headers } = formatSuccessResponse(data);
    return new Response(body, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, "Failed", 500)
    );
    return new Response(body, { status, headers });
  }
};

// Smart Routing Pattern (for [slug].ts that handles IDs too)
const { slug } = params;
const isNumeric = /^\d+$/.test(slug);
const item = isNumeric 
  ? await getById(db, parseInt(slug)) 
  : await getBySlug(db, slug);
```

### Image Rendering

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

### Null Handling

```typescript
// CORRECT: Convert null to undefined for optional props
recipeDetails = recipe.recipeJson || undefined;
publishedTime={recipe.publishedAt || undefined}

// WRONG: Passing null when undefined expected
recipeDetails = recipe.recipeJson; // may be null
```

---

## ❌ Anti-Patterns to Avoid

1. **Don't use `client:load`** on heavy components - use `client:visible` or `client:idle`
2. **Don't embed large data in HTML attributes** - use `<script>` with global objects
3. **Don't create new utility files** without checking if one exists in `src/lib/`
4. **Don't use `localStorage`** for anything critical - Cloudflare edge has no access
5. **Don't hardcode colors** - use CSS variables or Tailwind classes

---

## 🧪 Before Completing Any Task

1. **Run `pnpm build`** - ensure no TypeScript errors
2. **Check image dimensions** - all images must have width/height
3. **Verify API responses** - use standardized error format
4. **Update Beads** - `bd close <id>` and `bd sync`

---

## 📚 Key Files to Reference

| Purpose            | File                       |
| :----------------- | :------------------------- |
| Database functions | `src/shared/database/drizzle.ts`            |
| Type definitions   | `src/shared/types/index.ts`       |
| Schema definitions | `src/shared/database/schema.ts`        |
| Error handling     | `src/lib/error-handler.ts` |
| Auth utilities     | `src/lib/auth.ts`          |

---

## 🔀 Git & Commit Conventions

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

## 🧪 Testing Requirements

1. **Run build before committing**: `pnpm build`
2. **Test API changes**: Use `pnpm preview` to test with real D1/R2 bindings
3. **Manual verification**: Check affected pages in browser after changes
4. **Future**: When Vitest is added, run `pnpm test` before all commits

---

## 🔐 Security Guidelines

### NEVER Do

- ❌ Commit `.env` files or secrets
- ❌ Log sensitive data (tokens, passwords, emails)
- ❌ Expose internal error messages to users
- ❌ Use `eval()` or dynamic code execution
- ❌ Trust user input without validation

### Environment Variables

| Variable     | Purpose             | Location           |
| :----------- | :------------------ | :----------------- |
| `JWT_SECRET` | Auth token signing  | Cloudflare Secrets |
| `DB`         | D1 Database binding | wrangler.toml      |
| `R2_BUCKET`  | R2 Storage binding  | wrangler.toml      |

### Secrets Access

```typescript
// CORRECT: Access via env
const secret = env.JWT_SECRET;

// WRONG: Hardcoded
const secret = "my-secret-key"; // NEVER DO THIS
```

---

## 💬 Communication & Decision Making

### When to ASK the User

- Before deleting files or data
- Before making breaking API changes
- Before adding new dependencies
- When requirements are ambiguous
- Before using browser tools

### When to PROCEED Without Asking

- Fixing obvious TypeScript errors
- Following established patterns
- Adding missing image dimensions
- Formatting/linting fixes
- Implementing clearly defined tasks

### Response Style

- Be concise, not verbose
- Show code diffs, not full files
- Summarize what was done
- Flag any concerns or trade-offs

---

## 📂 File & Naming Conventions

### New Files Location

| Type            | Location                        | Example                 |
| :-------------- | :------------------------------ | :---------------------- |
| Astro page      | `src/pages/`                    | `about.astro`           |
| API route       | `src/modules/*/api/`            | `media/api/upload.ts`   |
| Module service  | `src/modules/*/services/`       | `media/services/r2.ts`  |
| Module schema   | `src/modules/*/schema/`         | `media/schema/media.ts` |
| Astro component | `src/components/`               | `RecipeCard.astro`      |
| Admin component | `src/admin/components/`         | `ImageEditor.jsx`       |
| Admin page      | `src/admin/pages/`              | `Dashboard.jsx`         |
| Shared utility  | `src/shared/utils/`             | `error-handler.ts`      |
| Type            | `src/types/` or module `types/` | `index.ts`              |

### Naming Patterns

- **Components**: PascalCase (`RecipeCard.astro`)
- **Utilities**: camelCase (`drizzle.ts`, `errorHandler.ts`)
- **API routes**: kebab-case for folders (`/api/pinterest-boards/`)
- **CSS classes**: kebab-case via Tailwind

---

## 🚀 Deployment Awareness

### Commands

| Command        | Purpose                                 |
| :------------- | :-------------------------------------- |
| `pnpm dev`     | Local dev server (no D1/R2)             |
| `pnpm build`   | Production build                        |
| `pnpm preview` | Full Cloudflare simulation (D1/R2 work) |

### Production Considerations

1. **Always test with `pnpm preview`** before considering work done
2. **D1 is SQLite** - no PostGres features
3. **Edge has no filesystem** - `fs` module won't work in production
4. **R2 URLs must be public** or use signed URLs

### wrangler.toml Bindings

```toml
[[d1_databases]]
binding = "DB"
database_name = "recipes-saas-db"
database_id = "..."

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "recipes-saas-images"
```

---

## ✅ Pre-Commit Checklist

Before marking any task complete:

- [ ] `pnpm build` passes with no errors
- [ ] All images have `width` and `height` attributes
- [ ] API responses use `formatSuccessResponse`/`formatErrorResponse`
- [ ] No `any` types unless documented reason
- [ ] No hardcoded secrets or sensitive data
- [ ] Commit message follows convention
- [ ] Beads issue updated (`bd close <id>` if done)


