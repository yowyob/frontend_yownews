import 'server-only';
import { fail } from '@/server/api-response';

// Inscription retirée de yownews : la création de compte se fait sur le portail yowauth
// (cf. NEXT_PUBLIC_CREATE_ACCOUNT_URL, page /auth/sign-up qui y renvoie). L'accès à la plateforme
// se fait ensuite sur invitation dans l'organisation. Ce endpoint local n'a plus de rôle.
export function POST() {
  return fail(410, 'SIGN_UP_MOVED', "L'inscription se fait désormais sur le portail Yowyob (yowauth).");
}
