# YowNews — Contexte Admin / Éditeur / Lecteur

Documentation de l'architecture de l'espace authentifié (admin, éditeur, lecteur) pour accélérer les futures sessions de développement.

---

## 1. Espaces et rôles

| Espace      | URL prefix     | Rôle KSM requis                          | Constante TS                         |
|-------------|----------------|------------------------------------------|--------------------------------------|
| Admin       | `/admin`       | `ROLE_SUPER_EDUCATION_SERVICES_MANAGER`  | `ADMIN_ROLE` dans `src/lib/roles.ts` |
| Éditeur     | `/editor`      | `ROLE_EDUCATION_EDITOR_PERMISSIONS`      | `EDITOR_ROLE`                        |
| Lecteur     | `/reader`      | Authentifié (pas de rôle spécifique)     | —                                    |

Les rôles ORGANIZATION-scoped ont un suffixe `#ORGANIZATION:<orgId>` dans le token ; `hasRole()` dans `src/lib/roles.ts` le retire avant comparaison.

**Comptes de test** :
- Admin : `admin@yownews.com` / `Demo@2024!` → `SUPER_EDUCATION_SERVICES_MANAGER` (TENANT scope)  
  `firstName='YowNews'`, `lastName='Admin'`, `id=00000000-0000-0000-0000-100000000005`
- Éditeur : `editor@yownews.com` / `Demo@2024!` → `EDUCATION_EDITOR_PERMISSIONS` (ORGANIZATION scope)  
  `firstName='YowNews'`, `lastName='Editor'`, `id=00000000-0000-0000-0000-100000000012`

---

## 2. Layout partagé — AdminSidebar

**Fichier** : `src/app/[locale]/admin/_components/AdminSidebar.tsx`

Un seul composant sidebar partagé, contrôlé par la prop `variant: 'admin' | 'editor' | 'reader'`.

### Props

```tsx
<AdminSidebar displayName={displayName} email={session.user.email} variant="admin" />
```

### Comportement

- **Repliée (72px)** : seul le bouton hamburger est visible (logo/label masqués via `{!collapsed && ...}`)
- **Déployée (240px)** : logo YN + label du workspace actif + liens de nav
- `displayName` : `firstName + ' ' + lastName || username || email` (calculé dans le layout)
- `variant` détermine : `isAdmin`, `isReader`, le préfixe de route (`/admin`, `/editor`, `/reader`), le badge de rôle

### Session / displayName (layouts)

```typescript
// src/app/[locale]/admin/layout.tsx (idem editor et reader)
const displayName =
  [session.user.firstName, session.user.lastName].filter(Boolean).join(' ')
  || session.user.username
  || session.user.email;
```

L'email n'est JAMAIS affiché dans la sidebar (sécurité) ; il reste accessible uniquement sur la page profil de chaque utilisateur.

---

## 3. SessionUser — type et session Redis

**Fichier** : `src/lib/types/auth.ts`

```typescript
export interface SessionUser {
  id: string;
  email: string;
  username?: string;      // stocké en session depuis KSM login
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions?: string[];
  tenantId?: string;
}
```

Le champ `username` est populé à la connexion depuis `KsmLoginSession.username` dans `src/app/api/auth/login/route.ts`. Les sessions antérieures (avant cet ajout) ne l'ont pas — re-login requis pour l'avoir.

**Redis** : host `localhost:6380` (pas 6379), configuré dans `src/server/session.ts`.

---

## 4. Structure de navigation

### Groupes de nav admin (navGroups)

```
Tableau de bord     /admin/dashboard
─────────────────────────────────────
Contenu
  • Feed            /admin/feed
  • Blogs           /admin/blogs
  • Cours           /admin/courses
  • Podcasts        /admin/podcasts
─────────────────────────────────────
Gestion
  • Utilisateurs    /admin/users
  • Demandes        /admin/role-requests
  • Education  ▾
      – Blogs       /admin/blogs
      – Cours       /admin/courses
      – Podcasts    /admin/podcasts
      – Catégories  /admin/categories
      – Tags        /admin/tags
  • Newsletter ▾    (dropdown)
      – Mes newsletters    /admin/newsletters
      – Catégories         /admin/newsletters/categories
      – Rédacteurs         /admin/newsletters/redacteurs
  • Forums          /admin/forums
─────────────────────────────────────
Mon espace
  • Profil          /admin/profile
  • Favoris         /admin/favorites
```

### Éditeur (variant='editor')

```
Tableau de bord     /editor/dashboard
Feed                /editor/feed
Blogs               /editor/blog
Cours               /editor/course
Podcasts            /editor/podcast
Newsletter          /editor/newsletter    (lien direct, pas de dropdown)
Forums              (non présent éditeur)
Profil              /editor/profile
```

### Lecteur (variant='reader')

```
Feed                /reader/feed
Newsletter          /reader/newsletter
Forums              /reader/forums
Profil              /reader/profile
```

---

## 5. Module Newsletter

### Pages admin

| Route                              | Composant principal               | Accès          | Description                                               |
|------------------------------------|-----------------------------------|----------------|-----------------------------------------------------------|
| `/admin/newsletters`               | `NewslettersAdminWorkspace`       | Admin + Éditeur| Onglets : "Mes newsletters" + "Modération" (admin seul)   |
| `/admin/newsletters/categories`    | `CategoriesManager`               | Admin only     | CRUD catégories de newsletter                             |
| `/admin/newsletters/redacteurs`    | `RedacteursWorkspace`             | Admin only     | 2 onglets : "Demandes rédacteurs" + "Validation de contenu"|

### Page éditeur

| Route                   | Composant principal  | Description                        |
|-------------------------|----------------------|------------------------------------|
| `/editor/newsletter`    | `NewsletterWorkspace`| Idem "Mes newsletters" côté admin  |

