import 'server-only';

export const serverEnv = {
  KSM_BASE_URL:         process.env.KSM_BASE_URL         ?? 'http://localhost:8080',
  KSM_CLIENT_ID:        process.env.KSM_CLIENT_ID        ?? 'yowyob-edu-frontend',
  KSM_API_KEY:          process.env.KSM_API_KEY          ?? '',
  KSM_PLATFORM_ORG_CODE: process.env.KSM_PLATFORM_ORG_CODE ?? 'YOWYOB_EDU',
  // Compte admin Yowyob Education utilisé côté serveur pour poser le rôle Lecteur aux nouveaux inscrits
  // (l'admin a déjà administration:assignments:write). Jamais exposé au client.
  KSM_PLATFORM_ADMIN_EMAIL:    process.env.KSM_PLATFORM_ADMIN_EMAIL    ?? 'admin@yowyob-edu.com',
  KSM_PLATFORM_ADMIN_PASSWORD: process.env.KSM_PLATFORM_ADMIN_PASSWORD ?? '',
  SESSION_SECRET:       process.env.SESSION_SECRET        ?? 'fallback-secret-do-not-use-in-production-12345678',
  SESSION_COOKIE_NAME:  process.env.SESSION_COOKIE_NAME  ?? 'yowyob_edu_session',
  SESSION_TTL_SECONDS:  Number(process.env.SESSION_TTL_SECONDS ?? '3600'),
  NODE_ENV:             (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',
  // Mode démo : contourne KSM/Redis pour parcourir toutes les pages sans backend
  // (session admin factice injectée par readSession()). Ne mock pas les données
  // métier : les widgets qui dépendent de KSM afficheront un état vide/erreur.
  MOCK_MODE:            process.env.MOCK_MODE === 'true',
} as const;
