'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import RowMenu, { type MenuItem } from '@/components/education/RowMenu';
import { useConfirm } from '@/components/ui/useConfirm';

type NewsletterStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type Categorie = { id: string; nom: string };
type Publication = {
  id: string; titre: string; description?: string | null; statut: NewsletterStatus;
  authorNom?: string | null; authorPrenom?: string | null;
  categories?: Categorie[] | null; coverId?: string | null; createdAt?: string | null;
};

const TABS: { key: NewsletterStatus; label: string }[] = [
  { key: 'PENDING', label: 'En attente' },
  { key: 'APPROVED', label: 'Validées' },
  { key: 'REJECTED', label: 'Rejetées' },
];

const STATUS_BADGE: Record<NewsletterStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'En attente', bg: '#FEF9EC', color: '#B45309' },
  APPROVED: { label: 'Validée', bg: 'rgba(34,197,94,.1)', color: '#16A34A' },
  REJECTED: { label: 'Rejetée', bg: '#FEF2F2', color: '#DC2626' },
};

const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: 'var(--gray-800)', borderTop: '1px solid var(--gray-100)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.5px' };

function StatusBadge({ statut }: { statut: NewsletterStatus }) {
  const b = STATUS_BADGE[statut];
  return <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color, whiteSpace: 'nowrap' }}>{b.label}</span>;
}

export default function NewsletterPublicationModeration() {
  const [tab, setTab] = useState<NewsletterStatus>('PENDING');
  const [items, setItems] = useState<Publication[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribersView, setSubscribersView] = useState<{ publication: Publication; emails: string[] | null } | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const load = async () => {
    setItems(null);
    try { setItems(await apiFetch<Publication[]>(`/api/newsletter/newsletters?status=${tab}`)); } catch { setItems([]); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- rechargement à chaque changement d'onglet.
  useEffect(() => { load(); }, [tab]);

  const setStatut = async (id: string, action: 'approve' | 'reject', statut: NewsletterStatus) => {
    setBusyId(id); setError(null);
    try {
      await apiFetch(`/api/newsletter/admin/newsletters/${id}/${action}`, { method: 'POST' });
      setItems((prev) => prev?.map((i) => i.id === id ? { ...i, statut } : i) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’action');
    } finally { setBusyId(null); }
  };

  const remove = async (id: string) => {
    if (!(await confirm('Supprimer définitivement cette newsletter et tous ses contenus ?'))) return;
    setBusyId(id); setError(null);
    try {
      await apiFetch(`/api/newsletter/newsletters/${id}`, { method: 'DELETE' });
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la suppression');
    } finally { setBusyId(null); }
  };

  // Union catégories + suiveurs du rédacteur + abonnés directs : « qui recevrait un e-mail si
  // cette newsletter publiait maintenant ? » (voir NewsletterEntityService.getSubscriberEmails).
  const viewSubscribers = async (p: Publication) => {
    setSubscribersView({ publication: p, emails: null });
    try {
      const emails = await apiFetch<string[]>(`/api/newsletter/newsletters/${p.id}/subscribers`);
      setSubscribersView({ publication: p, emails });
    } catch {
      setSubscribersView({ publication: p, emails: [] });
    }
  };

  const menuFor = (p: Publication): MenuItem[] => {
    const voir: MenuItem = { label: 'Voir les abonnés', onClick: () => viewSubscribers(p) };
    const del: MenuItem = { label: 'Supprimer', onClick: () => remove(p.id), danger: true };
    if (p.statut === 'PENDING') return [
      voir,
      { label: 'Valider', onClick: () => setStatut(p.id, 'approve', 'APPROVED') },
      { label: 'Rejeter', onClick: () => setStatut(p.id, 'reject', 'REJECTED'), danger: true },
    ];
    if (p.statut === 'APPROVED') return [
      voir,
      { label: 'Rejeter', onClick: () => setStatut(p.id, 'reject', 'REJECTED'), danger: true },
      del,
    ];
    return [voir, del];
  };

  const author = (p: Publication) => [p.authorPrenom, p.authorNom].filter(Boolean).join(' ') || '—';

  return (
    <div>
      {ConfirmDialog}
      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 20,
            border: `1px solid ${tab === t.key ? 'var(--blue)' : 'var(--gray-200)'}`,
            background: tab === t.key ? 'var(--blue)' : '#fff',
            color: tab === t.key ? '#fff' : 'var(--gray-600)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={th}>Newsletter</th>
              <th style={th}>Auteur</th>
              <th style={th}>Catégories</th>
              <th style={th}>Statut</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null ? (
              <tr><td style={td} colSpan={5}>Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td style={{ ...td, color: 'var(--gray-400)' }} colSpan={5}>Aucune newsletter ici.</td></tr>
            ) : items.map((p) => (
              <tr key={p.id} style={{ opacity: busyId === p.id ? 0.5 : 1 }}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.coverId && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/newsletter/newsletters/${p.id}/cover`} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.titre}</div>
                      {p.description && <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{p.description}</div>}
                    </div>
                  </div>
                </td>
                <td style={td}>{author(p)}</td>
                <td style={td}>{p.categories && p.categories.length > 0 ? p.categories.map((c) => c.nom).join(', ') : '—'}</td>
                <td style={td}><StatusBadge statut={p.statut} /></td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <RowMenu disabled={busyId === p.id} items={menuFor(p)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subscribersView && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSubscribersView(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '440px', width: '100%', maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 20px 45px rgba(0,0,0,.18)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px' }}>Abonnés à « {subscribersView.publication.titre} »</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gray-500)', margin: '0 0 16px' }}>
              Catégories, suiveurs du rédacteur et abonnés directs confondus.
            </p>
            {subscribersView.emails === null ? (
              <div style={{ color: 'var(--gray-400)', fontSize: '14px' }}>Chargement…</div>
            ) : subscribersView.emails.length === 0 ? (
              <div style={{ color: 'var(--gray-500)', fontSize: '14px' }}>Aucun abonné pour l&apos;instant.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {subscribersView.emails.map((email) => (
                  <li key={email} style={{ fontSize: '13.5px', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '8px' }}>{email}</li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" onClick={() => setSubscribersView(null)} style={{
                border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '9px 18px', background: '#fff',
                color: 'var(--gray-700)', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer',
              }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
