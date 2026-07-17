'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AppLink } from '@/components/ui/app-link';
import { useSessionUser } from '@/components/providers/session-provider';
import { isPlatformAdmin } from '@/lib/roles';

// Lien vers l'écran de modération (/admin/{kind}/moderation), affiché uniquement pour l'admin
// plateforme — la modération elle-même reste un écran séparé (validation obligatoire, cf. décision
// produit), mais sans ce lien depuis l'espace de gestion courant, du contenu SUBMITTED pouvait
// rester indéfiniment invisible/non traité (cf. bug feed lecteur vide). Réutilise le même endpoint
// filtrable que ContentModeration (`/api/admin/{kind}?status=SUBMITTED`) pour le compteur — pas de
// nouvel endpoint.
export default function ModerationLink({ kind }: { kind: 'blogs' | 'courses' | 'podcasts' }) {
  const user = useSessionUser();
  const admin = isPlatformAdmin(user?.permissions ?? user?.roles);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    apiFetch<{ id: string }[]>(`/api/admin/${kind}?status=SUBMITTED`)
      .then((data) => { if (!cancelled) setPending(Array.isArray(data) ? data.length : 0); })
      .catch(() => { if (!cancelled) setPending(null); });
    return () => { cancelled = true; };
  }, [admin, kind]);

  if (!admin) return null;

  return (
    <AppLink
      href={`/${kind}/moderation`}
      style={{
        marginLeft: 'auto', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: 'none',
        color: pending ? '#B45309' : 'var(--gray-600, #4b5563)',
        background: pending ? '#FEF3C7' : 'var(--gray-100, #f3f4f6)',
      }}
    >
      Modération
      {pending ? (
        <span style={{ background: '#B45309', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 11 }}>
          {pending}
        </span>
      ) : null}
    </AppLink>
  );
}
