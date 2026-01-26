# Pin Builder v2 – conception pour améliorer la création de pins

## Contexte actuel (résumé express)
- Côté articles: génération de pins ad hoc à partir de données article (bindings simples), via le canvas Konva; pas d’orchestration multi-variantes.
- `PinCanvas`: gère déjà le rendu/édition (Konva + Zustand). `useImageLoader` précharge via `/api/proxy-image`.
- Données: binding direct (`getValue/resolveBinding`) depuis `articleData`, peu de validations ni de typage des slots (image/text).
- Export: logique d’export locale; pas de pipeline serveur ni de files d’attente.
- Manques: pas de “1 article → N pins” automatisé, pas de pipeline média (crop/variants/placeholders), pas de versioning/approbation, pas de génération multi-formats (idea pin/story), peu d’observabilité.

## Flux cible centré article → pins
1) **Entree**: un article (slug/id) + selection d'un template approuve + parametres (formats souhaites, nombre de variantes, mode rapide/avance).
2) **Resolution des donnees**: binding robuste (fallbacks, rapport de completude) et selection des images via ArticleImagesJson (variants optimales par slot).
3) **Generation de variantes**: orchestrateur cree plusieurs candidates par article en jouant sur palette/copy/layout (controle, non aleatoire).
4) **Rendu client**: PinCanvas exporte le PNG (sans compression) et l'upload vers R2 via URL signee; manifest JSON associe.
5) **Revue + selection**: UI "Pins pour article" liste les candidates (miniatures) avec score heuristique (lisibilite contraste, densite texte) et permet d'en retenir/publier.
6) **Publication**: export final (URLs signees), + hook de planification vers Pinterest (futur).

## Objectifs clés
- Générer des lots de pins cohérents à partir d’un article (1→N variantes), multi-formats (2:3, 1:1, 9:16).
- Renforcer la robustesse (chargement images, CORS, fallback, validations de bindings) et la vitesse (préchargement, cache, worker render).
- Industrialiser l’export: rendu déterministe, queue/worker, stockage des assets, WebP/PNG optimisés.
- Sécurité produit: versioning, approbation, et sauvegarde automatique des états.

## Architecture proposée

### 1) Modèle de template v2 (source unique)
- `template` enrichi: `{ id, slug, name, description, width, height, aspectRatio, themeTokens, fonts[], brandPalette[], safeZones[] }`.
- Slots typés: `slots: [{ id, type: 'image'|'text'|'shape', required, bindingHint, constraints: { aspect?, minRes?, ratioLock? }, defaults, effects, zIndex }]`.
- Variantes: `formats: [{ ratio, width, height, bleed?, exportPreset }]` pour générer auto plusieurs surfaces.
- Sécurité: `version`, `created_by`, `approved_by`, `status: draft|ready|archived`.

### 2) Couche data/binding robuste
- Résolveur central (server + client): prend `articleData` et applique les `bindingHint` + fallbacks (`title -> headline -> slug`).
- Validation au chargement du template: rapport des bindings manquants, dégradations contrôlées (placeholder texte/image).
- Images: utiliser `ArticleImagesJson` (variants xs/sm/md/lg/original) + utilitaires `getBestVariantUrl` pour choisir la meilleure résolution par slot.

### 3) Pipeline média
- Ingestion: proxy existant évolué → resize/normalize en worker (WebP + placeholder LQIP) et stockage durable (R2/S3). Stocker `MediaVariantsJson`.
- Sélecteur de crop: pour chaque image slot, proposer des crops guidés (focus face/food), garde fou sur résolution.
- Cache: CDN + signature d’URL pour protéger le proxy; TTL cohérent (1h) + revalidation forcée sur sauvegarde.

### 4) Runtime éditeur (PinCanvas)
- Multi-surface: même session ouvre plusieurs canvases (2:3, 1:1) avec état partagé des bindings; chaque surface peut avoir overrides.
- Performance: séparer Layer “guides/ui” vs “content”, throttling des drag, batch update Konva; limiter re-render en mémoïsant `elements`.
- Accessibilité du texte: éditeur inline avec validation (longueur max par slot).
- Autosave + snapshots: chaque action push un diff (compresse) pour annuler/restaurer; autosave en brouillon serveur.

### 5) Génération de variantes (batch)
- Entrée: `templateId`, `articleId`, `formats[]`, `variantsCount`, `promptOverrides?`.
- Stratégies: 
  - `palette` (varie couleurs secondaires),
  - `layout` (permutation de quelques slots optionnels),
  - `copy` (accroches alternatives, contraintes de caractères).
