import 'server-only';
import { serverEnv } from '@/env';
import { logger } from '@/server/logger';
import { discoverSignUpContexts } from './modules/auth';

// Resolves the YowNews platform organization id from KSM by its business code.
// The id is authoritative on the KSM side (never hardcoded here); only the code
// lives in config. Cached for the process lifetime since the id is stable.
let cached: string | null = null;

export async function resolvePlatformOrganizationId(): Promise<string | null> {
  if (cached) return cached;
  const code = serverEnv.KSM_PLATFORM_ORG_CODE;
  try {
    const res = await discoverSignUpContexts(code);
    cached =
      (res.contexts.find((c) => c.organizationCode === code) ?? res.contexts[0])
        ?.organizationId ?? null;
    if (!cached) {
      logger.warn({ code }, 'ksm.platform_org.not_found');
    }
  } catch (cause) {
    // Misconfiguration (code points to an unknown org, KSM unreachable, ...):
    // leave unresolved so the kernel returns an explicit ORGANIZATION_CONTEXT error.
    logger.error({ code, cause }, 'ksm.platform_org.resolve_failed');
    cached = null;
  }
  return cached;
}
