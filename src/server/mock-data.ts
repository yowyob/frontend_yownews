import 'server-only';
import type { FeedItem, BlogDetail, ContentDetail } from './ksm/modules/education';
import type { DiscussionGroup, ForumPost, ForumCategorie } from './ksm/modules/forum';

/**
 * Données de démonstration servies uniquement en MOCK_MODE (cf. env.ts), pour pouvoir
 * parcourir les feeds (blogs/podcasts/cours) et le forum sans backend KSM disponible.
 * Ce ne sont pas des fixtures de test — juste de quoi peupler l'UI en mode démo.
 */

const DOMAINS = ['Développement', 'Business', 'Design', 'Marketing', 'Langues'];

export const MOCK_BLOG_FEED: FeedItem[] = [
  { id: 'mock-blog-1', contentType: 'BLOG', title: 'Comment démarrer avec Next.js en 2026', description: "Un guide pas à pas pour construire une première application moderne, du routage à l'App Router.", authorId: 'mock-author-1', domain: 'Développement', freeTags: ['Next.js', 'React'], publishedAt: '2026-06-12T09:00:00.000Z' },
  { id: 'mock-blog-2', contentType: 'BLOG', title: '5 stratégies pour lancer sa micro-entreprise en Afrique de l\'Ouest', description: "Retour d'expérience d'entrepreneurs ivoiriens sur le financement et la formalisation.", authorId: 'mock-author-2', domain: 'Business', freeTags: ['Entrepreneuriat'], publishedAt: '2026-06-08T14:30:00.000Z' },
  { id: 'mock-blog-3', contentType: 'BLOG', title: 'Les bases du design system pour les petites équipes', description: 'Pourquoi et comment construire une bibliothèque de composants cohérente sans surcharger votre process.', authorId: 'mock-author-3', domain: 'Design', freeTags: ['UI', 'Design System'], publishedAt: '2026-06-01T08:15:00.000Z' },
  { id: 'mock-blog-4', contentType: 'BLOG', title: 'Marketing digital : cibler sans budget publicitaire', description: 'Des techniques de croissance organique testées sur le marché camerounais.', authorId: 'mock-author-2', domain: 'Marketing', freeTags: ['Growth'], publishedAt: '2026-05-27T11:00:00.000Z' },
  { id: 'mock-blog-5', contentType: 'BLOG', title: 'Apprendre l\'anglais des affaires en 3 mois', description: 'Une méthode progressive pour gagner en confiance à l\'oral professionnel.', authorId: 'mock-author-4', domain: 'Langues', freeTags: ['Anglais'], publishedAt: '2026-05-20T16:45:00.000Z' },
  { id: 'mock-blog-6', contentType: 'BLOG', title: 'TypeScript : sortir des pièges classiques du typage', description: 'Panorama des erreurs fréquentes chez les développeurs qui migrent depuis JavaScript.', authorId: 'mock-author-1', domain: 'Développement', freeTags: ['TypeScript'], publishedAt: '2026-05-14T10:20:00.000Z' },
];

export const MOCK_PODCAST_FEED: FeedItem[] = [
  { id: 'mock-pod-1', contentType: 'PODCAST', title: 'Épisode 12 — Construire une startup EdTech en Afrique', description: 'Discussion avec une fondatrice basée à Abidjan sur les défis du financement local.', authorId: 'mock-author-5', domain: 'Business', freeTags: ['Startup'], publishedAt: '2026-06-10T07:00:00.000Z', listenCount: 1840 },
  { id: 'mock-pod-2', contentType: 'PODCAST', title: 'Épisode 11 — Design accessible : par où commencer ?', description: "Introduction pratique à l'accessibilité web pour les designers pressés.", authorId: 'mock-author-3', domain: 'Design', freeTags: ['Accessibilité'], publishedAt: '2026-06-03T07:00:00.000Z', listenCount: 962 },
  { id: 'mock-pod-3', contentType: 'PODCAST', title: 'Épisode 10 — Les langages qui montent en 2026', description: 'Tour d\'horizon des tendances techniques à surveiller cette année.', authorId: 'mock-author-1', domain: 'Développement', freeTags: ['Tech'], publishedAt: '2026-05-27T07:00:00.000Z', listenCount: 2210 },
  { id: 'mock-pod-4', contentType: 'PODCAST', title: 'Épisode 9 — Négocier son premier contrat freelance', description: 'Conseils concrets pour fixer ses tarifs et éviter les pièges classiques.', authorId: 'mock-author-2', domain: 'Business', freeTags: ['Freelance'], publishedAt: '2026-05-20T07:00:00.000Z', listenCount: 1345 },
];

