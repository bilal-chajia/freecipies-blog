# Plan de Refactoring — Unification du Modèle de Contenu

**Projet**: Freecipies  
**Date**: 2026-04-22  
**Auteur**: Hermes Agent  
**Statut**: DRAFT — En attente de validation  
**Complexité estimée**: 3-4 sprints (hors migration données historiques)

---

## 1. Executive Summary

Le système utilise actuellement **deux modèles de données parallèles** pour représenter le contenu éditorial :

- **ContentBlock** (`src/modules/articles/types/content-blocks.types.ts`) : discriminated union TypeScript, utilisée par le backend et le rendu Astro.
- **BlockNote Schema** (`src/admin/components/BlockEditor/`) : schéma d'éditeur riche avec props serialisées, utilisé par l'admin React.

Cette dualité est reliée par une couche de conversion manuelle de **472 lignes** (`conversion.ts`) contenant des `as any` sur chaque ligne. Résultat :
- Pas de validation TypeScript fiable sur le contenu.
- Risque de perte de données à chaque round-trip éditeur ↔ base.
- Trois structures différentes pour un même concept (ex: `RoundupItem`).
- Données redondantes entre colonnes JSON séparées (`recipe_json`, `faqs_json`) et blocs dans `content_json`.

**Objectif** : Établir `ContentBlock` comme **unique source de vérité** et réduire la couche BlockNote à un simple **adaptateur d'affichage** (pas de stockage).

---

## 2. Architecture Actuelle (AS-IS)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ADMIN (React)                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ RecipeBuilder │    │ FAQSection   │    │  RoundupListBlock    │  │
│  │ (Context)     │    │ (Context)    │    │  (props stringifiés) │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
│         │                   │                       │               │
│  ┌──────▼───────────────────▼───────────────────────▼───────────┐  │
│  │              BlockNote Editor (Schema custom)                 │  │
│  │  customImage | video | alert | faqSection | mainRecipe ...   │  │
│  └──────┬───────────────────────────────────────────────────────┘  │
│         │ blocksToContentJson()  [472 lignes, as any everywhere]   │
│         ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  PATCH /api/articles/:id                                    │  │
│  │  Body: { contentJson: string, recipeJson: string,          │  │
│  │          faqsJson: string, roundupJson: string }            │  │
│  └────────────────────┬────────────────────────────────────────┘  │
└───────────────────────┼────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE (SQLite/D1)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  articles                                                     │  │
│  │  ─────────                                                    │  │
│  │  id                                                           │  │
│  │  content_json  ← blocs mixtes (ContentBlock + BlockNote-like) │  │
│  │  recipe_json   ← données recette (hors content_json)          │  │
│  │  faqs_json     ← données FAQ (hors content_json)              │  │
│  │  roundup_json  ← DEPRECATED mais encore présent               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────┬────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Astro SSR)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ContentRenderer.astro                                         │  │
│  │  ─────────────────────                                         │  │
│  │  • Lit content_json → rend bloc par bloc                      │  │
│  │  • Lit faqs_json séparément (ignore le bloc faq_section)      │  │
│  │  • Lit roundup_json séparément si pas de bloc roundupList     │  │
│  │  • Fallback défensif sur block.props?.X || block.X            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture Cible (TO-BE)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ADMIN (React)                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              BlockNote Editor (ADAPTER uniquement)              │  │
│  │  ┌─────────────┐  Chaque bloc = miroir d'un ContentBlock      │  │
│  │  │  Adapter    │  Props = sous-ensemble typé de ContentBlock   │  │
│  │  │  (généré)   │  PAS de données sérialisées en JSON string   │  │
│  │  └─────────────┘                                              │  │
│  └────────────────────┬──────────────────────────────────────────┘  │
│                       │ blocksToContentJson() : mapping 1:1 typé   │
│                       ▼                                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  PATCH /api/articles/:id                                      │  │
│  │  Body: { contentJson: ContentBlock[] }  ← SEUL champ          │  │
│  └────────────────────┬──────────────────────────────────────────┘  │
└───────────────────────┼────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE (SQLite/D1)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  articles                                                     │  │
│  │  ─────────                                                    │  │
│  │  id                                                           │  │
│  │  content_json  ← SEULE source de vérité (ContentBlock[])      │  │
│  │  recipe_json   ← NULL (supprimé après migration)              │  │
│  │  faqs_json     ← NULL (supprimé après migration)              │  │
│  │  roundup_json  ← NULL (supprimé après migration)              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────┬────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Astro SSR)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ContentRenderer.astro                                         │  │
│  │  ─────────────────────                                         │  │
│  │  • Parse content_json via ZodSchema                           │  │
│  │  • Rend chaque ContentBlock avec un composant dédié           │  │
│  │  • Recipe/FAQ/Roundup = blocs first-class dans content_json   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phases de Refactoring

