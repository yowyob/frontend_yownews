import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';
import type { NewsletterStatus } from '@/server/ksm/modules/newsletter';

// GET /api/newsletter/newsletters?status= — file de modération des PUBLICATIONS (admin).
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const status = request.nextUrl.searchParams.get('status') as NewsletterStatus | null;
    return newsletterApi.listNewslettersByStatus(session, status ?? undefined);
  });
}

// POST /api/newsletter/newsletters — crée une PUBLICATION { titre, description, categorieIds }
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as { titre?: string; description?: string; categorieIds?: string[] };
    const titre = String(body.titre ?? '').trim();
    const description = String(body.description ?? '').trim();
    const categorieIds = Array.isArray(body.categorieIds) ? body.categorieIds : [];
    if (!titre) return fail(400, 'VALIDATION_ERROR', 'titre is required');

    // Nom/prénom de l'auteur résolus depuis le compte de l'utilisateur connecté.
    // Certains comptes (ex. inscription en mode organisation) n'ont ni nom ni prénom :
    // on retombe alors sur le username puis l'email pour ne jamais laisser l'auteur vide.
    const { firstName, lastName, username, email } = session.user;
    const hasName = Boolean(firstName?.trim() || lastName?.trim());
    return newsletterApi.createNewsletter(session, session.user.id, {
      titre, description, categorieIds,
      authorNom: hasName ? (lastName ?? '') : (username?.trim() || email),
      authorPrenom: hasName ? (firstName ?? '') : '',
    });
  });
}
