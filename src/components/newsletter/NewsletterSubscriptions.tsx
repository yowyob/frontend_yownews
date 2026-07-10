'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

type Categorie = { id: string; nom: string; description?: string | null };
type FollowedRedacteur = { id: string; email: string; nom: string; prenom: string };

export default function NewsletterSubscriptions({ email: initialEmail }: { email: string }) {
  const [allCategories, setAllCategories] = useState<Categorie[]>([]);
  const [subscribed, setSubscribed] = useState<Categorie[] | null>(null);
  const [followed, setFollowed] = useState<FollowedRedacteur[] | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [busyTags, setBusyTags] = useState<Record<string, boolean>>({});
  const [busyRedacteurs, setBusyRedacteurs] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadSubscribed = async () => {
    try {
      const data = await apiFetch<Categorie[]>('/api/newsletter/subscriptions/categories');
      setSubscribed(data);
    } catch {
      setSubscribed([]);
    }
  };

  const loadFollowed = async () => {
    try {
      const data = await apiFetch<FollowedRedacteur[]>('/api/newsletter/subscriptions/redacteurs');
      setFollowed(data);
    } catch {
      setFollowed([]);
    }
  };

  useEffect(() => {
    apiFetch<Categorie[]>('/api/newsletter/categories')
      .then(setAllCategories)
      .catch(() => {});
    loadSubscribed();
    loadFollowed();
  }, []);

  const handleTagToggle = async (cat: Categorie, isSubscribed: boolean) => {
    if (busyTags[cat.id]) return;
    setBusyTags((prev) => ({ ...prev, [cat.id]: true }));
    setMessage(null);

    try {
      if (isSubscribed) {
        // Desabonnement
        await apiFetch(`/api/newsletter/subscriptions/categories/${cat.id}`, { method: 'DELETE' });
        setSubscribed((prev) => prev?.filter((c) => c.id !== cat.id) ?? null);
        setMessage({ text: `Désabonné de la catégorie ${cat.nom}`, type: 'success' });
      } else {
        // Abonnement
        if (!email.trim()) {
          setMessage({ text: 'Veuillez renseigner un email de réception.', type: 'error' });
          setBusyTags((prev) => ({ ...prev, [cat.id]: false }));
          return;
        }
        await apiFetch(`/api/newsletter/subscriptions/categories/${cat.id}`, {
          method: 'POST',
          body: { email: email.trim() },
        });
        await loadSubscribed();
        setMessage({ text: `Abonné à la catégorie ${cat.nom} !`, type: 'success' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Une erreur est survenue', type: 'error' });
    } finally {
      setBusyTags((prev) => ({ ...prev, [cat.id]: false }));
    }
  };

  const unsubscribeRedacteur = async (redacteur: FollowedRedacteur) => {
    if (busyRedacteurs[redacteur.id]) return;
    setBusyRedacteurs((prev) => ({ ...prev, [redacteur.id]: true }));
    setMessage(null);

    try {
      await apiFetch(`/api/newsletter/subscriptions/redacteurs/${redacteur.id}`, { method: 'DELETE' });
      setFollowed((prev) => prev?.filter((r) => r.id !== redacteur.id) ?? null);
      setMessage({ text: `Désabonné des newsletters de ${[redacteur.prenom, redacteur.nom].filter(Boolean).join(' ') || redacteur.email}`, type: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message || 'Une erreur est survenue', type: 'error' });
    } finally {
      setBusyRedacteurs((prev) => ({ ...prev, [redacteur.id]: false }));
    }
  };

  const subscribedIds = new Set((subscribed ?? []).map((c) => c.id));

  return (
    <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: 'var(--font-jakarta), sans-serif' }}>
      
      {/* ── CARD PRINCIPALE D'ABONNEMENT ───────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-sora), sans-serif', fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
          Gérer mes abonnements Newsletters
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
          Abonnez-vous aux thématiques de votre choix en cliquant simplement sur les catégories ci-dessous. Vous recevrez les articles directement dans votre boîte mail.
        </p>

        {message && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 500,
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: message.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fca5a5',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            transition: 'all 0.3s ease',
          }}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'block' }}>
            Email de réception des newsletters
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              style={{
                width: '100%',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '11px 14px 11px 40px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1F5FBF')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '14px' }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
        </div>

        <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '12px', display: 'block' }}>
          Thématiques disponibles
        </label>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {allCategories.map((c) => {
            const isSub = subscribedIds.has(c.id);
            const loading = busyTags[c.id];
            return (
              <button
                key={c.id}
                type="button"
                disabled={loading}
                onClick={() => handleTagToggle(c, isSub)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: isSub ? '1.5px solid #1F5FBF' : '1.5px solid #e2e8f0',
                  background: isSub ? '#eff6ff' : '#ffffff',
                  color: isSub ? '#1F5FBF' : '#475569',
                  borderRadius: '24px',
                  padding: '8px 16px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isSub && !loading) {
                    e.currentTarget.style.borderColor = '#1F5FBF';
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSub && !loading) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#ffffff';
                  }
                }}
              >
                <span>{c.nom}</span>
                {loading ? (
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                ) : isSub ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── LISTE DES RÉDACTEURS SUIVIS ───────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px 28px',
      }}>
        <h3 style={{ fontFamily: 'var(--font-sora), sans-serif', fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
          Rédacteurs abonnés
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
          Vous êtes également abonné aux publications personnelles des rédacteurs suivants :
        </p>

        {followed === null ? (
          <p style={{ color: '#94a3b8', fontSize: '13.5px' }}>Chargement des abonnements rédacteurs…</p>
        ) : followed.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b', fontSize: '13.5px', margin: 0 }}>Vous ne suivez aucun rédacteur individuel pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {followed.map((r) => {
              const name = [r.prenom, r.nom].filter(Boolean).join(' ') || r.email;
              const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
              const loading = busyRedacteurs[r.id];
              return (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #f1f5f9',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  background: '#f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#1F5FBF',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>
                      {initials}
                    </div>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{name}</span>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => unsubscribeRedacteur(r)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#ff6b35',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: loading ? 'default' : 'pointer',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {loading ? 'Désabonnement…' : 'Se désabonner'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