### Phase 0 — Préparation (1 jour)

**Objectif** : Créer un environnement sûr pour refactorer sans casser la production.

| Tâche | Fichiers / Commandes | Livrable |
|-------|----------------------|----------|
| Freeze des features content | — | Commit tag `pre-content-refactor` |
| Créer backup types legacy | `src/modules/articles/types/content-blocks.legacy.ts` | Copie des types actuels |
| Activer `strict` partout | `tsconfig.json` | `noImplicitAny: true` |
| Auditer données existantes | Script SQL sur D1 | Rapport : % articles avec `recipe_json` vs `mainRecipe` bloc |

---

### Phase 1 — Fondation : Types Canoniques & Validation (3-4 jours)

**Objectif** : Définir la source de vérité typée et ajouter la validation runtime.

#### 1.1 Créer les Zod Schemas canoniques

**Nouveau fichier** : `src/modules/articles/types/content-blocks.schema.ts`

```ts
// Un Zod schema par bloc, miroir exact de l'interface TypeScript
const ParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
});

const ImageBlockSchema = z.object({
  type: z.literal('image'),
  media_id: z.number().nullable(),
  alt: z.string(),
  caption: z.string().optional(),
  credit: z.string().optional(),
  variants: ImageVariantsSchema, // ← réutilise @shared/types/images
});

// ... etc pour tous les 20+ blocs

export const ContentBlockSchema = z.discriminatedUnion('type', [
  ParagraphBlockSchema,
  HeadingBlockSchema,
  // ... tous les blocs y compris les manquants
  MainRecipeBlockSchema,
  RoundupListBlockSchema,
  RoundupItemBlockSchema,
]);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;
```

**Règle d'or** : Le Zod schema est la source de vérité. Les interfaces TypeScript sont dérivées via `z.infer`.

#### 1.2 Unifier les structures Roundup

**Fichier à modifier** : `src/modules/articles/types/roundups.types.ts`

Supprimer `RoundupItemPlaceholderBlock` (qui utilise `cover?: string | null`).  
Remplacer par une seule structure :

```ts
// Unique structure pour un item de roundup
export interface RoundupItem {
  position: number;
  article_id?: number | null;
  external_url?: string;
  title: string;
  subtitle?: string;
  note?: string;
  cover?: ImageSlot | null;  // ← toujours ImageSlot, jamais string
}
```

#### 1.3 Unifier les images dans les blocs

**Règle** : Toute référence à une image dans un bloc utilise `ImageSlot` ou `ImageVariants` (depuis `@shared/types/images`).  
Interdiction de stocker une URL string seule ou un JSON stringifié.

| Bloc | Champ avant | Champ après |
|------|-------------|-------------|
| `image` | `variants: ImageVariants` | ✅ inchangé |
| `roundup_item` | `cover?: string \| null` | `cover?: ImageSlot \| null` |
| `before_after` | `before/after: BeforeAfterImage` | ✅ inchangé |

#### 1.4 Compléter l'union `ContentBlock`

**Fichier** : `src/modules/articles/types/content-blocks.types.ts`

Ajouter les types manquants :

```ts
export interface MainRecipeBlock {
  type: 'main_recipe';
  // Pas de données internes — la recette est dans content_json comme bloc
  // Le renderer frontend détecte ce bloc et injecte le RecipeCard.astro
}

export interface RoundupListBlock {
  type: 'roundup_list';
  title?: string;
  description?: string;
  items: RoundupItem[];   // ← jamais stringifié
  show_stats?: boolean;
}

export interface RoundupItemBlock {
  type: 'roundup_item';
  article_id?: number | null;
  external_url?: string;
  title?: string;
  subtitle?: string;
  note?: string;
  cover?: ImageSlot | null;
}
```

