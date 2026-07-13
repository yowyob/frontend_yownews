import 'server-only';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';

/**
 * Liste les organisations que l'utilisateur courant peut activer (owned+member, déjà résolues au
 * login — cf. `accessibleOrganizations` sur `AppSession`), plus l'org actuellement active le cas
 * échéant. Alimente le sélecteur d'organisation du header editor/admin.
 */
export async function GET() {
  return authenticatedRoute((session) => {
    const organizations = session.accessibleOrganizations ?? [];
    if (!organizations.length) {
      return fail(404, 'NO_ORGANIZATION_ACCESS', "Ce compte n'est ni propriétaire ni employé d'aucune organisation.");
    }
    return ok({
      organizations,
      activeOrganizationId: session.workspace?.organizationId ?? null,
    });
  });
}
