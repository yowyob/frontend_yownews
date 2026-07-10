# YowNews — Espace Admin / Éditeur : contexte & décisions

> ⚠️ **Renommage de marque (session #7, 2026-07-10)** : le produit s'appelle désormais
> **Yowyob Education** (slug technique `yowyob-edu`). Identifiants renommés en conséquence
> côté code/config (client KSM `yowyob-edu-frontend`, code d'organisation `YOWYOB_EDU`, cookie
> `yowyob_edu_session`, emails `*@yowyob-edu.com`/`.local`, fichiers seed
> `V81__yowyob_edu_seed.sql`/`V82__yowyob_edu_editor_seed.sql`, classes
> `YowyobEduAdminBootstrap{Properties,Initializer}`). **Le reste de ce document n'a pas été
> réécrit** : toute la narration ci-dessous décrit des sessions passées où le produit
> s'appelait réellement "YowNews" — c'est exact pour l'époque décrite, pas l'état actuel des
> identifiants. Se référer au code courant (pas à ce doc) pour les valeurs exactes en vigueur.
> Le répertoire frontend garde le chemin `/home/devstack/Documents/frontend/yownews` (non
> renommé) ; seul le contenu (package npm, code, UI) a changé.

> Document de passation. Résume tout le travail réalisé sur l'espace d'administration
> de l'app **yownews** (Next 16 / next-intl) et son backend **KSM** (Spring WebFlux, hexagonal).
> Frontend réel = `/home/devstack/Documents/frontend/yownews` (port 3000). Le dossier
> `blog_podcasts` n'est QUE des maquettes UI. Backend = `/home/devstack/Documents/KSM_Kernel_Layer`.

## 1. Architecture & conventions

- **BFF (backend-for-frontend)** : yownews proxifie KSM (`KSM_BASE_URL=http://localhost:8081`) via
  `callKsm()` (`src/server/ksm/client.ts`). Envoie toujours `X-Client-Id` + `X-Api-Key` ; si session :
  `Authorization: Bearer`, `X-Tenant-Id`, `X-Organization-Id` (résolu via `resolvePlatformOrganizationId()`).
- **Sessions** : iron-session + Redis (port hôte **6380**, pas 6379).
- **Routing** : next-intl, routes sous `src/app/[locale]/`, navigation via `@/i18n/navigation`
  (Link/usePathname/useRouter), PAS `next/navigation` (sauf `redirect` serveur).
- **Réponses KSM** : la plupart sont enveloppées `{success,data,errorCode,message}` → `unwrapKsm`.
  **Le module education renvoie des entités BRUTES** → on utilise `callKsm({raw:true})` + parsing maison
  (`src/server/ksm/modules/education.ts`). Routes BFF : `handleRoute` + `readSession()` → `fail(401)`.

## 2. Détection des rôles (côté frontend)

Le backend `RolesPermissionResolver.mapAuthorities` injecte, pour chaque rôle assigné :
- `ROLE_<CODE>` **uniquement** si scope SYSTEM/TENANT, **plus** `ROLE_<CODE>#<scope>` dans tous les cas
  (`#TENANT`, `#ORGANIZATION:<id>`, `#AGENCY:<id>`) ;
- chaque permission, idem (bare si SYSTEM/TENANT, + suffixe de scope).

`src/lib/roles.ts` :
- `ADMIN_ROLE = 'ROLE_SUPER_EDUCATION_SERVICES_MANAGER'` (scope **TENANT**) → `isPlatformAdmin()`.
- `EDITOR_ROLE = 'ROLE_EDUCATION_EDITOR_PERMISSIONS'` (scope **ORGANIZATION**) → `isEducationEditor()`.
- Détection = `authorities.some(a => a.split('#')[0] === ROLE)` (on retire le suffixe de scope).

## 3. Espace ADMIN (livré)

- Détection admin par `ROLE_SUPER_EDUCATION_SERVICES_MANAGER` (zéro changement backend).
- Layout `src/app/[locale]/admin/layout.tsx` : garde `readSession` + `isPlatformAdmin` (sinon redirect).
- Composants `_components/` : `AdminSidebar` (prop `variant: 'admin'|'editor'`), `AdminTopbar`,
  `DashboardView` (présentationnel partagé), `TaxonomyManager` (CRUD catégories/tags).
- Pages : `dashboard`, `users` (**réel** — voir §5bis), `categories` (réel), `tags` (réel).
- Login : admin → `/admin/dashboard`, éditeur → `/editor/dashboard`, sinon `/`.

### Gestion des utilisateurs = RÉEL (livré — voir §5bis)
La page Utilisateurs liste désormais les **vrais comptes** du tenant via `GET /api/admin/users` (BFF →
`GET /api/administration/users`) et permet de **changer le rôle** via le ⋮. **Deux rôles seulement** :
**Rédacteur** (`EDUCATION_EDITOR_PERMISSIONS`) et **Lecteur** (`EDUCATION_READER_PERMISSIONS`).
`SEED_USERS` a été supprimé.

### Catégories / Tags = RÉEL
- Onglets de nav (plus des dropdowns) → pages centrales type « table users » : Nom, Description,
  Date de création, ⋮ (Modifier/Supprimer).
- Endpoints KSM `/api/v1/education/{categories,tags}` : **catégories = CRUD complet**,
  **tags = pas de DELETE** (GET/POST/PUT) → ⋮ Tags sans « Supprimer » (`canDelete={false}`).
- BFF : `src/server/ksm/modules/education.ts` + routes `src/app/api/education/{categories,tags}[/[id]]`.

## 4. Dé-duplication du rôle admin (backend, livré)

`SUPER_EDUCATION_SERVICES_MANAGER` n'est plus codé en dur dans le SQL. Source unique = template Java
`AdministrationApplicationService.defaultRoleTemplates`. `YowNewsAdminBootstrapInitializer`
(`IWM_BOOTSTRAP_YOWNEWS_ADMIN_ENABLED=true`) provisionne le rôle (`provisionDefaultRoles`) puis l'assigne
à `admin@yownews.com`. `V81__yownews_seed.sql` ne garde que les fixtures (client BFF, actor, org, agency,
souscriptions, compte user).

## 5. Compte ÉDITEUR de test (ce lot)

But : un compte avec le rôle **EDUCATION_EDITOR_PERMISSIONS** pour tester la création de blogs/cours,
en attendant le flux réel (user simple → demande de rôle rédacteur → validation admin), pas encore possible.

- **Seed** `V82__yownews_editor_seed.sql` : actor (`…011`) + user_account (`…012`)
  `editor@yownews.com` / `Demo@2024!` (même hash bcrypt que l'admin).
- **Assignation** : faite par `YowNewsAdminBootstrapInitializer` (le rôle est ORGANIZATION-scoped →
  assignation au scope ORGANIZATION avec l'org YowNews `…002`). Pas de SQL en dur de l'assignation
  (l'id du rôle est généré au runtime par `provisionDefaultRoles`).
- **Espace éditeur** `/editor` : réutilise `AdminSidebar variant="editor"` + `AdminTopbar` + `DashboardView`,
  **sans** les onglets Utilisateurs / Catégories / Tags. Garde = `isEducationEditor` (admin toléré).

### Pour activer le compte éditeur
1. Redémarrer le backend KSM (Liquibase applique V82 ; l'initializer assigne le rôle au boot).
2. Login `editor@yownews.com` / `Demo@2024!` → atterrit sur `/editor/dashboard`.
   (Alternative sans redémarrage, base déjà seedée : insérer actor+user puis
   `INSERT … user_role_assignment` en récupérant l'id via
   `SELECT id FROM roles.role WHERE tenant_id=… AND code='EDUCATION_EDITOR_PERMISSIONS'`.)

## 5bis. User-management RÉEL — méthode optimale (Partie E, LIVRÉ)

### Synthèse fonctionnelle (3 personas)
- **Lecteur** : s'inscrire/lire/s'abonner/noter ; demander à devenir Rédacteur (workflow BFF, pas KSM).
- **Rédacteur** : espace `/editor` ; créer ses contenus (brouillons) ; les soumettre.
- **Admin** : dashboard ; lister les users + rôles ; promouvoir/rétrograder ; valider/publier le contenu ;
  gérer catégories/tags.

### Constat KSM clé
- **Validation de contenu = native** : l'éditeur a `education:content:create` (brouillon) ; publier =
  `PATCH /api/v1/education/{blogs|courses}/{id}/publish` exige `:manage` (que l'admin a). Filtrage `?status=`.
- **Lister les users** était le seul vrai trou ; l'**assignation de rôle existait déjà**.

### Méthode retenue = 2 changements KSM seulement
- **C1 (1 ligne)** : `administration:assignments:write` ajouté au template `EDUCATION_SERVICES_ALL_PERMISSIONS`
  (`AdministrationApplicationService`) → débloque `canManageAdministrativeRoles` (list-roles + assign + revoke
  + gate du nouvel endpoint users). Appliqué en **recréant la base dev** (le template est la source unique).
- **C2 (1 endpoint read-only)** : `GET /api/administration/users` (garde `canManageAdministrativeRoles`).
  - `findAllByTenantId` descendu dans la stack auth (port `UserAccountRepository` + R2DBC + InMemory + Spring Data).
  - `findByTenantId` ajouté à `ActorRepository` (+ R2DBC/InMemory/Spring Data) pour enrichir **prénom/nom**.
  - Use case `ListTenantUsersUseCase` implémenté dans `AdministrationApplicationService` (agrège user + actor
    + rôles via assignments) ; DTO `AdministrationUserResponse` ; `ActorRepository` injecté dans le service.
- **C3 (0 KSM)** : assignation/révocation = endpoints existants `POST/DELETE /api/administration/users/{id}/roles`
  (`{ roleId, scope:"ORGANIZATION" }` ; l'org `…002` vient du contexte X-Organization-Id). `GET /api/administration/roles`
  pour récupérer l'id Rédacteur/Lecteur.
- **Simplifications** : pas de validation d'existence de compte (l'inscription crée un user **ACTIF**) ; modèle
  « employees d'organisation » écarté (l'inscription ne crée pas de membership). « Demande de rôle » = BFF only.

### Côté frontend (LIVRÉ)
- BFF `src/server/ksm/modules/administration.ts` : `listTenantUsers`, `listRoles`, `assignRole`, `revokeRole`
  (réponses enveloppées → `unwrapKsm`).
- Routes (admin-guarded `isPlatformAdmin`) : `src/app/api/admin/users/route.ts` (GET),
  `src/app/api/admin/roles/route.ts` (GET), `src/app/api/admin/users/[id]/roles/route.ts` (POST),
  `src/app/api/admin/users/[id]/roles/[assignmentId]/route.ts` (DELETE).
- `src/app/[locale]/admin/users/page.tsx` : réécrite (fetch réel users+roles, filtre par rôle, recherche,
  pagination, ⋮ « Passer Rédacteur/Lecteur » → assign/revoke réels, refetch). Plus de mock.

### Vérification
- Statique : `mvn -o compile` (actor/auth/administration/bootstrap) = **0** ; `tsc --noEmit` = **0** ; `eslint` = **0**.
- Runtime : **non exécutée ici** (Docker indisponible → Postgres/Redis/Kafka/ES + backend down). Séquence
  prête : recréer la base → `mvn -o -pl RT-comops-bootstrap -am package -DskipTests` → `java -jar …` →
  login admin → `curl /api/admin/users`. Un user yownews de test (`editor@yownews.com`, Rédacteur) est créé
  par le seed **V82** sur base fraîche.

## 6. Mécanismes KSM pour la gestion des utilisateurs (réf. — état après ce lot)

- **Lister les users d'un tenant** : ✅ **AJOUTÉ** — `findAllByTenantId` (stack auth) + `GET /api/administration/users`
  (use case `ListTenantUsersUseCase`).
- **Affecter un rôle** : ✅ endpoints existants `/api/administration/users/{userId}/roles` (POST/DELETE) +
  `GET /api/administration/roles`, gardés par `canManageAdministrativeRoles`. L'admin YowNews a maintenant
  `administration:assignments:write` (C1). (`/api/roles/**` reste gardé par `canManageIdentity`=`*:admin`, non utilisé.)
- Changement de **statut** de compte (Valider/Rejeter) : toujours **AUCUNE** capacité backend, et jugé
  **non nécessaire** (l'inscription crée un compte ACTIF ; la validation porte sur rôles + contenu).

## 7. Fichiers clés

Frontend (`yownews/`) :
- `src/lib/roles.ts`, `src/app/[locale]/auth/login/page.tsx`
- `src/app/[locale]/admin/{layout,dashboard/page,users/page,categories/page,tags/page}.tsx`
- `src/app/[locale]/admin/_components/{AdminSidebar,AdminTopbar,DashboardView,TaxonomyManager}.tsx`
- `src/app/[locale]/editor/{layout,dashboard/page}.tsx`
- `src/server/ksm/modules/{education,administration}.ts`
- `src/app/api/education/**` ; `src/app/api/admin/{users,roles,users/[id]/roles,users/[id]/roles/[assignmentId]}/route.ts`

Backend (`KSM_Kernel_Layer/`) :
- `RT-comops-bootstrap/.../config/YowNewsAdminBootstrap{Properties,Initializer}.java`
- `RT-comops-bootstrap/src/main/resources/db/r2dbc/V81__yownews_seed.sql`, `V82__yownews_editor_seed.sql`
- `RT-comops-bootstrap/.../db/changelog/releases/08{4,5}-yownews-*.yaml` + `db.changelog-master.yaml`
- `RT-comops-administration-core/.../AdministrationApplicationService.java` (templates + `listTenantUsers`)
- `RT-comops-administration-core/.../adapter/in/web/{AdministrationController,AdministrationUserResponse}.java`
- `RT-comops-administration-core/.../application/port/in/ListTenantUsersUseCase.java`
- `RT-comops-auth-core/.../UserAccountRepository.java` (+ R2DBC/InMemory/SpringData : `findAllByTenantId`)
- `RT-comops-actor-core/.../ActorRepository.java` (+ R2DBC/InMemory/SpringData : `findByTenantId`)

## 8. Inscription des users

L'inscription de base existait déjà (`POST /api/auth/sign-up` → Actor + UserAccount ACTIF + auto-login).
Deux trous comblés : le **Chantier 1** (rôle Lecteur auto) est **100 % BFF** ; le **Chantier 2**
(« Devenir Rédacteur ») a d'abord été fait en Redis puis **migré vers une vraie table KSM** dans le
module education (voir §8.2 — l'historique Redis est conservé en note).

### 8.1 Rôle Lecteur auto à l'inscription (Chantier 1)
- Un nouvel inscrit n'avait **aucun rôle**. Désormais le BFF lui assigne `EDUCATION_READER_PERMISSIONS`
  juste après le sign-up, **en tant qu'admin YowNews** (l'admin a `administration:assignments:write` — C1),
  exactement comme la page `/admin/users` (`assignRole`, scope ORGANIZATION).
- `src/server/ksm/admin-session.ts` : `getAdminSession()` (login `admin@yownews.com` via env,
  **cache mémoire** façon `platform-org.ts`) + `getReaderRoleId()` (via `listRoles`).
- `src/app/api/auth/sign-up/route.ts` : après `signUp`, `assignDefaultReaderRole` (best-effort : un échec
  ne casse pas l'inscription) puis **re-login** de l'utilisateur (`discoverContexts`+`selectContext`) pour
  que l'authority Lecteur soit dans la session.
- Env : `KSM_PLATFORM_ADMIN_EMAIL`, `KSM_PLATFORM_ADMIN_PASSWORD` (`.env.local` + `src/env.ts`).

### 8.2 Workflow « Devenir Rédacteur » (Chantier 2 — vraie table KSM `editor_application`)
> **Évolution** : initialement en Redis (`role-requests/store.ts`), c'est désormais une **vraie table
> en base** gérée par le module **education**. Le candidat fournit un **domaine** (multi-sélection), une
> **URL de preuve** (portfolio/LinkedIn) et une **motivation**. Le store Redis a été **supprimé**.

- **Table** `editor_application` (dans `V77__education_core.sql`, section 5c) : `id`, `user_id`,
  `tenant_id`, `organization_id`, `domains text[]`, `proof_url`, `motivation`, `status`
  (défaut `PENDING`), `created_at`/`decided_at`. Une seule candidature **PENDING** par user.
- **Chaîne hexagonale KSM** (`RT-comops-education-core/.../api/education/`) :
  `domain/model/EditorApplication.java` ; port out `EditorApplicationRepository` + adapter R2DBC ;
  port in `EditorApplicationUseCase` + DTOs (`EditorApplicationCreateDTO`, `EditorApplicationStatusDTO`) ;
  `application/service/EditorApplicationService.java` (userId/tenant/org via `ReactiveRequestContextHolder`,
  valide les domaines via `Domain.valueOf`, garde une-seule-PENDING) ;
  `adapter/in/web/EditorApplicationController.java` → `/api/v1/education/editor-applications` :
  `POST` (soumettre, **sans gate**), `GET /me`, `GET ?status=` (`:manage`), `PATCH /{id}/status` (`:manage`).
- **BFF** : `src/lib/education-domains.ts` (`EDUCATION_DOMAINS`, aussi consommé par `TaxonomyManager`) +
  `src/server/ksm/modules/editor-applications.ts` (`submitApplication`/`getMyApplication`/`listApplications`/`setStatus`).
- Routes BFF rebrandées vers KSM (mêmes chemins qu'avant) : `POST /api/role-requests`,
  `GET /api/role-requests/me` ; admin (`isPlatformAdmin`) : `GET /api/admin/role-requests`,
  `POST …/[id]/approve` (PATCH status APPROVED **+** `assignRole` Rédacteur), `POST …/[id]/reject`.
- UI Lecteur : formulaire dans `src/app/[locale]/reader/profile/ProfileClient.tsx` (cases domaines +
  proofUrl + motivation) — bannière « Devenir Rédacteur » sur le profil (voir §9).
- UI admin : `src/app/[locale]/admin/role-requests/page.tsx` (affiche domaines/preuve/motivation +
  Valider/Refuser) + entrée « Demandes de rôle » dans `AdminSidebar` (groupe Gestion, `adminOnly`).
- **Diagramme du workflow** : `docs/devenir-redacteur-workflow.mmd` (séquence Lecteur → BFF → KSM →
  Postgres : dépôt, suivi, revue admin, validation/refus).

> ⚠️ **Bug corrigé** : `EditorApplication` (modèle R2DBC du module education) n'avait pas `@Id` sur son
> champ `id`. Résultat : `PATCH …/status` (validation/refus, seul chemin utilisant `findById`) renvoyait
> 500 sans trace métier, alors que dépôt (INSERT) et liste (`findAll`) fonctionnaient. Corrigé en ajoutant
> `@Id` (`org.springframework.data.annotation.Id`) sur `id`. (`CategoryEntity` a le même manque latent.)

### 8.3 Correctifs d'inscription (BFF)
- **selectionToken** : `discover-sign-up-contexts` renvoie `selectionToken` (pas `token`) →
  `src/server/ksm/modules/auth.ts` (type) + `sign-up/route.ts` corrigés (sinon 400
  « signUpSelectionToken/contextId is required »).
- **accountType** : l'UI envoie `individual`/`organization`, KSM exige `PROSPECT`/`BUSINESS` →
  mapping dans `sign-up/route.ts` (`organization`→`BUSINESS`, sinon `PROSPECT`).

### 8.4 ⚠️ Point backend OUVERT — permission admin manquante sur base existante
- Symptôme : `GET /api/admin/users` → **500** (KSM mappe `AccessDenied` en 500) car le rôle
  `SUPER_EDUCATION_SERVICES_MANAGER` en base **n'a pas** `administration:assignments:write`.
- Cause : `provisionDefaultRoles` (`AdministrationApplicationService`) ne **crée** que les rôles absents
  (`existsByCode` → skip) ; il ne **met jamais à jour** un rôle existant. La permission a été ajoutée au
  template *après* la création du rôle → rôle figé. (La perm n'est pas « protégée » → sur base **fraîche**
  le rôle est créé correctement.)
- Impact : bloque l'assignation auto du rôle Lecteur (8.1) et la validation des demandes (8.2).
- Résolutions possibles (non tranché) : **reset base** (le template recrée le rôle), ou ajouter un
  **reconcile** au démarrage dans `YowNewsAdminBootstrapInitializer`
  (`replacePermissions` vers le template, idempotent). Le reset exige de recompiler d'abord
  (`mvn -o -pl RT-comops-administration-core,RT-comops-bootstrap -am compile`) si la modif du template
  est encore locale/non commitée.

### 8.5 Fichiers ajoutés/modifiés
- Nouveaux (frontend) : `src/server/redis.ts`, `src/server/ksm/admin-session.ts`,
  `src/lib/education-domains.ts`, `src/server/ksm/modules/editor-applications.ts`,
  `src/app/api/role-requests/{route,me/route}.ts`,
  `src/app/api/admin/role-requests/{route,[id]/approve/route,[id]/reject/route}.ts`,
  `src/app/[locale]/admin/role-requests/page.tsx`, + espace `/reader` (voir §9).
- Supprimés : `src/server/role-requests/store.ts` (remplacé par la table KSM `editor_application`).
- Modifiés : `src/env.ts`, `.env.local`, `src/server/session.ts` (utilise `redis.ts`),
  `src/server/ksm/modules/auth.ts`, `src/app/api/auth/sign-up/route.ts`,
  `src/components/landing/Header.tsx`, `src/app/[locale]/admin/_components/{AdminSidebar,TaxonomyManager}.tsx`.
- Backend (KSM) : chaîne `editor_application` du module education + table dans `V77` (voir §8.2),
  et durcissement du schéma education (voir §10). Le Chantier 1 reste, lui, **BFF-only**.

## 9. UX Lecteur & espace `/reader` (ce lot)

- **Pays par défaut au sign-up** : Cameroun (et non Côte d'Ivoire).
- **Header** (`src/components/landing/Header.tsx`) : menu hamburger **retiré totalement** ; l'email est
  remplacé par un **bouton « Dashboard »** role-aware (admin→`/admin`, rédacteur→`/editor`,
  lecteur→`/reader`) ; la déconnexion n'est plus dans le header (elle vit en bas de la sidebar, comme admin).
- **Espace `/reader`** : `src/app/[locale]/reader/layout.tsx` réutilise `AdminSidebar variant="reader"`
  (nouveau `READER_NAV`) — **sans** les onglets Utilisateurs / Tableau de bord / Education / Newsletter.
- **Profil minimal** : `src/app/[locale]/reader/profile/{page,ProfileClient}.tsx`. L'onglet **Posts**
  n'apparaît que pour un **Rédacteur** ; sinon une **bannière « Devenir Rédacteur »** (formulaire §8.2).
- **`/account`** redirige désormais vers `/reader/profile`.

## 10. Durcissement du schéma education (`V77__education_core.sql`, ce lot)

Revue + corrections (base **recréée**, donc tout passe dans le même `V77`, **sans renommage**) :
- 🔴 `tenant_id NOT NULL` sur les **12 tables** (corrige une fuite d'isolation : une ligne `tenant_id`
  NULL était visible de tous, le filtre applicatif laissant passer le NULL).
- 🔴 Clés uniques **scopées tenant** : `category_entity UNIQUE(tenant_id, name, domain)`,
  `tag_entity UNIQUE(tenant_id, name)` (fin des collisions inter-tenant).
- 🔴 `abonnement` : `UNIQUE(user_id, content_id)` (filet anti-doublon, cohérent avec le garde applicatif).
- 🟠 Suppression des index dupliqués `idx_podcast_tenant_rls` / `idx_blog_tenant_rls` (reliquats RLS).
- 🟠 Tous les `TIMESTAMP` → `TIMESTAMPTZ` (cohérence kernel). **Côté Java** : `LocalDateTime` → `Instant`
  sur les entités/services education concernés (`Favorite`, `Abonnement_entity`, `Education`, `TagEntity`,
  `Education/CourseR2dbcEntity`, `InterfaceEntity`, `AbstractEducationService`, `AbonnementServiceImpl`,
  `AbonnementResponseDTO`) pour matcher `timestamptz`.
- **Décisions** : `favorites`/`abonnement` restent **polymorphes** (`entity_id`+`entity_type`, bon patron
  pour leurs requêtes) ; **aucun renommage** (refactor Java massif, gain seulement esthétique).
- **Vérif** : `mvn -o -pl RT-comops-education-core -am compile` = **0**, plus aucun `LocalDateTime`
  ni `TIMESTAMP` non-tz résiduel.

## 11. Espace Rédacteur — Blogs : cover image, aperçu, horodatages (ce lot)

### 11.1 Bug corrigé — cover image jamais affichée (404), cause réelle = frontend
Le backend KSM enregistrait correctement la ressource (logs : `Ressource sauvegardée avec ID: …`,
plus de NPE après le fix `@Id` sur `ResourceEntity`, voir §KSM endpoint test status en mémoire), mais
l'image restait invisible. Cause : **le frontend n'était pas câblé pour la récupérer**, indépendamment
de tout bug backend.
- `BlogPreviewModal` (`src/app/[locale]/editor/blog/BlogWorkspace.tsx`) pointait l'`<img src>` vers
  `/api/education/blogs/{id}/coverblog` — route BFF **inexistante**.
- La route proxy réelle `src/app/api/education/blogs/[id]/cover/route.ts` n'exposait qu'un handler
  `POST` (upload) ; **aucun `GET`** pour streamer le binaire depuis KSM
  (`GET /api/v1/education/blogs/{id}/coverblog`).
- `ContentEditor.tsx` / `InitialContent.coverUrl` (`src/components/content-editor/types.ts`)
  n'étaient jamais alimentés en mode édition → l'aperçu de cover dans l'éditeur restait toujours vide
  même pour un blog ayant déjà une image.

**Fix (frontend uniquement)** :
- `src/server/ksm/modules/education.ts` : nouvelle fonction `getBlogCover(session, id)` → `callKsm`
  en `raw` sur `GET /api/v1/education/blogs/{id}/coverblog`, renvoie la `Response` brute.
- `src/app/api/education/blogs/[id]/cover/route.ts` : ajout du handler `GET` (auth via session,
  401 si absente) qui streame `res.body` avec le `Content-Type` repris de KSM (fallback `image/png`).
- `BlogWorkspace.tsx` : `coverblog` → `cover` dans l'`<img src>` de l'aperçu ; `initial.coverUrl` posé
  à `/api/education/blogs/{editing.id}/cover` en mode édition.
- `ContentEditor.tsx` : `onError` sur l'`<img>` de prévisualisation → si la cover n'existe pas (404),
  retombe proprement sur le dropzone vide plutôt qu'une icône d'image cassée.

### 11.2 Horodatages création/modification dans « Mes blogs »
Demande : afficher l'heure de création **et** de dernière modification, pour **tous les statuts**
(Brouillons, En attente de validation, Publiés) — pas seulement la date.
- `BlogWorkspace.tsx` (composant `MyBlogs`) : colonne unique **Date** remplacée par **Créé le** /
  **Modifié le**, formatées via `Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })`
  sur les champs `createdAt`/`updatedAt` déjà renvoyés par KSM (`BlogEntity`, passthrough complet via
  `GET /api/education/blogs`).

### 11.3 Reste à vérifier
Le fix ci-dessus règle un bug frontend confirmé indépendamment du backend. **Non encore vérifié en
conditions réelles** (KSM était down pendant cette investigation — pas de redémarrage fait par
l'agent, convention du projet). Si le 404 persiste après ce fix, suspect suivant côté KSM :
`AbstractEducationService.saveWithRessource` (`RT-comops-education-core`) — le `repository.save(entity)`
final qui pose `id_ressource` sur le blog n'a **aucun log**, donc son succès/échec est invisible ; et
`BlogMapperImpl` ne mappe pas `organizationId` (bug réel mais distinct, corruption silencieuse du
champ de la passerelle org KSM à chaque ré-sauvegarde via ce mapper).

---

## 12. Contrainte architecturale — un seul fichier SQL par module

**Décision validée lors de la session de corrections post-test (sessions #3).** Il existe un fichier
SQL *canonique* par module. On ne crée **jamais** de fichier patch `V8x__patch.sql` incrémental pour
modifier un schéma déjà défini — on modifie le fichier canonique du module directement.

| Module            | Fichier canonique                                      |
|-------------------|--------------------------------------------------------|
| education-core    | `db/r2dbc/V77__education_core.sql`                     |
| ratings-core      | `db/r2dbc/V78__ratings_core.sql`                       |
| newsletter-core   | `db/r2dbc/V80__newsletter_core.sql`                    |
| forum-core        | `db/r2dbc/V81__forum_core.sql` (nommage probable)      |
| bootstrap/seed    | `db/r2dbc/V81__yownews_seed.sql`, `V82__yownews_editor_seed.sql` |

Le changeset Liquibase correspondant (ex. `db/changelog/releases/080-ratings-core.yaml`) référence
le fichier SQL via `sqlFile:` — il reste inchangé si seul le SQL évolue dans les limites du même
schéma de départ. **Consequence :** toute évolution de schéma exige de recréer la base de
développement (ou de faire un `DROP TABLE / CREATE TABLE` manuellement si la base est déjà
existante).

---

## 13. Session de corrections post-test (11 points — session #3)

Après la mise en œuvre complète des modules newsletter/ratings/podcast/profil/espace lecteur,
l'utilisateur a relevé 11 points lors de tests en conditions réelles. Tous les points ont été traités.

### 13.1 Point 1 — Gestion des catégories newsletter par l'admin (CRUD)

Le backend `NewsletterCategorieController` exposait déjà `GET/POST/PUT/DELETE` sur
`/api/v1/newsletter/categorie`. Seul le `GET` était câblé côté frontend.

**Backend** : aucun changement.

**BFF** :
- `src/server/ksm/modules/newsletter.ts` : ajout de `createCategory`, `updateCategory`, `deleteCategory`.
- `src/app/api/newsletter/categories/route.ts` : ajout handler `POST`.
- `src/app/api/newsletter/categories/[id]/route.ts` (nouveau) : handlers `PUT` et `DELETE`.

**UI** :
- `src/app/[locale]/admin/newsletters/NewslettersAdminWorkspace.tsx` : nouvel onglet « Catégories »
  avec composant `CategoriesManager` inline (liste + formulaire création/édition + suppression).
  Ces catégories sont déjà consommées dynamiquement via `GET /api/newsletter/categories` par la
  demande de rédacteur et la création de newsletter — aucun changement consommateur requis.

### 13.2 Point 2 — Durée des cours en minutes

Le champ `duration` de `Course.java`/`CourseCreateDto.java` (KSM) est une `String` libre sans
validation. **Aucun changement backend.**

**Frontend** :
- `src/app/[locale]/editor/ContentWorkspace.tsx` : le champ `Durée` du formulaire de création
  de cours passe de `type="text"` à `type="number"` avec libellé « Durée (minutes) ».

### 13.3 Point 3 — Cover et audio dans la prévisualisation admin

Le backend exposait déjà `GET .../covercourse`, `GET .../coverpodcast`, `GET .../audiopodcast`.
Les routes BFF existantes `/api/education/{kind}/{id}/cover` et `/api/education/podcasts/{id}/audio`
étaient fonctionnelles en lecture. Seul le câblage UI manquait.

**Frontend** :
- `src/components/education/BlogPreviewModal.tsx` : nouvelle prop `audioPath?: string` ; rendu
  `<audio controls src={audioPath}>` quand fournie.
- `src/components/education/ContentModeration.tsx` : dans `openPreview`, passage de
  `coverPath={`/api/education/${kind}/${preview.id}/cover`}` et
  `audioPath={kind === 'podcasts' ? `/api/education/podcasts/${preview.id}/audio` : undefined}`
  à `BlogPreviewModal`. Avant ce fix, aucune prop n'était passée → fallback sur l'URL blog (404 silencieux).

### 13.4 Point 4 — Page de gestion des unités de cours

Le CRUD complet existait déjà aux deux extrémités (KSM `CourseController` et BFF
`/api/education/courses/[id]/units/**`). Seules la page et la navigation manquaient.

**Frontend (nouveau)** :
- `src/app/[locale]/editor/course/[id]/page.tsx` + `CourseUnitsManager.tsx` : page éditeur listant
  les unités d'un cours (`GET /api/education/courses/{id}/units`), formulaire de création (`POST`),
  suppression (`DELETE`).
- `src/app/[locale]/editor/ContentWorkspace.tsx` : ajout d'une entrée « Gérer les unités » dans le
  menu `RowMenu` du tableau « Mes cours », navigue vers `/editor/course/{id}` via `useAppRouter`.

### 13.5 Point 5 — Refonte du collapse sidebar

**Frontend** :
- `src/app/[locale]/admin/_components/AdminSidebar.tsx` :
  - Le bouton de bascule affiche désormais une **croix (×)** quand la sidebar est déployée et un
    **hamburger** quand elle est repliée (avant : hamburger dans les deux états).
  - Le logo + titre « YowNews » sont enveloppés dans un `<Link href="/">` naviguant vers la landing.

### 13.6 Point 6 — Nom de l'auteur sur les commentaires

**Problème** : les commentaires affichaient l'UUID auteur brut, illisible.

**Approche retenue** (après deux alternatives rejetées) : dénormalisation du nom au moment de la
création, calculé par le BFF depuis la session — sans nouvel endpoint actor-core.

**Schéma** (`V78__ratings_core.sql` — modification directe, pas de fichier patch) :
- Ajout `comment_by_name VARCHAR(255)` après `comment_by_user` dans `comments`.
- Ajout `reply_by_name VARCHAR(255)` après `reply_by_user_id` dans `comment_replies`.
- Suppression du fichier `V84__ratings_comment_author_name.sql` (migration incrémentale rejetée)
  et de son entrée `087-ratings-comment-author-name.yaml` dans `db.changelog-master.yaml`.

**Backend ratings-core** :
- Domain `Comment`/`CommentReply`, entités R2DBC, mappers, DTOs : champs `commentByName`/`replyByName` ajoutés.
- `CommentService.createComment` : `comment.setCommentByName(dto.getCommentByName())`.
- `CommentReplyService.createReply` : `reply.setReplyByName(dto.getReplyByName())`.
- `CommentReplyDTO.java` : getters/setters `replyByName` ajoutés (champ existait sans accesseurs).

**BFF** :
- `src/server/ksm/modules/ratings.ts` : champs `commentByName?`/`replyByName?` ajoutés aux types
  `CommentEntity`/`CommentReplyEntity` et aux signatures `createComment`/`createReply`.
- `src/app/api/ratings/comments/route.ts` (POST) : calcule
  `commentByName = [firstName, lastName].filter(Boolean).join(' ') || email` depuis la session.
- `src/app/api/ratings/comments/[id]/replies/route.ts` (POST) : même calcul → `replyByName`.

**Frontend** :
- `src/components/feed/ContentDetailView.tsx` : affiche `commentByName` (fallback `commentByUser.slice(0,8)`
  pour les anciens commentaires sans nom) avec avatar initiales au-dessus du contenu du commentaire.
  Idem `replyByName` pour les réponses.

### 13.7 Point 7 — Bug « le like revient à zéro »

**Cause racine** : `EntityStatsR2dbcEntity` implémentait `Persistable<UUID>` avec un flag `isNew`
jamais positionné à `true` à la première création. Spring Data R2DBC traitait donc chaque `save()`
comme un `UPDATE` — y compris le premier (aucune ligne existant encore, l'UPDATE ne faisait rien).
Au rechargement : `findById` ne trouvait rien → `hasLiked=false`, `totalLikes=0`.

**Fix backend** (`RT-comops-ratings-core/.../adapter/out/persistence/EntityStatsPersistenceAdapter.java`) :
- `save()` appelle d'abord `existsById` ; si la ligne n'existe pas, `entity.markNew()` avant `save`.

**Frontend** :
- `src/components/feed/ContentDetailView.tsx` : suppression du compteur numérique à côté des boutons
  like/dislike de la vue détail (juste l'icône colorée selon l'état, sans chiffre).

> Vérification requise : `CommentReplyR2dbcEntity` implémente aussi `Persistable` mais son mapper
> appelle `markNew()` quand `domain.getId() == null` — pas concerné. `RatingsR2dbcEntity` et
> `CommentR2dbcEntity` n'implémentent pas `Persistable` — pas concernés.

### 13.8 Point 8 — UI réponses aux commentaires

**Problème** : la barre de saisie de réponse était affichée dès que l'on ouvrait la liste des
réponses, sans que l'utilisateur ait cliqué « Répondre ».

**Fix** (`src/components/feed/ContentDetailView.tsx`) :
- État `replyFormOpen: Record<string, boolean>` ajouté, distinct de l'état « réponses visibles ».
- `toggleReplies` décomposé en `loadReplies` (charge + affiche) / `hideReplies` / `openReplyForm`.
- Le formulaire de saisie s'affiche **uniquement** si `replyFormOpen[commentId] === true` (après
  clic explicite sur « Répondre »).
- `submitReply` ferme le formulaire de saisie après succès et laisse la liste des réponses visible.

### 13.9 Point 9 — Compteur de like sur la card du feed pas mis à jour

Conséquence directe du bug du point 7 (`entity_stats` jamais persisté → `totalLikes` toujours 0).
`ContentFeedCard.tsx` appelle déjà `GET /api/ratings/total-likes?entityId=` à chaque montage.
**Aucun changement de code requis** — le correctif du point 7 suffit.

### 13.10 Point 10 — Lecteur audio podcast

**Problème** : aucun lecteur audio n'était affiché dans la vue détail d'un podcast côté lecteur.

**Fix** (`src/components/feed/ContentDetailView.tsx`) :
- Ajout d'un élément `<audio controls src={`/api/education/podcasts/${id}/audio`}` quand
  `contentType === 'PODCAST'`, placé en haut de la vue contenu (avant le transcript/body).

La route BFF `/api/education/podcasts/[id]/audio` existait déjà et fonctionne en lecture sans
restriction de rôle en `GET`.

### 13.11 Point 11 — Module forum : corrections backend + frontend complet

#### Contexte (audit réalisé avant implémentation)
Le module forum était isolé architecturalement (likes/commentaires propres, non branchés sur
`ratings-core`), avait plusieurs bugs bloquants et **zéro frontend**. Décision validée :
**Option B — corriger les bugs bloquants uniquement, construire le frontend sur les endpoints
propres au forum** (pas de migration vers ratings-core).

#### Corrections backend

**`RT-comops-forum-core`** :
- **Bug unicité globale des catégories** : `ForumCategorieService.createCategorie` vérifiait
  l'unicité par nom global → impossible d'avoir « Annonces » dans deux groupes différents.
  Corrigé en ajoutant `findByCategorieNameAndGroupeId` à travers toute la stack :
  `ForumCategorieRepository` (port out) → `R2dbcForumCategorieRepository` (Spring Data) →
  `CategoriePersistenceAdapter`.
- **Bug like/dislike incohérent** : `POST` utilisait `toggleLike`/`toggleDislike` ; `DELETE`
  appelait l'ancien `removeLike` (logique différente). Résolution : suppression de toutes les
  méthodes mortes (`addLike`, `removeLike`, `addDislike`, `removeDislike`, `handleDeletedPost`)
  depuis `PostUseCase` + `PostService` + `PostController`. Les endpoints `DELETE /like` et
  `DELETE /dislike` sont supprimés — toggle uniquement via `POST`.
- **Soft-delete ignoré** : les posts avec `suppressionDate != null` restaient visibles. Corrigé
  via prédicat `isNotDeleted()` dans `PostService`, appliqué sur tous les `Flux` de liste.
- **Endpoint groupes publics manquant** : `DiscussionGroupController` expose désormais
  `GET /groups/public` (guard `hasUserContext`) retournant uniquement les groupes VALIDATED,
  utilisable par les lecteurs sans que `GET /groups/all` (qui renvoie aussi PENDING/REJECTED)
  ne soit exposé.
- **Nettoyage permissions** : entrées mortes `forum:category:read`, `forum:categories:manage`,
  `forum:write:all`, `forum:delete` supprimées de `PermissionCatalogService.java`.
- **Code mort supprimé** : `LoginRequest.java` et `RegistrationRequest.java` (résidus boilerplate
  Spring Security, aucun lien avec le module forum).

#### Frontend (intégralement nouveau)

**Client KSM** :
- `src/server/ksm/modules/forum.ts` : client complet (groupes, posts, catégories, commentaires,
  `toggleLike`/`toggleDislike` — tous sur les endpoints propres au forum).

**Routes BFF** (toutes nouvelles, sous `/api/forum/`) :
- `groups/route.ts` — `GET` (publics), `POST` (créer groupe, type FORUM, statut PENDING)
- `groups/admin/route.ts` — `GET` tous (admin)
- `groups/[id]/validate/route.ts` — `PUT`
- `groups/[id]/reject/route.ts` — `PUT`
- `posts/route.ts` — `POST`
- `posts/group/[groupId]/route.ts` — `GET`
- `posts/[id]/like/route.ts` — `POST` toggle
- `posts/[id]/dislike/route.ts` — `POST` toggle
- `categories/group/[groupId]/route.ts` — `GET`, `POST`
- `categories/[id]/route.ts` — `DELETE`
- `commentaires/post/[postId]/route.ts` — `GET`, `POST`
- `commentaires/[id]/route.ts` — `DELETE`

**Pages admin** :
- `src/app/[locale]/admin/forums/page.tsx` + `ForumAdminWorkspace.tsx` : liste ongletée PENDING /
  VALIDATED / REJECTED, actions Valider/Rejeter sur les groupes PENDING.

**Pages lecteur** :
- `src/app/[locale]/reader/forums/page.tsx` + `ForumListPage.tsx` : liste des groupes publics
  (VALIDATED), bouton « Proposer un forum » (POST → statut PENDING → en attente de validation admin).
- `src/app/[locale]/reader/forums/[groupId]/page.tsx` + `ForumGroupView.tsx` : vue d'un groupe
  (posts + catégories), création de post avec sélection de catégories, toggle like, fil de
  commentaires (charger / masquer / créer / supprimer), suppression de post (auteur uniquement).

**Sidebar** :
- `src/app/[locale]/admin/_components/AdminSidebar.tsx` : entrées Forum (`/admin/forums`,
  `/reader/forums`) activées (`enabled: true`).

---

## 14. Fichiers clés — session #3 (corrections post-test)

### Backend modifié (`KSM_Kernel_Layer/`)
- `RT-comops-bootstrap/src/main/resources/db/r2dbc/V78__ratings_core.sql` — ajout `comment_by_name`, `reply_by_name`
- `RT-comops-bootstrap/.../db/changelog/db.changelog-master.yaml` — retrait entrée `087-ratings-comment-author-name.yaml`
- `RT-comops-ratings-core/.../application/service/CommentService.java` — `setCommentByName`
- `RT-comops-ratings-core/.../application/service/CommentReplyService.java` — `setReplyByName`
- `RT-comops-ratings-core/.../application/port/in/CommentReplyDTO.java` — getters/setters `replyByName`
- `RT-comops-ratings-core/.../adapter/out/persistence/EntityStatsPersistenceAdapter.java` — fix `markNew()` (point 7)
- `RT-comops-forum-core/.../application/port/out/ForumCategorieRepository.java` — `findByCategorieNameAndGroupeId`
- `RT-comops-forum-core/.../adapter/out/persistence/R2dbcForumCategorieRepository.java` — idem Spring Data
- `RT-comops-forum-core/.../adapter/out/persistence/CategoriePersistenceAdapter.java` — override
- `RT-comops-forum-core/.../application/service/ForumCategorieService.java` — unicité scopée par groupe
- `RT-comops-forum-core/.../application/port/in/PostUseCase.java` — suppression méthodes mortes like/dislike
- `RT-comops-forum-core/.../application/service/PostService.java` — suppression + filtre soft-delete
- `RT-comops-forum-core/.../adapter/in/web/PostController.java` — suppression endpoints DELETE like/dislike
- `RT-comops-forum-core/.../adapter/in/web/DiscussionGroupController.java` — `GET /groups/public`
- `RT-comops-administration-core/.../PermissionCatalogService.java` — suppression permissions forum mortes

**Supprimés** :
- `RT-comops-bootstrap/src/main/resources/db/r2dbc/V84__ratings_comment_author_name.sql`
- `RT-comops-bootstrap/.../db/changelog/releases/087-ratings-comment-author-name.yaml`
- `RT-comops-forum-core/.../adapter/in/web/LoginRequest.java`
- `RT-comops-forum-core/.../adapter/in/web/RegistrationRequest.java`

### Frontend modifié (`yownews/src/`)
- `components/feed/ContentDetailView.tsx` — auteur commentaire, réponses UI, like sans compteur, audio podcast
- `components/education/BlogPreviewModal.tsx` — prop `audioPath`, lecteur audio
- `components/education/ContentModeration.tsx` — passage `coverPath`/`audioPath` à la modale
- `app/[locale]/editor/ContentWorkspace.tsx` — durée en minutes, lien « Gérer les unités »
- `app/[locale]/admin/newsletters/NewslettersAdminWorkspace.tsx` — onglet catégories + `CategoriesManager`
- `app/[locale]/admin/_components/AdminSidebar.tsx` — toggle ×/☰, logo → landing, forum activé
- `server/ksm/modules/newsletter.ts` — `createCategory`, `updateCategory`, `deleteCategory`
- `server/ksm/modules/ratings.ts` — champs `commentByName`/`replyByName`
- `app/api/newsletter/categories/route.ts` — ajout `POST`
- `app/api/ratings/comments/route.ts` — calcul `commentByName` depuis session
- `app/api/ratings/comments/[id]/replies/route.ts` — calcul `replyByName` depuis session

### Frontend nouveau (`yownews/src/`)
- `app/api/newsletter/categories/[id]/route.ts` — `PUT`, `DELETE`
- `app/[locale]/editor/course/[id]/page.tsx` + `CourseUnitsManager.tsx` — gestion unités de cours
- `server/ksm/modules/forum.ts` — client KSM forum complet
- `app/api/forum/groups/route.ts`, `groups/admin/route.ts`, `groups/[id]/validate/route.ts`, `groups/[id]/reject/route.ts`
- `app/api/forum/posts/route.ts`, `posts/group/[groupId]/route.ts`, `posts/[id]/like/route.ts`, `posts/[id]/dislike/route.ts`
- `app/api/forum/categories/group/[groupId]/route.ts`, `categories/[id]/route.ts`
- `app/api/forum/commentaires/post/[postId]/route.ts`, `commentaires/[id]/route.ts`
- `app/[locale]/admin/forums/page.tsx` + `ForumAdminWorkspace.tsx`
- `app/[locale]/reader/forums/page.tsx` + `ForumListPage.tsx`
- `app/[locale]/reader/forums/[groupId]/page.tsx` + `ForumGroupView.tsx`

---

## 15. Refonte Newsletter : publication + contenu (session #4)

### 15.1 Modèle de données scindé (publication ⇄ contenu)
La table `newsletter` conflée (identité + contenu en une ligne) a été remplacée par **deux entités** :
- **`newsletter_entity`** = PUBLICATION / canal (titre, description, `author_id`, `redacteur_id`,
  `statut` PENDING→APPROVED/REJECTED, `cover_id`). Possédée par un rédacteur approuvé, validée par l'admin.
- **`newsletter_content_entity`** = CONTENU rattaché par FK (`newsletter_id`), statut
  DRAFT→SUBMITTED→APPROVED→PUBLISHED (+REJECTED), réutilise l'enum `StatutNewsletter`.
- `newsletter_categorie` (topics) rattaché à la **publication** ; catégories choisies à la création
  de la publication, **pas** à la rédaction du contenu.

Workflow : rédacteur approuvé → crée une publication → admin valide → l'espace de rédaction s'ouvre →
rédige des contenus (TipTap + image) → soumet → admin valide → publie.

**Convention fichiers** : tout replié dans un seul `V80__newsletter_core.sql` (V83/V84 + releases supprimés).
Converter R2DBC `NewsletterEntityStatusWritingConverter` ajouté (même piège que `RedacteurStatus`).

### 15.2 Correctifs de modération (session #4bis — 6 points)
1 & 4. **Menu « ⋮ » caché** : `RowMenu` ([components/education/RowMenu.tsx]) rendait son dropdown en
`position:absolute`, rogné par le `overflow:hidden` des tables. → rendu en **portal** (`position:fixed`).
2. **Auteur** : colonnes `author_nom`/`author_prenom` sur `newsletter_entity`, remplies **côté BFF** depuis
`session.user.firstName/lastName` (`api/newsletter/newsletters/route.ts` POST). Colonne « Auteur » en modération.
3. **Statut/actions persistants** : la modération ne retire plus la ligne ; elle met à jour le badge en place
et garde un `RowMenu` contextuel (validée → Rejeter/Supprimer ; côté rédacteur → **Modifier** via `PUT /newsletters/{id}`).
`reject` publication assoupli (possible après APPROVED) + `DELETE /admin/newsletters/{id}` (cascade contenus).
4. **Contenu** : `RowMenu` avec **Prévisualiser** (modale HTML + cover), Valider, Rejeter, Publier ; statut vivant.
6. **401 sur validate** — cause : **pas une permission** (l'admin a bien `newsletter:newsletter:manage`, sinon 403).
C'est `readSession()` qui renvoie `null` quand le **token d'accès KSM expire** (`session.expiresAt` dépassé) →
le BFF court-circuite en `fail(401)` (cohérent avec 401 + `application-code:10ms` + « GET marchaient avant »).
Pas de refresh du token user. Fix : `apiFetch` **redirige vers `/auth/login`** sur un 401 d'auth au lieu d'une erreur brute.
Amélioration future : rotation refresh-token (KSM la supporte via `SessionTokensController`).

### 15.3 Envoi email : tentative Kafka → notification-core, puis RETRAIT (point 5)
Objectif visé : `publish()` d'un contenu → événement Kafka (outbox kernel) → consumer → envoi email.
Le producteur reste en place : `NewsletterContentService.publish()` émet un `BusinessEvent`
`NEWSLETTER_CONTENT_PUBLISHED` (outbox kernel → topic unique `iwm.events.business`, `create-per-aggregate-topic:false`).

**notification-core RETIRÉ** — raison : le module est **délibérément désactivé** dans le monolithe (dépendance
**commentée** dans `RT-comops-bootstrap/pom.xml` : « Temporarily disabled: missing R2DBC repositories »).
L'ajouter comme dépendance de newsletter-core l'a réactivé de force → cascade d'échecs : bean `WebClient.Builder`
manquant (senders Twilio/Firebase/Meta), puis `NotificationReminderScheduler` tapant une table `notification.reminder`
non provisionnée. Sur décision : **toutes les modifications liées à notification-core ont été retirées** :
- dépendance `RT-comops-notification-core` supprimée du pom newsletter-core ;
- `NewsletterContentPublishedConsumer` supprimé (seul fichier newsletter-core qui importait notification-core) ;
- `WebClientConfiguration` supprimé.

**État actuel** : le producteur émet toujours l'événement mais **aucun consumer ne le traite** (WARN inoffensif
« No business event consumer registered »). L'**envoi email réel n'est pas branché**. Piste future SANS
notification-core : une implémentation SMTP de `EmailSender` dans newsletter-core (via `JavaMailSender`,
`SPRING_MAIL_*` déjà configuré) consommée par un consumer local. Topics préservés (`categorie.kafka_topic` intacte).

### 15.5 Fichiers clés — session #4
**Backend (`KSM_Kernel_Layer/`)**
- `db/r2dbc/V80__newsletter_core.sql` — schéma final (publication + contenu + colonnes auteur)
- newsletter-core : `NewsletterEntity(+R2dbc,+mapper,+DTOs)`, `NewsletterContent`, services `NewsletterEntityService`/
  `NewsletterContentService` (publish→event, update/delete), controllers (PUT/DELETE), ports/adapters (`deleteByNewsletterId`)
- `RT-comops-bootstrap/.../config/R2dbcRepositoryConfiguration.java` — `NewsletterEntityStatusWritingConverter`
- (retirés : `NewsletterContentPublishedConsumer`, dép notification-core, `WebClientConfiguration` — cf. §15.3)

**Frontend (`yownews/src/`)**
- `components/education/RowMenu.tsx` — dropdown en portal
- `server/ksm/modules/newsletter.ts` — publications + contenus + covers (`update/deleteNewsletter`, `deleteContent`)
- `app/api/newsletter/` — `newsletters` (POST/GET), `newsletters/[id]` (GET/PUT/DELETE), `newsletters/[id]/contents`,
  `contents` (GET), `contents/[id]` (PUT/DELETE), `contents/[id]/{submit,validate,reject,publish,cover}`, `admin/newsletters/[id]/approve`
- `app/[locale]/editor/newsletter/NewsletterWorkspace.tsx` — flux 2 étapes + RowMenu Modifier
- `app/[locale]/admin/newsletters/` — `NewsletterPublicationModeration.tsx` (new), `NewsletterContentModeration.tsx`,
  `moderation/page.tsx` (sous-onglets Newsletters / Contenus)
- `lib/api-client.ts` — redirection `/auth/login` sur 401 d'authentification

---

## 16. Inscription à deux modes & organisations éditrices (ce lot)

### 16.1 Modèle de données & isolation des contenus
- **Abonnements & Publications** : Les contenus créés par les utilisateurs (cours, blogs, podcasts, newsletters et contenus de newsletter) intègrent un champ `organizationId` pour stocker l'organisation éditrice.
- **Table `publisher_org_request`** (dans `V77__education_core.sql`) : Gère les demandes de statut d'organisation éditrice (statut `PENDING`, `APPROVED`, `REJECTED` ou `SUSPENDED`).
- **Contrôles à la création** : Si l'organisation n'est pas approuvée (statut différent de `APPROVED` dans `publisher_org_request`), la création de contenu ou de newsletter est rejetée (`403 FORBIDDEN`).
- **Validation à deux niveaux (Phases 3 & 4)** : 
  - Les contenus de l'organisation passent d'abord par le statut intermédiaire `ORG_APPROVED` (validation par l'administrateur de l'organisation).
  - La validation finale de publication s'effectue ensuite par l'administrateur de la plateforme (statut `APPROVED`).

### 16.2 Résolution dynamique de l'Organisation Plateforme (Sécurité)
Afin d'éviter de coder en dur les UUID (comme `…002` pour YowNews), nous avons mis en place une détection dynamique :
- **Côté KSM (Java)** :
  - Création des ports `PlatformOrgCheckPort` (`education-core`) et `PublisherOrgCheckPort` (`newsletter-core`).
  - L'implémentation de ces ports dans `bootstrap` (`EducationPlatformOrgCheckPort` et `EducationPublisherOrgCheckPort`) compare les ID reçus dans le contexte avec la propriété de configuration `YowNewsAdminBootstrapProperties.organizationId` (définie dans `application.yml`).
- **Côté YowNews (BFF & Frontend)** :
  - Les API BFF et les pages du frontend comparent le code de l'espace de travail actif (`session.workspace.organizationCode`) avec la variable d'environnement du tenant `KSM_PLATFORM_ORG_CODE` (définie dans `.env.local` et valant `"YOWNEWS"` par défaut) pour savoir si l'utilisateur est dans le contexte général de lecture.

### 16.3 BFF et Pages du Frontend
- **KSM Client** : [publisher-orgs.ts](file:///home/devstack/Documents/frontend/yownews/src/server/ksm/modules/publisher-orgs.ts) centralise les appels KSM.
- **BFF Endpoints** :
  - `POST/GET /api/publisher-orgs` : soumettre ou lister les candidatures d'organisation.
  - `PUT /api/publisher-orgs/[id]/decide` : validation par le super-admin (APPROVED, REJECTED, SUSPENDED).
  - `GET/POST /api/org/employees` : gestion des collaborateurs de l'organisation active.
- **Pages de l'application** :
  - **Candidature d'organisation** : [org-publisher/page.tsx](file:///home/devstack/Documents/frontend/yownews/src/app/%5Blocale%5D/editor/org-publisher/page.tsx) permet à l'owner d'une organisation de postuler et de voir le statut de la demande.
  - **Membres de l'organisation** : [my-org/page.tsx](file:///home/devstack/Documents/frontend/yownews/src/app/%5Blocale%5D/editor/my-org/page.tsx) permet à l'administrateur de l'organisation d'inviter de nouveaux collaborateurs ou de révoquer leur accès.
  - **Modération d'organisation** : [admin/publisher-orgs/page.tsx](file:///home/devstack/Documents/frontend/yownews/src/app/%5Blocale%5D/admin/publisher-orgs/page.tsx) permet au super-administrateur de valider/suspendre les organisations éditrices.
- **Sidebar** : Intégration des liens de navigation dynamique au sein de [AdminSidebar.tsx](file:///home/devstack/Documents/frontend/yownews/src/app/%5Blocale%5D/admin/_components/AdminSidebar.tsx).

### 16.4 Problèmes résolus liés à l'inscription et la création d'utilisateurs

Lors du développement du lot d'inscription des organisations et de la modération, plusieurs anomalies logiques et techniques majeures ont été corrigées et documentées ici :

1. **Impasse logique du rattachement forcé (Catch-22)** :
   - *Problème* : L'inscription d'une organisation forçait systématiquement le rattachement au tenant `"YOWNEWS"`, ce qui créait l'utilisateur comme simple membre de la plateforme globale sans possibilité d'y rattacher son organisation externe, le bloquant dans l'espace général.
   - *Solution* : Cinématique d'inscription modifiée. Seul le propriétaire (**Owner**) d'une organisation KSM pré-existante s'inscrit en mode Organisation.
   - *Champs masqués* : L'UI masque les champs de profil (`firstName`, `lastName`, `username`, `phone`) car le représentant possède déjà un compte KSM complet. Seuls `email`, `password` et `orgCode` (Code de l'organisation) sont saisis.
   - *Vérification du rôle Owner* : Le BFF authentifie l'utilisateur sur KSM, sélectionne son contexte d'organisation et vérifie qu'il dispose de la permission `"tenant:admin"` (rôle `GENERAL_ADMIN`). Si ce n'est pas le cas, l'inscription est rejetée avec un code `403 NOT_OWNER` (*"Seul le propriétaire de l'organisation est autorisé à l'inscrire"*).

2. **Bascule automatique en mode Particulier si l'organisation n'existe pas** :
   - *Problème* : Si un utilisateur saisit un code d'organisation inexistant dans KSM, il ne peut pas s'inscrire ni se connecter.
   - *Solution* : Si le code d'organisation saisi n'est pas trouvé dans KSM lors de la phase de découverte, le BFF retourne un statut `404 ORG_NOT_FOUND`. Le frontend intercepte cette erreur, affiche un message d'explication et bascule automatiquement le formulaire en mode **Particulier** (`individual`), révélant les champs masqués de nom/prénom/username pour qu'il s'inscrive comme simple lecteur.

3. **Inversion des ports KSM (Application vs Management/Actuator)** :
   - *Problème* : Le BFF appelait le port `8081` de KSM (`KSM_BASE_URL`). En mode local (`--kernel-local`), le port `8081` correspond au serveur d'administration (Spring Actuator) et ne répond pas aux routes métiers, renvoyant des erreurs `404 Not Found` (traduites en `500` par le BFF).
   - *Solution* : Correction des variables d'environnement (`.env.local` et fallbacks dans `src/env.ts`) pour que `KSM_BASE_URL` pointe sur le port **`8080`**, qui est le port d'écoute réel des API métiers du noyau local KSM.

4. **Suppression involontaire des migrations/seeds lors du réalignement Git** :
   - *Problème* : Le réalignement de KSM sur la branche `main` a écrasé les modifications locales de `db.changelog-master.yaml`. Les inclusions des fichiers de schéma des 4 modules personnalisés (`education-core`, `ratings-core`, `newsletter-core`, `forum-core`) ainsi que les seeds de données YowNews (qui insèrent les clés d'API du client `yownews-frontend`) avaient disparu, causant des erreurs `401 Unauthorized` systématiques.
   - *Solution* : Restauration des lignes d'inclusion des changelogs correspondants dans `db.changelog-master.yaml`, garantissant la création des tables et des enregistrements de sécurité nécessaires au démarrage de KSM.

5. **Rôle admin `SUPER_EDUCATION_SERVICES_MANAGER` perdu par un merge KSM (session #5)** :
   - *Problème* : Après un `git merge origin/main` sur la branche `mayega-git` (commit `336bbf15`), le fichier
     `AdministrationApplicationService.java` a été remplacé par la version `origin/main`, qui ne contenait que les
     rôles ERP génériques (`GENERAL_ADMIN`, `ORGANIZATION_ADMIN`, etc.). Tout le catalogue de rôles spécifique
     YowNews (`SUPER_EDUCATION_SERVICES_MANAGER`, `EDUCATION_EDITOR_PERMISSIONS`, `EDUCATION_READER_PERMISSIONS`,
     `EDUCATION_MANAGER`, `FORUM_*`, `NEWSLETTER_*`) avait disparu — présent au commit `12389278`, absent dès
     `336bbf15` et toujours absent au moment du diagnostic (`5957d893`). Conséquence : `YowNewsAdminBootstrapInitializer`
     échouait silencieusement à chaque démarrage KSM (`IllegalStateException` uniquement loguée) et ne pouvait
     **jamais** réassigner le rôle admin après une base recréée — un simple redémarrage ne suffisait pas.
   - *Solution* : Restauration à l'identique du bloc de constantes de permissions et des entrées `template(...)`
     manquantes dans `AdministrationApplicationService.java` (`RT-comops-administration-core`), sans toucher aux
     templates ERP existants. **KSM redevient intact/complet** — c'est une restauration de code perdu, pas un
     ajout de fonctionnalité. Après recompilation et redémarrage, le bootstrap idempotent réassigne correctement
     le rôle.

6. **Gestion des utilisateurs simples : tentative « employees », abandonnée pour un mur KSM structurel,
   solution finale = restauration de `ListTenantUsersUseCase` (session #5)** :
   - *Contexte* : le même merge cassé (`336bbf15`, cf. point 5) avait aussi réduit `GET /api/administration/users`
     (`ListTenantUsersUseCase`) à une version sans enrichissement (`AdministrationUserResponse` ne renvoyait plus
     ni `roles`, ni `firstName`/`lastName`), ce qui faisait planter le dashboard admin (`Cannot read properties of
     undefined (reading 'some')` dans `DashboardView.tsx`, `u.roles` étant `undefined`), et cassait la promotion
     Lecteur→Rédacteur lors de la validation d'une candidature (`applicant.roles.filter` sur `undefined`).
   - *Tentative 1 (abandonnée)* : reconstruire la gestion des utilisateurs simples sur le module
     **organisation-core** existant (`employee_membership`, endpoints `/api/employees*`, déjà utilisé pour les
     organisations éditrices externes, §16.3) plutôt que de restaurer le code perdu. Implémentée puis **entièrement
     annulée** après avoir buté sur un mur structurel KSM, non lié aux rôles/permissions applicatifs :
     - `PlatformServiceRouteResolver` (`RT-comops-kernel-core`) classe **toute** URL `/api/employees` comme
       service **HRM** (mapping hérité de `RT-comops-hrm-core`, qui possède son propre contrôleur employés à une
       autre URL, `/api/v1/hrm/employees` — pas de collision Spring, mais la table de routage de l'entitlement
       filter, elle, ne distingue pas les deux).
     - Ceci déclenche en cascade `ClientApplicationServiceEntitlementWebFilter` (le client `yownews-frontend`
       doit être autorisé sur le service HRM) **puis** `OrganizationServiceEntitlementWebFilter` (l'organisation
       YowNews doit être *abonnée* au service HRM) — deux couches de sécurité plateforme totalement hors sujet
       pour YowNews, chacune révélée après avoir débloqué la précédente.
     - Décision : ne pas continuer à contourner (chaque contournement engendre un nouveau blocage et un mensonge
       de configuration — YowNews n'a jamais eu besoin du service HRM) ; revenir à la restauration pure du code
       perdu (option la plus simple, déjà validée pour le point 5).
   - **Solution retenue** : restauration à l'identique de `ListTenantUsersUseCase` tel qu'il existait au commit
     `12389278` (avant le merge cassé) — agrégation user + actor + rôles, exposée sous `/api/administration/users`
     (chemin **non concerné** par la table de routage HRM, donc aucun des murs ci-dessus). Toutes les tentatives
     côté frontend (sign-up, page `/admin/users`, `DashboardView.tsx`, route `/api/org/employees`) ont été
     **intégralement revertées** à leur état d'avant ce lot — le module organisation-core/`employee_membership`
     reste utilisé, inchangé, uniquement pour les organisations éditrices externes (§16.3 : `my-org`,
     `org-publisher`, `admin/publisher-orgs`), qui n'ont jamais été concernées par ce blocage.

### Récapitulatif des changements KSM de ce lot (traçabilité)

| Fichier | Changement | Statut final |
|---|---|---|
| `RT-comops-administration-core/.../AdministrationApplicationService.java` | Restauration des constantes de permissions et `template(...)` manquants (`EDUCATION_*`, `FORUM_*`, `NEWSLETTER_*`, `SUPER_EDUCATION_SERVICES_MANAGER`) + `RESERVED_ROLE_CODES` | **Conservé** (point 5) |
| `RT-comops-administration-core/.../AdministrationApplicationService.java` | Restauration du champ `ActorRepository actorRepository` (+ param constructeur) et de `listTenantUsers(tenantId)` (agrégation user+actor+rôles, remplace la version bare `Flux<UserAccount>`) | **Conservé** (point 6) |
| `RT-comops-administration-core/.../port/in/ListTenantUsersUseCase.java` | Restauration de l'interface enrichie (`TenantUserView`/`TenantUserRoleView`), remplace `Flux<UserAccount>` | **Conservé** (point 6) |
| `RT-comops-administration-core/.../adapter/in/web/AdministrationUserResponse.java` | Restauration du DTO avec `roles: List<RoleRef>`, `firstName`, `lastName` (mappé depuis `TenantUserView`) | **Conservé** (point 6) |
| `RT-comops-actor-core/.../ActorRepository.java` (+ adapters R2DBC/InMemory/SpringData) | Restauration de `findByTenantId(tenantId)` sur toute la stack (nécessaire à `listTenantUsers`) | **Conservé** (point 6) |
| `RT-comops-bootstrap/.../db/r2dbc/V81__yownews_seed.sql` | Ajout de `'HRM'` à `allowed_service_codes` du client `yownews-frontend` (test de la tentative 1) | **Annulé** — retiré, tableau redevient `['ORGANIZATION','SETTINGS','EDUCATION','NEWSLETTER','FORUM','RATINGS']` |

⚠️ La base ayant été recréée pendant la tentative 1 (donc avec `HRM` dans `allowed_service_codes`), une requête
SQL manuelle de nettoyage a été fournie séparément (ou une nouvelle recréation de base, puisque le seed est
maintenant corrigé).


---

## 17. Newsletter : auto-publication des contenus + envoi email MailHog (session #6)

> ⚠️ Remplace §15.3 (obsolète) : le consumer email a été re-branché depuis (notification-core
> réactivé dans le pom bootstrap, `NewsletterContentPublishedConsumer` + `NewsletterEmailPort` +
> adaptateur `NotificationCoreNewsletterEmailAdapter` dans bootstrap → `EmailSmtpSenderAdapter` SMTP).

### 17.1 Plus de validation admin des CONTENUS
Décision : une fois la **publication** (NewsletterEntity) validée par l'admin (circuit conservé),
le rédacteur publie ses contenus **lui-même** : DRAFT → PUBLISHED directement.
Le circuit **ORG_APPROVED reste intact** (publication au nom d'une org externe : `submit` +
`org-approve` conservés ; publier exige ORG_APPROVED pour un contenu d'org).
- KSM `NewsletterContentController` : `POST /contents/{id}/publish` gate `create` OU `manage`,
  + param `userId` ; endpoints `validate`/`reject` **supprimés**.
- `NewsletterContentService.publish(contentId, userId)` : garde d'appartenance (authorId du contenu
  OU redacteurId de la newsletter, sinon 403), refuse un contenu déjà PUBLISHED, exige ORG_APPROVED
  pour un contenu d'org externe ; émet toujours `NEWSLETTER_CONTENT_PUBLISHED`.
- Frontend : `NewsletterWorkspace` (ContentSpace) → bouton **Publier** (confirm) au lieu de
  « Soumettre » ; onglet admin « Contenus » retiré (`moderation/page.tsx` ne rend plus que
  `NewsletterPublicationModeration` ; `NewsletterContentModeration.tsx` supprimé ; l'onglet
  « Validation de contenu » de `RedacteursWorkspace` retiré aussi). Routes BFF
  `contents/[id]/{validate,reject}` supprimées ; `publish` passe `session.user.id`.

### 17.2 Cause racine « rien dans MailHog » = config SMTP absente
`SPRING_MAIL_HOST` était **vide** dans `KSM_Kernel_Layer/.env` et aucun profil ne définissait
`spring.mail.*` → pas de bean `JavaMailSender` → chaque envoi échouait avec « SMTP is not
configured », erreur avalée (consumer best-effort). Fix :
- `application-local.yml` : `spring.mail` → localhost:1025 (MailHog), auth/starttls off,
  `iwm.notifications.email.from: newsletter@yownews.local` (sans From, JavaMail refuse d'envoyer).
- `.env` : mêmes valeurs (`SPRING_MAIL_HOST=localhost`, `SPRING_MAIL_PORT=1025`, auth/tls false,
  `IWM_NOTIFICATIONS_EMAIL_FROM`).
⚠️ Précision (constatée au test) : `start-full-stack.sh --kernel-local` source **`.env.local`**
(non versionné) et active le profil **`r2dbc`** — c'est donc `.env.local` qui porte la config
mail effective (`SPRING_MAIL_*` + `IWM_NOTIFICATIONS_EMAIL_FROM`), pas `application-local.yml`.
Rappel : les emails vont aux **abonnés des catégories** de la newsletter ET aux **followers du
rédacteur** (`LecteurRedacteurAbonnement`, depuis session #6bis) — sans abonné, aucun envoi.
UI MailHog : :8025. L'email est un template HTML (titre, cover en data URI, contenu TipTap,
footer) construit dans `NewsletterContentPublishedConsumer`.

### 17.3 Fix colonne « Auteur » vide en modération des newsletters
La chaîne authorNom/Prenom était intacte ; cause = comptes sans firstName/lastName (inscription
mode organisation, champs masqués). Fix BFF (`api/newsletter/newsletters/route.ts` POST) :
fallback `username` puis `email` quand nom+prénom vides. Donnée existante à corriger à la main
(`UPDATE newsletter.newsletter_entity SET author_nom=… WHERE id=…`) ou en recréant la newsletter.

---

## 18. Test du workflow user simple en conditions réelles (session #7)

### 18.1 Retrait de l'appel HRM mort dans le sign-up
En testant l'inscription individuelle dans un vrai navigateur, chaque sign-up déclenchait un
appel `POST /api/employees/invite` (module RH de KSM) qui échouait systématiquement en
`403 CLIENT_APPLICATION_SERVICE_NOT_ALLOWED` (« Client application is not allowed to access
service HRM »), logué en warning `auth.sign_up.organization_membership_failed`. C'est le même
mur déjà rencontré et abandonné en §16.4 point 6 (tentative « employees » pour les users
simples) — un reliquat de code n'avait pas été nettoyé de `sign-up/route.ts`.

**Analyse confirmée** : cet appel n'a jamais été nécessaire pour un lecteur simple.
- L'appartenance au **tenant** YowNews se fait dès l'inscription via
  `discoverSignUpContexts('YOWNEWS')` (résolu *avant* l'appel `signUp`), indépendamment de tout
  `employee_membership`.
- Le rôle **Lecteur** est posé séparément par `provisionReaderRoles(...)` — fonctionnel, inchangé.
- Chaque appel KSM reçoit quand même l'org YowNews dans `X-Organization-Id`, même sans
  `organizationId` en session : `client.ts` retombe sur `resolvePlatformOrganizationId()` (résolution
  dynamique par le code `YOWNEWS`) si `session.workspace.organizationId` est absent — donc les
  gates d'entitlement KSM passent normalement pour un lecteur simple.
- `organizationId` reste **volontairement `NULL`** sur le contenu créé par les users YowNews
  (blog/cours/podcast/newsletter) — ce n'est pas un oubli, cette colonne ne sert qu'aux
  **organisations externes éditrices** (§16). Ne pas chercher à la peupler pour un user YowNews normal.

**Décision** : suppression du code mort plutôt que souscription au service HRM (qui aurait exigé
d'ajouter `'HRM'` aux `allowed_service_codes` du client dans `V81__yownews_seed.sql` + une
souscription d'org — hors périmètre des 4 modules possédés, et inutile).

**Changements** :
- `src/app/api/auth/sign-up/route.ts` : suppression de la fonction `attachToYowNewsOrganization`
  et de son appel dans la branche inscription particulier ; imports `inviteEmployee`,
  `getAdminSession`, `resolvePlatformOrganizationId` retirés (devenus inutiles).
- `src/server/ksm/modules/organization.ts` : **fichier supprimé** (plus aucun consommateur —
  vérifié : `/editor/my-org` et `/api/org/employees` utilisent une fonction homonyme mais
  distincte dans `src/server/ksm/modules/publisher-orgs.ts`, non concernée).

### 18.2 ⚠️ Point ouvert (hors périmètre) — aucun email de vérification n'est envoyé, MailHog reste vide

**Constat** : après inscription individuelle, KSM répond `201` avec
`{status:'EMAIL_VERIFICATION_REQUIRED', emailVerified:false}` (mode strict — pas de session tant
que l'email n'est pas vérifié), mais MailHog (`:8025`) ne reçoit jamais rien.

**Cause identifiée dans `RT-comops-auth-core`** (module KSM **non possédé** — signalé, non corrigé) :
- `IWM_AUTH_EMAIL_ENABLED=false` dans `KSM_Kernel_Layer/.env.local` (`.env.local.example` aussi ;
  seuls les exemples VM/preprod/prod le mettent à `true`). Ce flag est **distinct** de la config
  SMTP (`SPRING_MAIL_*`) déjà branchée à MailHog pour les newsletters (§17.2) — même avec le SMTP
  configuré, `auth-core` n'essaie jamais d'envoyer un email tant que ce flag reste à `false`.
- `AuthEmailDeliveryService.deliver()` (`RT-comops-auth-core/.../application/service/`) : si
  `!properties.isEnabled()`, retourne un `DeliveryResult.preview(token, …)` **sans jamais appeler**
  `mailSender.send(...)` — normal que MailHog ne voie rien.
- Bug complémentaire dans `AuthApplicationService.java:364-372` (chemin sign-up) : ce
  `DeliveryResult` — qui porterait le token en mode preview — est **jeté** (`.then()` sans le
  renvoyer à l'appelant), contrairement au chemin « renvoyer l'email de vérification »
  (lignes 635-661) qui, lui, le renvoie. Résultat : **aucun moyen actuel de récupérer le lien de
  vérification via l'API** au moment du sign-up, ni par email (flag désactivé) ni par la réponse
  (jetée).

**Fichiers concernés (hors périmètre, à faire suivre au propriétaire d'`auth-core`)** :
- `RT-comops-auth-core/.../config/AuthEmailProperties.java`
- `RT-comops-auth-core/.../application/service/AuthEmailDeliveryService.java`
- `RT-comops-auth-core/.../application/service/AuthApplicationService.java` (lignes ~364-372)

**Options de contournement** :
- **A.** Activer `IWM_AUTH_EMAIL_ENABLED=true` en local (le SMTP MailHog est déjà configuré pour
  newsletter, §17.2). **✅ APPLIQUÉE le 2026-07-10 (session #7)**, avec l'accord explicite de
  l'utilisateur — voir encadré ci-dessous.
- **B.** Pour débloquer un test ponctuel sans toucher au code : lire le token de vérification
  directement en base Postgres (table de tokens d'`auth-core`) pour construire manuellement le
  lien `/auth/verify-email?token=…`.

> ⚠️ **Config temporaire active — à retirer sur demande**
>
> `IWM_AUTH_EMAIL_ENABLED=true` a été posé dans `KSM_Kernel_Layer/.env.local` (ligne ~22-27,
> commentaire explicite dans le fichier). C'est un changement de **config uniquement**
> (`.env.local`), pas de code — aucun fichier `.java` n'a été modifié pour ce point. Conséquence :
> KSM envoie désormais réellement l'email de vérification à l'inscription (visible dans MailHog
> `:8025`), ce qui débloque la connexion après inscription (cf. §18.4 pour le bug de sélection de
> contexte associé).
>
> **Pour retirer** (revenir au comportement par défaut du dépôt) : dans `KSM_Kernel_Layer/.env.local`,
> remettre `IWM_AUTH_EMAIL_ENABLED=false` (ou supprimer la ligne, le défaut Java est `false`), puis
> redémarrer KSM. Aucune autre étape — rien d'autre n'a été changé pour ce point.

### 18.3 ⚠️ Point ouvert (hors périmètre) — inscription qui plante si l'Actor existe déjà sans compte

**Constat** : si un `Actor` existe déjà pour un email dans le tenant YowNews (sans `UserAccount`
associé), l'inscription échoue en **500 générique** au lieu de réutiliser cet Actor.

**Cause identifiée dans `auth-core`/`actor-core`** (modules KSM **non possédés** — signalé, non
corrigé, contrainte de périmètre confirmée y compris en dérogation ponctuelle) :
- `AuthApplicationService.signUp()` (`RT-comops-auth-core/.../application/service/AuthApplicationService.java:284-344`)
  vérifie la disponibilité du `UserAccount` (`assertPrincipalAvailability`, ligne 302) mais jamais
  celle de l'`Actor`, avant d'appeler `createActorUseCase.createActor(...)` (ligne 303-313).
- `ActorApplicationService.createActor()` (`RT-comops-actor-core/.../ActorApplicationService.java:59-62`)
  lève `DuplicateActorEmailException` si un Actor actif existe déjà — gérée uniquement dans le
  contrôleur d'`actor-core` (`ActorExceptionHandler`, scope `ActorController`), pas dans le chemin
  sign-up (`AuthExceptionHandler` ne connaît que ses propres exceptions `UserAccount`). Elle remonte
  donc non interceptée → 500.
- Aucun endpoint KSM n'expose, depuis l'extérieur, un lookup Actor par email/tenant (vérifié
  exhaustivement sur `ActorController`/`AuthController`/`UserController`) — impossible pour le BFF
  de détecter ou de réparer ce cas précis sans modifier KSM.
- Réglages `server.error.include-message`/`include-exception` absents des YAML KSM → défauts Spring
  Boot, qui **n'exposent pas** le message de l'exception dans le corps JSON d'un 500 non géré — le
  BFF ne peut donc pas non plus distinguer ce cas d'un autre 500 après coup, par le contenu de la
  réponse.

**Décision confirmée avec l'utilisateur** : aucune modification de KSM, y compris `auth-core` en
dérogation ponctuelle (contrairement au point 18.1). Ce cas **reste bloquant** pour l'utilisateur
concerné tant que KSM n'est pas modifié — limite assumée, pas un oubli.

**Mitigation partielle appliquée côté BFF (ne corrige pas la cause racine)** :
- `src/server/ksm/modules/auth.ts` : `identifyAccount(principal)` → `POST /api/auth/identify`
  (endpoint KSM déjà public, non modifié). Appelé en pré-check dans `sign-up/route.ts` avant
  `authApi.signUp(...)` : si `accountExists === true` → réponse `409 ACCOUNT_MAY_EXIST` invitant à
  se connecter. **Limite documentée** : cet endpoint est **cross-tenant** côté KSM (pas de filtre
  par tenant) et ne renseigne que sur les `UserAccount`, jamais sur les `Actor` orphelins — donc
  il ne détecte **pas** le cas qui plante (Actor sans compte), seulement les cas voisins (compte
  déjà existant ailleurs sur la plateforme).
- `sign-up/route.ts` : si `authApi.signUp(...)` échoue avec un statut ≥ 500 (et que le pré-check
  n'a rien détecté), le message technique brut de KSM est remplacé par un message générique
  exploitable côté utilisateur, au lieu de le laisser fuiter tel quel.

**Piste de fix réel, si la contrainte de périmètre est un jour levée pour ce cas** (non appliquée) :
dans `AuthApplicationService.signUp()`, entourer l'appel `createActorUseCase.createActor(...)` d'un
`.onErrorResume(DuplicateActorEmailException.class, …)` qui retrouve l'Actor existant via
`ActorRepository.findByTenantId(tenantId)` (méthode **déjà existante** sur ce port, donc `actor-core`
n'aurait besoin d'aucune modification) filtré par email, pour le réutiliser au lieu de planter.
