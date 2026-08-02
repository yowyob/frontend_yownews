'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { apiFetch } from '@/lib/api-client';

// Cache module-level : userId → photoId (null = pas de photo). Un même auteur apparaît souvent
// plusieurs fois sur une page (liste d'utilisateurs, fil de posts…) ; on résout son photoId une
// seule fois. `inflight` déduplique les requêtes concurrentes pour le même userId.
const photoIdCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
// Instances de UserAvatar déjà montées, résolvant leur photo via `userId` — permet de les notifier
// en temps réel quand la photo change ailleurs (ex. upload sur la page profil) sans recharger la
// page. Sans ça, une instance déjà montée (sidebar, navbar) restait bloquée sur sa valeur en cache
// tant que le module JS n'était pas réinitialisé (F5).
const listeners = new Map<string, Set<(id: string | null) => void>>();

/** Diffuse un nouveau `photoId` à toutes les instances de `UserAvatar` résolues via ce `userId`,
 *  et met à jour le cache pour les futurs montages. À appeler après un upload réussi. */
export function setUserPhotoId(userId: string, photoId: string | null) {
  photoIdCache.set(userId, photoId);
  listeners.get(userId)?.forEach((fn) => fn(photoId));
}

async function resolvePhotoId(userId: string): Promise<string | null> {
  if (photoIdCache.has(userId)) return photoIdCache.get(userId) ?? null;
  const existing = inflight.get(userId);
  if (existing) return existing;
  const p = (async () => {
    try {
      const profile = await apiFetch<{ photoId?: string | null }>(`/api/users/${userId}/profile`);
      const id = profile?.photoId ?? null;
      photoIdCache.set(userId, id);
      return id;
    } catch {
      photoIdCache.set(userId, null);
      return null;
    } finally {
      inflight.delete(userId);
    }
  })();
  inflight.set(userId, p);
  return p;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

type Props = {
  name: string;
  size?: number;
  /** Fourni seul → le photoId est résolu via le profil public (avec cache). */
  userId?: string;
  /** Fourni (même `null`) → utilisé directement, sans requête de résolution. */
  photoId?: string | null;
  /** Couleur de la pastille de repli (initiales). */
  bg?: string;
  fontSize?: number;
  style?: CSSProperties;
  /** Si `true` et qu'une vraie photo est affichée, un clic l'ouvre en grand (overlay plein écran). */
  zoomable?: boolean;
};

/**
 * Avatar utilisateur : affiche la vraie photo de profil quand elle existe, sinon les initiales sur
 * pastille colorée (repli conservé). Deux modes : `photoId` explicite (aucun fetch) ou `userId`
 * (résolution du photoId via `/api/users/{id}/profile`, mise en cache par userId).
 */
export default function UserAvatar({ name, size = 36, userId, photoId, bg = 'var(--primary)', fontSize, style, zoomable }: Props) {
  // `photoId` explicite (même null) est utilisé tel quel ; sinon on résout depuis `userId` (async,
  // donc setState dans le .then → conforme à react-hooks/set-state-in-effect).
  const [fetchedId, setFetchedId] = useState<string | null | undefined>(undefined);
  // On mémorise la src qui a échoué (et non un booléen) : ainsi un changement d'id réactive l'image
  // sans avoir à réinitialiser d'état dans l'effet.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (photoId !== undefined || !userId) return; // rien à résoudre
    let cancelled = false;
    resolvePhotoId(userId).then((id) => { if (!cancelled) setFetchedId(id); });
    const set = listeners.get(userId) ?? new Set();
    listeners.set(userId, set);
    const onChange = (id: string | null) => { if (!cancelled) setFetchedId(id); };
    set.add(onChange);
    return () => {
      cancelled = true;
      set.delete(onChange);
      if (set.size === 0) listeners.delete(userId);
    };
  }, [userId, photoId]);

  const resolvedId = (photoId !== undefined ? photoId : fetchedId) ?? null;
  const showImg = !!resolvedId && failedSrc !== resolvedId;
  const src = showImg ? `/api/files/${resolvedId}` : null;

  return (
    <>
      <div
        onClick={zoomable && showImg ? () => setZoomOpen(true) : undefined}
        style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'var(--font-d)', fontWeight: 800,
          fontSize: fontSize ?? Math.round(size * 0.36), lineHeight: 1,
          cursor: zoomable && showImg ? 'zoom-in' : undefined,
          ...style,
        }}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element -- proxy BFF, pas d'optimisation next/image
          <img
            src={src ?? undefined}
            alt={name}
            width={size}
            height={size}
            onError={() => setFailedSrc(resolvedId)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          initialsOf(name)
        )}
      </div>

      {zoomOpen && src && (
        <div
          onClick={() => setZoomOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Fermer"
            style={{ position: 'absolute', top: '20px', right: '24px', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- même src proxy BFF que l'avatar */}
          <img
            src={src}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}
          />
        </div>
      )}
    </>
  );
}
