---
name: freecipies-admin-react
description: Best practices, architecture boundaries, routing patterns, Zustand state management, and Naming Contract compliance for the React 19 Admin Panel SPA in freecipies-blog.
---

# Freecipies Admin React SPA Skill

Use this skill when developing or modifying any part of the React 19 Admin SPA located in `src/admin/`. It enforces React Router v7 routes, Zustand stores, Tailwind CSS 4 dashboard styling, and compliance with the project's canonical contracts.

## Architecture & Folder Boundaries

All Admin SPA code is located in `src/admin/`. Never import server-only code (e.g., `cloudflare:workers`, `env.DB`, `env.IMAGES`) or Astro-only modules into this folder.

```
src/admin/
├── app/            # Admin app shell & routes.tsx
├── components/     # Shared layout/shell components only
├── features/       # Feature-specific modules containing pages/ and components/
├── hooks/          # Shared hooks
├── store/          # Zustand stores (useStore.ts)
├── styles/         # Admin dashboard-specific CSS system
├── ui/             # shadcn/ui components (Radix primitives)
├── utils/          # Admin-only utility functions
└── index.css       # Main CSS entry point for admin surface
```

### Key Import Rule
Always use path aliases defined in `tsconfig.json` for imports:
- `@admin/*` or `@/*` to point to `src/admin/*`
- `@shared/*` to point to `src/shared/*`
- Do NOT use relative imports like `../../../store/useStore`

---

## Naming Contract Compliance

You **MUST** comply with `docs/NAMING_CONTRACT.md` when communicating with the backend APIs:
1. **API Data Mapping**:
   - Backend database columns and JSON payloads use `snake_case` (e.g. `size_bytes`, `content_json`, `recipe_json`, `focal_point`).
   - Frontend variables and React component props use `camelCase` (e.g. `sizeBytes`, `contentJson`, `recipeJson`, `focalPoint`).
   - **Rule**: Map `snake_case` keys to `camelCase` when receiving data from the API. Map `camelCase` keys back to `snake_case` before submitting payloads to the API.
2. **Image Fields**:
   - Public/admin resolved image variants use `url`, not `r2_key` (which is kept server-side only).
   - Metadata must be formatted as `size_bytes` (in JSON payloads) and mapped to `sizeBytes` in local state.

---

## Routing Patterns (React Router v7)

Admin routing is managed by React Router v7 in `src/admin/app/routes.tsx`.

### 1. Lazy Loading
All feature pages are lazily loaded using `lazyPage` to ensure thin initial bundles:
```typescript
const lazyPage = <T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
): LazyExoticComponent<T> => lazy(() => importWithRetry(loader));
```

### 2. Route Configuration
- **Full Screen Routes**: Bypass the default `AdminLayout` (e.g., editors like `/templates/:slug?`). Add them to `fullScreenAdminRoutes`.
- **Layout-Bound Routes**: Render inside `AdminLayout` dashboard wrapper. Add them to `adminLayoutRoutes`.
- **Automatic Fallback**: Wildcard `*` redirects back to `/`.

---

## State Management (Zustand)

All global frontend states are centralized in `src/admin/store/useStore.ts`.

### 1. Authentication
`useAuthStore` manages authentication states and persists credentials under the key `admin-auth`:
```typescript
const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
```

### 2. UI Configuration
`useUIStore` manages dashboard layout states such as theme toggle (`light` | `dark`) and sidebar visibility:
```typescript
const { sidebarOpen, theme, toggleSidebar, toggleTheme } = useUIStore();
```

### 3. Feature Stores
Dedicated stores exist for `useArticlesStore`, `useAuthorsStore`, `useMediaStore`, `useCategoriesStore`, `useTagsStore`, `usePinterestBoardsStore`, `useHomepageStore`, and `useSettingsStore`.
- **Pagination & Filters**: Stores that handle lists must support pagination (`page`, `limit`, `total`) and filters (`search`, type/category select) with a `resetFilters()` action.

---

## Auth Error Handling
The SPA listens for a custom global authorization event:
- When any API client or service receives a `401 Unauthorized` response, it must dispatch the custom event:
  `window.dispatchEvent(new Event('auth:unauthorized'));`
- `AuthRedirectHandler` in `AdminApp.tsx` catches this event and automatically redirects the user to `/login`.

---

## Styling System

1. **Surface Isolation**:
   - The admin surface runs on `data-surface="admin"` with styles originating from `src/admin/styles/admin-theme.css`.
   - Never import public site styles (`src/site/styles/site-theme.css`) into admin files.
2. **Tailwind CSS 4**:
   - Use Tailwind utility classes for margins, paddings, flexbox, and grid layouts.
   - Prefer design tokens and semantic variables (e.g., `text-muted-foreground`, `bg-sidebar`, `border-border`) over hardcoded color values.