**Livrable** : `ContentBlock` union exhaustive + Zod schema + tests unitaires de validation.

---

### Phase 2 — Blocs Spéciaux : Recipe, FAQ, Roundup (2-3 jours)

**Objectif** : Éliminer les colonnes JSON séparées en transformant ces données en blocs first-class.

#### 2.1 Modèle de données unifié

Aujourd'hui, un article recette a :
- `content_json` : les blocs de texte/media
- `recipe_json` : les ingrédients, instructions, etc.
- Parfois un bloc `mainRecipe` dans `content_json` (vide)

**Cible** :
- `content_json` contient un bloc `main_recipe` à la position voulue par l'auteur.
- Les données de la recette sont **à l'intérieur** du bloc :

```json
{
  "type": "main_recipe",
  "recipe": { /* tout le RecipeJson */ }
}
```

**Avantage** : L'auteur contrôle l'emplacement de la recette dans le flux de lecture.  
**Inconvénient** : Le bloc fait ~2-5KB de JSON. Acceptable.

#### 2.2 Plan de migration données

**Script de migration** (à exécuter sur D1) :

```sql
-- Pour chaque article de type 'recipe' avec recipe_json non null
-- Injecter un bloc main_recipe au début de content_json

UPDATE articles
SET content_json = (
  json_array(
    json_object(
      'type', 'main_recipe',
      'recipe', json(recipe_json)
    ),
    -- suivi des anciens blocs content_json
    json(content_json)
  )
)
WHERE type = 'recipe' AND recipe_json IS NOT NULL;
```

*Note : SQLite JSON functions à adapter selon la version D1.*

#### 2.3 FAQ

Même principe. Le bloc `faq_section` devient :

```json
{
  "type": "faq_section",
  "title": "...",
  "items": [
    { "q": "...", "a": "..." }
  ]
}
```

Suppression de `faqs_json`. Migration similaire.

#### 2.4 Roundup

`roundup_json` est déjà marqué DEPRECATED. Finaliser :
- Convertir tous les `roundup_json` existants en blocs `roundup_list` dans `content_json`.
- Supprimer la colonne après validation.

---

### Phase 3 — Adaptateur BlockNote (4-5 jours)

**Objectif** : Remplacer `conversion.ts` (472 lignes de `as any`) par un adaptateur typé généré.

#### 3.1 Structure cible de l'adaptateur

**Nouveau fichier** : `src/admin/components/BlockEditor/adapters/contentBlockAdapter.ts`

```ts
// Pattern : un fichier par bloc, exporte deux fonctions typées

// src/admin/components/BlockEditor/adapters/image.adapter.ts
import type { ImageBlock } from '@modules/articles/types';
import type { Block } from '@blocknote/core';

export function contentToBlockNote(block: ImageBlock): Block {
  return {
    type: 'customImage',
    props: {
      mediaId: block.media_id?.toString() ?? '',
      alt: block.alt,
      caption: block.caption ?? '',
      credit: block.credit ?? '',
      // variants : on convertit ImageVariants → props individuelles si besoin
      variantsJson: JSON.stringify(block.variants),
    },
  };
}

export function blockNoteToContent(block: Block): ImageBlock {
  // Zod validation ici
  return ContentBlockSchema.parse({
    type: 'image',
    media_id: block.props.mediaId ? parseInt(block.props.mediaId, 10) : null,
    alt: block.props.alt,
    caption: block.props.caption || undefined,
    credit: block.props.credit || undefined,
    variants: parseJsonObject(block.props.variantsJson, {}),
  });
}
```

**Architecture** :

```
src/admin/components/BlockEditor/adapters/
├── index.ts                 # export { contentToBlockNote, blockNoteToContent }
├── paragraph.adapter.ts
├── heading.adapter.ts
├── image.adapter.ts
├── video.adapter.ts
├── alert.adapter.ts          # tip_box → alert
├── faq.adapter.ts
├── mainRecipe.adapter.ts
├── roundupList.adapter.ts
├── roundupItem.adapter.ts
├── relatedContent.adapter.ts
├── beforeAfter.adapter.ts
├── table.adapter.ts
├── divider.adapter.ts
└── spacer.adapter.ts
```

