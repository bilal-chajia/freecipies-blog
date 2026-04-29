# Plan d'Amélioration du Design Frontend — Freecipies CMS

> **But:** Moderniser le site public et l'admin sans mélanger leurs identités visuelles. Le site public reste un food blog éditorial; l'admin devient un dashboard CMS sobre et productif.

---

## Phase 1 — Fondation : Design Systems Séparés
**Priorité:** Critique | **Estimation:** 1-2 jours

### 1.1 Séparer primitives, thème site et thème admin
**Fichiers:**
- `src/shared/design-tokens.css`
- `src/site/styles/site-theme.css`
- `src/admin/styles/admin-theme.css`
- `src/site/styles/global.css`
- `src/admin/index.css`

`src/shared/design-tokens.css` contient uniquement des primitives neutres: neutres, espacement, type scale, z-index, transitions, états success/error/warning. La personnalité visuelle est déplacée vers deux thèmes séparés:
- `site-theme.css`: palette food blog, serif headings, identité culinaire.
- `admin-theme.css`: palette dashboard, shadcn/Radix variables, sans-serif, surfaces de travail.

```css
/* shared */
--space-4: 1rem;
--radius-md: 8px;
--transition-base: 250ms var(--ease-in-out);

/* site */
--brand-primary: #e74c3c;
--font-serif: "Playfair Display", Georgia, serif;

/* admin */
--brand-primary: #2563eb;
--background: 210 40% 98%;
```

### 1.2 Importer les polices Google Fonts
**Fichiers:** `src/site/components/BaseHead.astro`, `src/pages/admin/[...path].astro`

Le site public charge Playfair Display + Source Sans 3. L'admin charge seulement des polices sans-serif utiles au dashboard, sans Playfair Display.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" />
```

### 1.3 Aligner les couleurs par surface
**Fichiers à modifier:**
- `src/site/components/Header.astro` — remplacer les couleurs food hardcodées par les tokens site
- `src/site/components/Footer.astro` — remplacer les couleurs food hardcodées par les tokens site
- `src/pages/index.astro` — remplacer toutes les couleurs hardcodées par les tokens
- `src/site/layouts/RecipeLayout.astro` — idem
- `src/site/components/RecipeCard.astro` — idem

**Action:** Les composants publics utilisent les tokens `site-theme.css`; les composants admin utilisent les tokens `admin-theme.css`. Aucun composant admin ne doit dépendre de la palette food blog.

---

## Phase 2 — Site Public : Modernisation Visuelle
**Priorité:** Haute | **Estimation:** 2-3 jours

### 2.1 Dark Mode Natif
**Fichiers:** `src/site/layouts/Layout.astro`, `src/site/styles/global.css`, `src/site/styles/site-theme.css`

Ajouter un toggle dark mode dans le header et les règles CSS correspondantes :

```css
/* Dans global.css */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f0f0f;
    --bg-alt: #1a1a1a;
    --text: #f0f0f0;
    --text-light: #a0a0a0;
    --border: #333;
  }
}

