// Types partagés du feed public (landing). Fichier neutre (ni server-only ni client-only)
// pour être importable aussi bien par la route BFF que par les composants client.

export type PublicKind = 'blog' | 'podcast' | 'course';

export type PublicFeedItem = {
  id: string;
  type: PublicKind;
  title: string;
  description: string | null;
  domain: string | null;
  publishedAt: string | null;
  listenCount: number | null;
  coverUrl: string;
};

export type PublicFeed = {
  blogs: PublicFeedItem[];
  podcasts: PublicFeedItem[];
  courses: PublicFeedItem[];
};
