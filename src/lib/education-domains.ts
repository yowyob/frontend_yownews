// Domaines du module education KSM (enum Domain). Source unique partagée
// (TaxonomyManager, formulaire candidature Rédacteur, etc.).
export const EDUCATION_DOMAINS = [
  'EDUCATION', 'TECHNOLOGY', 'SCIENCE', 'ASTRONOMY', 'INFORMATIQUE',
  'LITTERATURE', 'AGRICULTURE', 'TAXI', 'TRAFFIC_RESEAU',
] as const;

export type EducationDomain = (typeof EDUCATION_DOMAINS)[number];
