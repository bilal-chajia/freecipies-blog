# Rapport de Review — Tests & Robustesse des Block Adapters

> **Reviewer**: Senior QA Engineer  
> **Scope**: Couverture de tests, qualité des tests, edge cases, fiabilité  
> **Commits couverts**: `87258e2`, `904aec9`, `b8b7fbf`

---

## 📊 Vue d'ensemble

| Métrique | Valeur |
|----------|--------|
| **Adapters total** | 14 |
| **Adapters avec tests unitaires** | 1 (ParagraphAdapter) |
| **Adapters couverts par round-trip** | 14 |
| **Fichiers de test projet** | 2 |
| **Tests unitaires dans node_modules** | ~200+ (librairie Zod uniquement) |

---

## 🔍 Fichier par Fichier

### 1. `ParagraphAdapter.test.ts`
**Score qualité : 5/10**

**Forces :**
- Teste le sens DB → Editor et Editor → DB
- Vérifie la conversion des styles bold/italic en markdown
- Teste le rejet du contenu vide (retourne null)

**Faiblesses / Risques :**
- **Aucun test sur `null`/`undefined`** : `toEditor({ type: 'paragraph', text: undefined })` n'est pas testé
- **Pas de test sur les liens markdown** : `[label](url)` est une feature de `parseInlineMarkdown` totalement non testée
- **Pas de test sur le style combiné** : `***text***` (bold+italic) non testé
- **Pas de test sur markdown malformé** : `**unclosed bold`, `*unclosed italic`
- **Assertions superficielles** : `toBeDefined()` sur `content` au lieu de vérifier la structure exacte des nodes
- **Aucun double round-trip** : ne vérifie pas que DB → Editor → DB → Editor donne le même résultat

**Suggestions :**
- Ajouter des tests pour `null`, `undefined`, `""`
- Tester `parseInlineMarkdown` isolément avec une suite complète de cas
- Tester le markdown malformé (doit être resilient)
- Tester les styles combinés (bold + italic + link)
- Vérifier la structure exacte des nodes retournés

---

### 2. `roundtrip.test.ts`
**Score qualité : 5/10**

**Forces :**
- Couvre tous les 14 types de blocs
- Vérifie que DB → Editor → DB ne plante pas
- Bonne idée de test d'intégration global

**Faiblesses / Risques :**
- **`any` omniprésent** : `const input: any = {...}` pour chaque bloc — annule la value du typage
- **Tests "smoke test" uniquement** : vérifie juste que ça ne plante pas, pas que les données sont correctes
- **Pas de vérification de structure** : ne vérifie pas que le résultat a les bons champs
- **Pas de test d'idempotence** : DB → Editor → DB → Editor devrait être identique au premier DB → Editor → DB
- **Pas d'edge cases** : tableaux vides, objets manquants, strings vides
- **Pas de test de performance** : conversion de 1000 blocs en moins de X ms

**Suggestions :**
- Remplacer `any` par les vrais types `ContentBlock`
- Ajouter des assertions sur la structure exacte du résultat
- Implémenter le double round-trip
- Ajouter des tests avec des données minimales (objets partiels)
- Ajouter des tests de stress (100+ blocs)

---

### 3. Adapters sans tests unitaires

| Adapter | Type | Complexité | Priorité de test |
|---------|------|-----------|-----------------|
| `AlertAdapter` | Simple | Basse | 🟢 Basse |
| `BeforeAfterAdapter` | Image | Moyenne | 🟡 Moyenne |
| `BlockquoteAdapter` | Simple | Basse | 🟢 Basse |
| `DividerAdapter` | Simple | Basse | 🟢 Basse |
| `FAQAdapter` | Complexe | Haute | 🔴 Haute |
| `HeadingAdapter` | Simple | Basse | 🟢 Basse |
| `ImageAdapter` | Image | Moyenne | 🟡 Moyenne |
| `ListAdapter` | Structuré | Moyenne | 🟡 Moyenne |
| `MainRecipeAdapter` | Complexe | Haute | 🔴 Haute |
| `RelatedContentAdapter` | Structuré | Moyenne | 🟡 Moyenne |
| `RoundupListAdapter` | Complexe | Haute | 🔴 Haute |
| `TableAdapter` | Structuré | Moyenne | 🟡 Moyenne |
| `VideoAdapter` | Média | Moyenne | 🟡 Moyenne |

---

## 🎯 Matrice de Risque

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|-----------|
| Régression sur FAQAdapter | Haut | Moyenne | Tests unitaires + round-trip |
| Régression sur MainRecipeAdapter | Haut | Haute | Tests unitaires + mocks |
| Régression sur RoundupListAdapter | Haut | Moyenne | Tests unitaires + fixtures |
| Régression sur ImageAdapter | Moyen | Haute | Tests avec fixtures d'images |
| Régression sur TableAdapter | Moyen | Moyenne | Tests avec tables complexes |
| Perte de données (round-trip) | Critique | Basse | Double round-trip + snapshot |

---

## 📋 Plan de Tests Recommandé

