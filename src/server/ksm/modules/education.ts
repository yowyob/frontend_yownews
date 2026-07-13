import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';
import { serverEnv } from '@/env';
import { MOCK_BLOG_FEED, MOCK_PODCAST_FEED, MOCK_COURSE_FEED, mockBlogDetail, mockContentDetail, mockDomains } from '@/server/mock-data';

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

// ── Store en mémoire (process du serveur dev), utilisé uniquement en MOCK_MODE : seedé depuis
// mock-data.ts au premier accès, puis mutable pour que créer/éditer/soumettre/publier un
// contenu en mode démo se reflète dans les listes (admin, "mes contenus"…) sans backend KSM.

let mockCategoryStore: CategoryEntity[] | null = null;
function getMockCategoryStore(): CategoryEntity[] {
  if (!mockCategoryStore) {
    mockCategoryStore = mockDomains().map((d, i) => ({ id: `mock-cat-${i}`, name: d, domain: d, tenantId: 'mock-tenant' }));
  }
  return mockCategoryStore;
}

let mockTagStore: TagEntity[] | null = null;
function getMockTagStore(): TagEntity[] {
  if (!mockTagStore) {
    mockTagStore = ['React', 'TypeScript', 'Business', 'Design', 'Débutant', 'Growth'].map((name, i) => ({
      id: `mock-tag-${i}`, name, tenantId: 'mock-tenant',
    }));
  }
  return mockTagStore;
}

// ── Catégories (CRUD complet) ───────────────────────────────────────────────

export function listCategories(session: AppSession) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(getMockCategoryStore());
  return getRaw<CategoryEntity[]>('/api/v1/education/categories', session);
}

export function createCategory(session: AppSession, input: TaxonomyCreateInput) {
  if (serverEnv.MOCK_MODE) {
    const category: CategoryEntity = { id: `mock-cat-${Date.now()}`, tenantId: 'mock-tenant', ...input };
    getMockCategoryStore().push(category);
    return Promise.resolve(category);
  }
  return sendRaw<CategoryEntity>('/api/v1/education/categories', 'POST', input, session);
}

export function updateCategory(session: AppSession, id: string, input: TaxonomyCreateInput) {
  if (serverEnv.MOCK_MODE) {
    const store = getMockCategoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Category not found' });
    store[idx] = { ...store[idx], ...input };
    return Promise.resolve(store[idx]);
  }
  return sendRaw<CategoryEntity>(`/api/v1/education/categories/${id}`, 'PUT', input, session);
}

export function deleteCategory(session: AppSession, id: string) {
  if (serverEnv.MOCK_MODE) {
    const store = getMockCategoryStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx >= 0) store.splice(idx, 1);
    return Promise.resolve();
  }
  return deleteRaw(`/api/v1/education/categories/${id}`, session);
}

// ── Tags (pas de DELETE côté backend) ────────────────────────────────────────

export function listTags(session: AppSession) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(getMockTagStore());
  return getRaw<TagEntity[]>('/api/v1/education/tags', session);
}

export function createTag(session: AppSession, input: TagCreateInput) {
  if (serverEnv.MOCK_MODE) {
    const tag: TagEntity = { id: `mock-tag-${Date.now()}`, tenantId: 'mock-tenant', ...input };
    getMockTagStore().push(tag);
    return Promise.resolve(tag);
  }
  return sendRaw<TagEntity>('/api/v1/education/tags', 'POST', input, session);
}

export function updateTag(session: AppSession, id: string, input: TagCreateInput) {
  if (serverEnv.MOCK_MODE) {
    const store = getMockTagStore();
    const idx = store.findIndex((t) => t.id === id);
    if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Tag not found' });
    store[idx] = { ...store[idx], ...input };
    return Promise.resolve(store[idx]);
  }
  return sendRaw<TagEntity>(`/api/v1/education/tags/${id}`, 'PUT', input, session);
}

// ── Domaines (liste enum, incl. NONE) ────────────────────────────────────────

export function listDomains(session: AppSession) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(mockDomains());
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

export type BlogDetail = BlogEntity & { categories: string[]; tags: string[] };

let mockBlogStore: BlogDetail[] | null = null;
function getMockBlogStore(): BlogDetail[] {
  if (!mockBlogStore) {
    mockBlogStore = MOCK_BLOG_FEED.map((f, i) => ({
      ...(mockBlogDetail(f.id) as BlogDetail),
      status: i === 0 ? 'DRAFT' : i === 1 ? 'SUBMITTED' : 'PUBLISHED',
    }));
  }
  return mockBlogStore;
}

