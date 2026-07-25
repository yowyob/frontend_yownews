import 'server-only';
import type { NextRequest } from 'next/server';
import { readSession } from '@/server/session';
import { getStoredFile } from '@/server/ksm/modules/files';

/**
 * Proxy d'affichage d'un fichier stocké (photo de profil…). L'endpoint KSM sous-jacent exige une
 * session (`@PreAuthorize` de classe sur `FileController`) : on relaie donc le binaire seulement
 * pour un visiteur connecté, sinon 401 → l'appelant retombe sur ses initiales.
 *
 * Le contenu d'un `fileId` (UUID content-addressé) ne change jamais → cache `immutable`, mais
 * `private` car la ressource n'est servie qu'à un utilisateur authentifié.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  const session = await readSession();
  if (!session) return new Response(null, { status: 401 });

  const res = await getStoredFile(session, fileId);
  if (!res.ok || !res.body) {
    return new Response(null, { status: res.status === 200 ? 404 : res.status });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
