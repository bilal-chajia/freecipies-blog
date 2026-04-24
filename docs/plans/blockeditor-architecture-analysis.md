# Analyse Architecturale — Module BlockEditor & Ecosystème Associé

> **Date:** 2026-04-23
> **Scope:** Full Stack (Admin React Editor ↔ Backend Drizzle ↔ Frontend Astro Renderer)
> **Editor Core:** BlockNote (@blocknote/core, @blocknote/react, @blocknote/mantine)

---

## Executive Summary

**Overall Rating:** 🔴 Critical — Architecture fonctionnelle mais fortement endettée. Le module souffre d'un God Component massif, d'un mismatch de modèle de données profond entre les 3 couches (DB/Editor/Frontend), et d'une prolifération de patterns de contournement (Context Hell, JSON-string props, bidirectional conversion monolithique).

**Risques principaux:**
1. **Maintenabilité** — `index.jsx` (1225 lignes) est impossible à tester unitairement
2. **Intégrité des données** — Round-trip conversion lossy entre DB ↔ Editor sans validation
3. **Extensibilité** — Ajouter un nouveau bloc custom nécessite de toucher 6+ fichiers (bloc, schema, conversion.ts, ContentRenderer.astro, types, service)
4. **Performance** — Re-serialisation JSON complète à chaque keystroke, DOM manipulation directe dans useEffect

---

## Metrics Dashboard

| Metric | Value | Status |
|--------|-------|--------|
| Total BlockEditor Files | 48 | — |
| Lines of Code (module) | ~10 965 | — |
| God Component (index.jsx) | 1 225 lignes | 🔴 |
| Conversion File (conversion.ts) | 441 lignes | 🔴 |
| Custom Blocks | 10 | 🟡 |
| React Contexts créés | 5 (Recipe, FAQ, Roundup, RelatedContent, Selection) | 🔴 |
| JSON-string props dans blocs | 8 (variantsJson, itemsJson, recipesJson, articlesJson, roundupsJson, beforeJson, afterJson, headersJson, rowsJson) | 🔴 |
| `any` casts dans conversion.ts | 15+ | 🔴 |
| Test Coverage | 0% | 🔴 |

---

## 1. Structural Issues

### 1.1 God Component — `BlockEditor/index.jsx` (1225 lignes)

**Symptoms:**
- 20+ `useRef`, 10+ `useEffect`, 6 `useState`, `useTransition`, `useDeferredValue`
- Mélange de: initialisation éditeur, sélection de blocs, toolbar de liens, gestion du focus, drag-and-drop canvas, sync de structure (outline), sync de données roundup, DOM attribute injection, pointer event handling

**Anti-patterns détectés:**
```jsx
// Lignes 84-92 : 9 useRef pour des concerns totalement différents
const wrapperRef = useRef(null);
const canvasRef = useRef(null);
const onChangeRef = useRef(onChange);
const lastSerializedRef = useRef('');
const lastEmittedValueRef = useRef('');
const lastRoundupRef = useRef('');
const lastPointerBlockIdRef = useRef(null);
const roundupSyncRef = useRef(false);
```

**Recommandation:**
- Extraire `useEditorStateManager` — gestion de la sélection, activeBlockId, structureItems
- Extraire `useLinkToolbar` — positionnement et état du toolbar de liens
- Extraire `useCanvasDragDrop` — logique DndContext pour le canvas
- Extraire `useInsertHandle` — logique du bouton "+" entre les blocs
- Garder dans `index.jsx` uniquement: montage de l'éditeur, composition des providers, rendu JSX

---

### 1.2 Bidirectional Conversion Monolithique — `utils/conversion.ts` (441 lignes)

**Symptoms:**
- Fonction `contentJsonToBlocks` = 230 lignes de switch/case avec `as any`
- Fonction `blocksToContentJson` = 200 lignes de switch/case inverse
- Conversion à la volée sans validation de schéma
- Types dupliqués: `ContentBlock` (src/modules/articles/types) vs BlockNote `Block<any,any,any>`

