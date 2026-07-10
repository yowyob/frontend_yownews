import { Link } from '@/i18n/navigation';

export function Footer() {
  return (
    <footer className="lv-footer" aria-label="Pied de page">
      <div className="lv-container">
        <div className="lv-footer-grid">
          <div>
            <div className="lv-brand" style={{ color: '#fff', marginBottom: 14 }}>
              <span className="lv-logo" aria-hidden="true">YE</span> Yowyob Education
            </div>
            <p style={{ maxWidth: 320 }}>
              La plateforme de contenu éducatif du Cameroun. Blogs, podcasts, cours et communauté
              pour les talents d&apos;ici.
            </p>
          </div>
          <div>
            <h4>Explorer</h4>
            <ul>
              <li><a href="#blogs">Articles</a></li>
              <li><a href="#podcasts">Podcasts</a></li>
              <li><a href="#cours">Cours</a></li>
              <li><Link href="/reader/newsletter">Newsletter</Link></li>
            </ul>
          </div>
          <div>
            <h4>Communauté</h4>
            <ul>
              <li><Link href="/reader/forums">Forums</Link></li>
              <li><Link href="/editor">Devenir créateur</Link></li>
              <li><a href="#features">À propos</a></li>
            </ul>
          </div>
          <div>
            <h4>Compte</h4>
            <ul>
              <li><Link href="/auth/sign-up">Créer un compte</Link></li>
              <li><Link href="/auth/login">Se connecter</Link></li>
            </ul>
          </div>
        </div>
        <div className="bot">© 2025 Yowyob Education. Cameroun.</div>
      </div>
    </footer>
  );
}
