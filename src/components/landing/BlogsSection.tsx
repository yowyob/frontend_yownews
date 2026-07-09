'use client';
import { Link } from '@/i18n/navigation';
import { usePublicFeed } from './PublicFeedProvider';
import { FeedCard } from './FeedCard';
import { useSession } from '@/components/providers/session-provider';

export function BlogsSection() {
  const { data, loading } = usePublicFeed();
  const { session } = useSession();
  const isLoggedIn = !!session?.user;
  const items = data.blogs.slice(0, 3);
  const seeAllHref = isLoggedIn ? '/reader/feed/blogs' : '/public/blogs';

  return (
    <section id="blogs" className="lv-section dark lv-grad" aria-labelledby="blogs-h2">
      <div className="lv-container">
        <div className="lv-section-head">
          <div>
            <span className="lv-tag light">BLOGS</span>
            <h2 id="blogs-h2">Nos derniers articles</h2>
          </div>
          <Link href={seeAllHref} className="lv-link-more">
            Voir tous les articles
          </Link>
        </div>
        <div className="lv-grid-3">
          {items.length > 0 ? (
            items.map((b) => <FeedCard key={b.id} item={b} />)
          ) : (
            <div className="lv-empty">{loading ? 'Chargement des articles…' : 'Bientôt de nouveaux articles.'}</div>
          )}
        </div>
      </div>
    </section>
  );
}
