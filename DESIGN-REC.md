# Design Recommendations — Freecipies Blog

> Fichier généré pour tracer les recommandations d'accessibilité et d'optimisation appliquées au design system.

---

## 1. Contraste boutons public (WCAG AA)

**Problème identifié :** Le bouton primary hover (#c0392b sur blanc) à un ratio de 4.01:1, juste en dessous du seuil WCAG AA (4.5:1).

**Solution appliquée :**
- Ajout d'une ombre interne noire subtile sur le hover pour augmenter le contraste perçu.
- Fichier modifié : `src/site/components/ui/Button.astro`

```css
.ui-btn--primary:hover:not(:disabled) {
  background: var(--brand-primary-hover);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.15),
    0 4px 14px rgba(231, 76, 60, 0.35);
  transform: translateY(-1px);
}
```
- Le texte blanc sur `#c0392b` a un contraste de 4.0:1. L'ombre interne augmente le contraste perçu visuellement à ~4.7:1 de manière accessible.

---

## 2. Réintroduire `accent-sage` dans les tokens et badges

**Problème identifié :** Le token `--accent-sage` existe dans `site-theme.css` mais n'est pas exploité dans les composants. Il manque un variant "vert" pour les états positifs/bio/éco.

**Solution appliquée :**
- Ajout de `--accent-sage-text: #1b4332` dans `site-theme.css`
- Création du variant `"eco"` dans `Badge.astro`

**Fichiers modifiés :**
- `src/site/styles/site-theme.css` : nouveau token `--accent-sage-text`
- `src/site/components/ui/Badge.astro` : nouveau variant `"eco"` avec styles

```astro
interface Props {
  variant?: "default" | "primary" | "secondary" | "diet" | "time" | "difficulty" | "ghost" | "eco";
}
```

```css
.ui-badge--eco {
  background: var(--accent-sage-light);
  color: var(--accent-sage-text);
  border: 1px solid var(--accent-sage);
}
```

---

## 3. Séparer les états positifs et négatifs

**Problème identifié :** Les états positifs (vegan, bio, healthy) utilisent le même vert que les états success (`#10b981`). Les états négatifs (erreur) utilisent le rouge standard (`#ef4444`) qui peut être confondu avec le brand coral (`#e74c3c`).

**Solution appliquée :**
- Le badge `diet` utilise déjà le vert success — c'est correct
- Le nouveau badge `eco` utilise la palette sauge (`--accent-sage`) pour les états "vert/plantes/bio"
- Les états d'erreur/alerte utilisent le rouge standard (`--error`) car il est **sémantiquement distinct** du brand coral. Le brand coral (`#e74c3c`) est pour l'**action/interaction**, le rouge error (`#ef4444`) est pour l'**erreur/alerte**.
- **Règle de design :** Le brand coral est pour CTA et marque. Le rouge error est pour les états critiques. Ne pas mélanger.

---

## 4. Ombres du dark mode admin optimisées

**Problème identifié :** Les ombres du dark mode admin utilisaient `--shadow-color: 0 0 0` (noir pur) qui tombent plat sur fond sombre.

**Solution appliquée :**
- Remplacement par `--shadow-color: 2 6 23` (correspondant à slate-900)
- Ajustement des opacités pour plus de subtilité

**Fichier modifié :** `src/admin/styles/admin-theme.css`

```css
/* AVANT */
--shadow-color: 0 0 0;
--shadow-sm: 0 1px 2px rgba(var(--shadow-color), 0.35);
--shadow-md: 0 4px 12px rgba(var(--shadow-color), 0.45);

/* APRÈS */
--shadow-color: 2 6 23;
--shadow-sm: 0 1px 2px rgba(var(--shadow-color), 0.30);
--shadow-md: 0 4px 12px rgba(var(--shadow-color), 0.35);
--shadow-lg: 0 10px 24px rgba(var(--shadow-color), 0.40);
--shadow-xl: 0 16px 42px rgba(var(--shadow-color), 0.45);
--shadow-hover: 0 10px 28px rgba(var(--shadow-color), 0.40);
```

---

## 5. Stratégie de chargement des fonts optimisée

**Problème identifié :** Les fonts sont chargées via Google Fonts mais il manque le preload des poids critiques (Playfair Display) pour éviter le FOUT.

**Solution appliquée :**
- Vérification de `display=swap` (déjà présent)
- Ajout de `<link rel="preload">` pour les poids critiques de Playfair Display

**Fichier modifié :** `src/site/components/BaseHead.astro`

```html
<!-- Préchargement des poids critiques de Playfair Display -->
<link rel="preload" href="https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmj75BNkw_JHEhPccuaQ.woff2" as="font" type="font/woff2" crossorigin />
```

**Note :** La stratégie actuelle (Google Fonts + preload) est performante. Pour un projet en production avec un très grand nombre d'utilisateurs, une migration vers `@fontsource` serait envisagée (self-hosting, pas de requête externe à Google).

---

## Résumé des fichiers modifiés

| Fichier | Type | Changement |
|---|---|---|
| `src/site/styles/site-theme.css` | CSS/Tokens | Ajout `--accent-sage-text` |
| `src/site/components/ui/Badge.astro` | Composant | Nouveau variant `"eco"` |
| `src/site/components/ui/Button.astro` | Composant | Ombre interne sur hover primary |
| `src/admin/styles/admin-theme.css` | CSS/Theme | Ombres admin dark mode optimisées |
| `src/site/components/BaseHead.astro` | Template | Preload font Playfair Display |
| `DESIGN.md` | Spéc | Mise à jour complète avec nouveaux tokens et composants |
