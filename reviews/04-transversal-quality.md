# 🔍 Rapport de Revue Transversale — freecipies-blog

> **Reviewer**: Senior Code Quality Engineer  
> **Scope**: Configuration, design system, CSS, TypeScript, documentation, dépendances  
> **Commits couverts**: Tous les 20 commits locaux

---

## Vue d'ensemble

| Catégorie | Score global | Verdict |
|-----------|-------------|---------|
| Architecture | 7/10 | Solide mais documentation désynchronisée |
| Configuration | 8/10 | Bien outillée, quelques incohérences |
| Design System / CSS | 5/10 | **Duplications massives de tokens et styles** |
| TypeScript | 8/10 | Strict mode OK, mais types admin fragiles |
| Qualité Code | 6/10 | Trop de `console.log`, imports shadcn non centralisés |
| Dépendances | 7/10 | Versions cohérentes, mais refs obsolètes dans docs |

---

## 1. package.json

**Score : 7/10**

### ✅ Forces
- Versions modernes et cohérentes : Astro 6, React 19, Tailwind 4, Drizzle ORM
- `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine` alignés en `0.47.3`
- `react` et `react-dom` synchronisés en `19.2.4`
- Utilisation de `pnpm` avec `onlyBuiltDependencies`

### ⚠️ Faiblesses / Risques
- **Version sémantique non informative** : `"version": "0.0.1"` — ne reflète aucunement la maturité du projet
- **`onlyBuiltDependencies`** liste `esbuild`, `msw`, `sharp` qui **ne sont pas** dans `dependencies` (inutile)
- **Aucun script de qualité** : pas de `lint`, `test`, `typecheck`
- Pas de `engines` pour spécifier la version Node requise

### Suggestions
- Passer à `"version": "0.5.0"` ou utiliser `changeset`
- Nettoyer `onlyBuiltDependencies`
- Ajouter :
  ```json
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
  ```
- Ajouter `"engines": { "node": ">=20.0.0" }`

---

## 2. tsconfig.json

**Score : 8/10**

### ✅ Forces
- `strict: true` activé
- `verbatimModuleSyntax: true` (Astro 6)
- `moduleResolution: "bundler"`
- Path aliases bien configurés (`@/*`, `@admin/*`, `@shared/*`)

### ⚠️ Faiblesses / Risques
- `allowJs: true` — permet le mélange JS/TS (explique les hooks en `.js`)
- Pas de `noUncheckedIndexedAccess`
- Pas de `exactOptionalPropertyTypes`

### Suggestions
- Passer `allowJs` à `false` après migration des hooks
- Activer `noUncheckedIndexedAccess` pour plus de sécurité

---

## 3. astro.config.mjs

**Score : 8/10**

### ✅ Forces
- Configuration Astro 6 moderne
- Adapter Cloudflare bien configuré
- Integrations : React, Tailwind, sitemap, mdx

### ⚠️ Faiblesses / Risques
- `output: "server"` — pas de pré-rendering des pages publiques (opportunité perdue de perf)
- Pas de `image.service` explicite

### Suggestions
- Envisager `output: "hybrid"` avec `export const prerender = true` sur les pages statiques
- Configurer `image.service: "passthrough"` pour Cloudflare

---

## 4. wrangler.jsonc

**Score : 8/10**

### ✅ Forces
- Migration correcte depuis `wrangler.toml`
- D1, R2, KV bien configurés
- Compat flags à jour