html.dark {
  --bg: #0f0f0f;
  --bg-alt: #1a1a1a;
  --text: #f0f0f0;
  --text-light: #a0a0a0;
  --border: #333;
}
```

**Composant:** Créer `src/site/components/ThemeToggle.astro` avec persistance en `localStorage`.

### 2.2 Composants UI Réutilisables (Site Public)
Créer `src/site/components/ui/` avec des composants Astro réutilisables :

- **`Card.astro`** — wrapper avec hover lift, shadow transition, radius cohérent
- **`Badge.astro`** — catégories, tags, diet badges avec variantes de couleur
- **`Button.astro`** — primary, secondary, ghost, icon avec animations
- **`Skeleton.astro`** — placeholder de chargement shimmer
- **`SectionTitle.astro`** — titre de section avec dot décoratif et ligne

### 2.3 Refonte de la Page d'Accueil
**Fichier:** `src/pages/index.astro`

**Problèmes actuels:**
- Le hero slider est statique (pas de JS pour le faire défiler)
- Les cartes ont 3 designs différents (foxiz-card, recipe-card-vertical, recipe-card-small)
- Le newsletter banner est visuellement séparé du reste

**Améliorations:**
1. **Hero Slider fonctionnel** — Ajouter un script inline pour l'autoplay (5s) et les dots cliquables
2. **Unification des cartes** — Utiliser le composant `Card.astro` partout
3. **Section Catégories améliorée** — Horizontal scroll snap sur mobile, grille cohérente sur desktop
4. **Newsletter stylisé** — Background avec gradient subtil, input + bouton fusionné (pill shape)
5. **Micro-interactions** — Hover scale sur les images, badges qui pulse, transitions sur les liens

### 2.4 Amélioration des Pages de Contenu (Recipe, Article, Roundup)
**Fichiers:** `src/site/layouts/RecipeLayout.astro`, `src/site/layouts/ArticleLayout.astro`

1. **Table des matières sticky** — Améliorer le TOC avec highlight de la section active au scroll
2. **Gallery d'images** — Si plusieurs images, ajouter un lightbox simple
3. **Progress bar de lecture** — Barre fine en haut de l'écran
4. **Bouton "Back to top"** — Apparaît après 500px de scroll
5. **Animations d'entrée** — Les sections apparaissent avec un fade-up au scroll (IntersectionObserver)

### 2.5 Loading States & Empty States
1. **Skeleton screens** — Pour les listes de recettes et la page d'accueil
2. **Empty states** — Illustrations/animations lorsqu'une catégorie n'a pas de contenu

---

## Phase 3 — Admin : Personnalisation & Polish
**Priorité:** Haute | **Estimation:** 2-3 jours

### 3.1 Thème Dashboard shadcn/ui
**Fichiers:** `src/admin/styles/admin-theme.css`, `src/admin/index.css`

Remplacer le thème food/brand par un thème dashboard neutre :

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 10%;
  --primary: 221 83% 53%;      /* #2563eb */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 0 0% 10%;
  --accent: 210 40% 96%;
  --accent-foreground: 0 0% 100%;
  --muted: 30 10% 96%;
  --muted-foreground: 0 0% 45%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 30 10% 90%;
  --input: 30 10% 90%;
  --ring: 221 83% 53%;
  --radius: 0.625rem;
}

.dark {
  --background: 0 0% 7%;
  --foreground: 30 10% 95%;
  --card: 0 0% 10%;
  --card-foreground: 30 10% 95%;
  --popover: 0 0% 10%;
  --popover-foreground: 30 10% 95%;
  --primary: 6 78% 57%;
  --primary-foreground: 0 0% 100%;
  --secondary: 30 60% 30%;
  --secondary-foreground: 30 10% 95%;
  --accent: 24 80% 45%;
  --accent-foreground: 0 0% 100%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 60%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 18%;
  --input: 0 0% 18%;
  --ring: 6 78% 57%;
}
```

### 3.2 Dashboard Amélioré
**Fichier:** `src/admin/features/dashboard/pages/Dashboard.jsx`

**Problèmes:** Données mockées, pas de données temps réel.

**Améliorations:**
1. **Stats cards modernisées** — Icônes avec background coloré, trend indicators (up/down %)
2. **Graphique temps réel** — Connecter à `/api/stats/dashboard` pour des vraies données
3. **Activité récente** — Liste des dernières actions (articles créés, modifiés)
4. **Quick actions** — Boutons "New Article", "New Recipe" visibles en haut
5. **État du système** — Widgets pour l'état de la DB, espace R2, dernier déploiement

### 3.3 Sidebar & Navigation
**Fichier:** `src/admin/components/AppSidebar.jsx`

