'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/providers/session-provider';
import { apiFetch } from '@/lib/api-client';
import type { EmployeeMembershipResponse } from '@/server/ksm/modules/employees';
import type { OrgContentItem, OrgContentType } from '@/server/ksm/modules/education';
import RowMenu from '@/components/education/RowMenu';
import { orgRoleOptionsForServices, orgRoleLabel } from '@/lib/org-roles';

const CONTENT_TYPE_OPTIONS: { value: OrgContentType; label: string }[] = [
  { value: 'blog', label: 'Blogs' },
  { value: 'course', label: 'Cours' },
  { value: 'podcast', label: 'Podcasts' },
];

const CONTENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

export default function OrganisationPage() {
  const workspace = useWorkspace();
  const [tab, setTab] = useState<'members' | 'content'>('members');
  const [employees, setEmployees] = useState<EmployeeMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleCode, setInviteRoleCode] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [contentType, setContentType] = useState<OrgContentType>('blog');
  const [orgContent, setOrgContent] = useState<OrgContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const activeOrgId = workspace?.organizationId;
  const isPlatformOrg = workspace?.organizationCode === (process.env.NEXT_PUBLIC_KSM_PLATFORM_ORG_CODE || 'YOWYOB_EDU');
  // Rôles attribuables, bornés par les services souscrits de l'org (Éducation et/ou Forum).
  const roleOptions = orgRoleOptionsForServices(workspace?.services);
  const selectedInviteRole = inviteRoleCode || roleOptions[0]?.code || '';

  const loadEmployees = React.useCallback(async () => {
    if (!activeOrgId || isPlatformOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await apiFetch<EmployeeMembershipResponse[]>('/api/org/employees');
      setEmployees(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, isPlatformOrg]);

  useEffect(() => {
    void (async () => {
      await loadEmployees();
    })();
  }, [loadEmployees]);

  const loadOrgContent = React.useCallback(async () => {
    if (!activeOrgId || isPlatformOrg) return;
    setContentLoading(true);
    setContentError(null);
    try {
      const items = await apiFetch<OrgContentItem[]>(`/api/org/content?type=${contentType}`);
      setOrgContent(items || []);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Impossible de charger le contenu.');
    } finally {
      setContentLoading(false);
    }
  }, [activeOrgId, isPlatformOrg, contentType]);

  useEffect(() => {
    if (tab !== 'content') return;
    void (async () => {
      await loadOrgContent();
    })();
  }, [tab, loadOrgContent]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("L'adresse email est requise.");
      return;
    }
    setInviteError(null);
    setInviteSuccess(null);
    setInviting(true);
    try {
      await apiFetch('/api/org/employees', {
        method: 'POST',
        body: { email: inviteEmail.trim(), roleCode: selectedInviteRole },
      });
      setInviteSuccess(`Rôle attribué à ${inviteEmail}.`);
      setInviteEmail('');
      loadEmployees();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Impossible d'attribuer ce rôle. Vérifiez que le compte existe.",
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (membershipId: string, roleCode: string) => {
    setSavingId(membershipId);
    try {
      await apiFetch(`/api/org/employees/${membershipId}`, {
        method: 'PUT',
        body: { roleCode },
      });
      await loadEmployees();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du changement de rôle.');
    } finally {
      setSavingId(null);
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir retirer ce membre de l'organisation ?")) return;
    try {
      await apiFetch(`/api/org/employees/${membershipId}`, { method: 'DELETE' });
      loadEmployees();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du retrait du membre.');
    }
  };

  if (!workspace) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--gray-200)', borderBottomColor: 'var(--accent)', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isPlatformOrg) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }}>
        <div style={{
          background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-100, #f3f4f6)',
          padding: '32px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dark, #111827)', marginBottom: '12px' }}>
            Aucune organisation active
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
            Connectez-vous en mode organisation pour gérer vos membres et vos rôles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--gray-200, #e5e7eb)' }}>
        {([
          { key: 'members' as const, label: 'Membres' },
          { key: 'content' as const, label: "Contenu de l'organisation" },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 700, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: tab === t.key ? '#FF6B35' : '#64748B',
              borderBottom: tab === t.key ? '2px solid #FF6B35' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        <div style={{
          background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200, #e5e7eb)',
          padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
            Membres de l&apos;organisation
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
            Gérez les rôles des collaborateurs de <strong>{workspace.organizationName}</strong>.
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '45px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--gray-200)', borderBottomColor: 'var(--accent)', animation: 'spin .7s linear infinite' }} />
            </div>
          ) : employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <p style={{ fontSize: '14px', fontStyle: 'italic' }}>Aucun collaborateur enregistré pour le moment.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Rôle</th>
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 8px', fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{emp.email}</td>
                      <td style={{ padding: '14px 8px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                        {savingId === emp.id ? 'Enregistrement…' : orgRoleLabel(emp.roleName)}
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                        <RowMenu
                          disabled={savingId === emp.id}
                          items={[
                            ...roleOptions.map((r) => ({
                              label: `Définir comme ${r.label}`,
                              onClick: () => handleRoleChange(emp.id, r.code),
                            })),
                            { label: "Retirer de l'organisation", onClick: () => handleRemove(emp.id), danger: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{
          background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200, #e5e7eb)',
          padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Attribuer un rôle
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '20px', lineHeight: '1.4' }}>
            Saisissez l&apos;email d&apos;un compte existant et le rôle à lui attribuer dans votre organisation.
          </p>
          <form onSubmit={handleInvite}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collaborateur@email.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <select
                value={selectedInviteRole}
                onChange={(e) => setInviteRoleCode(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              >
                {roleOptions.length === 0 && <option value="">Aucun service souscrit</option>}
                {roleOptions.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </div>
            {inviteError && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '8px' }}>{inviteError}</div>}
            {inviteSuccess && <div style={{ color: '#10B981', fontSize: '12px', marginBottom: '8px' }}>{inviteSuccess}</div>}
            <button
              type="submit"
              disabled={inviting}
              style={{ width: '100%', background: '#FF6B35', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              {inviting ? 'Envoi…' : 'Attribuer le rôle'}
            </button>
          </form>
        </div>
      </div>
      )}

      {tab === 'content' && (
        <div style={{
          background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200, #e5e7eb)',
          padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                Contenu de l&apos;organisation
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B' }}>
                Publié au nom de <strong>{workspace.organizationName}</strong>, par vous ou vos collaborateurs.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setContentType(opt.value)}
                  style={{
                    padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                    border: contentType === opt.value ? '1px solid #FF6B35' : '1px solid #D1D5DB',
                    background: contentType === opt.value ? 'rgba(255,107,53,.08)' : '#fff',
                    color: contentType === opt.value ? '#FF6B35' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {contentError && (
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', color: '#DC2626', fontSize: '13px' }}>
              {contentError}
            </div>
          )}

          {contentLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '45px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--gray-200)', borderBottomColor: 'var(--accent)', animation: 'spin .7s linear infinite' }} />
            </div>
          ) : orgContent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <p style={{ fontSize: '14px', fontStyle: 'italic' }}>Aucun contenu de ce type pour le moment.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Titre</th>
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Statut</th>
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {orgContent.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 8px', fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{item.title}</td>
                      <td style={{ padding: '14px 8px', fontSize: '13px', color: '#64748B' }}>
                        {item.status ? (CONTENT_STATUS_LABELS[item.status] ?? item.status) : '—'}
                      </td>
                      <td style={{ padding: '14px 8px', fontSize: '13px', color: '#64748B' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
