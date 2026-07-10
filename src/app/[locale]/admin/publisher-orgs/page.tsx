'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/components/providers/session-provider';
import { isPlatformAdmin } from '@/lib/roles';
import { apiFetch } from '@/lib/api-client';
import type { PublisherOrgRequest } from '@/server/ksm/modules/publisher-orgs';

export default function AdminPublisherOrgsPage() {
  const { session } = useSession();
  const [requests, setRequests] = useState<PublisherOrgRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const authorities = session?.user.permissions ?? session?.user.roles;
  const isAdmin = isPlatformAdmin(authorities);

  const loadRequests = React.useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const url = filterStatus ? `/api/publisher-orgs?status=${filterStatus}` : '/api/publisher-orgs';
      const data = await apiFetch<PublisherOrgRequest[]>(url);
      setRequests(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterStatus]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDecide = async (id: string, status: string) => {
    setActioningId(id);
    try {
      await apiFetch(`/api/publisher-orgs/${id}/decide`, {
        method: 'PUT',
        body: { status },
      });
      loadRequests();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour du statut.");
    } finally {
      setActioningId(null);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-[500px] mx-auto mt-20 p-6 text-center bg-red-50 border border-red-200 rounded-[12px] text-red-800">
        <h3 className="font-bold text-lg mb-2">Accès Interdit</h3>
        <p className="text-sm">Vous n'avez pas les droits administratifs nécessaires pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '24px' }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--gray-200, #e5e7eb)',
        padding: '28px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        
        {/* Header section with Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
              Modération des Organisations Éditrices
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B' }}>
              Validez ou suspendez les demandes d'organisations éditrices souhaitant publier sur Yowyob Education.
            </p>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                background: '#fff'
              }}
            >
              <option value="PENDING">En attente (PENDING)</option>
              <option value="APPROVED">Approuvées (APPROVED)</option>
              <option value="REJECTED">Refusées (REJECTED)</option>
              <option value="SUSPENDED">Suspendues (SUSPENDED)</option>
              <option value="">Tous les statuts</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
            <p style={{ fontSize: '14px', fontStyle: 'italic' }}>Aucune demande à afficher.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Code Org</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Nom</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Soumis le</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Statut</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="hover:bg-slate-50">
                    <td style={{ padding: '14px 8px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{req.orgCode}</td>
                    <td style={{ padding: '14px 8px', fontSize: '14px', color: '#334155' }}>{req.displayName || '-'}</td>
                    <td style={{ padding: '14px 8px', fontSize: '13px', color: '#64748B' }}>
                      {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 
                          req.status === 'APPROVED' ? '#DEF7EC' :
                          req.status === 'PENDING' ? '#EFF6FF' :
                          req.status === 'SUSPENDED' ? '#FEF3C7' : '#FEF2F2',
                        color:
                          req.status === 'APPROVED' ? '#03543F' :
                          req.status === 'PENDING' ? '#1D4ED8' :
                          req.status === 'SUSPENDED' ? '#92400E' : '#991B1B'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {actioningId === req.id ? (
                        <span style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Traitement...</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleDecide(req.id, 'APPROVED')}
                                style={{
                                  background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 600,
                                  padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer'
                                }}
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => handleDecide(req.id, 'REJECTED')}
                                style={{
                                  background: '#EF4444', color: '#fff', fontSize: '12px', fontWeight: 600,
                                  padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer'
                                }}
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {req.status === 'APPROVED' && (
                            <button
                              onClick={() => handleDecide(req.id, 'SUSPENDED')}
                              style={{
                                background: '#F59E0B', color: '#fff', fontSize: '12px', fontWeight: 600,
                                padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer'
                              }}
                            >
                              Suspendre
                            </button>
                          )}
                          {(req.status === 'SUSPENDED' || req.status === 'REJECTED') && (
                            <button
                              onClick={() => handleDecide(req.id, 'APPROVED')}
                              style={{
                                background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 600,
                                padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer'
                              }}
                            >
                              Réactiver
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
