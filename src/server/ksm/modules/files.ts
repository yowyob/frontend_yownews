import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

/**
 * Flux binaire d'un fichier stocké par file-core (`GET /api/files/{fileId}`).
 *
 * Contrairement aux médias d'article (`/api/public/education/media/...`, publics), `FileController`
 * porte un `@PreAuthorize("hasUserContext")` **au niveau de la classe** : l'endpoint exige donc une
 * session authentifiée. On appelle avec la session du visiteur. Usage principal : les photos de
 * profil (`actor.actor.photo_id`) affichées dans l'interface connectée.
 */
export function getStoredFile(session: AppSession, fileId: string) {
  return callKsm<Response>(
    `/api/files/${fileId}`,
    { method: 'GET', raw: true },
    { session },
  );
}
