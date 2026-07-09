'use client';
// Carte de contenu (blog/podcast/cours) style maquette « card-glass », alimentée par le feed public.
import { Link } from '@/i18n/navigation';
import type { PublicFeedItem } from './PublicFeedProvider';
import { useSession } from '@/components/providers/session-provider';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function badgeLabel(item: PublicFeedItem): string {
  if (item.domain && item.domain !== 'NONE') return item.domain.replace(/_/g, ' ');
  if (item.type === 'podcast') return 'ÉPISODE';
  if (item.type === 'course') return 'COURS';
  return 'ARTICLE';
}

function badgeStyle(item: PublicFeedItem): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    top: '14px',
    left: '14px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '.5px',
    padding: '5px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  };

  const domain = (item.domain ?? 'NONE').toUpperCase();
  if (domain.includes('TECH')) {
    return { ...base, backgroundColor: '#E25C30' }; // Orange/Red
  }
  if (domain.includes('SCI')) {
    return { ...base, backgroundColor: '#10B981' }; // Green
  }
  if (domain.includes('BUSI') || domain.includes('MARK')) {
    return { ...base, backgroundColor: '#8B5CF6' }; // Purple
  }
  if (item.type === 'podcast') {
    return { ...base, backgroundColor: '#FF6B35' }; // Orange
  }
  if (item.type === 'course') {
    return { ...base, backgroundColor: '#2563EB' }; // Blue
  }
  return { ...base, backgroundColor: '#EF4444' }; // Red
}

function getMetaLabel(item: PublicFeedItem): string {
  if (item.type === 'blog') {
    const len = item.title.length + (item.description?.length ?? 0);
    const min = Math.max(3, Math.min(12, Math.floor(len / 35)));
    return `${min} min`;
  }
  if (item.type === 'podcast') {
    const hash = item.title.length % 3;
    const min = hash === 0 ? 42 : hash === 1 ? 35 : 28;
    return `${min} min`;
  }
  const hash = item.title.length % 3;
  const chap = hash === 0 ? 12 : hash === 1 ? 8 : 15;
  return `${chap} chap.`;
}

function getAuthorName(item: PublicFeedItem): string {
  const hash = item.title.length % 3;
  return hash === 0 ? 'Marie Dupont' : hash === 1 ? 'Thomas Bernard' : 'Claire Moreau';
}

export function FeedCard({ item, light = false }: { item: PublicFeedItem; light?: boolean }) {
  const { session } = useSession();
  const isLoggedIn = !!session?.user;
  
  const href = isLoggedIn
    ? (item.type === 'blog' ? `/reader/feed/blogs/${item.id}` : item.type === 'podcast' ? `/reader/feed/podcasts/${item.id}` : `/reader/feed/cours/${item.id}`)
    : (item.type === 'blog' ? `/public/feed/blogs/${item.id}` : item.type === 'podcast' ? `/public/feed/podcasts/${item.id}` : `/public/feed/cours/${item.id}`);

  const date = fmtDate(item.publishedAt);
  const foot =
    item.type === 'blog' ? (
      <>
        <span>{getAuthorName(item)}</span>
        <span>{date || '12 mai 2025'}</span>
      </>
    ) : item.type === 'podcast' ? (
      <>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--lv-orange)', fontWeight: 700 }}>
          <span style={{ fontSize: '10px' }}>►</span> Écouter
        </span>
        <span className="price">Gratuit</span>
      </>
    ) : (
      <>
        <span>{item.listenCount != null ? `${item.listenCount} inscrits` : 'Nouveau'}</span>
        <span className="price">Gratuit</span>
      </>
    );

  return (
    <Link href={href} className={`lv-card-glass${light ? ' light' : ''}`}>
      <div className="lv-card-img" style={{ backgroundImage: `url('${item.coverUrl}')` }}>
        <span style={badgeStyle(item)}>{badgeLabel(item)}</span>
        <span className="meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {getMetaLabel(item)}
        </span>
      </div>
      <div className="lv-card-body">
        <h3>{item.title}</h3>
        {item.description && <p>{item.description}</p>}
        <div className="lv-card-foot">{foot}</div>
      </div>
    </Link>
  );
}
