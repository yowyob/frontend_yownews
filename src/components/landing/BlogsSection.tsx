'use client';
import { Link } from '@/i18n/navigation';
import ContentFeedCard from '@/components/feed/ContentFeedCard';
import { STATIC_BLOGS } from './staticContent';
import { useSession } from '@/components/providers/session-provider';

export function BlogsSection() {
  const { session } = useSession();
  const isLoggedIn = !!session?.user;
  const spacePrefix = isLoggedIn ? '/reader' : '/public';
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
        <div className="lv-grid-cards">
          {STATIC_BLOGS.map((b) => (
            <ContentFeedCard
              key={b.id}
              item={b}
              spacePrefix={spacePrefix}
              favorited={false}
              onToggleFavorite={() => {}}
              showActions={false}
              surface
            />
          ))}
        </div>
      </div>
    </section>
  );
}
