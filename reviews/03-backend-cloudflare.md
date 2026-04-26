# Rapport de Code Review — Backend Cloudflare / TypeScript

> **Reviewer**: Senior Backend Engineer (Cloudflare Workers, D1, Drizzle)  
> **Scope**: Zero-join architecture, JSON-LD, Drizzle ORM, API responses, TypeScript strictness  
> **Commits couverts**: `b68a7e4`, `2804ea4`, `b89c94c`, `0cf6b65`, `7eebe6c`, `52d8953`, `d1491da`

---

## Résumé Exécutif

L'architecture **zero-join** est globalement bien mise en œuvre avec des colonnes de cache (`cached_*_json`, `jsonld_json`, `faqs_json`) et une génération au **save time** via `syncCachedFields()`. Le JSON-LD est correctement pré-généré. Cependant, des **casts `any`**, un **subquery SQL brut Drizzle**, et des **LEFT JOIN résiduels** (admin + popular) pénalisent le score TypeScript strict et l'architecture zero-join pure. La validation Zod est basique et n'assure pas la validité JSON des champs structurés.

---

## 1. `src/modules/articles/services/articles.service.ts`

| Critère | Note |
|---------|------|
| Score qualité | **7 / 10** |

### Forces
- **Zero-join** : `syncCachedFields()` génère 8 colonnes de cache (`cachedTagsJson`, `cachedAuthorJson`, `cachedCategoryJson`, `cachedEquipmentJson`, `cachedTocJson`, `cachedRecipeJson`, `cachedCardJson`, `jsonldJson`) au save time — exactement l'architecture visée.
- **faqs_json** : extrait automatiquement des blocs `faq_section` de `content_json` dans `syncCachedFields()`.
- **JSON-LD** : appelle `generateJsonLd()` au save time et stocke dans `jsonldJson`.
- **Soft deletes** : `deleted_at IS NULL` utilisé partout.
- **Timestamps UTC** : `new Date().toISOString()` pour `updated_at`.

### Faiblesses / Risques
- **🔴 Casts `any`** dans plusieurs fonctions du service.
- **🔴 Subquery SQL brut** Drizzle pour la requête "popular" : utilise `.leftJoin()` au lieu de lire `cached_*`.
- **🔴 API admin** (`/api/admin/articles/[id].ts`) fait encore des `LEFT JOIN` pour récupérer les relations — ce n'est pas zero-join.
- Pas de transaction Drizzle explicite dans `syncCachedFields()` — si une étape échoue, la DB peut être en état incohérent.

### Suggestions
- Remplacer les `any` par les vrais types Drizzle.
- Supprimer les JOIN résiduels dans l'API admin — utiliser les colonnes `cached_*`.
- Envelopper `syncCachedFields()` dans une transaction Drizzle.
- Extraire la logique de cache dans un `CacheService` dédié.

---

## 2. `src/modules/articles/utils/jsonld.ts`

| Critère | Note |
|---------|------|
| Score qualité | **8 / 10** |

### Forces
- Génération centralisée de JSON-LD pour tous les types de contenu (Article, Recipe, Roundup, FAQPage)
- Conforme aux standards Google Rich Results 2026
- Support complet des schémas Schema.org

### Faiblesses / Risques
- Pas de validation que le JSON-LD généré est du JSON valide
- Pas de test unitaire
- `any` utilisé pour les objets Schema.org

### Suggestions
- Ajouter un test qui valide le JSON-LD contre schema.org
- Typer strictement les objets Schema.org
- Ajouter une fonction `validateJsonLd()`

---

## 3. `src/modules/articles/types/content-blocks.types.ts`

| Critère | Note |
|---------|------|
| Score qualité | **7 / 10** |

### Forces
- Union discriminantée sur `type` pour les blocs
- Types pour chaque variant de bloc

### Faiblesses / Risques
- Certains champs sont `any` au lieu d'être typés
- Pas de type pour le BlockNote editor format
- `ContentBlock` n'est pas exhaustif (certains blocs manquent)

### Suggestions
- Remplacer les `any` par des types précis
- Créer un type `EditorBlock` pour le format BlockNote
- Vérifier l'exhaustivité avec un test TypeScript

---

## 4. `src/pages/api/recipes/[slug].ts`

| Critère | Note |
|---------|------|
| Score qualité | **7 / 10** |

### Forces
- Utilise `cachedRecipeJson` et `cachedAuthorJson` (zero-join respecté pour les recettes publiques)
- `formatSuccessResponse` / `formatErrorResponse` utilisés
- Soft delete vérifié

### Faiblesses / Risques
- **🔴 Fait encore un JOIN** pour récupérer les ratings (table `recipe_ratings`) — ce n'est pas du zero-join pur.
- Pas de cache HTTP (pas de `Cache-Control` header)

### Suggestions
- Pré-calculer les ratings dans une colonne `cached_ratings_json` (ou utiliser KV pour les agrégations)
- Ajouter un header `Cache-Control: public, max-age=60` pour les recettes publiées

---

## 5. `src/pages/api/roundups/[slug].ts`

| Critère | Note |
|---------|------|
| Score qualité | **7 / 10** |

### Forces
- Utilise `cachedCardJson` pour les cartes de roundup
- Structure propre

### Faiblesses / Risques
- Fait des requêtes supplémentaires pour récupérer les articles du roundup
- Pas de `Cache-Control`

