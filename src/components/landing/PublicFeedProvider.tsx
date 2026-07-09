'use client';
// Fournit le feed public (blogs/podcasts/cours) à toute la landing en UN SEUL fetch.
// Le carrousel du hero et les trois sections consomment le même contexte.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { PublicFeed, PublicFeedItem } from '@/lib/types/public-feed';

export type { PublicFeed, PublicFeedItem };

const EMPTY: PublicFeed = { blogs: [], podcasts: [], courses: [] };

type Ctx = { data: PublicFeed; loading: boolean };
const PublicFeedContext = createContext<Ctx>({ data: EMPTY, loading: true });

export function PublicFeedProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PublicFeed>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const feed = await apiFetch<PublicFeed>('/api/public/feed');
        if (!cancelled && feed) setData(feed);
      } catch {
        /* landing tolérante : on garde le feed vide */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <PublicFeedContext.Provider value={{ data, loading }}>{children}</PublicFeedContext.Provider>;
}

export function usePublicFeed() {
  return useContext(PublicFeedContext);
}
