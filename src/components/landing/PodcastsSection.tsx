'use client';
import { Link } from '@/i18n/navigation';
import { usePublicFeed } from './PublicFeedProvider';
import { FeedCard } from './FeedCard';
import { useSession } from '@/components/providers/session-provider';

export function PodcastsSection() {
  const { data, loading } = usePublicFeed();
  const { session } = useSession();
  const isLoggedIn = !!session?.user;
  const items = data.podcasts.slice(0, 3);
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
          {items.length > 0 ? (
            items.map((p) => <FeedCard key={p.id} item={p} light />)
          ) : (
            <div className="lv-empty">{loading ? 'Chargement des podcasts…' : 'Bientôt de nouveaux épisodes.'}</div>
          )}
        </div>
      </div>
    </section>
  );
}
