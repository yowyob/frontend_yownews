import 'server-only';
import type { NextRequest } from 'next/server';
import * as educationApi from '@/server/ksm/modules/education';

/**
 * Streame une image insérée dans le corps d'un contenu. **Aucune session requise** : ces images
 * apparaissent dans des articles publiés, lus par des visiteurs anonymes (et, à terme, embarqués
 * sur des sites tiers). L'endpoint KSM correspondant est public pour la même raison ; le modèle
 * d'accès est celui d'un CDN — un UUID non devinable.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  const res = await educationApi.getEditorMedia(fileId);
  if (!res.ok || !res.body) {
    return new Response(null, { status: res.status === 200 ? 404 : res.status });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      // Le contenu d'un id donné ne change jamais : on laisse le navigateur le garder.
      'Cache-Control': res.headers.get('cache-control') ?? 'public, max-age=31536000, immutable',
    },
  });
}
