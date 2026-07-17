import 'server-only';
import type { NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { isEducationEditor } from '@/lib/roles';
import { listDomains } from '@/server/ksm/modules/education';
import { submitApplication } from '@/server/ksm/modules/editor-applications';

// POST /api/role-requests — un Lecteur soumet sa candidature pour devenir Rédacteur.
export async function POST(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const authorities = session.user.permissions ?? session.user.roles;
    if (isEducationEditor(authorities)) {
      return fail(409, 'ALREADY_EDITOR', 'Vous êtes déjà Rédacteur.');
    }

    const body = (await request.json()) as {
      domains?: unknown;
      proofUrl?: string;
      motivation?: string;
    };

    const domains = Array.isArray(body.domains) ? body.domains.map(String) : [];
    const proofUrl = String(body.proofUrl ?? '').trim();
    const motivation = String(body.motivation ?? '').trim();

    // Valide contre la même source réelle que le formulaire (/api/education/domains, l'enum Domain
    // de KSM) — l'ancienne constante statique EDUCATION_DOMAINS était obsolète (ex. CUISINE,
    // pourtant un domaine réel, en était absent) et rejetait des candidatures valides.
    const validDomains = await listDomains(session);
    if (!domains.length || !domains.every((d) => validDomains.includes(d))) {
      return fail(400, 'VALIDATION_ERROR', 'Sélectionnez au moins un domaine valide.');
    }
    if (!proofUrl) return fail(400, 'VALIDATION_ERROR', 'Le lien de preuve est requis.');
    if (!motivation) return fail(400, 'VALIDATION_ERROR', 'La motivation est requise.');

    const created = await submitApplication(session, { domains, proofUrl, motivation });
    return ok(created, { status: 201 });
  });
}
