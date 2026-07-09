import 'server-only';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/server/ksm/admin-session';
import * as educationApi from '@/server/ksm/modules/education';

// Proxy PUBLIC des images de couverture (landing). Streame l'image depuis KSM via la session
// service admin, sans exiger de session utilisateur. Ne sert que des contenus publiés
// (les feeds ne renvoient que du PUBLISHED).

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;
  const session = await getAdminSession();
  if (!session) return new Response(null, { status: 404 });

  let res: Response;
  if (type === 'blog') {
    res = await educationApi.getBlogCover(session, id);
  } else if (type === 'podcast') {
    res = await educationApi.getContentCover(session, 'podcasts', id);
  } else if (type === 'course') {
    res = await educationApi.getContentCover(session, 'courses', id);
  } else {
    return new Response(null, { status: 404 });
  }

  if (!res.ok || !res.body) return new Response(null, { status: 404 });

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
