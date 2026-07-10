'use client';
import { Link } from '@/i18n/navigation';
import PodcastFeedCard from '@/components/feed/PodcastFeedCard';
import { STATIC_PODCASTS } from './staticContent';
import { useSession } from '@/components/providers/session-provider';

export function PodcastsSection() {
  const { session } = useSession();
  const isLoggedIn = !!session?.user;
  const spacePrefix = isLoggedIn ? '/reader' : '/public';
  const seeAllHref = isLoggedIn ? '/reader/feed/podcasts' : '/public/podcasts';

  return (
    <section id="podcasts" className="lv-section" style={{ background: 'var(--lv-bg)' }} aria-labelledby="podcasts-h2">
      <div className="lv-container">
        <div className="lv-section-head">
          <div>
            <span className="lv-tag light">PODCASTS</span>
            <h2 id="podcasts-h2" style={{ color: 'var(--lv-ink)' }}>
              Écoutez nos podcasts
            </h2>
          </div>
          <Link href={seeAllHref} className="lv-link-more">
            Tous les podcasts
          </Link>
        </div>
        <div className="lv-grid-3">
          {STATIC_PODCASTS.map((p) => (
            <PodcastFeedCard
              key={p.id}
              item={p}
              spacePrefix={spacePrefix}
              favorited={false}
              onToggleFavorite={() => {}}
              showActions={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
