'use client';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/components/providers/session-provider';
import { isPlatformAdmin, isEducationEditor } from '@/lib/roles';

export function Header() {
  const { session } = useSession();
  const user = session?.user ?? null;

  const authorities = user?.permissions ?? user?.roles;
  const dashboardHref = isPlatformAdmin(authorities)
    ? '/admin/dashboard'
    : isEducationEditor(authorities)
      ? '/editor/dashboard'
      : '/reader/profile';

  return (
    <header className="lv-nav">
      <div className="lv-container lv-nav-inner">
        <Link href="/" className="lv-brand" aria-label="Yowyob Education">
          <span className="lv-logo" aria-hidden="true">YE</span> Yowyob Education
        </Link>
        <div className="lv-nav-links">
          <Link href="/public/blogs">Blogs</Link>
          <Link href="/public/podcasts">Podcasts</Link>
          <Link href="/public/cours">Cours</Link>
          <Link href="/#features">À propos</Link>
        </div>
        <div className="lv-nav-cta">
          {user ? (
            <Link href={dashboardHref} className="lv-btn lv-btn-orange">
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/auth/login">Connexion</Link>
              <Link href="/auth/sign-up" className="lv-btn lv-btn-orange">
                Commencer gratuitement
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