### Phase 1 — Tests unitaires par adapter (🔴 Haute priorité)

Créer un fichier `__tests__/{AdapterName}.test.ts` pour chaque adapter avec :

```typescript
import { describe, it, expect } from 'vitest';
import { ParagraphAdapter } from '../ParagraphAdapter';
import type { ContentBlock } from '../../../types';

describe('ParagraphAdapter', () => {
  describe('toEditor', () => {
    it('convertit un paragraphe simple', () => {
      const input: ContentBlock = { type: 'paragraph', text: 'Hello' };
      const result = ParagraphAdapter.toEditor(input);
      expect(result).toEqual({ type: 'paragraph', props: { textColor: 'default' }, content: [{ type: 'text', text: 'Hello', styles: {} }] });
    });

    it('retourne null pour texte vide', () => {
      expect(ParagraphAdapter.toEditor({ type: 'paragraph', text: '' })).toBeNull();
    });

    it('retourne null pour texte undefined', () => {
      expect(ParagraphAdapter.toEditor({ type: 'paragraph' } as any)).toBeNull();
    });

    it('convertit le markdown bold', () => { /* ... */ });
    it('convertit le markdown italic', () => { /* ... */ });
    it('convertit le markdown link', () => { /* ... */ });
    it('convertit le markdown combiné', () => { /* ... */ });
    it('ignore le markdown malformé', () => { /* ... */ });
  });

  describe('toDB', () => {
    it('convertit un bloc editor simple', () => { /* ... */ });
    it('convertit les styles en markdown', () => { /* ... */ });
    it('gère les liens', () => { /* ... */ });
  });

  describe('round-trip', () => {
    it('préserve les données simples', () => {
      const original: ContentBlock = { type: 'paragraph', text: 'Hello **world**' };
      const editor = ParagraphAdapter.toEditor(original);
      const back = ParagraphAdapter.toDB(editor!);
      expect(back).toEqual(original);
    });

    it('double round-trip stable', () => {
      const original: ContentBlock = { type: 'paragraph', text: 'Test' };
      const editor1 = ParagraphAdapter.toEditor(original);
      const db1 = ParagraphAdapter.toDB(editor1!);
      const editor2 = ParagraphAdapter.toEditor(db1);
      const db2 = ParagraphAdapter.toDB(editor2!);
      expect(db2).toEqual(db1);
    });
  });
});
```

### Phase 2 — Tests d'intégration (🟡 Moyenne priorité)

```typescript
// conversion.test.ts
import { describe, it, expect } from 'vitest';
import { convertDBToEditor, convertEditorToDB } from '../utils/conversion';

describe('Conversion intégration', () => {
  it('convertit un article complet', () => {
    const article = loadFixture('full-article.json');
    const editorBlocks = convertDBToEditor(article.blocks);
    const dbBlocks = convertEditorToDB(editorBlocks);
    expect(dbBlocks).toEqual(article.blocks);
  });

  it('gère les blocs inconnus gracieusement', () => {
    const blocks = [{ type: 'unknown_type', data: {} }];
    expect(() => convertDBToEditor(blocks)).not.toThrow();
  });
});
```

### Phase 3 — Tests de performance (🟢 Basse priorité)

```typescript
import { describe, it, expect } from 'vitest';
import { convertDBToEditor } from '../utils/conversion';

describe('Performance', () => {
  it('convertit 1000 blocs en moins de 100ms', () => {
    const blocks = Array.from({ length: 1000 }, (_, i) => ({
      type: 'paragraph',
      text: `Paragraph ${i} with **bold** and *italic*`
    }));
    const start = performance.now();
    convertDBToEditor(blocks);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
```

---

## 🔧 Configuration Vitest Recommandée

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
```

---

## 🎯 Recommandations Prioritaires

1. **🔴 Ajouter des tests unitaires pour `FAQAdapter`** (le plus complexe)
2. **🔴 Ajouter des tests unitaires pour `MainRecipeAdapter`** (mapping spécial)
3. **🔴 Ajouter des tests unitaires pour `RoundupListAdapter`** (structure imbriquée)
4. **🟡 Améliorer `roundtrip.test.ts`** — remplacer `any` par les vrais types
5. **🟡 Ajouter des tests d'edge cases** : `null`, `undefined`, champs manquants
6. **🟢 Ajouter le double round-trip** pour tous les adapters
7. **🟢 Configurer Vitest** avec les thresholds de coverage

---

## ✅ Vérifications Rapides

```bash
# Lancer les tests existants
pnpm test

# Vérifier la couverture
pnpm test -- --coverage

# Compter les fichiers de test
find src -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | wc -l

# Vérifier que tous les adapters ont un test
for adapter in src/admin/components/BlockEditor/blocks/adapters/*.ts; do
  name=$(basename "$adapter" .ts)
  if [ ! -f "src/admin/components/BlockEditor/blocks/adapters/__tests__/${name}.test.ts" ]; then
    echo "❌ Pas de test pour $name"
  fi
done
```
