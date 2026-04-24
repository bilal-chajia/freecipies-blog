# Plan d'Amélioration du Design Frontend — Freecipies CMS

> **But:** Unifier et moderniser l'expérience visuelle du site public et de l'admin. Créer un design system cohérent, accessible, et identifiable.

---

## Phase 1 — Fondation : Design System Unifié
**Priorité:** Critique | **Estimation:** 1-2 jours

### 1.1 Créer un fichier de tokens partagé
**Fichier:** `src/shared/design-tokens.css`

Ce fichier devient la source unique de vérité pour les couleurs, typographies, espacements, et ombres. Il est importé dans :
- `src/styles/global.css` (site public)
- `src/admin/index.css` (admin)

```css
@layer tokens {
  :root {
    /* === Marque === */
    --brand-primary: #e74c3c;
    --brand-primary-hover: #c0392b;
    --brand-secondary: #ff6b35;
    --brand-accent: #f7931e;
    --brand-gradient: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);

    /* === Neutres === */
    --neutral-900: #1a1a1a;
    --neutral-800: #333333;
    --neutral-700: #555555;
    --neutral-600: #777777;
    --neutral-500: #999999;
    --neutral-400: #b0b0b0;
    --neutral-300: #d0d0d0;
    --neutral-200: #e0e0e0;
    --neutral-100: #f0f0f0;
    --neutral-50: #f8f9fa;

    /* === Espacements (échelle 4px) === */
    --space-1: 0.25rem;   /* 4px  */
    --space-2: 0.5rem;    /* 8px  */
    --space-3: 0.75rem;   /* 12px */
    --space-4: 1rem;      /* 16px */
    --space-5: 1.25rem;   /* 20px */
    --space-6: 1.5rem;    /* 24px */
    --space-8: 2rem;      /* 32px */
    --space-10: 2.5rem;   /* 40px */
    --space-12: 3rem;     /* 48px */
    --space-16: 4rem;     /* 64px */
    --space-20: 5rem;     /* 80px */

    /* === Typographie === */
    --font-sans: 'Source Sans 3', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    --text-xs: 0.75rem;   /* 12px */
    --text-sm: 0.875rem;  /* 14px */
    --text-base: 1rem;    /* 16px */
    --text-lg: 1.125rem;  /* 18px */
    --text-xl: 1.25rem;   /* 20px */
    --text-2xl: 1.5rem;   /* 24px */
    --text-3xl: 1.875rem; /* 30px */
    --text-4xl: 2.25rem;  /* 36px */

    /* === Rayons === */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-full: 9999px;

    /* === Ombres === */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
    --shadow-xl: 0 16px 48px rgba(0,0,0,0.16);
    --shadow-hover: 0 12px 32px rgba(0,0,0,0.14);

    /* === Transitions === */
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-spring: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);

    /* === Z-Index scale === */
    --z-dropdown: 100;
    --z-sticky: 200;
    --z-modal: 300;
    --z-popover: 400;
    --z-toast: 500;
  }
}
```

### 1.2 Importer les polices Google Fonts
**Fichier:** `src/components/BaseHead.astro`

Ajouter les liens de préchargement pour Playfair Display et Source Sans 3 (variable fonts pour performance) :

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" />
```

### 1.3 Unifier les couleurs dans les composants existants
**Fichiers à modifier:**
- `src/components/Header.astro` — remplacer `#ff6b35` par `var(--brand-secondary)`
- `src/components/Footer.astro` — remplacer `#ff6b35` par `var(--brand-secondary)`
- `src/pages/index.astro` — remplacer toutes les couleurs hardcodées par les tokens
- `src/layouts/RecipeLayout.astro` — idem
- `src/components/RecipeCard.astro` — idem

**Action:** Remplacer TOUTES les valeurs hexadécimales répétées par des variables CSS.

---

## Phase 2 — Site Public : Modernisation Visuelle
**Priorité:** Haute | **Estimation:** 2-3 jours

### 2.1 Dark Mode Natif
**Fichiers:** `src/layouts/Layout.astro`, `src/styles/global.css`

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

**Composant:** Créer `src/components/ThemeToggle.astro` avec persistance en `localStorage`.

### 2.2 Composants UI Réutilisables (Site Public)
Créer `src/components/ui/` avec des composants Astro réutilisables :

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
**Fichiers:** `src/layouts/RecipeLayout.astro`, `src/layouts/ArticleLayout.astro`

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

### 3.1 Thème Custom shadcn/ui
**Fichier:** `src/admin/index.css`

Remplacer le thème zinc par un thème à la marque :

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 10%;
  --primary: 6 78% 57%;        /* #e74c3c */
  --primary-foreground: 0 0% 100%;
  --secondary: 30 100% 60%;    /* #ff9933 */
  --secondary-foreground: 0 0% 10%;
  --accent: 24 95% 53%;        /* #f7931e */
  --accent-foreground: 0 0% 100%;
  --muted: 30 10% 96%;
  --muted-foreground: 0 0% 45%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 30 10% 90%;
  --input: 30 10% 90%;
  --ring: 6 78% 57%;
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
**Fichier:** `src/admin/pages/dashboard/Dashboard.jsx`

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
**Fichier:** `src/styles/global.css` (site public) + `src/admin/index.css` (admin)

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
- [ ] L'admin reflète la marque (couleurs, logo)
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
src/components/ui/Card.astro
src/components/ui/Badge.astro
src/components/ui/Button.astro
src/components/ui/Skeleton.astro
src/components/ui/SectionTitle.astro
src/components/ThemeToggle.astro
src/components/ProgressBar.astro
src/components/BackToTop.astro
src/admin/components/ui/EmptyState.jsx
src/admin/components/ui/StatCard.jsx
```

### Fichiers à modifier (sélection)
```
src/styles/global.css
src/admin/index.css
src/admin/App.css
src/components/BaseHead.astro
src/layouts/Layout.astro
src/layouts/RecipeLayout.astro
src/components/Header.astro
src/components/Footer.astro
src/pages/index.astro
src/components/RecipeCard.astro
src/admin/pages/dashboard/Dashboard.jsx
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
