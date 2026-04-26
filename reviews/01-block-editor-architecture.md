# 🔍 Rapport d'Architecture — Block Editor (Astro 6 + React 19)

> **Reviewer**: Senior React Architect  
> **Scope**: Adapter pattern, hooks cohesion, test coverage, TypeScript strictness, index.jsx traceability  
> **Commits couverts**: `76472fb` à `bb5efb2`, `04a898e`, `4ad1adb`, `118a88c`, `a2748ff`

---

## 📊 Synthèse Globale

| Critère | Note | Commentaire |
|---------|------|-------------|
| **Pattern Adapter** | 6/10 | Bonne idée, mais incohérence `MainRecipeAdapter` et mapping hardcodé fragilisent le pattern |
| **Cohésion des Hooks** | 5/10 | Découpage logique mais certains hooks sont surchargés (228 lignes pour `useBlockSelection`) |
| **Dépendances Circulaires** | ✅ Aucune | Pas de cycles import détectés entre les modules examinés |
| **Tests** | 5/10 | Round-trip test couvre tous les types mais qualité médiocre (`any` omniprésent, tests d'intégration uniquement) |
| **Réduction index.jsx** | 6/10 | 220 lignes, bien délégué, mais 2 helpers métier restent inline |
| **TypeScript Strictness** | 4/10 | Mélange `.js`/`.ts`, `as any` récurrent, pas de strictNullChecks apparent |

---

## 📁 Fichier par Fichier

### 1. `BlockAdapter.ts`
**Score: 8/10**

**Forces** :
- Interface générique `BlockAdapter<T extends ContentBlock>` bien conçue avec contrat explicite (`toEditor`, `toDB`)
- Typage fort sur le bloc source et la cible
- Extensible par nature

**Faiblesses** :
- Pas de gestion d'erreurs dans l'interface (pas de `Result<T, E>` ou `try/catch` imposé)
- Aucune validation de schéma à la conversion

**Suggestions** :
- Ajouter une méthode `validate?` optionnelle
- Documenter les invariants de chaque adapter

---

### 2. `adapters/index.ts` (Registry)
**Score: 7/10**

**Forces** :
- Registry centralisé avec mapping `block.type → adapter`
- Barrel export propre

**Faiblesses** :
- Mapping hardcodé (pas de détection automatique)
- Pas de vérification à la compilation que tous les types sont couverts
- `MainRecipeAdapter` n'est pas dans le registry standard

**Suggestions** :
- Utiliser un `satisfies` TypeScript pour vérifier la exhaustivité
- Ajouter un test qui vérifie que chaque `ContentBlock['type']` a un adapter

---

### 3. `ParagraphAdapter.ts`
**Score: 7/10**

**Forces** :
- Implémentation simple et lisible
- Gestion du markdown inline (bold/italic)
- Retourne `null` pour contenu vide (garbage-in → null-out)

**Faiblesses** :
- `parseInlineMarkdown` n'est pas testée isolément
- Pas de gestion des liens markdown `[text](url)`
- Styles combinés (`***bold+italic***`) non testés

**Suggestions** :
- Extraire `parseInlineMarkdown` dans un utilitaire testé
- Ajouter des tests pour les liens et styles combinés

---

### 4. `BeforeAfterAdapter.ts`
**Score: 6/10**

**Forces** :
- Structure cohérente avec le pattern
- Gestion des images avant/après

**Faiblesses** :
- `as any` utilisé pour forcer le type BlockNote
- Pas de validation que les 2 images sont présentes
- Pas de fallback si une image est manquante

**Suggestions** :
- Typer strictement les props BlockNote
- Ajouter une validation de structure

---

### 5. `RoundupListAdapter.ts`
**Score: 6/10**

**Forces** :
- Conversion complexe bien structurée
- Gestion des items de roundup

**Faiblesses** :
- `as any` récurrent
- Logique de conversion des items assez dense
- Pas de vérification que les articles référencés existent

**Suggestions** :
- Découper la conversion d'items en sous-fonctions
- Typer avec les types BlockNote exacts

---

### 6. `roundtrip.test.ts`
**Score: 5/10**

**Forces** :
- Couvre tous les 14 types de blocs
- Vérifie l'idempotence DB → Editor → DB
- Bonne idée de test global

**Faiblesses** :
- **`any` omniprésent** — `const input: any = ...` pour chaque bloc
- Tests d'intégration uniquement, pas de tests unitaires par adapter
- Pas d'edge cases (null, undefined, données malformées)
- Pas de test sur la préservation exacte des données (seulement "ça ne plante pas")
- Pas de double round-trip (DB → Editor → DB → Editor)

**Suggestions** :
- Remplacer `any` par les vrais types `ContentBlock`
- Ajouter des tests unitaires par adapter dans des fichiers dédiés
- Tester les edge cases : `null`, `undefined`, champs manquants
- Ajouter un double round-trip pour vérifier la stabilité

---

### 7. `useBlockSelection.js`
**Score: 5/10**

**Forces** :
- Logique de sélection bien encapsulée
- Gère les clics, le focus, la navigation au clavier

**Faiblesses** :
- **228 lignes** — trop gros pour un hook
- Mélange de la logique de sélection, de focus, et de drag-and-drop
- En `.js` au lieu de `.ts`
- Pas de JSDoc sur les paramètres

**Suggestions** :
- Diviser en `useFocusManager` + `useKeyboardNavigation`
- Migrer en TypeScript
- Extraire les helpers purs (sélection de bloc, vérification d'état)

---

### 8. `useCanvasDragDrop.js`
**Score: 6/10**

**Forces** :
- Gère le drag-and-drop natif HTML5
- Feedback visuel pendant le drag

**Faiblesses** :
- En `.js`
- Pas de gestion du touch (mobile)
- Dépendances sur des refs externes non documentées

**Suggestions** :
- Migrer en TypeScript
- Ajouter le support touch pour mobile
- Documenter les dépendances de refs

---

### 9. `useEditorStateManager.js`
**Score: 6/10**

**Forces** :
- Centralise la gestion de l'état de l'éditeur
- Gère les opérations undo/redo

**Faiblesses** :
- En `.js`
- État potentiellement trop large
- Pas de sérialisation/desérialisation typée

**Suggestions** :
- Migrer en TypeScript avec un state type-safe
- Utiliser un reducer pattern si l'état continue de croître

---

### 10. `useInsertHandle.js`
**Score: 6/10**

**Forces** :
- Gère l'insertion de blocs entre les blocs existants
- UX proche de Notion

**Faiblesses** :
- En `.js`
- Logique DOM complexe (194 lignes)
- Pas de gestion d'erreur si l'insertion échoue

**Suggestions** :
- Migrer en TypeScript
- Simplifier la logique DOM avec des data-attributes
- Ajouter des guards pour les index invalides

---

### 11. `useLinkToolbar.js`
**Score: 7/10**

**Forces** :
- Petit hook cohésif (94 lignes)
- Gère la création, modification et suppression de liens

**Faiblesses** :
- En `.js`
- Pas de validation d'URL

**Suggestions** :
- Migrer en TypeScript
- Ajouter une validation d'URL basique

---

### 12. `index.jsx`
**Score: 6/10**

**Forces** :
- Réduction spectaculaire : **1208 → 253 lignes (-79%)**
- Composition claire avec les hooks
- Séparation des responsabilités

**Faiblesses** :
- 2 helpers métier restent inline (`getDefaultBlockData`, `createNewBlock`)
- Props drilling encore présent
- Pas de TypeScript (`.jsx`)

**Suggestions** :
- Extraire les 2 helpers dans `utils/editorHelpers.ts`
- Migrer en `.tsx`
- Utiliser un context léger si le props drilling s'aggrave

---

### 13. `conversion.ts`
**Score: 7/10**

**Forces** :
- Réduction de **571 → ~100 lignes**
- Délégation propre aux adapters via `getAdapterForType`
- Code beaucoup plus lisible

**Faiblesses** :
- `MainRecipeAdapter` a encore un traitement spécial hardcodé
- Pas de gestion d'erreur si un adapter est manquant

**Suggestions** :
- Intégrer `MainRecipeAdapter` dans le registry standard
- Ajouter un fallback explicite pour les types non reconnus

---

## 🎯 Recommandations Prioritaires

1. **🔴 Migrer tous les hooks `.js` → `.ts`** — C'est le plus gros risque de régression
2. **🔴 Corriger `MainRecipeAdapter`** pour suivre l'interface `BlockAdapter<T>`
3. **🟡 Améliorer les tests round-trip** — Remplacer `any` par les vrais types
4. **🟡 Ajouter des tests unitaires** pour chaque adapter
5. **🟢 Réduire `useBlockSelection`** en le divisant en sous-hooks

---

## ✅ Vérifications Rapides

```bash
# Compter les fichiers .js vs .ts dans le BlockEditor
find src/admin/components/BlockEditor -name "*.js" | wc -l
find src/admin/components/BlockEditor -name "*.ts" | wc -l

# Chercher les any
grep -rn "as any" src/admin/components/BlockEditor/

# Vérifier la taille de index.jsx
wc -l src/admin/components/BlockEditor/index.jsx
```
