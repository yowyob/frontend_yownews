'use client';
import { Link } from '@/i18n/navigation';
import ContentFeedCard from '@/components/feed/ContentFeedCard';
import { STATIC_COURSES } from './staticContent';
import { useSession } from '@/components/providers/session-provider';

export function CoursesSection() {
  const { session } = useSession();
  const isLoggedIn = !!session?.user;
  const spacePrefix = isLoggedIn ? '/reader' : '/public';
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
          {STATIC_COURSES.map((c) => (
            <ContentFeedCard
              key={c.id}
              item={c}
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
