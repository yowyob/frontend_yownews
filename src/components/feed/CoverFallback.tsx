'use client';

// Couleurs de marque en aplat uniquement (jamais de dégradé) — cf. charte définie sur le
// module Auth. Choisies déterministement à partir de l'id pour varier visuellement dans une
// grille de cartes sans paraître aléatoire d'un rendu à l'autre.
const PALETTE = ['#1F5FBF', '#FF6B35', '#1A4F9E', '#0F3460'];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initial(title: string) {
  const clean = title.trim();
  return clean ? clean[0].toUpperCase() : '?';
}

const ICONS: Record<string, React.ReactNode> = {
  PODCAST: (
    <path d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4zM5 10v1a7 7 0 0014 0v-1M12 18v4M8 22h8" />
  ),
  COURSE: (
    <path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
  ),
  BLOG: (
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6M9 9h1" />
  ),
};

/**
 * Couverture de secours quand aucune image n'est disponible (contenu de démo, cover jamais
 * uploadée…) — remplace le carré gris vide par un aplat de marque + initiale + pictogramme,
 * pour que la grille de feed reste dense et vivante même sans médias réels.
 */
export default function CoverFallback({
  id, title, contentType, style,
}: {
  id: string;
  title: string;
  contentType?: string | null;
  style?: React.CSSProperties;
}) {
  const bg = colorFor(id);
  const icon = ICONS[(contentType ?? 'BLOG').toUpperCase()] ?? ICONS.BLOG;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        ...style,
      }}
    >
      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.2" style={{ position: 'absolute', opacity: 0.14, top: '-10px', right: '-10px' }}>
        {icon}
      </svg>
      <span style={{ fontFamily: 'var(--font-d)', fontSize: '56px', fontWeight: 800, color: 'rgba(255,255,255,.92)' }}>
        {initial(title)}
      </span>
    </div>
  );
}