export function createBlog(session: AppSession, input: BlogCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  if (serverEnv.MOCK_MODE) {
    const now = new Date().toISOString();
    const blog: BlogDetail = {
      ...payload, id: `mock-blog-${Date.now()}`, status: 'DRAFT', createdAt: now, updatedAt: now, publishedAt: null,
      categories: input.categories ?? [], tags: input.tags ?? [],
    };
    getMockBlogStore().unshift(blog);
    return Promise.resolve(blog);
  }
  return sendRaw<BlogEntity>('/api/v1/education/blogs', 'POST', payload, session);
}

export function updateBlog(session: AppSession, id: string, input: BlogCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  if (serverEnv.MOCK_MODE) {
    const store = getMockBlogStore();
    const idx = store.findIndex((b) => b.id === id);
    if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Blog not found' });
    store[idx] = { ...store[idx], ...payload, categories: input.categories ?? store[idx].categories, tags: input.tags ?? store[idx].tags, updatedAt: new Date().toISOString() };
    return Promise.resolve(store[idx]);
  }
  return sendRaw<BlogEntity>(`/api/v1/education/blogs/${id}`, 'PUT', payload, session);
}

// Blog enrichi de ses catégories/tags curés (lus depuis les tables de liaison) — pour édition/aperçu.
export async function getBlog(session: AppSession, id: string): Promise<BlogDetail> {
  if (serverEnv.MOCK_MODE) {
    const found = getMockBlogStore().find((b) => b.id === id);
    if (!found) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Blog not found' });
    return found;
  }
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

function mockSetBlogStatus(id: string, status: string): BlogDetail {
  const store = getMockBlogStore();
  const idx = store.findIndex((b) => b.id === id);
  if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Blog not found' });
  store[idx] = { ...store[idx], status, ...(status === 'PUBLISHED' ? { publishedAt: new Date().toISOString() } : {}) };
  return store[idx];
}

export async function submitBlog(session: AppSession, id: string) {
  if (serverEnv.MOCK_MODE) return mockSetBlogStatus(id, 'SUBMITTED');
  const res = await callKsm<Response>(
    `/api/v1/education/blogs/${id}/submit`,
    { method: 'PATCH', raw: true },
    { session },
  );
  return readRaw<BlogEntity>(res);
}

// Suppression = archivage (soft delete → ARCHIVED). L'éditeur a education:content:delete.
export async function archiveBlog(session: AppSession, id: string) {
  if (serverEnv.MOCK_MODE) { mockSetBlogStatus(id, 'ARCHIVED'); return; }
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
  if (serverEnv.MOCK_MODE) {
    const found = getMockBlogStore().find((b) => b.id === id);
    if (!found) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Blog not found' });
    return found;
  }
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
  if (serverEnv.MOCK_MODE) {
    const store = getMockBlogStore();
    return Promise.resolve(status ? store.filter((b) => b.status === status) : store);
  }
  const params = new URLSearchParams({ authorId: session.user.id });
  if (status) params.set('status', status);
  return getRaw<BlogEntity[]>(`/api/v1/education/blogs?${params.toString()}`, session);
}

// Liste tous les blogs (toute l'org/tenant), filtrée par statut — usage admin (gestion/validation).
export function listAllBlogs(session: AppSession, status?: string) {
  if (serverEnv.MOCK_MODE) {
    const store = getMockBlogStore();
    return Promise.resolve(status ? store.filter((b) => b.status === status) : store);
  }
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return getRaw<BlogEntity[]>(`/api/v1/education/blogs${query}`, session);
}

export async function publishBlog(session: AppSession, id: string) {
  if (serverEnv.MOCK_MODE) return mockSetBlogStatus(id, 'PUBLISHED');
  const res = await callKsm<Response>(
    `/api/v1/education/blogs/${id}/publish`,
    { method: 'PATCH', raw: true },
    { session },
  );
  return readRaw<BlogEntity>(res);
}

export async function rejectBlog(session: AppSession, id: string) {
  if (serverEnv.MOCK_MODE) return mockSetBlogStatus(id, 'REJECTED');
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
  if (serverEnv.MOCK_MODE) return Promise.resolve(84);
  return getRaw<number>(`/api/v1/education/abonnements/author/${authorId}/followers/count`, session);
}

// Abonnements de l'utilisateur courant (sert à dériver le compteur "Following" en dédupliquant authorId).
export function getMySubscriptions(session: AppSession) {
  if (serverEnv.MOCK_MODE) return Promise.resolve([] as AbonnementEntity[]);
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
  if (serverEnv.MOCK_MODE) return Promise.resolve(MOCK_BLOG_FEED.slice(0, limit));
  return getRaw<FeedItem[]>(`/api/v1/education/feed/blogs?limit=${limit}`, session);
}

export function getPodcastFeed(session: AppSession, limit = 20) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(MOCK_PODCAST_FEED.slice(0, limit));
  return getRaw<FeedItem[]>(`/api/v1/education/feed/podcasts?limit=${limit}`, session);
}

