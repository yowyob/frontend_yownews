export type FeedContentType = 'BLOG' | 'PODCAST' | 'COURSE';

export function coverPathFor(contentType: string | null | undefined, id: string): string {
  const t = (contentType ?? '').toUpperCase();
  if (t === 'PODCAST') return `/api/education/podcasts/${id}/cover`;
  if (t === 'COURSE') return `/api/education/courses/${id}/cover`;
  return `/api/education/blogs/${id}/cover`;
}

// Segment de route du fil correspondant (toujours en français pour les pages /feed/*).
export function feedSegmentFor(contentType: string | null | undefined): 'blogs' | 'podcasts' | 'cours' {
  const t = (contentType ?? '').toUpperCase();
  if (t === 'PODCAST') return 'podcasts';
  if (t === 'COURSE') return 'cours';
  return 'blogs';
}
