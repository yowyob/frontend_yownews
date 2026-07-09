import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as ratingsApi from '@/server/ksm/modules/ratings';

// POST /api/ratings/evaluate — { score, feedback? } : évaluation de la plateforme par l'utilisateur courant.
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as { score?: number; feedback?: string };
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return fail(400, 'VALIDATION_ERROR', 'score must be an integer between 1 and 5');
    }

    return ratingsApi.rateApplication(session, session.user.id, score, body.feedback?.trim() || undefined);
  });
}