1. **Logo custom** — Remplacer l'icône générique par le logo Freecipies
2. **Icônes colorées** — Chaque section a une couleur d'accent subtile
3. **Badges de compteur** — Nombre d'articles/drafts visibles sur les liens
4. **Section utilisateur** — Avatar + nom en bas de la sidebar
5. **Collapse animation** — Transition fluide lors du repli

### 3.4 Feedback & Notifications
**Fichiers:** Toutes les pages admin

1. **Toasts Sonner** — Remplacer les `alert()` et `console.log` par des toasts :
   - Succès : fond vert subtil
   - Erreur : fond rouge
   - Info : fond bleu
2. **Loading states** — Skeletons pour les tables et les cards
3. **Empty states** — Illustrations pour les listes vides
4. **Confirm dialogs** — Pour les actions destructrices (delete)

### 3.5 Éditeurs Gutenberg / BlockNote
**Problème:** Double système de design (BlockNote/Mantine + shadcn/ui)

**Solutions:**
1. **Overrides CSS** — Forcer les couleurs de BlockNote à matcher le thème shadcn
2. **Toolbar custom** — Remplacer la toolbar par défaut par une toolbar shadcn/ui
3. **Sélecteur de blocs** — Style du slash command et de l'inserter à harmoniser

---

## Phase 4 — Interactions & Motion Design
**Priorité:** Moyenne | **Estimation:** 1-2 jours

### 4.1 Animations Globales
**Fichier:** `src/site/styles/global.css` (site public) + `src/admin/index.css` (admin)

```css
/* Fade up au scroll */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-up {
  animation: fadeUp 0.5s var(--ease-out) forwards;
}

/* Stagger pour les listes */
.stagger-children > * {
  opacity: 0;
  animation: fadeUp 0.4s var(--ease-out) forwards;
}
.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
/* ... etc */

/* Hover lift pour les cards */
.hover-lift {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

/* Shimmer loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(90deg, var(--neutral-100) 25%, var(--neutral-200) 50%, var(--neutral-100) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### 4.2 Page Transitions (Admin)
**Fichier:** `src/admin/AdminApp.jsx`

Utiliser `framer-motion` (déjà dans deps via `motion`) pour les transitions de page :

```jsx
import { AnimatePresence, motion } from 'motion/react';

// Wrapper pour les routes
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### 4.3 Micro-interactions
**Site public:**
- Boutons : scale(0.98) au clic
- Liens : underline animation de gauche à droite
- Images : zoom subtil au hover (1.02)
- Badges : pulse doux pour les "new"

**Admin:**
- Sidebar items : slide indicator à gauche sur hover
- Boutons : ripple effect minimal
- Table rows : highlight au hover avec transition

---

## Phase 5 — Responsive & Mobile-First Polish
**Priorité:** Haute | **Estimation:** 1 jour

### 5.1 Audit Mobile du Site Public
**Outils:** DevTools responsive + Lighthouse

**Points à vérifier/corriger:**
1. **Header** — Le menu mobile fonctionne mais manque d'animation
2. **Hero** — Le slider doit devenir un carousel swipeable sur mobile
3. **Grilles** — `grid-template-columns` avec `auto-fit` et `minmax()` partout
4. **Typography** — `clamp()` déjà utilisé, vérifier la lisibilité à 320px
5. **Touch targets** — Tous les boutons doivent faire minimum 44x44px
6. **Images** — Vérifier les `sizes` attributes pour éviter les images trop lourdes

### 5.2 Admin Mobile
**Problèmes connus:**
- La sidebar passe en Sheet sur mobile (déjà fait)
- Les tables sont difficiles à lire sur mobile

**Solutions:**
- Cards view alternative pour les tables sur < 768px
- Formulaires en full-width sur mobile
- Editor : toolbar simplifiée sur mobile

---

## Phase 6 — Performance & Accessibilité
**Priorité:** Haute | **Estimation:** 1 jour

