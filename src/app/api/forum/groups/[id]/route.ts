import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';
import { resolveUserNames } from '@/server/ksm/user-names';
import { isPlatformAdmin } from '@/lib/roles';

// PUT /api/forum/groups/[id] — modifier un groupe
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = await request.json();
    return forumApi.updateGroup(session, id, body);
  });
}

// DELETE /api/forum/groups/[id] — l'admin supprime n'importe quel groupe (modération),
// le créateur supprime le sien (propriété vérifiée côté backend dans les deux cas).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const authorities = session.user.permissions ?? session.user.roles;
    if (isPlatformAdmin(authorities)) {
      await forumApi.deleteGroup(session, id);
    } else {
      await forumApi.deleteOwnGroup(session, id);
    }
    return null;
  });
}

// GET /api/forum/groups/[id] — recuperer un groupe.
// On joint `memberNames` (best-effort) : les `members` KSM ne sont que des UUID, mais le créateur
// doit voir les vrais noms dans le panneau « Membres ». N'altère jamais `members` (UUID conservés).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const group = await forumApi.getGroup(session, id);
    const memberIds = group.members ?? [];
    const names = memberIds.length > 0 ? await resolveUserNames(memberIds) : new Map<string, string>();
    return { ...group, memberNames: memberIds.map((uid) => ({ userId: uid, userName: names.get(uid) ?? null })) };
  });
}

