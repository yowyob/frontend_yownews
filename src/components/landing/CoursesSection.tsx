'use client';
import { Link } from '@/i18n/navigation';
import { usePublicFeed } from './PublicFeedProvider';
import { FeedCard } from './FeedCard';
import { useSession } from '@/components/providers/session-provider';

export function CoursesSection() {
  const { data, loading } = usePublicFeed();
  const { session } = useSession();
  const isLoggedIn = !!session?.user;
  const items = data.courses.slice(0, 3);
  const seeAllHref = isLoggedIn ? '/reader/feed/cours' : '/public/cours';

  return (
    <section id="cours" className="lv-section dark lv-grad" aria-labelledby="cours-h2">
      <div className="lv-container">
        <div className="lv-section-head">
          <div>
            <span className="lv-tag light">COURS</span>
            <h2 id="cours-h2">Commencez à apprendre aujourd&apos;hui</h2>
          </div>
          <Link href={seeAllHref} className="lv-link-more">
            Voir tous les cours
          </Link>
        </div>
        <div className="lv-grid-3">
          {items.length > 0 ? (
            items.map((c) => <FeedCard key={c.id} item={c} />)
          ) : (
            <div className="lv-empty">{loading ? 'Chargement des cours…' : 'Bientôt de nouveaux cours.'}</div>
          )}
        </div>
      </div>
    </section>
  );
}