### Flux inscription rédacteur

`NewsletterWorkspace` (partagé admin/éditeur) :
1. `GET /api/newsletter/redacteurs/me` → KSM `GET /api/v1/newsletter/redacteurs/me?userId=...`
   - 404 → affiche `RequestForm` (formulaire d'inscription)
   - PENDING → message "Demande en attente"
   - APPROVED → affiche `ContentTabs` (rédaction)
   - REJECTED → message + raison
2. `POST /api/newsletter/redacteurs` → KSM `POST /api/v1/newsletter/redacteurs?userId=...`
   - Body : `{ nom, prenom, email, categories: [{nom, isCustom}] }`
   - `nom` = `session.user.lastName || session.user.email`
   - `prenom` = `session.user.firstName || session.user.username || '-'` (jamais vide)

### API routes Next.js → KSM

```
GET  /api/newsletter/categories              → GET  /api/v1/newsletter/categorie
POST /api/newsletter/categories              → POST /api/v1/newsletter/categorie
PUT  /api/newsletter/categories/[id]         → PUT  /api/v1/newsletter/categorie/:id
DEL  /api/newsletter/categories/[id]         → DEL  /api/v1/newsletter/categorie/:id

POST /api/newsletter/redacteurs              → POST /api/v1/newsletter/redacteurs?userId=...
GET  /api/newsletter/redacteurs/me           → GET  /api/v1/newsletter/redacteurs/me?userId=...

POST /api/newsletter/newsletters             → POST /api/v1/newsletter/newsletters?userId=...
GET  /api/newsletter/newsletters/mine        → GET  /api/v1/newsletter/newsletters/author/:userId
POST /api/newsletter/newsletters/[id]/submit → POST /api/v1/newsletter/newsletters/:id/submit?userId=...
```

Module KSM newsletter : `src/server/ksm/modules/newsletter.ts`  
Toutes les réponses sont **brutes** (pas d'enveloppe `ApiResponse`) → parsing manuel via `readRaw<T>()`.

---

## 6. Permissions KSM (newsletter)

| Endpoint KSM                                      | Permission requise            |
|---------------------------------------------------|-------------------------------|
| POST `/api/v1/newsletter/redacteurs`              | `newsletter:newsletter:create`|
| GET  `/api/v1/newsletter/redacteurs/me`           | `newsletter:newsletter:create`|
| GET  `/api/v1/newsletter/admin/redacteurs/pending`| `newsletter:newsletter:read`  |
| POST `/api/v1/newsletter/admin/redacteurs/.../approve` | `newsletter:newsletter:update`|

---

## 7. Composants réutilisables (newsletter)

| Composant                       | Fichier                                                              | Rôle                                          |
|---------------------------------|----------------------------------------------------------------------|-----------------------------------------------|
| `NewsletterWorkspace`           | `src/app/[locale]/editor/newsletter/NewsletterWorkspace.tsx`         | Inscription + rédaction newsletters (partagé) |
| `NewslettersAdminWorkspace`     | `src/app/[locale]/admin/newsletters/NewslettersAdminWorkspace.tsx`   | Wrapper admin (Mes newsletters + Modération)  |
| `CategoriesManager`             | `src/app/[locale]/admin/newsletters/_components/CategoriesManager.tsx` | CRUD catégories                             |
| `RedacteursWorkspace`           | `src/app/[locale]/admin/newsletters/redacteurs/RedacteursWorkspace.tsx` | Demandes + validation contenu (admin)       |
| `RedacteurRequestsModeration`   | `src/app/[locale]/admin/newsletters/RedacteurRequestsModeration.tsx` | Approve/reject demandes rédacteur            |
| `NewsletterContentModeration`   | `src/app/[locale]/admin/newsletters/NewsletterContentModeration.tsx` | Validation newsletters soumises              |

---

## 8. Bugs corrigés (historique)

### Session — username non affiché
- **Problème** : L'email s'affichait dans la sidebar au lieu du username (risque sécurité)
- **Fix** : Ajout `username?: string` dans `SessionUser`, stocké depuis `KsmLoginSession.username` dans le login route, fallback `username || email` dans les layouts

### Sidebar — hamburger chevauchait le logo
- **Problème** : En mode replié (72px), le logo YN débordait sur le bouton hamburger
- **Fix** : `{!collapsed && <div logo+label />}` — logo masqué quand replié, bouton centré

### Newsletter — 500 sur inscription rédacteur
- **Problème** : `POST /api/newsletter/redacteurs` retournait 500 (KSM)
- **Cause** : `R2dbcDataIntegrityViolationException` non interceptée dans `NewsletterGlobalExceptionHandler` → catch-all → 500. Aussi : `prenom = ''` si `firstName` absent → `@NotBlank` KSM
- **Fix backend** : Handler `R2dbcDataIntegrityViolationException` → 409 + vérification email en amont dans `RedacteurService.createRequest`
- **Fix frontend** : `prenom = firstName || username || '-'` dans `src/app/api/newsletter/redacteurs/route.ts`

---

## 9. Architecture technique

- **Framework** : Next.js 15 (App Router), `next-intl` (i18n, locale dans l'URL)
- **Auth** : Iron-session + Redis (port 6380) — `readSession()` dans les layouts server
- **KSM** : Spring WebFlux (port 8081) — appelé via `callKsm()` dans `src/server/ksm/client.ts`
- **Rôles** : vérifiés côté server dans les layouts (redirect si non autorisé) ET côté client via `session.user.permissions ?? session.user.roles`
- **Composants partagés** : `AdminSidebar` avec prop `variant` — **ne pas dupliquer** en créant une sidebar séparée par espace
