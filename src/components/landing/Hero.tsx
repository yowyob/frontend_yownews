import { Link } from '@/i18n/navigation';
import { HeroCarousel } from './HeroCarousel';

export function Hero() {
  return (
    <section className="lv-hero" aria-labelledby="hero-h1">
      <HeroCarousel />
      <div className="lv-container">
        <h1 id="hero-h1">
          Apprenez. <span className="o">Explorez.</span>
          <br />
          Grandissez avec YowNews
        </h1>
        <p className="lead">
          Des milliers d&apos;articles, podcasts et cours créés par des experts camerounais et
          africains, pour booster vos compétences et nourrir votre curiosité, gratuitement.
        </p>
        <div className="ctas">
          <Link href="/auth/sign-up" className="lv-btn lv-btn-orange">
            Commencer maintenant
          </Link>
          <a href="#cours" className="lv-btn lv-btn-ghost">
            Explorer les cours
          </a>
        </div>
        <div className="checks">
          <span>100% Gratuit</span>
          <span>Sans engagement</span>
          <span>Accès illimité</span>
        </div>
        <nav className="lv-hero-nav" aria-label="Sections du contenu">
          <a href="#blogs">Blogs</a>
          <a href="#podcasts">Podcasts</a>
          <a href="#cours">Cours</a>
        </nav>
      </div>
    </section>
  );
}
