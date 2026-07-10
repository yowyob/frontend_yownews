'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/providers/session-provider';
import { apiFetch } from '@/lib/api-client';
import type { EmployeeMembership } from '@/server/ksm/modules/publisher-orgs';

export default function MyOrgPage() {
  const workspace = useWorkspace();
  const [employees, setEmployees] = useState<EmployeeMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const activeOrgId = workspace?.organizationId;
  const isPlatformOrg = workspace?.organizationCode === (process.env.NEXT_PUBLIC_KSM_PLATFORM_ORG_CODE || 'YOWYOB_EDU');

  const loadEmployees = React.useCallback(async () => {
    if (!activeOrgId || isPlatformOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await apiFetch<EmployeeMembership[]>('/api/org/employees');
      setEmployees(list || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, isPlatformOrg]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

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
        body: { email: inviteEmail.trim() },
      });
      setInviteSuccess(`Invitation envoyée à ${inviteEmail}.`);
      setInviteEmail('');
      loadEmployees();
    } catch (err: any) {
      setInviteError(err.message || "Impossible d'inviter l'utilisateur. Vérifiez que son compte existe.");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir retirer ce membre de l'organisation ?")) {
      return;
    }
    try {
      await apiFetch(`/api/org/employees/${membershipId}`, {
        method: 'DELETE',
      });
      loadEmployees();
    } catch (err: any) {
      alert(err.message || "Erreur lors du retrait du membre.");
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
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--gray-100, #f3f4f6)',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 21V7l9-4 9 4v14M9 21V11h6v10"/></svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dark, #111827)', marginBottom: '12px' }}>
            Sélectionnez votre Organisation
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
            Veuillez basculer vers le contexte de votre organisation externe à l'aide du sélecteur d'espace situé en haut de la page pour pouvoir gérer ses membres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* Members List Card */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--gray-200, #e5e7eb)',
          padding: '28px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
            Membres de l'Organisation
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
            Gérez les collaborateurs ayant accès aux espaces de rédaction de votre organisation <strong>{workspace.organizationName}</strong>.
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
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Statut</th>
                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="hover:bg-slate-50">
                      <td style={{ padding: '14px 8px', fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{emp.email}</td>
                      <td style={{ padding: '14px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: emp.status === 'ACTIVE' ? '#DEF7EC' : '#FEF3C7',
                          color: emp.status === 'ACTIVE' ? '#03543F' : '#92400E'
                        }}>
                          {emp.status === 'ACTIVE' ? 'Actif' : 'Invité'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRemove(emp.id)}
                          style={{
                            background: 'transparent',
                            color: '#EF4444',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'color 0.2s'
                          }}
                          className="hover:text-red-700"
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Form Card */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--gray-200, #e5e7eb)',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Inviter un Collaborateur
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '20px', lineHeight: '1.4' }}>
            Saisissez l'email d'un compte YowYob Education existant. Un rôle rédacteur scopolé à l'organisation lui sera automatiquement assigné.
          </p>
          <form onSubmit={handleInvite}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collaborateur@email.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  marginBottom: '12px'
                }}
              />
              {inviteError && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '8px' }}>{inviteError}</div>}
              {inviteSuccess && <div style={{ color: '#10B981', fontSize: '12px', marginBottom: '8px' }}>{inviteSuccess}</div>}
            </div>
            <button
              type="submit"
              disabled={inviting}
              style={{
                width: '100%',
                background: '#FF6B35',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {inviting ? 'Invitation...' : 'Envoyer l\'invitation'}
            </button>
          </form>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