**Exemple de mismatch:**
| Aspect | Format DB (Canonical) | Format Editor (BlockNote) | Problème |
|--------|----------------------|---------------------------|----------|
| Image block | `media_id: number` | `mediaId: string` | Type différent |
| Video block | `provider, videoId` | `+url: string` | Champ redondant |
| FAQ items | `items: FAQItem[]` | `items: string` (JSON) | Sérialisé en string |
| Roundup items | `items: RoundupItem[]` | `itemsJson: string` | Sérialisé en string |
| Related content | `recipes: RelatedArticleCard[]` | `recipesJson: string` | Sérialisé en string |
| Table | `headers: string[], rows: string[][]` | `headersJson, rowsJson` | Sérialisé en string |
| Before/After | `before: BeforeAfterImage` | `beforeJson: string` | Sérialisé en string |

**Recommandation:**
- **Un seul type canonique**: `ContentBlock` discriminated union (déjà défini, mais pas respecté)
- **Per-block adapter pattern**: chaque bloc définit sa propre fonction `toBlockNote()` et `fromBlockNote()`
- **Zod schemas** aux frontières (API et editor init) pour valider les deux directions
- **Supprimer les JSON-string props** — utiliser des objets natifs dans les props BlockNote (BlockNote supporte les objets/array dans propSchema via `default`)

---

### 1.3 Context Hell — 5 Contexts React pour des données liées

**Symptoms:**
- `RecipeDataContext` (défini dans `MainRecipeBlock.jsx` — couplage inversé!)
- `FAQDataContext` (défini dans `FAQSectionBlock.jsx`)
- `RoundupDataContext` (défini dans `index.jsx`)
- `RelatedContentContext` (fichier séparé)
- `BlockSelectionContext` (fichier séparé)

**Problème architectural:**
Les contexts existent pour contourner une limitation de BlockNote: les blocs custom avec `content: 'none'` ne peuvent pas facilement stocker des structures de données complexes. Mais cette approche crée:
- **Deux sources de vérité** parallèles: les props du bloc ET le context
- **Sync complexe**: `updateItems()` dans FAQSectionBlock met à jour local state, block props (via `editor.updateBlock`), ET le context
- **Couplage inversé**: MainRecipeBlock définit le context que BlockEditor consomme — le bloc enfant définit l'API pour le parent

**Exemple critique (FAQSectionBlock.jsx:308-320):**
```jsx
const updateItems = (newItems) => {
    setLocalItems(newItems);                          // Source 1: local state
    editor.updateBlock(block, {
        props: { ...block.props, items: JSON.stringify(newItems) }  // Source 2: block props
    });
    if (setFaqs) setFaqs(newItems);                   // Source 3: React Context
};
```

**Recommandation:**
- **Supprimer les contexts de données** (Recipe, FAQ, Roundup)
- **Stocker TOUTES les données dans les props BlockNote** — BlockNote v0.20+ supporte des propSchema avec des objets complexes via la configuration `propSchema`
- **Utiliser `editor.updateBlock` comme seule source de vérité**
- Pour les données trop volumineuses (recette complète), utiliser un `ref` ou un store externe (Zustand) avec une clé de référence dans le bloc, pas un Context React

---

### 1.4 Content Model Mismatch — Fullstack Pipeline

**4-Layer Analysis:**

**Layer 1: Database Schema** (`articles.schema.ts`)
```typescript
// Colonnes JSON parallèles — certains DEPRECATED mais encore utilisés
contentJson: text('content_json'),      // Blocs éditoriaux
recipeJson: text('recipe_json'),         // DONNÉES RECETTE (hors content_json!)
roundupJson: text('roundup_json'),       // DEPRECATED — mais encore en code
faqsJson: text('faqs_json'),             // DONNÉES FAQ (hors content_json!)
```