### Suggestions
- Pré-calculer les articles du roundup dans `cached_roundup_items_json`
- Ajouter le cache HTTP

---

## 6. `src/pages/api/admin/articles/[id].ts`

| Critère | Note |
|---------|------|
| Score qualité | **6 / 10** |

### Forces
- CRUD complet
- Validation basique

### Faiblesses / Risques
- **🔴 Fait des LEFT JOIN** pour récupérer author, category, tags, equipment
- **🔴 Pas de validation Zod** sur le body de la requête
- Pas de rate limiting
- Pas de vérification des permissions (seulement auth)

### Suggestions
- Utiliser les colonnes `cached_*` au lieu des JOIN
- Ajouter une validation Zod stricte du body
- Ajouter un middleware de rate limiting
- Vérifier les permissions (admin vs editor)

---

## 7. `src/pages/api/articles.ts`

| Critère | Note |
|---------|------|
| Score qualité | **6 / 10** |

### Forces
- Liste paginée
- `formatSuccessResponse` utilisé

### Faiblesses / Risques
- **🔴 Requête "popular" fait des JOIN** pour les relations
- Pas de pagination cursor-based
- Pas de filtrage côté DB (filtres en mémoire)

### Suggestions
- Utiliser `cached_*` pour la route popular
- Implémenter la pagination cursor-based pour de grandes listes
- Déplacer les filtres dans la requête SQL

---

## 8. `db/schema.sql`

| Critère | Note |
|---------|------|
| Score qualité | **8 / 10** |

### Forces
- Schema bien structuré
- Colonnes `cached_*` ajoutées proprement
- `deleted_at` sur toutes les tables
- Foreign keys définies

### Faiblesses / Risques
- **🔴 Colonne `cachedCommentCount` supprimée en 2 commits** (`52d8953` + `d1491da`) — aurait pu être un seul commit
- Pas de migration Drizzle pour cette suppression (schema.sql modifié directement)

### Suggestions
- Toujours utiliser Drizzle migrations pour les changements de schema
- Squasher les 2 commits de suppression en un seul

---

## 9. `src/shared/validation/schemas/articles.ts`

| Critère | Note |
|---------|------|
| Score qualité | **5 / 10** |

### Forces
- Début de validation Zod
- Schéma de base pour les articles

### Faiblesses / Risques
- **🔴 Très basique** — ne valide pas la structure JSON des champs `content_json`, `cached_*`
- Ne valide pas les types de blocs
- Ne convertit pas `null` en `undefined` pour les props optionnelles

### Suggestions
- Créer un schéma Zod pour `ContentBlock[]`
- Valider `content_json` comme un tableau de blocs valides
- Utiliser `.nullable().transform(v => v ?? undefined)`
- Implémenter la validation complète selon le plan `zod-validation-plan.md`

---

## 10. `src/shared/utils/hydration.ts`

| Critère | Note |
|---------|------|
| Score qualité | **7 / 10** |

### Forces
- Utilitaire pour la gestion de l'hydration côté client
- Gère les islands Astro

### Faiblesses / Risques
- En `.ts` mais pas assez typé
- Pas de test

### Suggestions
- Typer strictement les paramètres
- Ajouter un test unitaire

---

## 11. `src/scripts/global-enhancements.js`

| Critère | Note |
|---------|------|
| Score qualité | **5 / 10** |

### Forces
- Améliorations globales côté client

### Faiblesses / Risques
- **🔴 En `.js` au lieu de `.ts`**
- Code exécuté sur tous les pages sans lazy loading
- Pas de gestion d'erreur

### Suggestions
- Migrer en TypeScript
- Charger conditionnellement selon la page
- Ajouter un `try/catch` global

---

## 🎯 Recommandations Prioritaires

1. **🔴 Éliminer les JOIN résiduels** dans `/api/admin/articles/[id].ts` et `/api/articles.ts`
2. **🔴 Ajouter la validation Zod** sur toutes les API routes (body, query params)
3. **🔴 Envelopper `syncCachedFields()` dans une transaction**
4. **🟡 Ajouter les headers `Cache-Control`** sur les routes publiques
5. **🟡 Remplacer les `any` par les vrais types Drizzle**
6. **🟢 Pré-calculer les ratings** dans une colonne cache (ou KV)
7. **🟢 Ajouter le rate limiting** sur les routes admin

---

## 📊 Architecture Zero-Join : État des Lieux

| Route | Utilise cached_* | Reste des JOIN | Priorité |
|-------|-----------------|----------------|----------|
| `/recipes/[slug]` | ✅ Oui | Ratings | 🟡 Moyenne |
| `/roundups/[slug]` | ✅ Oui | Articles liés | 🟡 Moyenne |
| `/articles` (liste) | ✅ Oui | Aucun | ✅ OK |
| `/articles/[slug]` | ✅ Oui | Aucun | ✅ OK |
| `/api/admin/articles/[id]` | ❌ Non | Author, Category, Tags, Equipment | 🔴 Haute |
| `/api/articles` (popular) | ❌ Non | Relations | 🔴 Haute |

---

## ✅ Vérifications Rapides

```bash
# Chercher les LEFT JOIN restants
grep -rn "leftJoin" src/pages/api/

# Chercher les any dans le backend
grep -rn "as any" src/modules/ src/pages/api/

# Vérifier les formatSuccessResponse/formatErrorResponse
grep -rn "formatSuccessResponse\|formatErrorResponse" src/pages/api/ | wc -l
```
