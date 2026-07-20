import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isEducationEditor, isPlatformAdmin } from '@/lib/roles';
import * as educationApi from '@/server/ksm/modules/education';

// Taille maximale d'une image insérée dans un corps d'article. Garde-fou côté BFF : au-delà, le
// HTML devient lourd à charger pour le lecteur et le flux multipart encombre KSM pour rien.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'];

/**
 * Téléverse une image destinée au CORPS d'un contenu (article, chapitre de cours) et renvoie son
 * URL, que l'éditeur insère dans le HTML. Réservé aux rédacteurs : c'est une écriture.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', 'Réservé aux rédacteurs');
    }

    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', 'file is required');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return fail(400, 'VALIDATION_ERROR', "Format d'image non pris en charge (PNG, JPEG, GIF, WebP ou AVIF).");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return fail(400, 'VALIDATION_ERROR', 'Image trop volumineuse (5 Mo maximum).');
    }

    const forward = new FormData();
    forward.append('file', file, file.name);
    return educationApi.uploadEditorMedia(session, forward);
  });
}