**Problème:** La recette et les FAQ existent en DEUX exemplaires:
- a) Dans `content_json` comme blocs (`mainRecipe`, `faqSection`) — positionnables dans le flux éditorial
- b) Dans `recipe_json` / `faqs_json` — pour le frontend et le service

Cette duplication crée des risques de désynchronisation majeurs.

**Layer 2: Backend Types** (`content-blocks.types.ts`)
- Types bien définis avec discriminated union `ContentBlock`
- MAIS: `FAQSectionBlock` définit `items: FAQItem[]` (type natif)
- ALORS QUE: dans l'éditeur, FAQ items sont stockés comme `string` JSON dans block props

**Layer 3: Editor Blocks**
- Chaque bloc custom utilise `propSchema` avec des strings JSON pour les tableaux/objets
- Exemple `RoundupListBlock`: `itemsJson: { default: "[]" }`
- Exemple `RelatedContentBlock`: `recipesJson`, `articlesJson`, `roundupsJson`

**Layer 4: Frontend Renderer** (`ContentRenderer.astro`)
- Rendu défensif avec multiples fallbacks:
```astro
if (block.type === "roundupList" || block.type === "roundup_list") {
    const items = typeof block.itemsJson === "string"
        ? JSON.parse(block.itemsJson)
        : block.items || [];
}
```
- Accède à la fois `block.props?.type` ET `block.type` (preuve du mismatch)

**Recommandation:**
- **Fusionner `recipeJson` et `faqsJson` dans `contentJson`** — la recette et les FAQ doivent être des blocs first-class dans le flux éditorial
- **Utiliser `ContentBlock` comme seule source de vérité** à travers toutes les couches
- **Créer un `BlockAdapter` typé par bloc** — chaque bloc sait comment se convertir de/vers `ContentBlock`

---

### 1.5 DOM Manipulation Directe dans React

**Symptoms:**
Lignes 239-270 dans `index.jsx`:
```jsx
editor.domElement.querySelectorAll('[data-id][data-block-root]').forEach((node) => {
    node.removeAttribute('data-block-root');
});
// ... puis re-injection manuelle des attributs data-block-root et data-custom-block
```

Lignes 638-840: Gestion du bouton "+" inter-blocs via `pointermove`, `getBoundingClientRect`, calculs de distance aux edges, timeout de masquage.

**Problème:**
- Cette logique devrait être dans des custom hooks ou des composants dédiés
- Mélange de React state et DOM imperative — risque de désynchronisation
- Performance: `querySelectorAll` sur chaque changement de contenu

**Recommandation:**
- `useBlockAttributes` — hook dédié à l'injection des data-attributes
- `useInsertHandle` — hook isolant toute la logique du bouton "+"
- Utiliser des `ResizeObserver` / `IntersectionObserver` plutôt que pointermove pour le positionnement

---

### 1.6 No Type Safety at Boundaries

**Symptoms:**
- `conversion.ts`: `type AnyBlock = Block<any, any, any>`
- `useSlashMenu.ts`: `editor: BlockNoteEditor<any, any, any>`
- `insert-block.ts`: `editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema> | any`
- `ContentRenderer.astro`: `Astro.props as { content?: unknown; ... }`

**Recommandation:**
- Typer le schéma BlockNote avec le generic `BlockNoteSchema`
- Utiliser Zod pour valider `ContentBlock[]` à l'entrée et à la sortie de l'API
- Générer des types TypeScript à partir du schéma Zod

---

### 1.7 Manual JSON Handling Duplication

**Symptoms:**
- `prepareJsonFields` dans `articles.service.ts` (lignes 239-258) — stringify manuel
- `parseJsonArray` / `parseJsonObject` dans `utils/json.ts`
- `JSON.stringify` / `JSON.parse` dispersés dans chaque bloc custom
- Drizzle ORM supporte nativement `json()` — mais le projet utilise `text()` + stringify manuel

