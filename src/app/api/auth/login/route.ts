import 'server-only';
import type { NextRequest } from 'next/server';
import type { AppSession } from '@/lib/types/auth';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { writeSession } from '@/server/session';
import { buildSession, saveJoinPending } from '@/server/login-pending';
import { getTermsConsent } from '@/server/terms-consent';
import { ensureOrgServicesSubscribed } from '@/server/ksm/freelance-org';
import { promoteToEditorOnPlatformOrg, getAdminSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { listEmployees } from '@/server/ksm/modules/employees';
import { getMyApplication } from '@/server/ksm/modules/editor-applications';
import { allowLoginAttempt, clientIp } from '@/server/rate-limit';
import { isPlatformAdmin, isEducationEditor } from '@/lib/roles';
import { HttpError } from '@/lib/types/api';
import { logger } from '@/server/logger';

// « Membre EDU » = le token porte déjà la permission lecteur éducation (rôle EDUCATION_READER de l'org
// plateforme). On teste la permission (éventuellement suffixée `#<orgId>`) plutôt que la liste d'orgs.
function hasEducationAccess(session: AppSession): boolean {
  const perms = session.user.permissions ?? session.user.roles ?? [];
  return perms.some((p) => p === 'education:content:read' || p.startsWith('education:content:read#'));
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { email?: string; password?: string };
    // Le champ saisi est un identifiant Yowyob (username) ou un email. On ne force pas le lowercase :
    // un username peut être sensible à la casse, et l'email réel n'est de toute façon plus un
    // identifiant de connexion côté KSM (il renvoie l'identifiant par email — cf. plus bas).
    const principal = String(body.email ?? '').trim();
    const password = String(body.password ?? '');

    if (!principal || !password) {
      return fail(400, 'VALIDATION_ERROR', 'email and password are required');
    }

    // Rate-limit par IP AVANT tout appel KSM (remplace le captcha) : freine le bourrage d'identifiants.
    if (!(await allowLoginAttempt(clientIp(request)))) {
      return fail(429, 'RATE_LIMITED', 'Trop de tentatives. Réessayez dans une minute.');
    }

    // Depuis le rebuild KSM, l'ancien email n'est plus un identifiant de connexion : discover-contexts
    // répond 401 AUTH_YOWYOB_IDENTITY_REMINDER_SENT et KSM envoie l'identifiant Yowyob (username) par
    // email. On traduit ce cas en résultat positif dédié pour que le client affiche l'écran adéquat
    // (sans le router à tort vers l'inscription). Les autres erreurs KSM sont relancées telles quelles.
    let discovery: Awaited<ReturnType<typeof authApi.discoverContexts>>;
    try {
      discovery = await authApi.discoverContexts(principal, password);
    } catch (cause) {
      if (cause instanceof HttpError && cause.errorCode === 'AUTH_YOWYOB_IDENTITY_REMINDER_SENT') {
        return { requiresIdentifier: true as const, message: cause.message };
      }
      throw cause;
    }

    if (!discovery.contexts.length) {
      // discover-contexts renvoie une liste vide aussi bien pour un mauvais mot de passe que pour un
      // compte inexistant : on lève l'ambiguïté avec /identify pour router correctement.
      let accountExists = false;
      try {
        accountExists = (await authApi.identifyAccount(principal)).accountExists;
      } catch (cause) {
        logger.error({ cause }, 'auth.login.identify_failed');
      }
      if (accountExists) {
        return fail(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
      }
      // Pas de compte KSM → le client redirige vers la page d'inscription (→ yowauth).
      return { requiresSignUp: true as const };
    }

    const ctx = discovery.contexts[0];
    const orgs = ctx.organizations ?? [];

    // Organisation unique (Yowyob Education) : plus de sélection/switch d'org. On auto-sélectionne
    // le premier contexte d'org disponible (0 org = contexte plateforme par défaut ; ≥1 = validé
    // nativement par KSM via validateOrganizationAccess).
    const orgId = orgs[0]?.organizationId ?? undefined;
    let contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);
    let session = buildSession(contextual);

    // Le login n'est autorisé que pour un membre ACTIF de l'org plateforme (invitation acceptée). Le
    // rôle lecteur étant attribué dès l'invitation (statut PENDING), on ne peut PAS se fier au rôle :
    // on résout le statut d'adhésion réel. Fail-open : si le lookup admin échoue (incident
    // transitoire), on retombe sur la permission education pour ne pas verrouiller un membre légitime.
    let isActiveMember: boolean;
    try {
      const admin = await getAdminSession();
      const platformOrgId = admin ? await resolvePlatformOrganizationId() : null;
      if (admin && platformOrgId) {
        const members = await listEmployees(admin, platformOrgId);
        const me = members.find((m) => m.userId === session.user.id);
        isActiveMember = me ? me.status === 'ACTIVE' : false;
      } else {
        isActiveMember = hasEducationAccess(session);
      }
    } catch (cause) {
      logger.error({ cause }, 'auth.login.membership_status_failed');
      isActiveMember = cause instanceof HttpError && cause.status === 404 ? false : hasEducationAccess(session);
    }

    // La gate d'adhésion ACTIVE ne concerne QUE les lecteurs (accès obtenu par invitation). Le staff
    // plateforme (admin) et les éditeurs n'ont pas d'adhésion `employee_membership` — leur accès vient
    // de rôles (SUPER_EDUCATION_SERVICES_MANAGER, EDUCATION_EDITOR_PERMISSIONS) → on les exempte, sinon
    // ils seraient redirigés à tort vers « Rejoindre ».
    const authorities = session.user.permissions ?? session.user.roles;
    const isStaff = isPlatformAdmin(authorities) || isEducationEditor(authorities);

    // Lecteur non-membre OU membre PENDING (invitation non acceptée) : on propose « Rejoindre ». Le
    // clic (→ /api/auth/login/join) (r)émet l'invitation dans l'org EDU ; l'utilisateur active ensuite
    // son accès via le lien reçu par email (PENDING→ACTIVE), puis se reconnecte. On ne renvoie qu'un
    // pendingId opaque (l'email reste côté serveur, borné dans le temps).
    if (!isStaff && !isActiveMember) {
      // Inviter par le RECOVERY_EMAIL : KSM résout l'invité par cette adresse (l'email fourni à
      // l'inscription), pas par `email` (= <username>@yowyob.com), sinon 404 EMPLOYEE_NOT_FOUND.
      const inviteEmail = contextual.session.recoveryEmail ?? session.user.email;
      const pendingId = await saveJoinPending({ email: inviteEmail }, discovery.expiresInSeconds);
      return { requiresJoin: true as const, pendingId, email: session.user.email };
    }

    // Re-login frais (mêmes identifiants) pour refléter un rôle attribué après l'émission du token.
    async function freshLogin(preferOrgId?: string): Promise<void> {
      try {
        const d = await authApi.discoverContexts(principal, password);
        const c = d.contexts[0];
        if (!c) return;
        const target =
          preferOrgId ??
          c.organizations.find((o) => o.organizationId === orgId)?.organizationId ??
          c.organizations[0]?.organizationId ??
          undefined;
        contextual = await authApi.selectContext(d.selectionToken, c.contextId, target);
        session = buildSession(contextual);
      } catch (cause) {
        logger.error({ cause }, 'auth.login.fresh_login_failed');
      }
    }

    // Souscription aux services d'une org (mode organisation) : sans rapport avec la logique de
    // rôle ci-dessous, ne concerne que les comptes qui activent une organisation externe.
    if (orgId) {
      await ensureOrgServicesSubscribed(session, orgId, orgs[0]?.services ?? []);
    }

    // Bascule Lecteur→Rédacteur : mécanisme unique — invitation dans l'org Yowyob Education (déjà
    // vérifiée plus haut via isActiveMember) → candidature → approbation par l'admin (owner) →
    // attribution du rôle PAR l'admin, jamais par auto-attribution de l'utilisateur. L'ancien
    // modèle ("self-service, propriétaire de sa propre org") est abandonné : peu importe qu'un
    // compte possède par ailleurs une autre organisation ou non, seule son appartenance "employé"
    // à Yowyob Education compte ici. Cf. promoteToEditorOnPlatformOrg.
    try {
      const application = await getMyApplication(session);
      if (application?.status === 'APPROVED') {
        const admin = await getAdminSession();
        if (admin) {
          const promoted = await promoteToEditorOnPlatformOrg(admin, session.user.id);
          if (promoted) await freshLogin();
        }
      }
    } catch (cause) {
      logger.error({ cause }, 'auth.login.editor_promotion_failed');
    }

    // Rattache la preuve de consentement enregistrée au clic sur « Rejoindre » (même résolution
    // d'email que saveJoinPending, cf. plus haut). Absente pour le staff (jamais passé par ce gate) :
    // simple enrichissement informatif, ne bloque pas le login.
    try {
      const consentEmail = contextual.session.recoveryEmail ?? session.user.email;
      const termsConsent = await getTermsConsent(consentEmail);
      if (termsConsent) session.termsConsent = termsConsent;
    } catch (cause) {
      logger.error({ cause }, 'auth.login.terms_consent_lookup_failed');
    }

    await writeSession(session);

    return {
      user: session.user,
      workspace: session.workspace,
      forcePasswordChange: session.forcePasswordChange ?? false,
    };
  });
}
