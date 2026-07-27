import 'server-only';
import { fail } from '@/server/api-response';

// « Mode organisation » retiré : organisation unique (Yowyob Education), accès sur invitation.
export function POST() {
  return fail(410, 'FEATURE_REMOVED', 'Le mode organisation a été retiré.');
}