**Recommandation:**
- Utiliser `drizzle-orm/sqlite-core` `json()` type pour les colonnes JSON
- Ou au minimum, créer un `JsonColumn` helper avec parse/stringify automatique
- Supprimer `prepareJsonFields` du service layer

---

## 2. Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Astro)                                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │ ContentRenderer │──│ TableBlock   │  │ RoundupItemList             │ │
│  │ .astro (465 LoC)│  │ BeforeAfter  │  │ RelatedContent              │ │
│  └─────────────────┘  └──────────────┘  └─────────────────────────────┘ │
│         ▲                                                                │
│         │ Reads `contentJson` + `recipeJson` + `faqsJson` + `roundupJson`│
├─────────┼────────────────────────────────────────────────────────────────┤
│         │                    BACKEND (Drizzle/D1)                        │
│         │  ┌─────────────────────────────────────────────────────────┐   │
│         └──│ articles.service.ts — prepareJsonFields, hydrateArticle │   │
│            └─────────────────────────────────────────────────────────┘   │
│                                    ▲                                     │
│                                    │ DB Row: contentJson, recipeJson...   │
├────────────────────────────────────┼─────────────────────────────────────┤
│                                    │         ADMIN (React)                │
│                           ┌────────┴────────┐                             │
│                           │  BlockEditor    │                             │
│                           │  index.jsx      │                             │
│                           │  (1225 LoC)     │                             │
│                           └────────┬────────┘                             │
│                    ┌───────────────┼───────────────┐                     │
│                    ▼               ▼               ▼                     │
│           ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│           │ conversion │  │ 10 Custom  │  │ 5 React    │                │
│           │ .ts (441)  │  │ Blocks     │  │ Contexts   │                │
│           └────────────┘  └────────────┘  └────────────┘                │
│                    │               │                                     │
│                    │               ▼                                     │
│                    │    RecipeBuilder, FAQSectionBlock...                │
│                    │               │                                     │
│                    │    ┌──────────┴──────────┐                          │
│                    │    │ BlockNote Core      │                          │
│                    └───▶│ @blocknote/core     │                          │
│                         └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Priority Recommendations

### 🔴 Critical (Sécurité / Intégrité des données)

1. **Replace JSON-string props with native objects**
   - `itemsJson: string` → `items: Array<...>` dans propSchema
   - Nécessite potentiellement une mise à jour de BlockNote ou un patch

2. **Eliminate dual-source data for Recipe & FAQ**
   - Soit tout dans `contentJson` (blocs positionnables), soit tout dans colonnes dédiées
   - Ne JAMAIS avoir les deux en parallèle

3. **Add Zod validation at API boundaries**
   - Valider `ContentBlock[]` côté backend avant sauvegarde
   - Valider côté frontend avant init de l'éditeur

### 🟡 High (Architecture / Maintenabilité)

4. **Extract hooks from God Component**
   - `useEditorStateManager`, `useLinkToolbar`, `useCanvasDragDrop`, `useInsertHandle`
   - Cible: `index.jsx` < 300 lignes

5. **Per-block adapter pattern**
   - Chaque bloc exporte: `blockSpec`, `toBlockNote(block)`, `fromBlockNote(block)`, `renderAstro(block)`
   - Supprimer `conversion.ts` monolithique

6. **Consolidate contexts into editor state**
   - Supprimer RecipeDataContext, FAQDataContext, RoundupDataContext
   - Stocker les données dans les blocs via `editor.updateBlock`

### 🟢 Medium (Code quality / DX)

7. **Type the BlockNote schema**
   - Remplacer tous les `any` par les generics du schéma
   - Générer `BlockNoteEditor<AppSchema>`

8. **Drizzle json() columns**
   - Remplacer `text('content_json')` par `json('content_json')`
   - Supprimer `prepareJsonFields`

9. **Test infrastructure**
   - Tests unitaires pour chaque block adapter
   - Tests de round-trip: DB → Editor → DB

---

*Document généré depuis l'analyse automatisée du module BlockEditor.*
