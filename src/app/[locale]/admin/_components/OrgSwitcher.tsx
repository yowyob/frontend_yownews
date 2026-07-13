'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, BffApiError } from '@/lib/api-client';
import { useSession, useWorkspace } from '@/components/providers/session-provider';

type AccessibleOrganization = { organizationId: string; code: string; displayName: string };

type SwitchableResponse = { organizations: AccessibleOrganization[]; activeOrganizationId: string | null };

type SwitchResponse =
  | { workspace: { tenantId: string; organizationId: string; organizationCode: string; organizationName: string } }
  | {
      requiresSubscription: true;
      organization: AccessibleOrganization;
      requiredServices: readonly string[];
      effectiveServices: string[];
    };

const SERVICE_LABELS: Record<string, string> = {
  NEWSLETTER: 'Newsletter',
  HRM: 'Gestion des employés',
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Sélecteur d'organisation active — change de workspace en cours de session (même token, même sid,
 * juste le header X-Organization-Id qui change côté BFF) via /api/org/switch, sans re-login. N'a de
 * sens que si l'utilisateur a accès à plusieurs organisations (owned+member) ; sinon affiche un
 * badge statique avec l'org active (ou rien si aucune org).
 */
export default function OrgSwitcher() {
  const router = useRouter();
  const { refresh } = useSession();
  const workspace = useWorkspace();

  const [organizations, setOrganizations] = useState<AccessibleOrganization[] | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribeStep, setSubscribeStep] = useState<{
    organization: AccessibleOrganization;
    requiredServices: readonly string[];
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<SwitchableResponse>('/api/org/switchable');
      setOrganizations(res.organizations);
    } catch (err) {
      // 404 NO_ORGANIZATION_ACCESS : compte sans org (ex. lecteur freelance) — pas une erreur à
      // afficher, juste "pas de switcher pour ce compte".
      setOrganizations(err instanceof BffApiError && err.status === 404 ? [] : null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleSwitch(organizationId: string) {
    if (switching || organizationId === workspace?.organizationId) { setOpen(false); return; }
    setSwitching(true);
    setError(null);
    try {
      const res = await apiFetch<SwitchResponse>('/api/org/switch', {
        method: 'POST',
        body: { organizationId },
      });
      if ('requiresSubscription' in res) {
        setSubscribeStep({ organization: res.organization, requiredServices: res.requiredServices });
        return;
      }
      setOpen(false);
      setSubscribeStep(null);
      await refresh();
      router.refresh();
    } catch {
      setError("Impossible de changer d'organisation.");
    } finally {
      setSwitching(false);
    }
  }

  async function handleSubscribe(serviceCode: string) {
    if (!subscribeStep || switching) return;
    setSwitching(true);
    setError(null);
    try {
      await apiFetch('/api/org/subscribe', {
        method: 'POST',
        body: { organizationId: subscribeStep.organization.organizationId, serviceCode },
      });
      await handleSwitch(subscribeStep.organization.organizationId);
    } catch {
      setError('Impossible de souscrire ce service.');
      setSwitching(false);
    }
  }

  // Pas encore chargé, ou compte sans organisation accessible : rien à afficher.
  if (organizations === null || organizations.length === 0) return null;

  const activeName = workspace?.organizationName ?? organizations.find((o) => o.organizationId === workspace?.organizationId)?.displayName;

  // Une seule org accessible : badge statique, pas de dropdown (rien à switcher).
  if (organizations.length === 1) {
    return activeName ? (
      <div
        title={activeName}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
          borderRadius: '20px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
          border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-600)',
        }}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
        {activeName}
      </div>
    ) : null;
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSubscribeStep(null); setError(null); }}
        disabled={switching}
        aria-haspopup="menu" aria-expanded={open}
        title="Changer d'organisation active"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
          borderRadius: '20px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
          border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--dark)',
          cursor: switching ? 'wait' : 'pointer', opacity: switching ? 0.6 : 1,
        }}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
        {activeName ?? 'Choisir une organisation'}
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12" height="12" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 149 }} />
          <div
            role="menu"
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '240px',
              background: '#fff', borderRadius: '10px', border: '1px solid var(--gray-200)',
              boxShadow: 'var(--sh-lg)', padding: '6px', zIndex: 150,
            }}
          >
            {error && (
              <div style={{ padding: '8px 12px', fontSize: '12px', color: '#dc2626' }}>{error}</div>
            )}
            {subscribeStep ? (
              <div style={{ padding: '4px' }}>
                <p style={{ padding: '6px 8px 10px', fontSize: '12px', color: 'var(--gray-500)' }}>
                  « {subscribeStep.organization.displayName} » n&apos;a souscrit à aucun module. Choisissez celui à activer :
                </p>
                {subscribeStep.requiredServices.map((code) => (
                  <button
                    key={code}
                    type="button"
                    role="menuitem"
                    disabled={switching}
                    onClick={() => handleSubscribe(code)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                      borderRadius: '7px', fontSize: '13px', fontWeight: 500, color: 'var(--dark)',
                      border: 'none', background: 'transparent', cursor: switching ? 'wait' : 'pointer',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {SERVICE_LABELS[code] ?? code}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSubscribeStep(null)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: '7px', fontSize: '12px', color: 'var(--gray-500)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  Retour
                </button>
              </div>
            ) : (
              organizations.map((org) => {
                const active = org.organizationId === workspace?.organizationId;
                return (
                  <button
                    key={org.organizationId}
                    type="button"
                    role="menuitem"
                    disabled={switching}
                    onClick={() => handleSwitch(org.organizationId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
                      padding: '9px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: 500,
                      color: active ? 'var(--accent)' : 'var(--dark)',
                      background: active ? 'rgba(255,107,53,.08)' : 'transparent',
                      border: 'none', cursor: switching ? 'wait' : 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{ width: '24px', height: '24px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff', background: 'var(--primary)', flexShrink: 0 }}>
                      {initials(org.displayName)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.displayName}</span>
                    {active && (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