export const MOCK_COURSE_FEED: FeedItem[] = [
  { id: 'mock-course-1', contentType: 'COURSE', title: 'Développement web moderne avec React', description: 'Un parcours complet du composant à la mise en production, avec projets pratiques.', authorId: 'mock-author-1', domain: 'Développement', freeTags: ['React', 'Débutant'], publishedAt: '2026-05-01T00:00:00.000Z' },
  { id: 'mock-course-2', contentType: 'COURSE', title: 'Gestion de projet pour freelances', description: 'Structurer ses missions clients, ses livrables et son planning sans y laisser sa santé mentale.', authorId: 'mock-author-2', domain: 'Business', freeTags: ['Gestion'], publishedAt: '2026-04-18T00:00:00.000Z' },
  { id: 'mock-course-3', contentType: 'COURSE', title: 'Introduction au design UI/UX', description: 'Les fondamentaux de la conception d\'interfaces centrées utilisateur, de la recherche au prototype.', authorId: 'mock-author-3', domain: 'Design', freeTags: ['UI/UX', 'Débutant'], publishedAt: '2026-04-05T00:00:00.000Z' },
  { id: 'mock-course-4', contentType: 'COURSE', title: 'Anglais professionnel niveau intermédiaire', description: 'Vocabulaire et mises en situation pour gagner en aisance en réunion et à l\'écrit.', authorId: 'mock-author-4', domain: 'Langues', freeTags: ['Anglais'], publishedAt: '2026-03-22T00:00:00.000Z' },
];

export const MOCK_FORUM_GROUPS: DiscussionGroup[] = [
  { groupId: 'mock-group-1', name: 'Développeurs Afrique', description: 'Échanges techniques entre développeurs francophones — entraide, code review, offres.', type: 'FORUM', status: 'VALIDATED', creatorId: 'mock-author-1', creatorName: 'Kwame Asante', members: ['mock-author-1', 'mock-author-2', 'mock-author-3'], createdAt: '2026-01-15T00:00:00.000Z' },
  { groupId: 'mock-group-2', name: 'Entrepreneurs & Startups', description: "Communauté d'entrepreneurs qui partagent retours d'expérience et opportunités de financement.", type: 'COMMUNITY', status: 'VALIDATED', creatorId: 'mock-author-2', creatorName: 'Aïcha Traoré', members: ['mock-author-2', 'mock-author-4'], createdAt: '2026-02-02T00:00:00.000Z' },
  { groupId: 'mock-group-3', name: 'Design & Créativité', description: 'Un espace pour partager ses maquettes, demander des retours et discuter des tendances.', type: 'PUBLIC', status: 'VALIDATED', creatorId: 'mock-author-3', creatorName: 'Mariam Kaboré', members: ['mock-author-3'], createdAt: '2026-02-20T00:00:00.000Z' },
];

export const MOCK_FORUM_POSTS: Record<string, ForumPost[]> = {
  'mock-group-1': [
    { postId: 'mock-post-1', title: 'Quelqu\'un utilise déjà le nouveau App Router en production ?', content: 'Je migre un projet Pages Router et je cherche des retours d\'expérience sur les points de friction.', authorId: 'mock-author-1', authorName: 'Kwame Asante', groupId: 'mock-group-1', numberOfLikes: 14, numberOfDislikes: 0, commentCount: 6, creationDate: '2026-06-09T10:00:00.000Z' },
    { postId: 'mock-post-2', title: 'Retour sur 6 mois de TypeScript strict', content: 'Le mode strict fait mal au début mais évite pas mal de bugs en prod. Voici ce qu\'on a appris.', authorId: 'mock-author-3', authorName: 'Mariam Kaboré', groupId: 'mock-group-1', numberOfLikes: 9, numberOfDislikes: 1, commentCount: 3, creationDate: '2026-06-04T15:30:00.000Z' },
  ],
  'mock-group-2': [
    { postId: 'mock-post-3', title: 'Comment avez-vous trouvé vos premiers investisseurs ?', content: 'Je lance ma startup EdTech et je cherche des pistes de financement adaptées au marché local.', authorId: 'mock-author-2', authorName: 'Aïcha Traoré', groupId: 'mock-group-2', numberOfLikes: 22, numberOfDislikes: 0, commentCount: 11, creationDate: '2026-06-07T09:00:00.000Z' },
  ],
  'mock-group-3': [
    { postId: 'mock-post-4', title: 'Retours sur ma maquette de landing page', content: 'Premier jet pour un client e-commerce, je suis preneur de critiques constructives.', authorId: 'mock-author-3', authorName: 'Mariam Kaboré', groupId: 'mock-group-3', numberOfLikes: 7, numberOfDislikes: 0, commentCount: 4, creationDate: '2026-06-11T12:00:00.000Z' },
  ],
};