#### 3.2 Supprimer les props JSON-string

| Prop BlockNote actuelle | Remplacement |
|------------------------|--------------|
| `variantsJson: string` | Gardé temporairement mais parsé/validé via Zod à la conversion |
| `itemsJson: string` | `items: RoundupItem[]` (dans le bloc BN aussi) |
| `headersJson: string` | `headers: string[]` |
| `rowsJson: string` | `rows: string[][]` |
| `beforeJson: string` | `before: BeforeAfterImage` |
| `afterJson: string` | `after: BeforeAfterImage` |
| `recipesJson: string` | `recipes: RelatedArticleCard[]` |

*Note : BlockNote supporte les arrays/objects dans propSchema depuis la v0.12+. Si limitation, wrapper dans un élément custom avec `content: 'none'`.*

#### 3.3 Gestion des Contexts React

**Supprimer** : `RecipeDataContext`, `FAQDataContext` (qui créent une source de vérité parallèle).

**Remplacer par** : Les blocs BlockNote stockent directement les données dans leurs props, qui sont sync vers `ContentBlock` via l'adaptateur.

**Fichiers à modifier** :
- `src/admin/components/BlockEditor/blocks/MainRecipeBlock.jsx`
- `src/admin/components/BlockEditor/blocks/FAQSectionBlock.jsx`
- `src/admin/pages/articles/GutenbergRecipeEditor.jsx` (retirer les Providers)

---

### Phase 4 — Backend & API (2-3 jours)

**Objectif** : Le backend ne reçoit et ne sert que du `ContentBlock[]` validé.

#### 4.1 Validation API

**Fichier** : `src/pages/api/articles.ts` (et endpoints CRUD articles)

```ts
import { ContentBlockSchema } from '@modules/articles/types/content-blocks.schema';

// Dans le handler POST/PUT
const parsed = ContentBlockSchema.array().safeParse(body.contentJson);
if (!parsed.success) {
  return formatErrorResponse(parsed.error.format(), 400);
}
```

#### 4.2 Supprimer les champs JSON séparés du schéma Drizzle

**Fichier** : `src/modules/articles/schema/articles.schema.ts`

```ts
// AVANT
recipeJson: text('recipe_json'),
roundupJson: text('roundup_json'),
faqsJson: text('faqs_json'),

// APRES
// Supprimés — tout est dans contentJson
```

**Impact** : Tous les `SELECT`/`INSERT` Drizzle doivent retirer ces colonnes.

**Fichiers à modifier** :
- `src/modules/articles/schema/articles.schema.ts`
- `src/modules/articles/services/articles.service.ts`
- `src/modules/articles/api/helpers.ts`
- `src/shared/utils/hydration.ts` (retirer `extractRecipe`, `recipeJson`)

#### 4.3 Caches dérivés

Les colonnes `cached_*` (`cachedRecipeJson`, `cachedTocJson`, etc.) sont générées à partir de `content_json`.  
**Inchangé** pour l'instant — on les garde comme dérivés mais on les recalcule depuis `content_json`.

---

### Phase 5 — Frontend Renderer (2-3 jours)

**Objectif** : `ContentRenderer.astro` lit un `ContentBlock[]` validé sans fallback défensif.

#### 5.1 Parser avec Zod

```astro
---
import { ContentBlockSchema } from '@modules/articles/types/content-blocks.schema';

const parsed = ContentBlockSchema.array().safeParse(
  typeof content === 'string' ? JSON.parse(content) : content
);

if (!parsed.success) {
  console.error('Invalid content_json:', parsed.error);
  // Rendre un message d'erreur ou fallback
}

const blocks = parsed.success ? parsed.data : [];
---
```

#### 5.2 Composant par bloc

Extraire chaque rendu de bloc en sous-composant Astro typé :

```
src/components/content-blocks/
├── ParagraphBlock.astro
├── HeadingBlock.astro
├── ImageBlock.astro
├── VideoBlock.astro
├── AlertBlock.astro        // tip_box
├── FAQBlock.astro
├── MainRecipeBlock.astro   // injecte RecipeCard.astro
├── RoundupListBlock.astro
├── RelatedContentBlock.astro
├── TableBlock.astro
├── BeforeAfterBlock.astro
├── DividerBlock.astro
└── index.ts                # map type → composant
```

