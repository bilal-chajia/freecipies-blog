# Freecipies Project Guidelines for AI Agents

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
| `zod`              | 3.23.8  | Validation          |
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

## 🚨 Critical Rules

### Performance First

1. **No client-side hydration** on public pages unless absolutely necessary
2. **Always add `width` and `height`** to `<img>` tags to prevent CLS
3. **Use `loading="lazy"`** for below-fold images, `fetchpriority="high"` for hero images
4. **Minimize DOM size** - use global JS objects instead of data attributes for large data
5. **Target Lighthouse 90+** on all public pages

### Database (Cloudflare D1)

1. **Use Drizzle ORM** - never raw SQL unless optimizing specific queries
2. **Flat schema** - `imageUrl`, `imageWidth`, `imageHeight` directly on records, NOT nested objects
3. **Parse JSON fields** - `recipeJson` and `faqsJson` are stored as TEXT, parse with `safeParseJson()` in `db.ts`
4. **Handle nulls** - Convert `null` to `undefined` with `|| undefined` for component props

### TypeScript

1. **Strict mode** - no `any` types unless absolutely necessary
2. **Import types** from `src/types/index.ts`
3. **Use existing patterns** - check `src/lib/` for utilities before creating new ones

### Agent Behavior

1. **No browser without permission** - NEVER use browser tools to navigate websites without explicit user approval
2. **Ask before browsing** - If you need to visit a URL, ask the user first
3. **Prefer MCP over browser** - Use MCP tools to read documentation instead of opening browsers

### Research Requirements

1. **Read docs via MCP first** - Before implementing any feature using a library, use MCP tools to read its documentation
2. **Use MCP for latest features** - Always query MCP servers (shadcn, context7, etc.) to ensure using the most current API patterns and features before writing code
3. **Check existing code** - Always search the codebase for existing patterns before writing new code
4. **Verify versions** - Ensure any code examples match the versions listed in this file
5. **Reference key files** - Read `src/lib/db.ts`, `src/types/index.ts`, and `src/lib/schema.ts` before database work

---

## 📁 Project Structure

```
src/
├── components/        # Astro + React components
│   ├── admin/         # React Admin Panel (SPA)
│   └── *.astro        # Public site components
├── layouts/           # Page layouts (RecipeLayout, Layout)
├── lib/               # Utilities
│   ├── db.ts          # Database functions (getArticles, etc.)
│   ├── schema.ts      # Drizzle schema definitions
│   ├── auth.ts        # JWT authentication
│   └── error-handler.ts # Standardized API responses
├── pages/
│   ├── api/           # API routes (GET, POST, PUT, DELETE)
│   └── *.astro        # Public pages
└── types/             # TypeScript type definitions
```

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
| Database functions | `src/lib/db.ts`            |
| Type definitions   | `src/types/index.ts`       |
| Schema definitions | `src/lib/schema.ts`        |
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

| Type            | Location                | Example              |
| :-------------- | :---------------------- | :------------------- |
| Astro page      | `src/pages/`            | `about.astro`        |
| API route       | `src/pages/api/`        | `recipes.ts`         |
| Component       | `src/components/`       | `RecipeCard.astro`   |
| Admin component | `src/components/admin/` | `ImageEditor.jsx`    |
| Utility         | `src/lib/`              | `cache.ts`           |
| Type            | `src/types/`            | Append to `index.ts` |

### Naming Patterns

- **Components**: PascalCase (`RecipeCard.astro`)
- **Utilities**: camelCase (`db.ts`, `errorHandler.ts`)
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