- Orchestrateur: envoie N jobs vers un worker de rendu; renvoie un tableau de candidates avec score heuristique (contraste lisible, densité texte, ratio image).

### 6) Export & publication
- Service `PinRenderWorker` (headless Canvas/Node) : charge template + data, résout bindings, injecte images (pré-cropées), rend en WebP/PNG.
- Queue (Bull/Redis) pour les exports; état: queued → rendering → optimizing → stored.
- Stockage: dossier par campagne `{articleSlug}/pins/{templateSlug}/{variantId}.webp` + JSON manifest (bindings, overrides, hashes).
- Livraison: URL signées + webhook/callback pour l’admin; option de push vers Pinterest scheduler plus tard.

### 7) Gouvernance & qualité
- Versioning: verrouillage d’une version quand “prête”; duplicata pour itérations.
- Approvals: rôle reviewer valide un template avant diffusion; check-list (contraste AA, text length, bindings remplis).
- Observabilité: logs des échecs de rendu, temps de fetch image, erreurs CORS; métriques `p95_render`, taux de bindings manquants.

## MVP article-first (ordre)
1) Nouveau schéma template/slots + validations bindings côté client (toast + badge par slot).
2) Écran “Pins d’article”: choisir template + article → liste de bindings validés + preview d’une première pin (2:3).
3) Sélecteur d’images basé sur `ImageVariants` + fallback placeholder; proxy sécurisé (signature + maxSize).
4) Export pipeline minimal côté serveur: `POST /api/pins/render` (templateId + articleId) → WebP 2:3, manifest JSON; sans queue au début.
5) Génération de 3 variantes auto (palette/copy) par article/template; présentation en grille pour sélection et archivage des rejets.

## Flux post-publication (articles/recipes/roundups → file d’attente pins)
1) **Trigger**: on `article/recipe/roundup` publié ou mis à jour → event bus `article.published`.
2) **Queue**: job `pin_generation.enqueue` créé avec `{ articleId, type, slug, templateIds[], formats[] }`.
3) **Préparation** (worker 1): 
   - Résout bindings + rapport manquants.
   - Sélectionne les images optimales (`ImageVariants`) ou placeholders.
   - Génère les variantes (palette/copy/layout) selon config de la file (ex: 3 candidates).
4) **Rendu** (client) : PinCanvas exporte le PNG (original sans compression) depuis le navigateur; upload vers R2 via URL signée fournie par l’API. Manifest JSON envoyé avec l’upload.
5) **Indexation**: le serveur enregistre la pin comme `generated`, score heuristique, liens assets R2.
6) **Notification**: notifie l’admin/UI “Pins à valider” (ou webhook) avec miniatures + résumé (bindings manquants, score contraste).
7) **Action**: l’admin valide/publie ou rejette; les rejets peuvent être purgés après TTL.

## UI: section Pinterest (existante)
- Ajouter un onglet `Pins` aux cotes de `Boards` et `Templates` (pas de nouvelle rubrique).
- L onglet `Pins` affiche la file (queued/generated/approved/rejected), les miniatures, le manifest (bindings/texte utilise) et les erreurs (ex: original manquant ou trop petit).
- Actions rapides : approuver/rejeter, copier l URL R2, envoyer au scheduler Pinterest, telecharger le PNG brut (sans compression).

## Points d’intégration code
- `useImageLoader`: brancher sur utilitaire image variants, ajouter placeholder + abortController pour annuler fetch sur changement rapide.
- `PinCanvas`: support multi-surface (tabs) + layer split; limiter `keepRatio` et snap par slot constraints.
- `dataBinding.ts`: centraliser la résolution + validation + suggestions; exposer un rapport de complétude pour l’UI.
- API: endpoint pour URL signée d’upload R2 (`POST /api/pins/upload-url`), endpoint d’enqueue `POST /api/pins/enqueue`, et endpoints de statut/liste (`/api/pins/:articleId`).

## Risques & mitigations
- **Performances**: trop de re-render Konva → isoler state des éléments vs UI; mémo des images; throttle drag.
+- **CORS/qualité image**: proxy signé + resize côté worker; rejeter < minRes.
+- **Complexité UX**: garder un mode “Rapide” (choix template + dataset + 3 variantes auto) et un mode “Avancé” (édition fine).
+- **Coût stockage**: compresser en WebP + TTL sur variantes rejetées; nettoyage programmé des drafts.
