import type { FeedItem } from '@/components/feed/ContentFeedCard';

/**
 * Contenu statique des 3 sections de la landing (articles/podcasts/cours) — volontairement
 * figé (pas de fetch KSM), avec de vraies photos Unsplash. Chaque photo avec personnes a été
 * vérifiée visuellement avant sélection pour représenter des personnes noires/africaines
 * (cohérent avec le public visé par la plateforme) ; les autres sont des photos d'objets/
 * scènes sans personne. Le hero carousel (HeroCarousel.tsx) reste dynamique, hors périmètre.
 */

export const STATIC_BLOGS: FeedItem[] = [
  {
    id: 'static-blog-1',
    contentType: 'BLOG',
    title: 'Comment démarrer avec Next.js en 2026',
    description: "Un guide pas à pas pour construire une première application moderne, du routage à l'App Router.",
    domain: 'TECH',
    freeTags: ['Next.js', 'React'],
    publishedAt: '2026-06-12T09:00:00.000Z',
    coverUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
  },
  {
    id: 'static-blog-2',
    contentType: 'BLOG',
    title: "5 stratégies pour lancer sa micro-entreprise en Afrique de l'Ouest",
    description: "Retour d'expérience d'entrepreneurs ivoiriens sur le financement et la formalisation.",
    domain: 'BUSINESS',
    freeTags: ['Entrepreneuriat'],
    publishedAt: '2026-06-08T14:30:00.000Z',
    coverUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
  },
  {
    id: 'static-blog-3',
    contentType: 'BLOG',
    title: 'Les bases du design system pour les petites équipes',
    description: 'Pourquoi et comment construire une bibliothèque de composants cohérente sans surcharger votre process.',
    domain: 'EDUCATION',
    freeTags: ['UI', 'Design System'],
    publishedAt: '2026-06-01T08:15:00.000Z',
    coverUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=80',
  },
];

export const STATIC_PODCASTS: FeedItem[] = [
  {
    id: 'static-podcast-1',
    contentType: 'PODCAST',
    title: 'Épisode 12 — Construire une startup EdTech en Afrique',
    description: 'Discussion avec une fondatrice basée à Abidjan sur les défis du financement local.',
    domain: 'BUSINESS',
    freeTags: ['Startup'],
    publishedAt: '2026-06-10T07:00:00.000Z',
    listenCount: 1840,
    coverUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
  },
  {
    id: 'static-podcast-2',
    contentType: 'PODCAST',
    title: 'Épisode 11 — Design accessible : par où commencer ?',
    description: "Introduction pratique à l'accessibilité web pour les designers pressés.",
    domain: 'EDUCATION',
    freeTags: ['Accessibilité'],
    publishedAt: '2026-06-03T07:00:00.000Z',
    listenCount: 962,
    coverUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
  },
  {
    id: 'static-podcast-3',
    contentType: 'PODCAST',
    title: 'Épisode 10 — Les langages qui montent en 2026',
    description: "Tour d'horizon des tendances techniques à surveiller cette année.",
    domain: 'TECH',
    freeTags: ['Tech'],
    publishedAt: '2026-05-27T07:00:00.000Z',
    listenCount: 2210,
    coverUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
  },
];

export const STATIC_COURSES: FeedItem[] = [
  {
    id: 'static-course-1',
    contentType: 'COURSE',
    title: 'Développement web moderne avec React',
    description: 'Un parcours complet du composant à la mise en production, avec projets pratiques.',
    domain: 'TECH',
    freeTags: ['React', 'Débutant'],
    publishedAt: '2026-05-01T00:00:00.000Z',
    coverUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
  },
  {
    id: 'static-course-2',
    contentType: 'COURSE',
    title: 'Gestion de projet pour freelances',
    description: 'Structurer ses missions clients, ses livrables et son planning sans y laisser sa santé mentale.',
    domain: 'BUSINESS',
    freeTags: ['Gestion'],
    publishedAt: '2026-04-18T00:00:00.000Z',
    coverUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
  },
  {
    id: 'static-course-3',
    contentType: 'COURSE',
    title: "Introduction au design UI/UX",
    description: "Les fondamentaux de la conception d'interfaces centrées utilisateur, de la recherche au prototype.",
    domain: 'EDUCATION',
    freeTags: ['UI/UX', 'Débutant'],
    publishedAt: '2026-04-05T00:00:00.000Z',
    coverUrl: 'https://images.unsplash.com/photo-1531123414780-f74242c2b052?w=800&q=80',
  },
];
