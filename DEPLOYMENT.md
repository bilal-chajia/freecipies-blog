# Guide de Déploiement - Freecipies Blog

## 🚀 Options de Déploiement

### Option 1 : Cloudflare Pages (Recommandé - Automatique)

**Avantages :**
- ✅ Déploiement automatique à chaque push
- ✅ Preview URLs pour chaque PR
- ✅ HTTPS automatique
- ✅ CDN global gratuit
- ✅ Rollback facile

**Configuration :**

1. **Connectez votre repo à Cloudflare Pages**
   - Rendez-vous sur https://pages.cloudflare.com/
   - Cliquez sur "Create a project"
   - Connectez votre repository GitHub
   - Sélectionnez la branche `main`

2. **Paramètres de build**
   ```
   Framework preset: Astro
   Build command: pnpm build
   Build output directory: dist
   Root directory: /
   Node.js version: 20
   ```

3. **Variables d'environnement** (dans Cloudflare Pages Settings)
   ```
   JWT_SECRET=votre-secret-key
   ```

4. **Bindings** (à configurer dans l'interface)
   - **D1 Database** → `DB`
   - **R2 Bucket** → `IMAGES`
   - **KV Namespace** → `SESSION`

5. **Déclencheurs**
   - Production : branche `main`
   - Preview : toutes les autres branches

---

### Option 2 : GitHub Actions (CI/CD)

**Fichier déjà créé :** `.github/workflows/deploy.yml`

**Configuration requise :**

1. **Créer un token API Cloudflare**
   - Allez sur https://dash.cloudflare.com/profile/api-tokens
   - Créez un token avec les permissions "Cloudflare Pages: Edit"
   - Copiez le token

2. **Ajouter les secrets GitHub**
   - Dans votre repo GitHub → Settings → Secrets and variables → Actions
   - Ajoutez :
     ```
     CLOUDFLARE_API_TOKEN=votre-token
     CLOUDFLARE_ACCOUNT_ID=votre-account-id
     ```

3. **Déclenchement automatique**
   - Chaque push sur `main` déploie automatiquement
   - Les PR créent des previews

---

### Option 3 : Déploiement Manuel

**Utilisez les scripts npm :**

```bash
# Build + Deploy en une commande
pnpm deploy

# Ou via le script Windows
pnpm deploy:local
```

**Ou manuellement :**
```bash
pnpm build
wrangler pages deploy dist --project-name=freecipies-blog
```

---

## 🔧 Prérequis

### 1. Installer Wrangler CLI
```bash
pnpm add -g wrangler
```

### 2. Authentifier Wrangler
```bash
wrangler login
```

### 3. Créer le projet Cloudflare Pages
```bash
wrangler pages project create freecipies-blog
```

---

## 📝 Workflow Recommandé

### Développement Local
```bash
# Travailler en local
pnpm dev

# Tester avec les bindings Cloudflare
pnpm build
pnpm preview
```

### Déploiement en Production
```bash
# Option 1 : Push vers main (automatique avec GitHub Actions ou Cloudflare Pages)
git add .
git commit -m "feat: votre message"
git push origin main

# Option 2 : Déploiement manuel
pnpm build
pnpm deploy
```

---

## 🌐 URLs de Déploiement

Après déploiement, vous aurez :

- **Production** : `https://freecipies-blog.pages.dev`
- **Preview** (par PR) : `https://<branch>--freecipies-blog-<id>.pages.dev`

Vous pouvez aussi connecter votre domaine personnalisé dans Cloudflare Pages Settings.

---

## 🔍 Vérification Post-Déploiement

1. ✅ Vérifiez que la page auteur fonctionne : `/authors/chef-maria`
2. ✅ Testez les images et les liens sociaux
3. ✅ Vérifiez le responsive sur mobile
4. ✅ Contrôlez les erreurs dans la console Cloudflare

---

## 🐛 Dépannage

### Build échoue
```bash
# Nettoyer le cache et rebuild
rm -rf node_modules/.vite dist
pnpm install
pnpm build
```

### Erreur de bindings D1/R2
- Vérifiez que les ressources sont liées dans Cloudflare Pages Settings
- Vérifiez `wrangler.toml` pour les noms corrects

### Erreur d'authentification
- Vérifiez que `JWT_SECRET` est configuré
- Vérifiez les permissions du token API

---

## 💡 Tips

- **Preview URLs** : Parfait pour tester avant de merger
- **Environment variables** : Utilisez des secrets pour les données sensibles
- **Branches** : Chaque branche crée une URL de preview unique
- **Rollback** : Possible depuis le dashboard Cloudflare Pages
- **Analytics** : Activez Cloudflare Analytics pour suivre les performances
