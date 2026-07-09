const TESTIMONIALS = [
  {
    quote:
      'Grâce aux cours de marketing digital, j’ai lancé ma petite boutique en ligne à Douala. Le contenu est clair et vraiment adapté à notre marché.',
    name: 'Aïcha Ngono',
    role: 'Entrepreneure, Douala',
  },
  {
    quote:
      'Les podcasts tech m’accompagnent chaque matin dans les embouteillages de Yaoundé. J’apprends énormément, et tout est gratuit.',
    name: 'Hervé Tchoumi',
    role: 'Développeur, Yaoundé',
  },
  {
    quote:
      'Enfin une plateforme qui parle de nos réalités. Les articles sur l’agriculture m’ont beaucoup aidée dans mon exploitation à Bafoussam.',
    name: 'Marlyse Fotso',
    role: 'Agricultrice, Bafoussam',
  },
];

export function TestimonialsSection() {
  return (
    <section className="lv-testi-wrap lv-grad">
      <div className="lv-container">
        <h2>Ce que disent nos apprenants</h2>
        <div className="lv-grid-3 lv-testi-grid">
          {TESTIMONIALS.map((t) => (
            <div className="lv-testi" key={t.name}>
              <div className="q">&ldquo;</div>
              <p className="quote">{t.quote}</p>
              <div className="who">
                <span className="avatar" aria-hidden="true">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <div className="n">{t.name}</div>
                  <div className="r">{t.role}</div>
                </div>
              </div>
              <div className="lv-stars" aria-label="5 étoiles sur 5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