**ContentRenderer.astro** devient un simple dispatcher :

```astro
---
import * as Blocks from './content-blocks';
---

<div class="content-blocks">
  {blocks.map((block) => {
    const Component = Blocks[block.type];
    return Component ? <Component {block} /> : null;
  })}
</div>
```

#### 5.3 Supprimer les fallback multi-format

Retirer les patterns comme :

```ts
// AVANT
block.url || block.props?.url
block.type === "roundupList" || block.type === "roundup_list"

// APRES
block.url
block.type === "roundup_list"
```

---

### Phase 6 — Migration des Données Historiques (1-2 jours)

**Script** : `scripts/migrate-content-json.ts`

```ts
/**
 * Migration one-shot à exécuter avant le déploiement de Phase 4.
 * Objectif : transformer tous les articles existants au nouveau format.
 */

// Pour chaque article :
// 1. Parse content_json actuel (format hybride)
// 2. Si recipe_json existe → injecte bloc main_recipe
// 3. Si faqs_json existe → injecte bloc faq_section
// 4. Si roundup_json existe → injecte bloc roundup_list
// 5. Normalise les images (convertit les cover: string en ImageSlot)
// 6. Valide avec Zod
// 7. UPDATE content_json, SET recipe_json=NULL, faqs_json=NULL, roundup_json=NULL
```

**Validation** :
- Exporter un dump avant migration.
- Comparer `article_count` avant/après.
- Vérifier que 100% des `content_json` passent `ContentBlockSchema.array().safeParse()`.

---

### Phase 7 — Nettoyage & Dépréciation (1 jour)

- Supprimer `src/admin/components/BlockEditor/utils/conversion.ts` (remplacé par adapters/)
- Supprimer `RecipeDataContext`, `FAQDataContext`
- Marquer `roundup_json`, `recipe_json`, `faqs_json` comme supprimés dans le schéma Drizzle
- Supprimer `src/modules/articles/types/content-blocks.legacy.ts`

---

## 5. Fichiers Concernés (Checklist)

### Types & Schémas
- [ ] `src/modules/articles/types/content-blocks.types.ts` — compléter union
- [ ] `src/modules/articles/types/content-blocks.schema.ts` — **NOUVEAU** (Zod)
- [ ] `src/modules/articles/types/recipes.types.ts` — conserver, utilisé par bloc main_recipe
- [ ] `src/modules/articles/types/roundups.types.ts` — unifier RoundupItem
- [ ] `src/modules/articles/schema/articles.schema.ts` — retirer colonnes JSON

### Éditeur Admin
- [ ] `src/admin/components/BlockEditor/schema.ts` — adapter types props
- [ ] `src/admin/components/BlockEditor/utils/conversion.ts` — **SUPPRIMER**
- [ ] `src/admin/components/BlockEditor/adapters/` — **NOUVEAU** (16 fichiers)
- [ ] `src/admin/components/BlockEditor/blocks/ImageBlock.jsx` — utiliser ImageSlot
- [ ] `src/admin/components/BlockEditor/blocks/VideoBlock.jsx` — normaliser url/provider
- [ ] `src/admin/components/BlockEditor/blocks/FAQSectionBlock.jsx` — supprimer Context
- [ ] `src/admin/components/BlockEditor/blocks/MainRecipeBlock.jsx` — supprimer Context
- [ ] `src/admin/components/BlockEditor/blocks/RoundupListBlock.jsx` — utiliser RoundupItem[]
- [ ] `src/admin/components/BlockEditor/blocks/BeforeAfterBlock.jsx` — normaliser structure
- [ ] `src/admin/components/BlockEditor/blocks/TableBlock.jsx` — arrays natifs
- [ ] `src/admin/components/BlockEditor/blocks/RelatedContentBlock.jsx` — arrays natifs

### Backend & API
- [ ] `src/modules/articles/services/articles.service.ts` — retirer recipe/faq/roundup JSON
- [ ] `src/modules/articles/api/helpers.ts` — validation Zod
- [ ] `src/pages/api/articles.ts` — valider contentJson
- [ ] `src/shared/utils/hydration.ts` — retirer extractRecipe, etc.

