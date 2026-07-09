import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';

// DELETE /api/forum/posts/[id] — supprimer un post
// Corrige le 404 existant : ForumGroupView appelait déjà cette route
// mais le fichier n'existait pas.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    await forumApi.deletePost(session, id, session.user.id);
    return null;
  });
}
