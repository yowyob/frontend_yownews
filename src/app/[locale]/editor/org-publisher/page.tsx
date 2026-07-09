'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/providers/session-provider';
import { apiFetch } from '@/lib/api-client';
import type { PublisherOrgRequest } from '@/server/ksm/modules/publisher-orgs';

export default function OrgPublisherPage() {
  const workspace = useWorkspace();
  const [request, setRequest] = useState<PublisherOrgRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [orgCode, setOrgCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  const activeOrgId = workspace?.organizationId;
  const isPlatformOrg = workspace?.organizationCode === (process.env.NEXT_PUBLIC_KSM_PLATFORM_ORG_CODE || 'YOWNEWS');

  useEffect(() => {
    if (workspace) {
      setOrgCode(workspace.organizationCode ?? '');
      setDisplayName(workspace.organizationName ?? '');
    }
  }, [workspace]);

  const loadMyRequest = React.useCallback(async () => {
    if (!activeOrgId || isPlatformOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<PublisherOrgRequest | null>('/api/publisher-orgs/mine');
      setRequest(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, isPlatformOrg]);

  useEffect(() => {
    loadMyRequest();
  }, [loadMyRequest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCode.trim()) {
      setError("Le code de l'organisation est requis.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<PublisherOrgRequest>('/api/publisher-orgs', {
        method: 'POST',
        body: { orgCode, displayName },
      });
      setRequest(data);
      setSuccess("Votre demande a été soumise avec succès.");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!workspace) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (isPlatformOrg) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dark, #fff)', marginBottom: '12px' }}>
            Sélectionnez votre Organisation
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-600, #9ca3af)', lineHeight: '1.6' }}>
            Vous êtes actuellement dans l'espace général de lecture. Veuillez basculer vers le contexte de votre organisation externe à l'aide du sélecteur d'espace situé en haut de la page pour pouvoir demander le statut d'organisation éditrice.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '24px' }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--gray-200, #e5e7eb)',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          Statut Organisation Éditrice YowNews
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: '1.5' }}>
          Demandez l'autorisation de publier des articles, podcasts et formations au nom de votre organisation <strong>{workspace.organizationName}</strong>.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : request ? (
          <div>
            {request.status === 'APPROVED' && (
              <div style={{
                background: '#ECFDF5',
                border: '1.5px solid #10B981',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>✅</span>
                <h3 style={{ color: '#065F46', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                  Organisation Éditrice Approuvée
                </h3>
                <p style={{ color: '#047857', fontSize: '13px', lineHeight: '1.5' }}>
                  Votre organisation a le statut d'organisation éditrice. Vous pouvez créer, valider et publier des contenus sur YowNews au nom de <strong>{request.displayName || request.orgCode}</strong>.
                </p>
              </div>
            )}

            {request.status === 'PENDING' && (
              <div style={{
                background: '#EFF6FF',
                border: '1.5px solid #3B82F6',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>⏳</span>
                <h3 style={{ color: '#1E3A8A', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                  Demande en cours d'examen
                </h3>
                <p style={{ color: '#1D4ED8', fontSize: '13px', lineHeight: '1.5' }}>
                  Votre demande pour le code <strong>{request.orgCode}</strong> ({request.displayName}) a bien été enregistrée le {new Date(request.createdAt).toLocaleDateString('fr-FR')} et est actuellement en cours d'examen par notre équipe administrative.
                </p>
              </div>
            )}

            {request.status === 'REJECTED' && (
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #EF4444',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px', textAlign: 'center' }}>❌</span>
                <h3 style={{ color: '#991B1B', fontWeight: 700, fontSize: '16px', marginBottom: '6px', textAlign: 'center' }}>
                  Demande Refusée
                </h3>
                <p style={{ color: '#B91C1C', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px', textAlign: 'center' }}>
                  Votre demande a été refusée par l'administrateur. Vous pouvez ajuster vos informations ci-dessous et soumettre à nouveau votre demande.
                </p>
                <hr style={{ borderColor: '#FEE2E2', margin: '16px 0' }} />
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Code Organisation</label>
                    <input
                      type="text"
                      value={orgCode}
                      onChange={(e) => setOrgCode(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nom d'affichage</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                    />
                  </div>
                  {error && <div style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-orange w-full"
                    style={{ background: 'var(--primary, #FF6B35)', color: '#fff', fontWeight: 600, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    {submitting ? 'Envoi...' : 'Soumettre à nouveau la demande'}
                  </button>
                </form>
              </div>
            )}

            {request.status === 'SUSPENDED' && (
              <div style={{
                background: '#FFFBEB',
                border: '1.5px solid #F59E0B',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🚫</span>
                <h3 style={{ color: '#78350F', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                  Statut Suspendu
                </h3>
                <p style={{ color: '#B45309', fontSize: '13px', lineHeight: '1.5' }}>
                  Le statut d'organisation éditrice pour <strong>{request.displayName}</strong> a été suspendu par les administrateurs de la plateforme YowNews. Vos membres ne peuvent temporairement plus publier de contenu. Veuillez contacter le support.
                </p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', color: '#1E293B' }}>
                Code Unique Organisation (KSM)
              </label>
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value)}
                placeholder="Ex: MYORG"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', color: '#1E293B' }}>
                Nom d'affichage YowNews
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Ma Super Org"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>

            {error && <div style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
            {success && <div style={{ color: '#10B981', fontSize: '13px', marginBottom: '12px' }}>{success}</div>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: '#FF6B35',
                color: '#fff',
                fontWeight: 700,
                fontSize: '15px',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {submitting ? 'Traitement en cours...' : 'Envoyer la demande d\'approbation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