### 6.1 Performance
1. **Préchargement critique** — `rel="preload"` pour la font et le CSS critique
2. **Lazy loading** — Déjà présent sur les images, vérifier les iframes
3. **CSS critique** — Inliner le CSS du above-the-fold dans `<head>`
4. **Réduction du CSS** — Éliminer les styles morts (outils comme `purgecss`)

### 6.2 Accessibilité (Audit)
1. **Contraste** — Vérifier tous les textes sur fond coloré (WCAG AA minimum)
2. **Focus visible** — Déjà bien géré, vérifier les nouveaux composants
3. **ARIA** — Ajouter `aria-current="page"` sur la nav active
4. **Réduction de mouvement** — Déjà géré, vérifier les nouvelles animations
5. **Screen reader** — Tester avec NVDA/VoiceOver les cartes et le slider

---

## Phase 7 — Testing & Validation
**Priorité:** Critique | **Estimation:** 1 jour

### 7.1 Checklist Visuelle
- [ ] Le site public a une identité visuelle cohérente
- [ ] L'admin reflète un dashboard CMS sobre, pas la palette food blog
- [ ] Le dark mode fonctionne sur les deux
- [ ] Les animations respectent `prefers-reduced-motion`
- [ ] Toutes les couleurs hardcodées sont remplacées par des tokens

### 7.2 Tests Navigateurs
- [ ] Chrome / Edge (Blink)
- [ ] Firefox (Gecko)
- [ ] Safari (WebKit) — Tester les container queries et :has()
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 7.3 Lighthouse Targets
- **Performance:** 95+
- **Accessibility:** 100
- **Best Practices:** 100
- **SEO:** 100

---

## Fichiers Clés à Créer/Modifier

### Nouveaux fichiers
```
src/shared/design-tokens.css
src/site/styles/site-theme.css
src/admin/styles/admin-theme.css
src/site/components/ui/Card.astro
src/site/components/ui/Badge.astro
src/site/components/ui/Button.astro
src/site/components/ui/Skeleton.astro
src/site/components/ui/SectionTitle.astro
src/site/components/ThemeToggle.astro
src/site/components/ProgressBar.astro
src/site/components/BackToTop.astro
src/admin/components/ui/EmptyState.jsx
src/admin/components/ui/StatCard.jsx
```

### Fichiers à modifier (sélection)
```
src/site/styles/global.css
src/admin/index.css
src/admin/App.css
src/site/components/BaseHead.astro
src/site/layouts/Layout.astro
src/site/layouts/RecipeLayout.astro
src/site/components/Header.astro
src/site/components/Footer.astro
src/pages/index.astro
src/site/components/RecipeCard.astro
src/admin/features/dashboard/pages/Dashboard.jsx
src/admin/components/AdminLayout.jsx
src/admin/components/AppSidebar.jsx
```

---

## Roadmap Proposée

| Phase | Durée estimée | Priorité |
|-------|--------------|----------|
| 1 — Design System | 1-2 jours | Critique |
| 2 — Site Public | 2-3 jours | Haute |
| 3 — Admin | 2-3 jours | Haute |
| 4 — Motion Design | 1-2 jours | Moyenne |
| 5 — Responsive | 1 jour | Haute |
| 6 — Perf & A11y | 1 jour | Haute |
| 7 — Testing | 1 jour | Critique |

**Total estimé:** 10-14 jours de travail concentré.

---

## Notes Techniques

1. **Tailwind v4** — Utiliser `@theme` pour étendre les tokens au lieu de `tailwind.config.js`
2. **Astro** — Les styles scoped sont compilés, privilégier les classes utilitaires Tailwind pour les composants réutilisables
3. **React 19** — Les composants admin peuvent utiliser les nouveaux hooks si pertinent
4. **shadcn/ui** — Mettre à jour les composants UI existants si une nouvelle version sort
5. **BlockNote** — Les overrides CSS doivent utiliser `!important` avec parcimonie, préférer les sélecteurs spécifiques
