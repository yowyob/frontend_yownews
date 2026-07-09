import type { ReactNode } from 'react';

const svg = (d: ReactNode) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const FEATURES: { ic: ReactNode; title: string; desc: string }[] = [
  {
    ic: svg(<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>),
    title: 'Contenus adaptés au Cameroun',
    desc: 'Des articles, cours et podcasts ancrés dans les réalités locales, de Douala à Yaoundé, de Bamenda à Garoua.',
  },
  {
    ic: svg(<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>),
    title: '100% gratuit',
    desc: 'Aucun abonnement, aucun frais caché. Tout le savoir est accessible librement, où que vous soyez.',
  },
  {
    ic: svg(<><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></>),
    title: 'Accessible partout',
    desc: 'Optimisé pour les connexions mobiles. Apprenez depuis votre téléphone, même avec un forfait data léger.',
  },
  {
    ic: svg(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>),
    title: 'Voix locales',
    desc: 'Des experts, entrepreneurs et enseignants camerounais partagent leur savoir et leur expérience.',
  },
  {
    ic: svg(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>),
    title: 'Cours structurés',
    desc: 'Des parcours organisés en unités, du débutant à l’avancé, pour progresser à votre rythme.',
  },
  {
    ic: svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>),
    title: 'Une communauté',
    desc: 'Forums, newsletters et profils d’auteurs : échangez et suivez celles et ceux qui vous inspirent.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="lv-features">
      <div className="lv-container">
        <h2>Tout ce dont vous avez besoin pour apprendre</h2>
        <div className="lv-grid-feat">
          {FEATURES.map((f) => (
            <div className="lv-feat" key={f.title}>
              <div className="lv-feat-ic">{f.ic}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