export const MOCK_FORUM_CATEGORIES: Record<string, ForumCategorie[]> = {
  'mock-group-1': [
    { categorieId: 'mock-cat-1', categorieName: 'Entraide', groupeId: 'mock-group-1', postsIds: ['mock-post-1'] },
    { categorieId: 'mock-cat-2', categorieName: 'Retours d\'expérience', groupeId: 'mock-group-1', postsIds: ['mock-post-2'] },
  ],
  'mock-group-2': [
    { categorieId: 'mock-cat-3', categorieName: 'Financement', groupeId: 'mock-group-2', postsIds: ['mock-post-3'] },
  ],
  'mock-group-3': [
    { categorieId: 'mock-cat-4', categorieName: 'Critique de maquettes', groupeId: 'mock-group-3', postsIds: ['mock-post-4'] },
  ],
};

export function mockDomains() {
  return DOMAINS;
}

// ── Détails (page de lecture) — dérivés des items de feed + un corps de texte factice,
// pour que cliquer sur une carte en mode démo n'aboutisse plus à un "fetch failed". ──

const MOCK_BODY = `Ceci est un contenu de démonstration généré en mode MOCK_MODE, utilisé pour vérifier
l'affichage de la page de lecture (mise en page, typographie, actions) sans backend disponible.

Un deuxième paragraphe permet de vérifier le rendu sur plusieurs blocs de texte, avec une
longueur suffisante pour observer l'espacement entre les sections et la largeur de colonne
de lecture choisie pour le contenu.

Un dernier paragraphe conclut cet exemple : ce texte n'a aucune valeur éditoriale, il sert
uniquement de gabarit visuel le temps de connecter le vrai backend.`;

export function mockBlogDetail(id: string): BlogDetail | null {
  const base = MOCK_BLOG_FEED.find((it) => it.id === id);
  if (!base) return null;
  return {
    id: base.id,
    title: base.title,
    description: base.description,
    authorId: base.authorId,
    domain: base.domain,
    status: 'PUBLISHED',
    content: MOCK_BODY,
    rawContent: MOCK_BODY,
    readingTime: 4,
    freeTags: base.freeTags,
    freeCategories: [],
    publishedAt: base.publishedAt,
    createdAt: base.publishedAt,
    categories: base.domain ? [base.domain] : [],
    tags: base.freeTags ?? [],
  };
}

export function mockContentDetail(kind: 'courses' | 'podcasts', id: string): ContentDetail | null {
  const base = (kind === 'podcasts' ? MOCK_PODCAST_FEED : MOCK_COURSE_FEED).find((it) => it.id === id);
  if (!base) return null;
  return {
    id: base.id,
    title: base.title,
    description: base.description,
    authorId: base.authorId,
    domain: base.domain,
    status: 'PUBLISHED',
    freeTags: base.freeTags,
    freeCategories: [],
    publishedAt: base.publishedAt,
    createdAt: base.publishedAt,
    trainerName: kind === 'courses' ? 'Formateur démo' : undefined,
    duration: kind === 'courses' ? '4h30' : undefined,
    level: kind === 'courses' ? 'DEBUTANT' : undefined,
    transcript: kind === 'podcasts' ? MOCK_BODY : undefined,
    audioUrl: undefined,
    categories: base.domain ? [base.domain] : [],
    tags: base.freeTags ?? [],
  };
}
