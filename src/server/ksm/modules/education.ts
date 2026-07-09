import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

// Le module education renvoie des entités BRUTES (pas d'enveloppe ApiResponse),
// donc on appelle callKsm en `raw` puis on parse/valide la réponse nous-mêmes.

export type CategoryEntity = {
  id: string;
  name: string;
  description?: string | null;
  domain?: string | null;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TagEntity = {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TaxonomyCreateInput = {
  name: string;
  description?: string;
  domain?: string;
};

export type TagCreateInput = {
  name: string;
  description?: string;
  categoryId?: string;
};

async function readRaw<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      if (parsed?.message) message = parsed.message;
    } catch {
      /* corps non-JSON : on garde le statusText */
    }
    throw new HttpError({ status: res.status, errorCode: null, message });
  }
  return (text ? (JSON.parse(text) as T) : (null as T));
}

async function getRaw<T>(path: string, session: AppSession): Promise<T> {
  const res = await callKsm<Response>(path, { method: 'GET', raw: true }, { session });
  return readRaw<T>(res);
}

async function sendRaw<T>(
  path: string,
  method: 'POST' | 'PUT',
  body: unknown,
  session: AppSession,
): Promise<T> {
  const res = await callKsm<Response>(path, { method, body, raw: true }, { session });
  return readRaw<T>(res);
}

async function deleteRaw(path: string, session: AppSession): Promise<void> {
  const res = await callKsm<Response>(path, { method: 'DELETE', raw: true }, { session });
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    const text = await res.text();
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      if (parsed?.message) message = parsed.message;
    } catch {
      /* corps non-JSON */
    }
    throw new HttpError({ status: res.status, errorCode: null, message });
  }
}

// ── Catégories (CRUD complet) ───────────────────────────────────────────────

export function listCategories(session: AppSession) {
  return getRaw<CategoryEntity[]>('/api/v1/education/categories', session);
}

export function createCategory(session: AppSession, input: TaxonomyCreateInput) {
  return sendRaw<CategoryEntity>('/api/v1/education/categories', 'POST', input, session);
}

export function updateCategory(session: AppSession, id: string, input: TaxonomyCreateInput) {
  return sendRaw<CategoryEntity>(`/api/v1/education/categories/${id}`, 'PUT', input, session);
}

export function deleteCategory(session: AppSession, id: string) {
  return deleteRaw(`/api/v1/education/categories/${id}`, session);
}

// ── Tags (pas de DELETE côté backend) ────────────────────────────────────────

export function listTags(session: AppSession) {
  return getRaw<TagEntity[]>('/api/v1/education/tags', session);
}

export function createTag(session: AppSession, input: TagCreateInput) {
  return sendRaw<TagEntity>('/api/v1/education/tags', 'POST', input, session);
}

export function updateTag(session: AppSession, id: string, input: TagCreateInput) {
  return sendRaw<TagEntity>(`/api/v1/education/tags/${id}`, 'PUT', input, session);
}

// ── Domaines (liste enum, incl. NONE) ────────────────────────────────────────

export function listDomains(session: AppSession) {
  return getRaw<string[]>('/api/v1/education/domains', session);
}

// ── Blogs ────────────────────────────────────────────────────────────────────

