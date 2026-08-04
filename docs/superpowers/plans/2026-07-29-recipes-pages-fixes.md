# Recipes Pages — Correctifs des anomalies d'affichage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 7 anomalies détectées sur l'affichage public des contenus (`/recipes`, `/articles`, `/roundups`) : fuite de brouillons, sidebar "popular" mal triée, 404 servies en 302, course condition + spam sur les votes, code mort et duplication de la logique hero.

**Architecture:** Correctifs chirurgicaux sur la chaîne existante (pages Astro SSR → services Drizzle → hydratation). Aucun changement de schéma D1. Le filtre de publication est ajouté comme paramètre optionnel des services (rétro-compatible, la prévisualisation admin continue de fonctionner). Le vote devient un seul `UPDATE` SQL atomique + rate-limit KV (binding `SESSION` existant). La logique hero est factorisée dans un helper partagé testé.

**Tech Stack:** Astro 6 SSR, Drizzle ORM (D1/SQLite), Vitest, Cloudflare KV.

## Global Constraints

- `pnpm` uniquement. **Ne jamais lancer `pnpm build`** (règle AGENTS.md) — la vérification se fait via `pnpm test` et `pnpm dev`.
- TypeScript strict, **pas de `any`** dans le code nouveau.
- SQL/JSON en `snake_case`, TypeScript en `camelCase` (voir `docs/NAMING_CONTRACT.md`).
- Soft deletes : toute requête garde `deleted_at IS NULL`.
- Alias de chemins : `@modules/`, `@shared/`, `@server/`, `@site/`, `@components/`, `@layouts/`.
- Ne pas modifier les contrats `docs/`.
- Ne pas modifier la forme de la réponse de `POST /api/recipes/rate` (`{ id, ratingValue, ratingCount }`) — des clients la consomment.
- Travail sur une branche dédiée `fix/recipes-display-anomalies` (créée depuis `main` ou la branche courante, au choix de l'exécutant).
- ⚠️ Le working tree contient des modifications non commitées **sans rapport** avec ce plan (`src/site/components/content/NutritionFacts.astro`, `src/site/components/content/toc/TocHeader.astro`). Tous les `git add` du plan sont scopés par chemin — ne jamais utiliser `git add -A` / `git add .`.
- Commandes de test : `pnpm vitest run <fichier>` pour un test ciblé, `pnpm test` pour la suite complète.

## Décisions validées avec l'utilisateur

1. **Votes (anomalie #4)** : UPDATE atomique `json_set` + rate-limit par IP via KV `SESSION`. PAS de nouvelle table `recipe_votes`.
2. **Périmètre (anomalies #1 et #3)** : les 3 types de contenu (`recipes`, `articles`, `roundups`).
3. **Prévisualisation admin préservée** : `src/pages/api/preview/render.astro` utilise `getArticleBySlug` sans filtre — le filtre est donc un paramètre optionnel des services, appliqué uniquement aux call sites publics.

## Carte des fichiers

| Fichier | Action | Tâche |
|---|---|---|
| `src/shared/utils/hero-image.ts` | Create | 5 |
| `src/shared/utils/__tests__/hero-image.test.ts` | Create (test) | 5 |
| `src/shared/utils/index.ts` | Modify (export) | 5 |
| `src/modules/articles/services/articles.service.ts` | Modify (options filtre + vote atomique) | 1, 4 |
| `src/modules/articles/services/__tests__/article-by-slug.test.ts` | Create (test) | 1 |
| `src/modules/articles/services/__tests__/add-recipe-vote.test.ts` | Create (test) | 4 |
| `src/pages/recipes/index.astro` | Modify (filtre + helper hero) | 1, 5 |
| `src/pages/recipes/[slug].astro` | Modify (filtre + 404 + helper hero) | 1, 3, 5 |
| `src/pages/articles/[slug].astro` | Modify (filtre + 404 + helper hero) | 1, 3, 5 |
| `src/pages/roundups/[slug].astro` | Modify (filtre + 404 + helper hero) | 1, 3, 5 |
| `src/pages/api/recipes/[slug].ts` | Modify (filtre) | 1 |
| `src/pages/api/articles/[slug].ts` | Modify (filtre) | 1 |
| `src/pages/api/roundups/[slug].ts` | Modify (filtre) | 1 |
| `src/pages/api/articles/index.ts` | Modify (filtre) | 1 |
| `src/pages/api/recipes/rate.ts` | Modify (rate-limit KV) | 4 |
| `src/server/site-data/popular-recipes.ts` | Modify (tri + filtre) | 2 |
| `src/server/site-data/__tests__/popular-recipes.test.ts` | Create (test) | 2 |
| `src/site/components/NotFound.astro` | Create (extraction de 404.astro) | 3 |
| `src/pages/404.astro` | Modify (utilise NotFound) | 3 |
| `src/site/layouts/RecipeLayout.astro` | Modify (nettoyage + helper hero) | 5, 6 |

---

### Task 1: Filtre `workflow_status: 'published'` sur toutes les surfaces publiques

Corrige l'anomalie #1 (brouillons accessibles : listing `/recipes`, 3 pages détail, 4 endpoints API).

**Files:**
- Modify: `src/modules/articles/services/articles.service.ts:226-255` (`getArticleBySlug`) et `:450-477` (`getArticleById`)
- Test: `src/modules/articles/services/__tests__/article-by-slug.test.ts` (nouveau)
- Modify (call sites) :
  - `src/pages/recipes/index.astro:35-41`
  - `src/pages/recipes/[slug].astro:27,33`
  - `src/pages/articles/[slug].astro:22,28`
  - `src/pages/roundups/[slug].astro:24,30`
  - `src/pages/api/recipes/[slug].ts:48`
  - `src/pages/api/articles/[slug].ts:23`
  - `src/pages/api/roundups/[slug].ts:48`
  - `src/pages/api/articles/index.ts:24`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces (signatures étendues, rétro-compatibles — le 4e/3e paramètre est optionnel) :

```ts
// src/modules/articles/services/articles.service.ts
export interface PublishedFilterOptions {
  workflow_status?: string;
}
export async function getArticleBySlug(
  db: D1Database | DrizzleDb,
  slug: string,
  type?: 'recipe' | 'article' | 'roundup',
  options?: PublishedFilterOptions,
): Promise<HydratedArticle | null>
export async function getArticleById(
  db: D1Database | DrizzleDb,
  id: number,
  options?: PublishedFilterOptions,
): Promise<HydratedArticle | null>
```

- [ ] **Step 1: Créer la branche de travail**

```bash
git checkout -b fix/recipes-display-anomalies
```

- [ ] **Step 2: Write the failing test**

Créer `src/modules/articles/services/__tests__/article-by-slug.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { getArticleBySlug, getArticleById } from '../articles.service';

const dialect = new SQLiteSyncDialect();

// --- Mocks for getArticleBySlug (drizzle.query.articles.findFirst + tags chain) ---
const findFirst = vi.fn(async (_args?: unknown) => null);
const orderBy = vi.fn(async () => [] as unknown[]);
const tagsWhere = vi.fn(() => ({ orderBy }));
const innerJoin = vi.fn(() => ({ where: tagsWhere }));
const tagsFrom = vi.fn(() => ({ innerJoin }));
const select = vi.fn(() => ({ from: tagsFrom }));

vi.mock('../../../../shared/database/drizzle', () => ({
  getDb: () => ({
    query: { articles: { findFirst } },
    select,
  }),
}));

describe('getArticleBySlug workflow_status option', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not filter by workflow_status by default (admin/preview compat)', async () => {
    await getArticleBySlug({} as never, 'my-recipe', 'recipe');
    const args = findFirst.mock.calls[0][0] as { where: never };
    const { sql } = dialect.sqlToQuery(args.where);
    expect(sql).not.toContain('workflow_status');
  });

  it('adds workflow_status condition when option is passed', async () => {
    await getArticleBySlug({} as never, 'my-recipe', 'recipe', { workflow_status: 'published' });
    const args = findFirst.mock.calls[0][0] as { where: never };
    const { sql, params } = dialect.sqlToQuery(args.where);
    expect(sql).toContain('"workflow_status"');
    expect(params).toContain('published');
  });

  it('still filters slug, type and soft delete', async () => {
    await getArticleBySlug({} as never, 'my-recipe', 'recipe', { workflow_status: 'published' });
    const args = findFirst.mock.calls[0][0] as { where: never };
    const { sql, params } = dialect.sqlToQuery(args.where);
    expect(sql).toContain('"slug"');
    expect(sql).toContain('"type"');
    expect(sql).toContain('"deleted_at"');
    expect(params).toContain('my-recipe');
    expect(params).toContain('recipe');
  });
});

// --- Mocks for getArticleById (select/from/leftJoin/leftJoin/where/get chain) ---
const get = vi.fn(async () => undefined);
const idWhere = vi.fn(() => ({ get }));
const leftJoin2 = vi.fn(() => ({ where: idWhere }));
const leftJoin1 = vi.fn(() => ({ leftJoin: leftJoin2 }));
const idFrom = vi.fn(() => ({ leftJoin: leftJoin1 }));
const idSelect = vi.fn(() => ({ from: idFrom }));

describe('getArticleById workflow_status option', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-mock select for the ID chain: getDb is called per function,
    // so swap the implementation used by the module-level mock.
    select.mockImplementation(() => ({ from: idFrom }));
  });

  it('adds workflow_status condition when option is passed', async () => {
    await getArticleById({} as never, 42, { workflow_status: 'published' });
    const condition = idWhere.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(condition as never);
    expect(sql).toContain('"workflow_status"');
    expect(params).toContain('published');
  });

  it('does not filter by workflow_status by default', async () => {
    await getArticleById({} as never, 42);
    const condition = idWhere.mock.calls[0][0];
    const { sql } = dialect.sqlToQuery(condition as never);
    expect(sql).not.toContain('"workflow_status"');
  });
});
```

Note d'implémentation du test : `getDb` est mocké au niveau module ; `getArticleBySlug` consomme `query` + `select` (tags), `getArticleById` consomme `select` (chaîne ID). Le `select.mockImplementation` dans le `beforeEach` du second `describe` réoriente `select` vers la chaîne ID. Le premier `describe` doit donc rétablir `select.mockImplementation(() => ({ from: tagsFrom }))` dans son propre `beforeEach` — ajouter cette ligne si les tests s'exécutent dans l'ordre inverse.

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm vitest run src/modules/articles/services/__tests__/article-by-slug.test.ts
```

Attendu : FAIL — les conditions SQL ne contiennent pas `workflow_status` (le paramètre `options` n'existe pas encore ; TypeScript signale aussi l'argument en trop).

- [ ] **Step 4: Implement — options de filtre dans les deux services**

Dans `src/modules/articles/services/articles.service.ts`, ajouter l'interface (près de `ArticleQueryOptions`, ligne ~76) :

```ts
export interface PublishedFilterOptions {
  workflow_status?: string;
}
```

Modifier `getArticleBySlug` (lignes 226-236) :

```ts
export async function getArticleBySlug(
  db: D1Database | DrizzleDb,
  slug: string,
  type?: 'recipe' | 'article' | 'roundup',
  options?: PublishedFilterOptions
): Promise<HydratedArticle | null> {
  const drizzle = getDb(db);

  const conditions = [eq(articles.slug, slug), isNull(articles.deleted_at)];
  if (type) {
    conditions.push(eq(articles.type, type));
  }
  if (options?.workflow_status) {
    conditions.push(eq(articles.workflow_status, options.workflow_status));
  }

  const result = await drizzle.query.articles.findFirst({
    where: and(...conditions),
  });
  // ... reste inchangé
```

Modifier `getArticleById` (lignes 450-470) : ajouter le paramètre `options?: PublishedFilterOptions` et la condition :

```ts
export async function getArticleById(
  db: D1Database | DrizzleDb,
  id: number,
  options?: PublishedFilterOptions
): Promise<HydratedArticle | null> {
  const drizzle = getDb(db);

  const conditions = [eq(articles.id, id), isNull(articles.deleted_at)];
  if (options?.workflow_status) {
    conditions.push(eq(articles.workflow_status, options.workflow_status));
  }

  const result = await drizzle
    .select({
      ...getTableColumns(articles),
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      authorName: authors.name,
      authorSlug: authors.slug,
      authorImagesJson: authors.images_json,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.category_id, categories.id))
    .leftJoin(authors, eq(articles.author_id, authors.id))
    .where(and(...conditions))
    .get();
  // ... reste inchangé
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm vitest run src/modules/articles/services/__tests__/article-by-slug.test.ts
```

Attendu : PASS (5 tests).

- [ ] **Step 6: Appliquer le filtre aux 9 call sites publics**

`src/pages/recipes/index.astro` (ligne 35) — ajouter `workflow_status` :

```ts
    const result = await getArticles(env.DB, {
      type: "recipe",
      workflow_status: "published",
      categorySlug: categoryFilter || undefined,
      tagSlug: tagFilter || undefined,
      limit,
      offset,
    });
```

`src/pages/recipes/[slug].astro` :

```ts
      recipe = await getArticleById(env.DB, parseInt(slug), { workflow_status: "published" });
```
```ts
      recipe = await getArticleBySlug(env.DB, slug, "recipe", { workflow_status: "published" });
```

`src/pages/articles/[slug].astro` :

```ts
      article = await getArticleById(env.DB, parseInt(slug), { workflow_status: "published" });
```
```ts
      article = await getArticleBySlug(env.DB, slug, "article", { workflow_status: "published" });
```

`src/pages/roundups/[slug].astro` :

```ts
      roundup = await getArticleById(env.DB, parseInt(slug), { workflow_status: "published" });
```
```ts
      roundup = await getArticleBySlug(env.DB, slug, "roundup", { workflow_status: "published" });
```

`src/pages/api/recipes/[slug].ts:48` :

```ts
        const article = await getArticleBySlug(db, slug, 'recipe', { workflow_status: 'published' });
```

`src/pages/api/articles/[slug].ts:23` (appel actuel sans `type` — le conserver ainsi) :

```ts
        const article = await getArticleBySlug(db, slug, undefined, { workflow_status: 'published' });
```

`src/pages/api/roundups/[slug].ts:48` :

```ts
        const article = await getArticleBySlug(db, slug, 'roundup', { workflow_status: 'published' });
```

`src/pages/api/articles/index.ts:24` :

```ts
      const article = await getArticleBySlug(db, slug, type || undefined, { workflow_status: 'published' });
```

**Ne pas toucher** : `src/pages/api/preview/render.astro` (prévisualisation admin), `src/pages/api/views/[slug].ts`, `src/server/site-data/stories/list.ts` (le filtre d'éligibilité `isStoryEligible` existe déjà).

- [ ] **Step 7: Run full test suite + typecheck**

```bash
pnpm test
pnpm astro check
```

Attendu : tous les tests PASS, aucune erreur de type nouvelle.

- [ ] **Step 8: Commit**

```bash
git add src/modules/articles/services/articles.service.ts \
        src/modules/articles/services/__tests__/article-by-slug.test.ts \
        src/pages/recipes/index.astro "src/pages/recipes/[slug].astro" \
        "src/pages/articles/[slug].astro" "src/pages/roundups/[slug].astro" \
        "src/pages/api/recipes/[slug].ts" "src/pages/api/articles/[slug].ts" \
        "src/pages/api/roundups/[slug].ts" src/pages/api/articles/index.ts
git commit -m "fix(public): restrict public surfaces to published content"
```

---

### Task 2: Sidebar « Popular Recipes » — vrai tri par popularité + filtre published

Corrige l'anomalie #2 (la sidebar affichait les dernières recettes, pas les plus vues, sans filtre de publication).

**Files:**
- Modify: `src/server/site-data/popular-recipes.ts`
- Test: `src/server/site-data/__tests__/popular-recipes.test.ts` (nouveau)

**Interfaces:**
- Consumes: `getArticles(db, options)` avec `sortBy: 'view_count'` (déjà supporté, `articles.service.ts:90,187-191`), l'option `workflow_status` (Task 1).
- Produces: `getPopularRecipes(currentSlug, limit, options?)` — signature inchangée.

- [ ] **Step 1: Write the failing test**

Créer `src/server/site-data/__tests__/popular-recipes.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPopularRecipes } from '../popular-recipes';

const getArticles = vi.fn(async () => ({ items: [], total: 0 }));
const getCloudflareEnvMock = vi.fn((): { DB?: unknown } => ({ DB: {} }));

vi.mock('@modules/articles', () => ({
  getArticles: (...args: unknown[]) => getArticles(...args),
}));

vi.mock('@server/cloudflare/env', () => ({
  getCloudflareEnv: () => getCloudflareEnvMock(),
}));

describe('getPopularRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCloudflareEnvMock.mockReturnValue({ DB: {} });
  });

  it('queries published recipes sorted by view_count', async () => {
    await getPopularRecipes('current-slug', 5);
    expect(getArticles).toHaveBeenCalledWith(expect.anything(), {
      type: 'recipe',
      workflow_status: 'published',
      sortBy: 'view_count',
      limit: 6,
    });
  });

  it('returns [] when DB binding is missing', async () => {
    getCloudflareEnvMock.mockReturnValueOnce({});
    const result = await getPopularRecipes('x', 5);
    expect(result).toEqual([]);
    expect(getArticles).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/server/site-data/__tests__/popular-recipes.test.ts
```

Attendu : FAIL — `getArticles` reçoit actuellement `{ type: 'recipe', limit: 6 }` sans `workflow_status` ni `sortBy`.

- [ ] **Step 3: Implement**

Réécrire `src/server/site-data/popular-recipes.ts` :

```ts
import { getArticles, type HydratedArticle } from "@modules/articles";
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareEnv } from "@server/cloudflare/env";
import { presentPopularRecipes } from "./presenters";

export { presentPopularRecipes };

export const getPopularRecipes = async (
  currentSlug = "",
  limit = 5,
  options?: { db?: D1Database }
): Promise<HydratedArticle[]> => {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return [];

    const result = await getArticles(db, {
      type: "recipe",
      workflow_status: "published",
      sortBy: "view_count",
      limit: limit + 1,
    });

    return presentPopularRecipes(result.items, currentSlug, limit);
  } catch (error) {
    console.error("Error loading popular recipes:", error);
    return [];
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/server/site-data/__tests__/popular-recipes.test.ts
```

Attendu : PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/site-data/popular-recipes.ts src/server/site-data/__tests__/popular-recipes.test.ts
git commit -m "fix(sidebar): sort popular recipes by view_count, published only"
```

---

### Task 3: Vraies 404 (statut 404) et 500 sur erreur DB

Corrige l'anomalie #3 (`Astro.redirect("/404")` = 302 + erreurs DB déguisées en 404) sur les 3 pages détail. Extrait le markup 404 dans un composant réutilisable.

**Files:**
- Create: `src/site/components/NotFound.astro`
- Modify: `src/pages/404.astro`
- Modify: `src/pages/recipes/[slug].astro`, `src/pages/articles/[slug].astro`, `src/pages/roundups/[slug].astro`

**Interfaces:**
- Consumes: les options `workflow_status` de Task 1 (le code final ci-dessous les inclut).
- Produces: `<NotFound />` — composant Astro sans props, markup extrait à l'identique de `404.astro`.

- [ ] **Step 1: Créer le composant `NotFound`**

Créer `src/site/components/NotFound.astro` — copier à l'identique le contenu du `<div class="min-h-[60vh] ...">...</div>` de `src/pages/404.astro` (lignes 9-89), sans frontmatter :

```astro
<div class="min-h-[60vh] flex items-center justify-center px-4">
    <div class="text-center max-w-md">
        <!-- Illustration -->
        <div class="mb-8">
            <div class="relative inline-block">
                <span
                    class="text-[120px] font-bold text-gray-200 dark:text-gray-800 leading-none"
                    >404</span
                >
                <div
                    class="absolute inset-0 flex items-center justify-center"
                >
                    <svg
                        class="w-20 h-20 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                    </svg>
                </div>
            </div>
        </div>

        <!-- Content -->
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Page Not Found
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
            Oops! The page you're looking for doesn't exist or has been
            moved.
        </p>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a
                href="/"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Go Home
            </a>
            <a
                href="/recipes"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Browse Recipes
            </a>
        </div>
    </div>
</div>
```

Réécrire `src/pages/404.astro` :

```astro
---
import Layout from "@layouts/Layout.astro";
import NotFound from "@components/NotFound.astro";
---

<Layout
    title="Page Not Found"
    description="The page you're looking for doesn't exist."
>
    <NotFound />
</Layout>
```

- [ ] **Step 2: Réécrire `src/pages/recipes/[slug].astro`**

Contenu final complet (inclut le filtre de Task 1 ; la logique hero sera factorisée en Task 5 — conserver le bloc hero actuel tel quel pour l'instant) :

```astro
---
import { env } from 'cloudflare:workers';
import Layout from "@layouts/Layout.astro";
import RecipeLayout from "@layouts/RecipeLayout.astro";
import NotFound from "@components/NotFound.astro";
import SEO from "@components/SEO.astro";
import { getArticleBySlug, getArticleById } from "@modules/articles";
import { extractImage, getImageSrcSet } from "@shared/utils";
import { parseJsonLdArray } from "@modules/articles/utils/cached-fields";

/**
 * In SSR mode, Astro doesn't require getStaticPaths.
 * It renders pages on-demand. We get the slug from Astro.params.
 */

const { slug } = Astro.params;

if (!slug) {
  return new Response("Slug is missing", { status: 400 });
}

if (!env.DB) {
  throw new Error("Database not configured");
}

// Smart routing: support both numeric ID and slug.
// Errors are NOT swallowed: a DB failure must surface as a 500.
const isNumeric = /^\d+$/.test(slug);
let recipe = isNumeric
  ? await getArticleById(env.DB, parseInt(slug), { workflow_status: "published" })
  : await getArticleBySlug(env.DB, slug, "recipe", { workflow_status: "published" });

// Ensure numeric IDs resolve to the right content type
if (recipe && isNumeric && recipe.type !== "recipe") {
  recipe = null;
}

if (!recipe) {
  Astro.response.status = 404;
}

const author = recipe?.author;
const category = recipe?.category;

const jsonldSchemas = recipe ? parseJsonLdArray(recipe.jsonld_json) : [];

const heroSlot = extractImage(recipe?.images_json, "hero", 1200);
const heroThumb = extractImage(recipe?.images_json, "thumbnail", 1200);
const heroSlotSrcSet = getImageSrcSet(recipe?.images_json, "hero");
const thumbSrcSet = getImageSrcSet(recipe?.images_json, "thumbnail");
const useHeroSlot = heroSlot.image_url && (heroSlotSrcSet || !heroThumb.image_url);
const heroImage = useHeroSlot ? heroSlot : heroThumb;

const pageTitle = recipe?.metaTitle || recipe?.headline || "";
const pageDescription = recipe?.metaDescription || recipe?.short_description || "";
---

{
  !recipe ? (
    <Layout title="Page Not Found" description="The page you're looking for doesn't exist.">
      <NotFound />
    </Layout>
  ) : (
    <RecipeLayout recipe={recipe} author={author} category={category}>
      <SEO
        slot="head"
        title={pageTitle}
        description={pageDescription}
        image={heroImage.image_url || recipe.image_url || ""}
        imageAlt={heroImage.imageAlt || recipe.imageAlt || undefined}
        schemas={jsonldSchemas}
      />
    </RecipeLayout>
  )
}
```

- [ ] **Step 3: Réécrire `src/pages/articles/[slug].astro`**

Contenu final complet :

```astro
---
import { env } from 'cloudflare:workers';
import Layout from "@layouts/Layout.astro";
import ArticleLayout from "@layouts/ArticleLayout.astro";
import NotFound from "@components/NotFound.astro";
import SEO from "@components/SEO.astro";
import { getArticleBySlug, getArticleById } from "@modules/articles";
import { parseJsonLdArray } from "@modules/articles/utils/cached-fields";
import { extractImage, getImageSrcSet } from "@shared/utils";

const { slug } = Astro.params;

if (!slug) {
  return new Response("Slug is missing", { status: 400 });
}

if (!env.DB) {
  throw new Error("Database not configured");
}

// Smart routing: support both numeric ID and slug.
// Errors are NOT swallowed: a DB failure must surface as a 500.
const isNumeric = /^\d+$/.test(slug);
let article = isNumeric
  ? await getArticleById(env.DB, parseInt(slug), { workflow_status: "published" })
  : await getArticleBySlug(env.DB, slug, "article", { workflow_status: "published" });

if (article && isNumeric && article.type !== "article") {
  article = null;
}

if (!article) {
  Astro.response.status = 404;
}

const heroSlot = extractImage(article?.images_json, "hero", 1200);
const heroThumb = extractImage(article?.images_json, "thumbnail", 1200);
const heroSlotSrcSet = getImageSrcSet(article?.images_json, "hero");
const thumbSrcSet = getImageSrcSet(article?.images_json, "thumbnail");
const useHeroSlot = heroSlot.image_url && (heroSlotSrcSet || !heroThumb.image_url);
const heroImage = useHeroSlot ? heroSlot : heroThumb;

// Author and category are already hydrated via hydrateArticle() from cached JSON columns
const author = (article as any)?.author || null;
const category = (article as any)?.category || null;

const jsonldSchemas = article ? parseJsonLdArray(article.jsonld_json) : [];

const pageTitle = article?.metaTitle || article?.headline || "";
const pageDescription = article?.metaDescription || article?.short_description || "";
---

{
  !article ? (
    <Layout title="Page Not Found" description="The page you're looking for doesn't exist.">
      <NotFound />
    </Layout>
  ) : (
    <ArticleLayout article={article} author={author} category={category}>
      <SEO
        slot="head"
        title={pageTitle}
        description={pageDescription}
        image={heroImage.image_url || article.image_url || ""}
        imageAlt={heroImage.imageAlt || article.imageAlt || undefined}
        schemas={jsonldSchemas}
      />
    </ArticleLayout>
  )
}
```

- [ ] **Step 4: Réécrire `src/pages/roundups/[slug].astro`**

Contenu final complet (note : la règle hero des roundups était plus simple — elle sera unifiée en Task 5 ; ici on conserve le comportement actuel `heroSlot.image_url ? heroSlot : heroThumb`) :

```astro
---
import { env } from 'cloudflare:workers';
import Layout from "@layouts/Layout.astro";
import RoundupLayout from "@layouts/RoundupLayout.astro";
import NotFound from "@components/NotFound.astro";
import SEO from "@components/SEO.astro";
import { getArticleBySlug, getArticleById } from "@modules/articles";
import { extractImage } from "@shared/utils";
import { parseJsonLdArray } from "@modules/articles/utils/cached-fields";

export const prerender = false;

const { slug } = Astro.params;

if (!slug) {
  return new Response("Slug is missing", { status: 400 });
}

if (!env.DB) {
  throw new Error("Database not configured");
}

// Smart routing: support both numeric ID and slug.
// Errors are NOT swallowed: a DB failure must surface as a 500.
const isNumeric = /^\d+$/.test(slug);
let roundup = isNumeric
  ? await getArticleById(env.DB, parseInt(slug), { workflow_status: "published" })
  : await getArticleBySlug(env.DB, slug, "roundup", { workflow_status: "published" });

if (roundup && isNumeric && roundup.type !== "roundup") {
  roundup = null;
}

if (!roundup) {
  Astro.response.status = 404;
}

// Author and category are already hydrated via hydrateArticle() from cached JSON columns
const author = (roundup as any)?.author || null;
const category = (roundup as any)?.category || null;

const heroSlot = extractImage(roundup?.images_json, "hero", 1200);
const heroThumb = extractImage(roundup?.images_json, "thumbnail", 1200);
const heroImage = heroSlot.image_url ? heroSlot : heroThumb;

const pageTitle = roundup?.metaTitle || roundup?.headline || "";
const pageDescription = roundup?.metaDescription || roundup?.short_description || "";
const jsonldSchemas = roundup ? parseJsonLdArray(roundup.jsonld_json) : [];
---

{
  !roundup ? (
    <Layout title="Page Not Found" description="The page you're looking for doesn't exist.">
      <NotFound />
    </Layout>
  ) : (
    <RoundupLayout article={roundup} author={author} category={category}>
      <SEO
        slot="head"
        title={pageTitle}
        description={pageDescription}
        image={heroImage.image_url || roundup.image_url || ""}
        imageAlt={heroImage.imageAlt || roundup.imageAlt || undefined}
        schemas={jsonldSchemas}
      />
    </RoundupLayout>
  )
}
```

- [ ] **Step 5: Vérifier le rendu et le typecheck**

```bash
pnpm astro check
pnpm test
```

Attendu : aucune erreur de type nouvelle ; suite de tests PASS.

Vérification manuelle (serveur dev, nécessite D1 local) :

```bash
pnpm dev
# Dans un autre terminal :
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/recipes/slug-qui-nexiste-pas
```

Attendu : `404` (et non `302`). Une URL valide doit répondre `200`.

- [ ] **Step 6: Commit**

```bash
git add src/site/components/NotFound.astro src/pages/404.astro \
        "src/pages/recipes/[slug].astro" "src/pages/articles/[slug].astro" "src/pages/roundups/[slug].astro"
git commit -m "fix(seo): serve real 404 status on detail pages, surface DB errors as 500"
```

---

### Task 4: Vote atomique + rate-limit KV sur `POST /api/recipes/rate`

Corrige l'anomalie #4 (course condition read-modify-write + absence d'anti-spam). Un seul `UPDATE` SQL : les expressions SQLite d'un `SET` sont évaluées sur les **anciennes** valeurs de la ligne, ce qui rend le calcul de moyenne atomique sans transaction applicative.

**Files:**
- Modify: `src/modules/articles/services/articles.service.ts:803-850` (`addRecipeVote`)
- Test: `src/modules/articles/services/__tests__/add-recipe-vote.test.ts` (nouveau)
- Modify: `src/pages/api/recipes/rate.ts`

**Interfaces:**
- Consumes: binding KV `SESSION` (`Env.SESSION: KVNamespace`, `src/shared/types/env.types.ts:12`), `getCloudflareEnv()` (`src/server/cloudflare/env.ts`), `AppError`/`ErrorCodes` (`@shared/utils`).
- Produces: `addRecipeVote(db, article_id, rating)` — même signature, même retour `{ ratingValue: number; ratingCount: number } | null`. Constante `VOTE_RATE_LIMIT_TTL_SECONDS = 3600` dans `rate.ts`.

- [ ] **Step 1: Write the failing test**

Créer `src/modules/articles/services/__tests__/add-recipe-vote.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { addRecipeVote } from '../articles.service';

const dialect = new SQLiteSyncDialect();

const returning = vi.fn(async () => [
  { recipe_json: JSON.stringify({ aggregate_rating: { rating_value: 4.5, rating_count: 3 } }) },
]);
const where = vi.fn(() => ({ returning }));
const set = vi.fn(() => ({ where }));
const update = vi.fn(() => ({ set }));

vi.mock('../../../../shared/database/drizzle', () => ({
  getDb: () => ({ update }),
}));

describe('addRecipeVote (atomic)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('performs a single UPDATE with json_set expressions (no read-modify-write)', async () => {
    await addRecipeVote({} as never, 7, 5);
    expect(update).toHaveBeenCalledTimes(1);
    const setArg = set.mock.calls[0][0] as Record<string, unknown>;
    // recipe_json and cached_rating_json must be SQL expressions, not JS-computed strings
    const compiled = dialect.sqlToQuery(setArg.recipe_json as never);
    expect(compiled.sql).toContain('json_set');
    expect(compiled.sql).toContain('aggregate_rating');
  });

  it('returns the new rating parsed from the RETURNING clause', async () => {
    const result = await addRecipeVote({} as never, 7, 5);
    expect(result).toEqual({ ratingValue: 4.5, ratingCount: 3 });
  });

  it('returns null when no row matches (missing/deleted/not a recipe)', async () => {
    returning.mockResolvedValueOnce([]);
    const result = await addRecipeVote({} as never, 999, 4);
    expect(result).toBeNull();
  });

  it('restricts the UPDATE to non-deleted recipes', async () => {
    await addRecipeVote({} as never, 7, 5);
    const condition = where.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(condition as never);
    expect(sql).toContain('"deleted_at"');
    expect(sql).toContain('"type"');
    expect(params).toContain('recipe');
    expect(params).toContain(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/modules/articles/services/__tests__/add-recipe-vote.test.ts
```

Attendu : FAIL — l'implémentation actuelle fait un `drizzle.query.articles.findFirst` (absent du mock) puis deux `update`, et ne filtre pas sur `type`/`deleted_at` dans un seul UPDATE.

- [ ] **Step 3: Implement — réécriture atomique de `addRecipeVote`**

Remplacer le corps de `addRecipeVote` dans `src/modules/articles/services/articles.service.ts` :

```ts
/**
 * Add a vote to a recipe — atomic single-statement version.
 *
 * All SET expressions are evaluated against the OLD row values by SQLite,
 * so the running average is computed atomically in one UPDATE. Concurrent
 * votes serialize at the D1 write layer instead of racing in JS.
 * cached_recipe_json intentionally keeps its previous rating-free content
 * (see buildCachedRecipeJson — it does not embed aggregate_rating).
 */
export async function addRecipeVote(
  db: D1Database | DrizzleDb,
  article_id: number,
  rating: number
): Promise<{ ratingValue: number; ratingCount: number } | null> {
  const drizzle = getDb(db);

  const oldValue = sql`COALESCE(json_extract(${articles.recipe_json}, '$.aggregate_rating.rating_value'), 0)`;
  const oldCount = sql`COALESCE(json_extract(${articles.recipe_json}, '$.aggregate_rating.rating_count'), 0)`;
  const newCount = sql`(${oldCount} + 1)`;
  const newValue = sql`ROUND(((${oldValue} * ${oldCount}) + ${rating}) / (${oldCount} + 1), 1)`;

  const rows = await drizzle
    .update(articles)
    .set({
      recipe_json: sql`json_set(${articles.recipe_json},
        '$.aggregate_rating.rating_value', ${newValue},
        '$.aggregate_rating.rating_count', ${newCount}
      )`,
      cached_rating_json: sql`json_object('rating_value', ${newValue}, 'rating_count', ${newCount})`,
      updated_at: new Date().toISOString(),
    })
    .where(
      and(
        eq(articles.id, article_id),
        isNull(articles.deleted_at),
        eq(articles.type, 'recipe'),
        sql`${articles.recipe_json} IS NOT NULL`
      )
    )
    .returning({ recipe_json: articles.recipe_json });

  const updated = rows[0];
  if (!updated) return null;

  const recipe = safeParseJson<{ aggregate_rating?: { rating_value?: number; rating_count?: number } }>(
    updated.recipe_json
  );
  return {
    ratingValue: recipe?.aggregate_rating?.rating_value ?? 0,
    ratingCount: recipe?.aggregate_rating?.rating_count ?? 0,
  };
}
```

Supprimer l'import devenu inutile de `buildCachedRecipeJson`/`normalizeRecipeJson` **uniquement si** plus aucune autre fonction du fichier ne les utilise (vérifier avec grep : `buildCachedRatingJson`, `buildCachedRecipeJson`, `normalizeRecipeJson` sont aussi utilisés par `cache-builders` — ne supprimer que les imports orphelins dans `articles.service.ts`).

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/modules/articles/services/__tests__/add-recipe-vote.test.ts
```

Attendu : PASS (4 tests).

- [ ] **Step 5: Rate-limit KV dans `rate.ts`**

Réécrire `src/pages/api/recipes/rate.ts` :

```ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addRecipeVote } from '@modules/articles';
import { getCloudflareEnv } from '@server/cloudflare/env';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateBody, z } from '@shared/validation';

export const prerender = false;

/** POST /api/recipes/rate body schema */
const RateRecipeSchema = z.object({
  id: z.number().int().positive('Valid recipe ID is required'),
  rating: z.number().min(0.5, 'Rating must be at least 0.5').max(5, 'Rating must be at most 5'),
});

/** One vote per recipe per IP per hour (tunable). */
const VOTE_RATE_LIMIT_TTL_SECONDS = 3600;

/**
 * POST /api/recipes/rate
 * Submit a rating for a recipe
 *
 * Body:
 * - id: number (article ID)
 * - rating: number (0.5-5)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, rating } = await validateBody(request, RateRecipeSchema);

    const db = env.DB;
    if (!db) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    // Rate limit: 1 vote per recipe per IP per TTL window.
    // Fail-open if the KV binding is unavailable (vote still recorded).
    const kv = getCloudflareEnv().SESSION;
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const rateLimitKey = `ratelimit:recipe-vote:${id}:${ip}`;
    if (kv) {
      const existing = await kv.get(rateLimitKey);
      if (existing) {
        throw new AppError(
          ErrorCodes.INVALID_REQUEST,
          'You have already voted for this recipe recently. Please try again later.',
          429
        );
      }
    }

    const result = await addRecipeVote(db, id, rating);

    if (!result) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Recipe not found or could not be updated', 404);
    }

    if (kv) {
      await kv.put(rateLimitKey, '1', { expirationTtl: VOTE_RATE_LIMIT_TTL_SECONDS });
    }

    const { body: responseBody, status, headers } = formatSuccessResponse({
      id,
      ...result
    });

    return new Response(responseBody, { status, headers });
  } catch (error) {
    console.error('Error submitting rating:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(
            ErrorCodes.DATABASE_ERROR,
            'Failed to submit rating',
            500,
            { originalError: error instanceof Error ? error.message : 'Unknown error' }
          )
    );
    return new Response(body, { status, headers });
  }
};
```

- [ ] **Step 6: Run full test suite**

```bash
pnpm test
```

Attendu : PASS complet.

- [ ] **Step 7: Commit**

```bash
git add src/modules/articles/services/articles.service.ts \
        src/modules/articles/services/__tests__/add-recipe-vote.test.ts \
        src/pages/api/recipes/rate.ts
git commit -m "fix(ratings): atomic vote update + per-IP KV rate limit"
```

---

### Task 5: Helper partagé `resolveHeroImage` (déduplication)

Corrige l'anomalie #6 (logique hero dupliquée dans 5 fichiers, avec 2 variantes divergentes). Unifie sur la règle des pages détail : hero si présent **et** (srcset disponible **ou** pas de thumbnail), sinon thumbnail.

> **Changement de comportement assumé** : les cartes du listing (`recipes/index.astro`) et la page roundup adoptent la règle des pages recette/article. Une image hero sans variantes ne sera plus préférée à une thumbnail avec variantes.

**Files:**
- Create: `src/shared/utils/hero-image.ts`
- Test: `src/shared/utils/__tests__/hero-image.test.ts`
- Modify: `src/shared/utils/index.ts` (export)
- Modify: `src/pages/recipes/[slug].astro`, `src/pages/articles/[slug].astro`, `src/pages/roundups/[slug].astro`, `src/site/layouts/RecipeLayout.astro`, `src/pages/recipes/index.astro`

**Interfaces:**
- Consumes: `extractImage`, `getImageSrcSet`, `ExtractedImage` (`src/shared/utils/hydration.ts:39-139`).
- Produces:

```ts
// src/shared/utils/hero-image.ts
export interface ResolvedHeroImage {
  image: ExtractedImage;
  srcSet: string;
  slot: 'hero' | 'thumbnail';
}
export function resolveHeroImage(
  images_json: string | null | undefined,
  targetWidth?: number, // default 1200
): ResolvedHeroImage
```

- [ ] **Step 1: Write the failing test**

Créer `src/shared/utils/__tests__/hero-image.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { resolveHeroImage } from '../hero-image';

const withVariants = {
  hero: {
    alt: 'Hero alt',
    variants: {
      md: { url: 'https://img/hero-md.jpg', width: 800, height: 600 },
      lg: { url: 'https://img/hero-lg.jpg', width: 1200, height: 900 },
    },
  },
  thumbnail: {
    alt: 'Thumb alt',
    variants: {
      sm: { url: 'https://img/thumb-sm.jpg', width: 400, height: 300 },
    },
  },
};

describe('resolveHeroImage', () => {
  it('prefers hero when it has variants (srcset available)', () => {
    const result = resolveHeroImage(JSON.stringify(withVariants), 1200);
    expect(result.slot).toBe('hero');
    expect(result.image.image_url).toBe('https://img/hero-lg.jpg');
    expect(result.srcSet).toContain('hero-md.jpg 800w');
    expect(result.srcSet).toContain('hero-lg.jpg 1200w');
  });

  it('falls back to thumbnail when hero is missing', () => {
    const images = JSON.stringify({ thumbnail: withVariants.thumbnail });
    const result = resolveHeroImage(images, 1200);
    expect(result.slot).toBe('thumbnail');
    expect(result.image.image_url).toBe('https://img/thumb-sm.jpg');
  });

  it('uses hero without variants when no thumbnail exists', () => {
    const images = JSON.stringify({
      hero: { alt: 'h', variants: { original: { url: 'https://img/hero.jpg', width: 1200, height: 800 } } },
    });
    const result = resolveHeroImage(images, 1200);
    expect(result.slot).toBe('hero');
    expect(result.image.image_url).toBe('https://img/hero.jpg');
  });

  it('prefers thumbnail when hero has no srcset and thumbnail exists', () => {
    const images = JSON.stringify({
      hero: { alt: 'h', variants: { original: { url: 'https://img/hero.jpg', width: 1200, height: 800 } } },
      thumbnail: withVariants.thumbnail,
    });
    const result = resolveHeroImage(images, 1200);
    expect(result.slot).toBe('thumbnail');
  });

  it('returns empty image for null/invalid input', () => {
    expect(resolveHeroImage(null).image.image_url).toBeUndefined();
    expect(resolveHeroImage('not json').image.image_url).toBeUndefined();
    expect(resolveHeroImage('{}').srcSet).toBe('');
  });
});
```

Note : la variante `original` ne fait pas partie du srcset (`getSrcSet` n'émet que xs/sm/md/lg, `src/shared/types/images.ts:467-479`), d'où le cas « hero sans srcset ».

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/shared/utils/__tests__/hero-image.test.ts
```

Attendu : FAIL — module `../hero-image` introuvable.

- [ ] **Step 3: Implement le helper**

Créer `src/shared/utils/hero-image.ts` :

```ts
/**
 * Hero Image Resolution
 * =====================
 * Single source of truth for picking the display image of a content page
 * or card: prefer the `hero` slot when it exists AND (has a srcset OR no
 * thumbnail is available), otherwise fall back to `thumbnail`.
 */

import { extractImage, getImageSrcSet, type ExtractedImage } from './hydration';

export interface ResolvedHeroImage {
  image: ExtractedImage;
  srcSet: string;
  slot: 'hero' | 'thumbnail';
}

export function resolveHeroImage(
  images_json: string | null | undefined,
  targetWidth = 1200
): ResolvedHeroImage {
  const heroSlot = extractImage(images_json, 'hero', targetWidth);
  const heroThumb = extractImage(images_json, 'thumbnail', targetWidth);
  const heroSlotSrcSet = getImageSrcSet(images_json, 'hero');
  const thumbSrcSet = getImageSrcSet(images_json, 'thumbnail');
  const useHeroSlot = !!(heroSlot.image_url && (heroSlotSrcSet || !heroThumb.image_url));

  return {
    image: useHeroSlot ? heroSlot : heroThumb,
    srcSet: useHeroSlot ? heroSlotSrcSet : thumbSrcSet,
    slot: useHeroSlot ? 'hero' : 'thumbnail',
  };
}
```

Ajouter l'export dans `src/shared/utils/index.ts` (après `export * from './hydration';`) :

```ts
export * from './hero-image';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/shared/utils/__tests__/hero-image.test.ts
```

Attendu : PASS (5 tests).

- [ ] **Step 5: Adopter le helper dans les 5 fichiers**

`src/pages/recipes/[slug].astro` — remplacer le bloc hero (6 lignes) par :

```ts
import { resolveHeroImage } from "@shared/utils";
// ...
const { image: heroImage } = resolveHeroImage(recipe?.images_json, 1200);
```

(supprimer les imports `extractImage, getImageSrcSet` devenus inutiles dans ce fichier).

`src/pages/articles/[slug].astro` — même remplacement.

`src/pages/roundups/[slug].astro` — remplacer :

```ts
const heroSlot = extractImage(roundup?.images_json, "hero", 1200);
const heroThumb = extractImage(roundup?.images_json, "thumbnail", 1200);
const heroImage = heroSlot.image_url ? heroSlot : heroThumb;
```

par :

```ts
import { resolveHeroImage } from "@shared/utils";
// ...
const { image: heroImage } = resolveHeroImage(roundup?.images_json, 1200);
```

`src/site/layouts/RecipeLayout.astro` (lignes 51-57) — remplacer :

```ts
const heroSlot = extractImage(recipe.images_json, "hero", 1200);
const heroThumb = extractImage(recipe.images_json, "thumbnail", 1200);
const heroSlotSrcSet = getImageSrcSet(recipe.images_json, "hero");
const thumbSrcSet = getImageSrcSet(recipe.images_json, "thumbnail");
const useHeroSlot = heroSlot.image_url && (heroSlotSrcSet || !heroThumb.image_url);
const heroImage = useHeroSlot ? heroSlot : heroThumb;
const heroSrcSet = useHeroSlot ? heroSlotSrcSet : thumbSrcSet;
```

par :

```ts
const { image: heroImage, srcSet: heroSrcSet } = resolveHeroImage(recipe.images_json as string, 1200);
```

(ajouter `resolveHeroImage` à l'import existant depuis `@shared/utils` ligne 21 ; y laisser `extractImage`/`getImageSrcSet` — encore utilisés pour l'avatar auteur).

`src/pages/recipes/index.astro` — remplacer la fonction locale `getRecipeImage` (lignes 76-94) par un appel au helper ; le helper retourne `{ image, srcSet }`, adapter le call site ligne 263 :

```ts
// Supprimer getRecipeImage. Dans le map :
const { image: selected, srcSet } = resolveHeroImage(recipe.images_json, 400);
```

(supprimer aussi les imports `extractImage, getImageSrcSet` si inutilisés après ce retrait — vérifier).

- [ ] **Step 6: Run full test suite + typecheck**

```bash
pnpm astro check
pnpm test
```

Attendu : PASS, pas d'erreur de type.

- [ ] **Step 7: Commit**

```bash
git add src/shared/utils/hero-image.ts src/shared/utils/__tests__/hero-image.test.ts \
        src/shared/utils/index.ts "src/pages/recipes/[slug].astro" \
        "src/pages/articles/[slug].astro" "src/pages/roundups/[slug].astro" \
        src/site/layouts/RecipeLayout.astro src/pages/recipes/index.astro
git commit -m "refactor(images): unify hero image resolution in shared helper"
```

---

### Task 6: Nettoyage `RecipeLayout.astro` (import mort, CSS orphelin, truncate)

Corrige les anomalies #5 et #7.

**Files:**
- Modify: `src/site/layouts/RecipeLayout.astro`

**Interfaces:**
- Consumes: rien.
- Produces: rien (suppressions uniquement). **Vigilance** : le CSS `.meta-pill` utilisé par `RecipeCard.astro` est scopé dans ce dernier (`RecipeCard.astro:823+`) — les blocs supprimés du layout ne sont pas ceux qui stylent la carte.

- [ ] **Step 1: Vérifier qu'aucun contenu injecté n'utilise les classes supprimées**

Le `tldr` est injecté via `set:html` — s'assurer qu'aucune seed/migration n'injecte `recipe-meta-pills` ou `meta-pill` :

```bash
grep -rn "meta-pill\|recipe-meta-pills" db/ src/pages/api/preview/ 2>/dev/null
```

Attendu : aucune occurrence hors `src/site/`. Si une occurrence existe dans du contenu seed, conserver les styles correspondants et l'indiquer dans le message de commit.

- [ ] **Step 2: Supprimer l'import mort**

`src/site/layouts/RecipeLayout.astro:12` — supprimer :

```ts
import RecipeMetaPills from "../components/content/RecipeMetaPills.astro";
```

Ne pas supprimer le fichier `src/site/components/content/RecipeMetaPills.astro` (référencé dans la documentation de `recipes.types.ts` ; sa suppression relèverait d'une décision séparée).

- [ ] **Step 3: Supprimer le CSS orphelin**

Dans le `<style>` de `RecipeLayout.astro`, supprimer les deux blocs :

1. Lignes 468-506 — le bloc `/* Recipe Meta Pills */` complet (`.recipe-meta-pills`, `.meta-pill`, `.meta-pill .icon`, `.meta-pill .label`, `.meta-pill .value`).
2. Lignes 753-763 — la section `/* Fluid responsive */` qui redéfinit `.recipe-meta-pills` et `.meta-pill` :

```css
  /* Fluid responsive — no max-width media queries needed */
  .recipe-meta-pills {
    gap: clamp(var(--space-2), 1.5vw, var(--space-4));
    padding: clamp(var(--space-4), 2vw, var(--space-6)) 0;
  }

  .meta-pill {
    padding: clamp(var(--space-2), 1vw, var(--space-3)) clamp(var(--space-2), 1.5vw, var(--space-4));
    min-width: auto;
    flex: 1 1 auto;
  }
```

Conserver dans cette section fluid-responsive les règles `.content-section h2/h3` et `.ingredient-list li` (utilisées).

- [ ] **Step 4: Corriger le truncate redondant**

`src/site/layouts/RecipeLayout.astro:110` — remplacer :

```ts
  { label: truncate(recipe.headline || recipe.headline, 50) },
```

par :

```ts
  { label: truncate(String(recipe.headline ?? ""), 50) },
```

(`recipe` est typé `Record<string, unknown>` dans ce layout — le `String(...)` garde le typecheck strict sans `any`.)

- [ ] **Step 5: Vérifier**

```bash
pnpm astro check
pnpm test
```

Attendu : PASS. Vérification visuelle via `pnpm dev` sur une recette avec bloc `main_recipe` : la carte recette (pills prep/cook/difficulty) doit être inchangée (styles fournis par `RecipeCard.astro`).

- [ ] **Step 6: Commit**

```bash
git add src/site/layouts/RecipeLayout.astro
git commit -m "chore(recipe-layout): drop dead import, orphan CSS, redundant fallback"
```

---

## Vérification finale (après toutes les tâches)

```bash
pnpm test
pnpm astro check
git log --oneline main..HEAD
```

Attendu : 6 commits, suite verte, typecheck propre. La validation end-to-end sur D1 (`pnpm preview`) est laissée à l'utilisateur (nécessite un build, soumis à autorisation).