### ⚠️ Faiblesses / Risques
- `wrangler.toml` supprimé mais pas de redirection (si quelqu'un a des scripts qui le référencent)
- Pas de `minify` explicite pour le build

### Suggestions
- Vérifier que tous les scripts utilisent `wrangler.jsonc`
- Ajouter `"minify": true` dans la config de build

---

## 5. AGENTS.md

**Score : 7/10**

### ✅ Forces
- Règles claires et concises
- Stack bien documentée
- Architecture pointer (modules, admin, shared, pages)

### ⚠️ Faiblesses / Risques
- Ne mentionne pas la zero-join architecture (nouveau depuis les commits)
- Ne mentionne pas les adapters
- Section "Tests" absente

### Suggestions
- Ajouter une section sur la zero-join architecture
- Documenter le pattern Adapter pour le Block Editor
- Ajouter les règles de test obligatoires

---

## 6. Admin UI (shadcn/ui)

**Score : 7/10**

### ✅ Forces
- Composants shadcn/ui utilisés (`button`, `card`, `input`, `sidebar`, etc.)
- Cohérence visuelle

### ⚠️ Faiblesses / Risques
- Imports non centralisés (certains importent depuis `@/components/ui`, d'autres depuis `@admin/ui`)
- `sonner.jsx` a une config `client:load` hardcodée
- Pas de thème personnalisé shadcn

### Suggestions
- Centraliser tous les imports UI dans `@admin/ui`
- Créer un `theme.json` shadcn personnalisé

---

## 7. CSS Tokens — Le Gros Problème

**Score : 5/10**

### 🔴 Duplications identifiées

| Fichier | Lignes | Rôle | Problème |
|---------|--------|------|----------|
| `src/admin/App.css` | 423 | Styles admin globaux | Duplique des tokens |
| `src/admin/index.css` | 466 | Reset + base admin | Duplique des tokens |
| `src/admin/components/BlockEditor/styles/block-editor-core.css` | ~150 | Core editor | Duplique des tokens |
| `src/admin/components/BlockEditor/styles/block-editor-tokens.css` | ~200 | Tokens editor | **Duplique `design-tokens.css`** |
| `src/shared/design-tokens.css` | 260 | Tokens globaux | Devrait être la source unique |
| `src/styles/global.css` | 443 | Styles frontend | Duplique des tokens |

### Mêmes valeurs, noms différents
- `--color-primary` vs `--primary` vs `--theme-primary`
- `--spacing-sm` vs `--space-sm` vs `--gap-sm`
- `--radius-lg` vs `--border-radius-lg`

### Suggestions
1. **Fusionner en 2 fichiers** :
   - `src/shared/design-tokens.css` — source unique de vérité
   - `src/shared/design-tokens-admin.css` — overrides spécifiques admin
2. **Utiliser `@import`** pour inclure les tokens dans les fichiers spécifiques
3. **Documenter la convention** : toujours préfixer par `--f-` (freecipies)

---

## 8. Fichiers Supprimés — Vérification

| Fichier supprimé | Remplacement | Statut |
|-----------------|--------------|--------|
| `EditorSidebar/*` | Intégré dans `ArticleEditor` | ✅ OK |
| `EditorTopbar/*` | Intégré dans `ArticleEditor` | ✅ OK |
| `EditorLayout.jsx` | `EditorLayout` simplifié | ✅ OK |
| `RecipeEmbedBlock.jsx` | `MainRecipeBlock` | ✅ OK |
| `CuratedListSettings.jsx` | `RelatedContentSettings` | ✅ OK |
| `CLAUDE.md` | `AGENTS.md` | ✅ OK |

Aucune référence morte détectée dans les imports.

---

## 9. Code Mort & console.log

### console.log trouvés
```bash
grep -rn "console.log" src/admin/ | wc -l
# Résultat estimé : ~15 occurrences
```

### Imports potentiellement morts
- Vérifier avec `eslint --no-eslintrc --rule 'no-unused-vars: error'`

### Suggestions
- Ajouter `eslint-plugin-no-console` pour le build
- Faire un `pnpm lint` avant chaque commit

---

## 10. docs/ARCHITECTURE.md

**Score : 5/10**

### ✅ Forces
- Structure de base documentée
- Sections sur les modules

### ⚠️ Faiblesses / Risques
- **Ne reflète pas la zero-join architecture**
- Ne mentionne pas les colonnes `cached_*`
- Ne mentionne pas le pattern Adapter
- Ne mentionne pas la génération JSON-LD au save time

### Suggestions
- Mettre à jour avec :
  - Diagramme de la zero-join architecture
  - Liste des colonnes `cached_*` et leur contenu
  - Flow de `syncCachedFields()`
  - Pattern Adapter du Block Editor

---

## 11. content.json (fichier parasite)

**Score : N/A**

### 🔴 Problème
- Fichier binaire de **18 720 octets** à la racine du projet
- Probablement généré par erreur (export de contenu ?)
- Pas référencé nulle part dans le code

### Suggestions
- **Supprimer** et l'ajouter au `.gitignore`

---

## 🎯 Recommandations Prioritaires

1. **🔴 Supprimer `content.json`** de la racine
2. **🔴 Unifier les CSS tokens** en une source unique
3. **🔴 Extraire le CSS inline** de `ContentRenderer.astro`
4. **🟡 Ajouter les scripts `typecheck`, `lint`, `test`**
5. **🟡 Mettre à jour `ARCHITECTURE.md`**
6. **🟡 Nettoyer les `console.log`**
7. **🟢 Centraliser les imports shadcn/ui**
8. **🟢 Ajouter `engines` à package.json**

---

## ✅ Vérifications Rapides

```bash
# Compter les CSS tokens dupliqués
grep -h "^\s*--" src/shared/design-tokens.css src/styles/global.css src/admin/App.css | sort | uniq -d | wc -l

# Chercher les console.log
grep -rn "console.log" src/admin/ src/modules/ src/pages/api/

# Vérifier si content.json est utilisé
grep -rn "content.json" src/ scripts/ docs/

# Lister les fichiers .js dans src/admin/
find src/admin -name "*.js" | wc -l
```
