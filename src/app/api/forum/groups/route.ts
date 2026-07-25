import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';
import { getAdminSession } from '@/server/ksm/admin-session';
import { listTenantUsers } from '@/server/ksm/modules/administration';
import { logger } from '@/server/logger';

// Résout le nom d'affichage d'un utilisateur à partir de son id (join actor_id → vrais firstName/
// lastName via l'admin), pour le figer dans `creatorName` à la création. Best-effort : null si la
// session admin ou le lookup échoue (l'appelant ne bloque pas la création).
async function resolveCreatorName(userId: string): Promise<string | undefined> {
  try {
    const admin = await getAdminSession();
    if (!admin) return undefined;
    const users = await listTenantUsers(admin);
    const u = users.find((x) => x.userId === userId);
    if (!u) return undefined;
    return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || undefined;
  } catch (cause) {
    logger.error({ cause, userId }, 'forum.create.resolve_creator_name_failed');
    return undefined;
  }
}

// GET /api/forum/groups — groupes publics (VALIDATED)
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    return forumApi.listPublicGroups(session);
  });
}

// POST /api/forum/groups — créer un groupe
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const body = (await request.json()) as Parameters<typeof forumApi.createGroup>[1];
    const name = String(body.name ?? '').trim();
    if (!name) return fail(400, 'VALIDATION_ERROR', 'name is required');
    const creatorId = body.creatorId ?? session.user.id;
    // KSM refuse une COMMUNITY sans membres (« so members are required »). Le créateur en est le
    // premier membre par défaut : on le garantit ici pour que le client n'ait pas à le gérer.
    const members =
      body.type === 'COMMUNITY' && (!body.members || body.members.length === 0)
        ? [creatorId]
        : body.members;
    // Le créateur ne fournit aucun nom : on le résout automatiquement depuis son id et on le fige
    // dans `creatorName` (affiché en modération). On respecte un `creatorName` explicite s'il est fourni.
    const creatorName = body.creatorName ?? (await resolveCreatorName(creatorId));
    return forumApi.createGroup(session, { ...body, name, creatorId, creatorName, members });
  });
}