export function getCourseFeed(session: AppSession, limit = 20) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(MOCK_COURSE_FEED.slice(0, limit));
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

export type ContentDetail = ContentEntity & { categories: string[]; tags: string[] };

let mockContentStore: (ContentDetail & { kind: ContentKind })[] | null = null;
function getMockContentStore(): (ContentDetail & { kind: ContentKind })[] {
  if (!mockContentStore) {
    const courses = MOCK_COURSE_FEED.map((f, i) => ({
      ...(mockContentDetail('courses', f.id) as ContentDetail),
      kind: 'courses' as ContentKind,
      status: i === 0 ? 'DRAFT' : i === 1 ? 'SUBMITTED' : 'PUBLISHED',
    }));
    const podcasts = MOCK_PODCAST_FEED.map((f, i) => ({
      ...(mockContentDetail('podcasts', f.id) as ContentDetail),
      kind: 'podcasts' as ContentKind,
      status: i === 0 ? 'DRAFT' : i === 1 ? 'SUBMITTED' : 'PUBLISHED',
    }));
    mockContentStore = [...courses, ...podcasts];
  }
  return mockContentStore;
}

export function createContent(session: AppSession, kind: ContentKind, input: ContentCreateInput) {
  const payload = {
    ...withCourseValidationFiller(kind, input),
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  if (serverEnv.MOCK_MODE) {
    const now = new Date().toISOString();
    const item: ContentDetail & { kind: ContentKind } = {
      ...payload, id: `mock-${kind}-${Date.now()}`, kind, status: 'DRAFT', createdAt: now, updatedAt: now, publishedAt: null,
      categories: input.categories ?? [], tags: input.tags ?? [],
    };
    getMockContentStore().unshift(item);
    return Promise.resolve(item);
  }
  return sendRaw<ContentEntity>(contentBasePath(kind), 'POST', payload, session);
}

export function updateContent(session: AppSession, kind: ContentKind, id: string, input: ContentCreateInput) {
  const payload = {
    ...withCourseValidationFiller(kind, input),
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  if (serverEnv.MOCK_MODE) {
    const store = getMockContentStore();
    const idx = store.findIndex((c) => c.id === id && c.kind === kind);
    if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Content not found' });
    store[idx] = { ...store[idx], ...payload, categories: input.categories ?? store[idx].categories, tags: input.tags ?? store[idx].tags, updatedAt: new Date().toISOString() };
    return Promise.resolve(store[idx]);
  }
  return sendRaw<ContentEntity>(`${contentBasePath(kind)}/${id}`, 'PUT', payload, session);
}

export async function getContent(session: AppSession, kind: ContentKind, id: string): Promise<ContentDetail> {
  if (serverEnv.MOCK_MODE) {
    const found = getMockContentStore().find((c) => c.id === id && c.kind === kind);
    if (!found) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Content not found' });
    return found;
  }
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

function mockSetContentStatus(kind: ContentKind, id: string, status: string): ContentDetail {
  const store = getMockContentStore();
  const idx = store.findIndex((c) => c.id === id && c.kind === kind);
  if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Content not found' });
  store[idx] = { ...store[idx], status, ...(status === 'PUBLISHED' ? { publishedAt: new Date().toISOString() } : {}) };
  return store[idx];
}

async function patchContent(session: AppSession, kind: ContentKind, id: string, action: string) {
  if (serverEnv.MOCK_MODE) {
    const status = action === 'submit' ? 'SUBMITTED' : action === 'publish' ? 'PUBLISHED' : 'REJECTED';
    return mockSetContentStatus(kind, id, status);
  }
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
  if (serverEnv.MOCK_MODE) { mockSetContentStatus(kind, id, 'ARCHIVED'); return; }
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
  if (serverEnv.MOCK_MODE) {
    const found = getMockContentStore().find((c) => c.id === id && c.kind === kind);
    if (!found) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Content not found' });
    return found;
  }
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
  if (serverEnv.MOCK_MODE) {
    const found = getMockContentStore().find((c) => c.id === id && c.kind === kind);
    if (!found) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Content not found' });
    return found;
  }
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
  if (serverEnv.MOCK_MODE) {
    const store = getMockContentStore().filter((c) => c.kind === kind);
    return Promise.resolve(status ? store.filter((c) => c.status === status) : store);
  }
  const params = new URLSearchParams({ authorId: session.user.id });
  if (status) params.set('status', status);
  return getRaw<ContentEntity[]>(`${contentBasePath(kind)}?${params.toString()}`, session);
}

// Liste tout le contenu (toute l'org/tenant), filtrée par statut — usage admin (modération).
export function listAllContent(session: AppSession, kind: ContentKind, status?: string) {
  if (serverEnv.MOCK_MODE) {
    const store = getMockContentStore().filter((c) => c.kind === kind);
    return Promise.resolve(status ? store.filter((c) => c.status === status) : store);
  }
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

const mockCourseUnitStore = new Map<string, UnitCourseEntity[]>();
function getMockUnitList(courseId: string): UnitCourseEntity[] {
  if (!mockCourseUnitStore.has(courseId)) mockCourseUnitStore.set(courseId, []);
  return mockCourseUnitStore.get(courseId)!;
}

export function listCourseUnits(session: AppSession, courseId: string) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(getMockUnitList(courseId));
  return getRaw<UnitCourseEntity[]>(`/api/v1/education/courses/${courseId}/units`, session);
}

export function createCourseUnit(session: AppSession, courseId: string, input: UnitCourseCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  if (serverEnv.MOCK_MODE) {
    const now = new Date().toISOString();
    const unit: UnitCourseEntity = { ...payload, id: `mock-unit-${Date.now()}`, idCours: courseId, status: 'DRAFT', createdAt: now, updatedAt: now };
    getMockUnitList(courseId).push(unit);
    return Promise.resolve(unit);
  }
  return sendRaw<UnitCourseEntity>(`/api/v1/education/courses/${courseId}/units`, 'POST', payload, session);
}

export function updateCourseUnit(session: AppSession, courseId: string, unitId: string, input: UnitCourseCreateInput) {
  const payload = {
    ...input,
    authorId: session.user.id,
    tenantId: session.workspace?.tenantId ?? session.user.tenantId,
  };
  if (serverEnv.MOCK_MODE) {
    const list = getMockUnitList(courseId);
    const idx = list.findIndex((u) => u.id === unitId);
    if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Unit not found' });
    list[idx] = { ...list[idx], ...payload, updatedAt: new Date().toISOString() };
    return Promise.resolve(list[idx]);
  }
  return sendRaw<UnitCourseEntity>(`/api/v1/education/courses/${courseId}/units/${unitId}`, 'PUT', payload, session);
}

export async function deleteCourseUnit(session: AppSession, courseId: string, unitId: string) {
  if (serverEnv.MOCK_MODE) {
    const list = getMockUnitList(courseId);
    const idx = list.findIndex((u) => u.id === unitId);
    if (idx >= 0) list.splice(idx, 1);
    return;
  }
  await deleteRaw(`/api/v1/education/courses/${courseId}/units/${unitId}`, session);
}

async function patchCourseUnit(session: AppSession, courseId: string, unitId: string, action: string) {
  if (serverEnv.MOCK_MODE) {
    const list = getMockUnitList(courseId);
    const idx = list.findIndex((u) => u.id === unitId);
    if (idx === -1) throw new HttpError({ status: 404, errorCode: 'NOT_FOUND', message: 'Unit not found' });
    list[idx] = { ...list[idx], status: action === 'publish' ? 'PUBLISHED' : 'REJECTED' };
    return list[idx];
  }
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

const mockFavoritesStore = new Map<string, FavoriteEntity[]>();
function getMockFavoritesList(userId: string): FavoriteEntity[] {
  if (!mockFavoritesStore.has(userId)) mockFavoritesStore.set(userId, []);
  return mockFavoritesStore.get(userId)!;
}

// Le contrôleur KSM prend ses paramètres en query string (pas de corps JSON).
export function toggleFavorite(session: AppSession, entityId: string, contentType: string) {
  if (serverEnv.MOCK_MODE) {
    const list = getMockFavoritesList(session.user.id);
    const idx = list.findIndex((f) => f.entityId === entityId);
    if (idx >= 0) { list.splice(idx, 1); return Promise.resolve('removed'); }
    list.push({ id: `mock-fav-${Date.now()}`, userId: session.user.id, entityId, contentType, tenantId: 'mock-tenant', createdAt: new Date().toISOString() });
    return Promise.resolve('added');
  }
  const params = new URLSearchParams({ userId: session.user.id, entity_id: entityId, entityType: contentType });
  return sendRaw<string>(`/api/v1/education/favorites/toggle?${params.toString()}`, 'POST', undefined, session);
}

export function listMyFavorites(session: AppSession) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(getMockFavoritesList(session.user.id));
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

const mockEnrollments = new Set<string>();
const mockCompletedUnits = new Map<string, Set<string>>();

export function enrollInCourse(session: AppSession, courseId: string): Promise<void> {
  if (serverEnv.MOCK_MODE) { mockEnrollments.add(`${session.user.id}:${courseId}`); return Promise.resolve(); }
  return sendRaw<void>(`/api/v1/education/courses/${courseId}/enroll`, 'POST', undefined, session);
}

export function getCourseProgress(session: AppSession, courseId: string): Promise<CourseProgressView> {
  if (serverEnv.MOCK_MODE) {
    const enrolled = mockEnrollments.has(`${session.user.id}:${courseId}`);
    const completed = Array.from(mockCompletedUnits.get(`${session.user.id}:${courseId}`) ?? []);
    const total = getMockUnitList(courseId).length || 1;
    return Promise.resolve({ enrolled, completedUnitIds: completed, percent: Math.round((completed.length / total) * 100) });
  }
  return getRaw<CourseProgressView>(`/api/v1/education/courses/${courseId}/progress`, session);
}

export function completeCourseUnit(session: AppSession, unitId: string): Promise<void> {
  if (serverEnv.MOCK_MODE) {
    for (const [courseId, units] of mockCourseUnitStore) {
      if (units.some((u) => u.id === unitId)) {
        const key = `${session.user.id}:${courseId}`;
        if (!mockCompletedUnits.has(key)) mockCompletedUnits.set(key, new Set());
        mockCompletedUnits.get(key)!.add(unitId);
        break;
      }
    }
    return Promise.resolve();
  }
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
  if (serverEnv.MOCK_MODE) {
    const contents: PublicContentInfo[] = [...getMockBlogStore(), ...getMockContentStore()]
      .filter((c) => c.status === 'PUBLISHED')
      .slice(0, 4)
      .map((c) => ({
        id: c.id, title: c.title, description: c.description ?? '',
        contentType: 'kind' in c ? (c.kind === 'courses' ? 'COURSE' : 'PODCAST') : 'BLOG',
        domain: c.domain ?? '', publishedAt: c.publishedAt ?? '',
      }));
    return Promise.resolve({
      id: userId, firstName: 'Utilisateur', lastName: 'Démo', biography: 'Profil de démonstration en MOCK_MODE.',
      photoId: null, followersCount: 42, followingCount: 8, isFollowing: false, contents,
    });
  }
  return getRaw<UserPublicProfile>(`/api/v1/education/users/${userId}/profile`, session);
}



// ── Contenu de l'organisation active ───────────────────────────────────────────
// Réutilise l'endpoint natif KSM `GET /api/v1/education/org/content` (OrgContentController),
// qui filtre par `organizationId` résolu depuis le contexte (X-Organization-Id) — aucune logique
// de filtrage à dupliquer côté BFF. Un seul champ commun (organizationId) suffit à distinguer le
// contenu de l'org de celui d'un simple auteur individuel (cf. AbstractEducationService.create).

export type OrgContentType = 'blog' | 'course' | 'podcast';

export type OrgContentItem = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  authorId?: string | null;
  organizationId?: string | null;
  tenantId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

export function listOrgContent(session: AppSession, type: OrgContentType): Promise<OrgContentItem[]> {
  if (serverEnv.MOCK_MODE) {
    // Les fixtures MOCK_MODE ne portent pas d'organizationId (pas de notion d'org en démo) —
    // vue vide plutôt qu'un filtrage inventé qui laisserait croire à un vrai rattachement.
    return Promise.resolve([]);
  }
  return getRaw<OrgContentItem[]>(`/api/v1/education/org/content?type=${type}`, session);
}
