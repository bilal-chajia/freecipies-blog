# 🔍 Rapport de Performance Frontend — Freecipies Blog

> **Méthode**: Lighthouse (preset desktop) + Playwright Performance API
> **Runtime**: build production via `pnpm preview` (Astro build + Wrangler dev), `http://127.0.0.1:8787`
> **Date**: 2026-06-15 · **Branche**: `perf/site-cwv-fonts`
>
> ⚠️ Ce rapport remplace une version antérieure (estimations « Perf ~75 », blocages
> images/CLS/`client:load`) qui s'est révélée **totalement obsolète** après mesure réelle.

---

## 🏆 Scores Lighthouse (mesurés, pas estimés)

| Catégorie | Accueil `/` | Recette `/recipes/pasta-carbonara` |
|-----------|:-----------:|:----------------------------------:|
| **Performance** | **98** | **100** |
| **Accessibility** | 92 → *(corrigé, voir §3)* | 96 → *(corrigé, voir §3)* |
| **Best Practices** | 81 → *(corrigé, voir §2)* | 100 |
| **SEO** | 100 | 100 |

### Core Web Vitals — Accueil
| Métrique | Valeur | Seuil « good » | Statut |
|----------|--------|----------------|--------|
| FCP | 0.3 s | < 1.8 s | ✅ |
| LCP | 1.1 s | < 2.5 s | ✅ |
| TBT | 0 ms | < 200 ms | ✅ |
| CLS | 0.001 | < 0.1 | ✅ |
| Speed Index | 0.5 s | < 3.4 s | ✅ |
| TTI | 1.1 s | < 3.8 s | ✅ |

Les fonts self-hostées (commits `844e36e`, `94c17ef`) sont préchargées et arrivent
tôt (~262 ms) — la chaîne cross-origin Google Fonts est éliminée.

---

## 1. Problème principal identifié : StoriesBar AMP prérendue (accueil) — ✅ CORRIGÉ

Tous les gros diagnostics de l'accueil convergeaient vers un seul coupable : le
composant `StoriesBar` chargeait **en eager** le runtime `amp-story-player`
(`cdn.ampproject.org`) qui upgradait le `<amp-story-player>` et **prérendait toutes
les slides**, même barre fermée (`visibility:hidden`).

| Diagnostic Lighthouse | Coût | Origine |
|-----------------------|------|---------|
| `image-delivery` | **836 KiB** | covers `lg` des stories prérendues (ex. `brown-butter-choc-chunk-cookies-lg` = 272 KiB) chargées dans une iframe invisible |
| `unused-javascript` | **97 KiB** | 100 % AMP : `v0.js` + `amp-story-1.0.js` |
| `best-practices 81` | — | quasi-entièrement dû à AMP (deprecations + JS inutilisé + warning iframe sandbox) |

### Correctif appliqué
`src/site/scripts/stories-player.ts` + `src/site/components/StoriesBar.astro` :
- Suppression des balises `<link>`/`<script>` AMP eager.
- Chargement **paresseux** du runtime + CSS sur **intention utilisateur**
  (`pointerenter` / `focusin` / `touchstart` sur la barre = préchargement, ou au
  premier clic sur un ring).
- Les rings restent des liens vers la page AMP standalone tant que le runtime
  n'est pas chargé (progressive enhancement préservé ; fallback navigation si le
  runtime échoue à charger).

**Gain**: l'accueil ne charge plus ~96 KiB de JS tiers ni ~830 KiB d'images de
covers au chargement initial.

---

## 2. Best Practices (accueil) — ✅ adressé via §1

Le score 81 provenait essentiellement du runtime AMP eager (deprecations, JS
inutilisé, warning « iframe sandbox allow-scripts + allow-same-origin »). En
différant AMP (§1), ces signaux disparaissent du chargement initial.

`bf-cache` : 2 raisons d'échec restantes (mineur, lié aux headers cache du runtime
de preview ; à revalider en prod Cloudflare).

---

## 3. Accessibilité — ✅ CORRIGÉ

Lighthouse signalait `color-contrast` sur de nombreux éléments en texte atténué
(`.foxiz-tag`, `.meta-item`, `.breadcrumb-link`, `.author-role`, `.meta-label`,
captions…) — cause racine systémique : le token `--text-tertiary` (`#7b857c`)
n'atteignait que ~3.7:1 sur `--bg` (`#fcfbfa`), sous le seuil WCAG AA 4.5:1.

### Correctifs appliqués
- `src/site/styles/site-theme.css` : `--text-tertiary` foncé `#7b857c → #677068`
  (≥4.7:1, y compris sur les surfaces teintées `#f3f6f3` des panneaux
  d'ingrédients ; même teinte sage-gray). Le dark-mode passait déjà (~6.8:1).
- `src/pages/index.astro` : `.meta-item` passe de `opacity:0.9` à
  `color: var(--text-secondary)` (déterministe) ; `.foxiz-tag` en
  `--text-secondary` + `min-height: 24px` (cible tactile `target-size`).

- `src/pages/index.astro` : `.foxiz-card-title a` en `inline-block` +
  `min-height: 24px` → cible tactile conforme (`target-size`).

**Résultat** : accueil **100/100/100/100**, recette **100/100**, `target-size` et
`color-contrast` à 100 sur les deux pages.

---

## 4. Axes secondaires (faible priorité, non traités)

- **Render-blocking ~110 ms** : `Layout.*.css` (34 KiB) + `index.*.css` (3 KiB)
  bloquent le premier paint. Marge faible (LCP déjà à 1.1 s).
- **Images de cartes (`image-delivery`)** : le coupable lourd — les rings de la
  StoriesBar chargeaient la variante `sm` (720×720, ~80–136 KiB) pour un affichage
  64px — est **corrigé** : `build-preview.ts` résout désormais la variante la plus
  petite (`xs`) via `PREVIEW_VARIANT_ORDER`. Savings `image-delivery` 603 → 477 KiB.
  Le reliquat est constitué d'images **lazy sous la ligne de flottaison** (aucun
  impact CWV) + marge de compression au niveau de la génération des variantes R2.
- **Recette : ~54 KiB React** (vendor `client.*.js`) pour `RatingSystem` —
  acceptable vu TBT=0 ; hydratable en `client:visible` si besoin un jour.

---

## ✅ Vérifications

```bash
# Build prod + runtime Wrangler
pnpm preview        # http://127.0.0.1:8787

# Lighthouse (preset desktop)
npx lighthouse http://127.0.0.1:8787/ --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo

# Web Vitals via Playwright Performance API : voir l'analyse de session.
```
