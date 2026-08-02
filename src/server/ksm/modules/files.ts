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

export type StoredFileResponse = { id: string; fileName: string; contentType: string; size: number };

/** Téléverse un fichier générique (multipart, champ `file`) via file-core. Renvoie son id, utilisable
 *  ensuite comme `photoId` (ex. photo de profil employé, cf. `updateEmployeePhoto`). */
export function uploadFile(session: AppSession, formData: FormData) {
  return callKsm<StoredFileResponse>(
    '/api/files',
    { method: 'POST', body: formData },
    { session },
  );
}
