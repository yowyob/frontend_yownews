import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// Taille max d'un média inséré dans un contenu de newsletter (image en ligne ou fichier joint).
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Téléverse une image ou un fichier destiné au corps d'un contenu de newsletter (éditeur par blocs),
 * et renvoie son URL publique absolue. Proxy vers KSM `POST /api/v1/newsletter/media`.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', 'file is required');
    if (file.size > MAX_BYTES) return fail(400, 'VALIDATION_ERROR', 'Fichier trop volumineux (15 Mo maximum).');

    const forward = new FormData();
    forward.append('file', file, file.name);
    return newsletterApi.uploadNewsletterMedia(session, forward);
  });
}