### Frontend
- [ ] `src/components/ContentRenderer.astro` — dispatcher Zod + composants
- [ ] `src/components/content-blocks/` — **NOUVEAU** (14 composants)
- [ ] `src/layouts/RecipeLayout.astro` — lire recipe depuis content_json
- [ ] `src/layouts/RoundupLayout.astro` — lire roundup depuis content_json

### Migration
- [ ] `scripts/migrate-content-json.ts` — **NOUVEAU**

---

## 6. Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Données historiques corrompues par migration | Moyenne | Critique | Dump complet avant migration. Script idempotent. Validation Zod post-migration. |
| BlockNote ne supporte pas arrays/objects dans props | Faible | Élevé | Vérifier compatibilité v0.15+. Si blocage, wrapper dans custom element avec `content: 'none'`. |
| Performance : RecipeJson dans content_json | Faible | Moyen | RecipeJson fait ~2-5KB. Contenu médian article = 15-50KB. Impact négligeable. |
| Régression éditeur admin | Moyenne | Élevé | Tests E2E sur le flux création/modification d'article. Sous-feature flag si possible. |
| Breaking change API pour intégrations tierces | Faible | Moyen | L'API publique expose déjà `content_json`. Pas de changement de contrat. |
| Migration D1 longue (timeout) | Moyenne | Moyen | Migrer par batch de 100 articles. Script exécuté hors ligne (pas dans requête HTTP). |

---

## 7. Métriques de Succès

| Métrique | Avant | Cible |
|----------|-------|-------|
| Nombre de formats parallèles | 2 (ContentBlock + BlockNote) | 1 (ContentBlock) |
| Lignes dans conversion/adaptation | 472 | ~160 (16 adapters × ~10 lignes) |
| Utilisation de `as any` | ~30+ dans conversion.ts | 0 |
| Colonnes JSON séparées | 3 (recipe, faq, roundup) | 0 |
| Structures RoundupItem | 3 | 1 |
| Validation runtime content_json | Aucune | Zod sur 100% des requêtes |
| Couverture types ContentBlock | ~75% (types manquants) | 100% |

---

## 8. Dépendances & Prérequis

1. **BlockNote version** : Vérifier que `@blocknote/core` et `@blocknote/react` supportent les objects/arrays dans `propSchema`. Si non, prévoir un spike de 1/2 journée.
2. **Zod** : Déjà présent indirectement ? Si non, ajouter au `package.json`.
3. **Tests** : Avoir au minimum 3 articles de test (article standard, recette, roundup) pour valider le round-trip.

---

## 9. Estimation Récapitulative

| Phase | Durée estimée | Fichiers créés | Fichiers modifiés |
|-------|--------------|----------------|-------------------|
| Phase 0 — Préparation | 1j | 2 | 2 |
| Phase 1 — Types & Zod | 3-4j | 1 | 4 |
| Phase 2 — Blocs spéciaux | 2-3j | 1 | 6 |
| Phase 3 — Adaptateur BN | 4-5j | 16 | 12 |
| Phase 4 — Backend/API | 2-3j | 0 | 6 |
| Phase 5 — Frontend | 2-3j | 14 | 4 |
| Phase 6 — Migration données | 1-2j | 1 | 0 |
| Phase 7 — Nettoyage | 1j | 0 | 8 |
| **TOTAL** | **16-22 jours** | **35** | **42** |

*Estimation pour un développeur senior à plein temps. Réduisable à 10-12 jours avec 2 développeurs (un sur types/backend, un sur éditeur/frontend).*

---

## 10. Prochaines Actions Immédiates

1. [ ] **Valider ce plan** avec l'équipe / le décideur.
2. [ ] **Créer la branche Git** `refactor/content-model-unification`.
3. [ ] **Exécuter Phase 0** (freeze, backup, audit données).
4. [ ] **Spike technique** : vérifier support arrays dans BlockNote propSchema.
5. [ ] **Commencer Phase 1** si spike OK.

---

*Document généré automatiquement par Hermes Agent. Dernière mise à jour : 2026-04-22.*