export type BlogEntity = {
  id: string;
  title: string;
  description?: string | null;
  authorId?: string | null;
  tenantId?: string | null;
  domain?: string | null;
  status?: string | null;
  content?: string | null;
  rawContent?: string | null;
  readingTime?: number | null;
  freeTags?: string[] | null;
  freeCategories?: string[] | null;
  customDomain?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

export type BlogCreateInput = {
  title: string;
  description: string;
  domain: string;
  content: string;
  rawContent?: string;
  readingTime: number;
  categories: string[];
  tags?: string[];
  freeTags?: string[];
  freeCategories?: string[];
  customDomain?: string;
};

export function createBlog(session: AppSession, input: BlogCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  return sendRaw<BlogEntity>('/api/v1/education/blogs', 'POST', payload, session);
}

export function updateBlog(session: AppSession, id: string, input: BlogCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  return sendRaw<BlogEntity>(`/api/v1/education/blogs/${id}`, 'PUT', payload, session);
}

export type BlogDetail = BlogEntity & { categories: string[]; tags: string[] };

// Blog enrichi de ses catégories/tags curés (lus depuis les tables de liaison) — pour édition/aperçu.
export async function getBlog(session: AppSession, id: string): Promise<BlogDetail> {
  const [blog, categories, tags] = await Promise.all([
    getRaw<BlogEntity>(`/api/v1/education/blogs/${id}`, session),
    getRaw<string[]>(`/api/v1/education/blogs/${id}/categories`, session).catch(() => [] as string[]),
    getRaw<string[]>(`/api/v1/education/blogs/${id}/tags`, session).catch(() => [] as string[]),
  ]);
  return {
    ...blog,
    categories: Array.isArray(categories) ? categories : [],
    tags: Array.isArray(tags) ? tags : [],
  };
}

export async function submitBlog(session: AppSession, id: string) {
  const res = await callKsm<Response>(
    `/api/v1/education/blogs/${id}/submit`,
    { method: 'PATCH', raw: true },
    { session },
  );
  return readRaw<BlogEntity>(res);
}

// Suppression = archivage (soft delete → ARCHIVED). L'éditeur a education:content:delete.
export async function archiveBlog(session: AppSession, id: string) {
  const res = await callKsm<Response>(
    `/api/v1/education/blogs/${id}/archive`,
    { method: 'PATCH', raw: true },
    { session },
  );
  if (!res.ok) {
    throw new HttpError({ status: res.status, errorCode: null, message: res.statusText || 'Archive failed' });
  }
}

// Upload de la cover (multipart, champ `cover`). Renvoie l'entité blog mise à jour.
export async function uploadBlogCover(session: AppSession, id: string, formData: FormData) {
  const res = await callKsm<Response>(
    `/api/v1/education/blogs/${id}/cover`,
    { method: 'POST', body: formData, raw: true },
    { session },
  );
  return readRaw<BlogEntity>(res);
}

// Renvoie la réponse brute (flux binaire) de la cover, pour streaming direct côté route BFF.
export function getBlogCover(session: AppSession, id: string) {
  return callKsm<Response>(
    `/api/v1/education/blogs/${id}/coverblog`,
    { method: 'GET', raw: true },
    { session },
  );
}

// Liste des blogs de l'auteur courant, filtrée par statut (DRAFT / PUBLISHED…).
export function listMyBlogs(session: AppSession, status?: string) {
  const params = new URLSearchParams({ authorId: session.user.id });
  if (status) params.set('status', status);
  return getRaw<BlogEntity[]>(`/api/v1/education/blogs?${params.toString()}`, session);
}

// Liste tous les blogs (toute l'org/tenant), filtrée par statut — usage admin (gestion/validation).
export function listAllBlogs(session: AppSession, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return getRaw<BlogEntity[]>(`/api/v1/education/blogs${query}`, session);
}

export async function publishBlog(session: AppSession, id: string) {
  const res = await callKsm<Response>(
    `/api/v1/education/blogs/${id}/publish`,
    { method: 'PATCH', raw: true },
    { session },
  );
  return readRaw<BlogEntity>(res);
}

export async function rejectBlog(session: AppSession, id: string) {
  const res = await callKsm<Response>(
    `/api/v1/education/blogs/${id}/reject`,
    { method: 'PATCH', raw: true },
    { session },
  );
  return readRaw<BlogEntity>(res);
}

// ── Abonnements (base du "follow" : pas de table follow dédiée dans KSM) ──────

export type AbonnementEntity = {
  id: string;
  userId: string;
  authorId: string;
  contentId: string;
  contentType?: string | null;
  createdAt?: string | null;
};

// Nombre d'utilisateurs distincts abonnés à l'un des contenus de cet auteur ("Followers").
export function getFollowerCount(session: AppSession, authorId: string) {
  return getRaw<number>(`/api/v1/education/abonnements/author/${authorId}/followers/count`, session);
}

// Abonnements de l'utilisateur courant (sert à dériver le compteur "Following" en dédupliquant authorId).
export function getMySubscriptions(session: AppSession) {
  return getRaw<AbonnementEntity[]>('/api/v1/education/abonnements/user', session);
}

// ── Feed (3 flux distincts Blog/Podcast/Cours — jamais fusionnés, voir FeedService côté KSM) ──

export type FeedItem = {
  id: string;
  contentType?: string | null;
  title: string;
  description?: string | null;
  authorId?: string | null;
  domain?: string | null;
  freeTags?: string[] | null;
  publishedAt?: string | null;
  listenCount?: number | null;
};

export function getBlogFeed(session: AppSession, limit = 20) {
  return getRaw<FeedItem[]>(`/api/v1/education/feed/blogs?limit=${limit}`, session);
}

export function getPodcastFeed(session: AppSession, limit = 20) {
  return getRaw<FeedItem[]>(`/api/v1/education/feed/podcasts?limit=${limit}`, session);
}

export function getCourseFeed(session: AppSession, limit = 20) {
  return getRaw<FeedItem[]>(`/api/v1/education/feed/courses?limit=${limit}`, session);
}

// ── Contenu générique (Cours / Podcast — Blog garde ses fonctions dédiées ci-dessus,
//    inchangées pour ne pas risquer de régression sur un flux déjà en prod) ───────────

export type ContentKind = 'courses' | 'podcasts';

export type ContentEntity = {
  id: string;
  title: string;
  description?: string | null;
  authorId?: string | null;
  tenantId?: string | null;
  domain?: string | null;
  status?: string | null;
  freeTags?: string[] | null;
  freeCategories?: string[] | null;
  customDomain?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  // Spécifique Cours
  trainerName?: string | null;
  duration?: string | null;
  level?: string | null;
  // Spécifique Podcast
  transcript?: string | null;
  audioUrl?: string | null;
};

export type ContentCreateInput = {
  title: string;
  description: string;
  domain: string;
  categories: string[];
  tags?: string[];
  freeTags?: string[];
  freeCategories?: string[];
  customDomain?: string;
  // Cours
  trainerName?: string;
  duration?: string;
  level?: string;
  // Podcast
  transcript?: string;
};

function contentBasePath(kind: ContentKind) {
  return `/api/v1/education/${kind}`;
}

// CourseCreateDto hérite de BlogCreateDTO côté KSM (réutilisation de DTO, pas un choix produit) :
// `content`/`readingTime` y restent @NotBlank/@NotNull bien que Course ne les persiste pas
// (CourseService.mapDtoToEntity les ignore). On les renseigne donc avec des valeurs neutres
// pour satisfaire la validation, sans impact fonctionnel côté Cours.
function withCourseValidationFiller(kind: ContentKind, input: ContentCreateInput) {
  if (kind !== 'courses') return input;
  return { ...input, content: input.description, readingTime: 1 };
}

export function createContent(session: AppSession, kind: ContentKind, input: ContentCreateInput) {
  const payload = {
    ...withCourseValidationFiller(kind, input),
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  return sendRaw<ContentEntity>(contentBasePath(kind), 'POST', payload, session);
}

export function updateContent(session: AppSession, kind: ContentKind, id: string, input: ContentCreateInput) {
  const payload = {
    ...withCourseValidationFiller(kind, input),
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  return sendRaw<ContentEntity>(`${contentBasePath(kind)}/${id}`, 'PUT', payload, session);
}

export type ContentDetail = ContentEntity & { categories: string[]; tags: string[] };

export async function getContent(session: AppSession, kind: ContentKind, id: string): Promise<ContentDetail> {
  const [item, categories, tags] = await Promise.all([
    getRaw<ContentEntity>(`${contentBasePath(kind)}/${id}`, session),
    getRaw<string[]>(`${contentBasePath(kind)}/${id}/categories`, session).catch(() => [] as string[]),
    getRaw<string[]>(`${contentBasePath(kind)}/${id}/tags`, session).catch(() => [] as string[]),
  ]);
  return {
    ...item,
    categories: Array.isArray(categories) ? categories : [],
    tags: Array.isArray(tags) ? tags : [],
  };
}

async function patchContent(session: AppSession, kind: ContentKind, id: string, action: string) {
  const res = await callKsm<Response>(
    `${contentBasePath(kind)}/${id}/${action}`,
    { method: 'PATCH', raw: true },
    { session },
  );
  return readRaw<ContentEntity>(res);
}

export const submitContent = (session: AppSession, kind: ContentKind, id: string) => patchContent(session, kind, id, 'submit');
export const publishContent = (session: AppSession, kind: ContentKind, id: string) => patchContent(session, kind, id, 'publish');
export const rejectContent = (session: AppSession, kind: ContentKind, id: string) => patchContent(session, kind, id, 'reject');

// Suppression = archivage (soft delete → ARCHIVED).
export async function archiveContent(session: AppSession, kind: ContentKind, id: string) {
  const res = await callKsm<Response>(
    `${contentBasePath(kind)}/${id}/archive`,
    { method: 'PATCH', raw: true },
    { session },
  );
  if (!res.ok) {
    throw new HttpError({ status: res.status, errorCode: null, message: res.statusText || 'Archive failed' });
  }
}

export async function uploadContentCover(session: AppSession, kind: ContentKind, id: string, formData: FormData) {
  const res = await callKsm<Response>(
    `${contentBasePath(kind)}/${id}/cover`,
    { method: 'POST', body: formData, raw: true },
    { session },
  );
  return readRaw<ContentEntity>(res);
}

// Renvoie la réponse brute (flux binaire) de la cover, pour streaming direct côté route BFF.
// Suffixe irrégulier côté KSM : coverblog / covercourse / coverpodcast.
export function getContentCover(session: AppSession, kind: ContentKind, id: string) {
  const suffix = kind === 'courses' ? 'covercourse' : 'coverpodcast';
  return callKsm<Response>(
    `${contentBasePath(kind)}/${id}/${suffix}`,
    { method: 'GET', raw: true },
    { session },
  );
}

export async function uploadContentAudio(session: AppSession, kind: ContentKind, id: string, formData: FormData) {
  const res = await callKsm<Response>(
    `${contentBasePath(kind)}/${id}/audio`,
    { method: 'POST', body: formData, raw: true },
    { session },
  );
  return readRaw<ContentEntity>(res);
}

// Renvoie la réponse brute (flux binaire) de l'audio, pour streaming direct côté route BFF.
export function getContentAudio(session: AppSession, kind: ContentKind, id: string) {
  return callKsm<Response>(
    `${contentBasePath(kind)}/${id}/audiopodcast`,
    { method: 'GET', raw: true },
    { session },
  );
}

// Liste du contenu de l'auteur courant, filtrée par statut.
export function listMyContent(session: AppSession, kind: ContentKind, status?: string) {
  const params = new URLSearchParams({ authorId: session.user.id });
  if (status) params.set('status', status);
  return getRaw<ContentEntity[]>(`${contentBasePath(kind)}?${params.toString()}`, session);
}

// Liste tout le contenu (toute l'org/tenant), filtrée par statut — usage admin (modération).
export function listAllContent(session: AppSession, kind: ContentKind, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return getRaw<ContentEntity[]>(`${contentBasePath(kind)}${query}`, session);
}

// ── Unités (chapitres) de cours ────────────────────────────────────────────────

export type UnitCourseEntity = {
  id: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  status?: string | null;
  unit?: number | null;
  idCours?: string | null;
  freeTags?: string[] | null;
  freeCategories?: string[] | null;
  customDomain?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UnitCourseCreateInput = {
  title: string;
  description?: string;
  domain: string;
  unit?: number;
  freeTags?: string[];
  freeCategories?: string[];
  customDomain?: string;
};

export function listCourseUnits(session: AppSession, courseId: string) {
  return getRaw<UnitCourseEntity[]>(`/api/v1/education/courses/${courseId}/units`, session);
}

export function createCourseUnit(session: AppSession, courseId: string, input: UnitCourseCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  return sendRaw<UnitCourseEntity>(`/api/v1/education/courses/${courseId}/units`, 'POST', payload, session);
}

export function updateCourseUnit(session: AppSession, courseId: string, unitId: string, input: UnitCourseCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  return sendRaw<UnitCourseEntity>(`/api/v1/education/courses/${courseId}/units/${unitId}`, 'PUT', payload, session);
}

export async function deleteCourseUnit(session: AppSession, courseId: string, unitId: string) {
  await deleteRaw(`/api/v1/education/courses/${courseId}/units/${unitId}`, session);
}

async function patchCourseUnit(session: AppSession, courseId: string, unitId: string, action: string) {
  const res = await callKsm<Response>(
    `/api/v1/education/courses/${courseId}/units/${unitId}/${action}`,
    { method: 'PATCH', raw: true },
    { session },
  );
  return readRaw<UnitCourseEntity>(res);
}

export const publishCourseUnit = (session: AppSession, courseId: string, unitId: string) =>
  patchCourseUnit(session, courseId, unitId, 'publish');
export const rejectCourseUnit = (session: AppSession, courseId: string, unitId: string) =>
  patchCourseUnit(session, courseId, unitId, 'reject');

// ── Favoris ──────────────────────────────────────────────────────────────────

export type FavoriteEntity = {
  id: string;
  userId: string;
  entityId: string;
  contentType?: string | null;
  tenantId?: string | null;
  createdAt?: string | null;
};

// Le contrôleur KSM prend ses paramètres en query string (pas de corps JSON).
export function toggleFavorite(session: AppSession, entityId: string, contentType: string) {
  const params = new URLSearchParams({ userId: session.user.id, entity_id: entityId, entityType: contentType });
  return sendRaw<string>(`/api/v1/education/favorites/toggle?${params.toString()}`, 'POST', undefined, session);
}

export function listMyFavorites(session: AppSession) {
  return getRaw<FavoriteEntity[]>(`/api/v1/education/favorites/${session.user.id}`, session);
}

// Favoris hydratés (titre/description/domaine/tags…) pour réutiliser le rendu carte du feed.
// Best-effort : un favori dont le contenu source a été supprimé est silencieusement ignoré.
export async function listMyFavoritesDetailed(session: AppSession): Promise<FeedItem[]> {
  const favorites = await listMyFavorites(session);
  const hydrated = await Promise.allSettled(favorites.map(async (f): Promise<FeedItem> => {
    const type = (f.contentType ?? '').toUpperCase();
    if (type === 'BLOG') {
      const b = await getBlog(session, f.entityId);
      return { id: b.id, contentType: 'BLOG', title: b.title, description: b.description, authorId: b.authorId, domain: b.domain, freeTags: b.freeTags, publishedAt: b.publishedAt };
    }
    if (type === 'PODCAST' || type === 'COURSE') {
      const kind: ContentKind = type === 'PODCAST' ? 'podcasts' : 'courses';
      const c = await getContent(session, kind, f.entityId);
      return { id: c.id, contentType: type, title: c.title, description: c.description, authorId: c.authorId, domain: c.domain, freeTags: c.freeTags, publishedAt: c.publishedAt };
    }
    throw new Error(`Type de contenu favori inconnu : ${type}`);
  }));
  return hydrated
    .filter((r): r is PromiseFulfilledResult<FeedItem> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ── Course Enrollment & Progress ─────────────────────────────────────────────

export type CourseProgressView = {
  percent: number;
  completedUnitIds: string[];
  enrolled: boolean;
};

export function enrollInCourse(session: AppSession, courseId: string): Promise<void> {
  return sendRaw<void>(`/api/v1/education/courses/${courseId}/enroll`, 'POST', undefined, session);
}

export function getCourseProgress(session: AppSession, courseId: string): Promise<CourseProgressView> {
  return getRaw<CourseProgressView>(`/api/v1/education/courses/${courseId}/progress`, session);
}

export function completeCourseUnit(session: AppSession, unitId: string): Promise<void> {
  return sendRaw<void>(`/api/v1/education/courses/units/${unitId}/complete`, 'POST', undefined, session);
}

// ── User Public Profile ──────────────────────────────────────────────────────

export type PublicContentInfo = {
  id: string;
  title: string;
  description: string;
  contentType: string;
  domain: string;
  publishedAt: string;
};

export type UserPublicProfile = {
  id: string;
  firstName: string;
  lastName: string;
  biography?: string | null;
  photoId?: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  contents: PublicContentInfo[];
};

export function getPublicProfile(session: AppSession, userId: string): Promise<UserPublicProfile> {
  return getRaw<UserPublicProfile>(`/api/v1/education/users/${userId}/profile`, session);
}


