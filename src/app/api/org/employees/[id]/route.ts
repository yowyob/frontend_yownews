import 'server-only';
import { type NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { removeEmployee } from '@/server/ksm/modules/publisher-orgs';
import { isEducationEditor, isPlatformAdmin } from '@/lib/roles';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return authenticatedRoute(async (session) => {
    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', "Vous n'avez pas l'autorisation de retirer des membres.");
    }

    const { id } = await params;
    await removeEmployee(session, id);
    return ok({ success: true });
  });
}
