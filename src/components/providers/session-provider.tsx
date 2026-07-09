'use client';
import * as React from 'react';
import type { ClientSession, SessionUser, WorkspaceContext } from '@/lib/types/auth';

export type { ClientSession };

export type SessionContextValue = {
  session: ClientSession | null;
  setSession: (s: ClientSession | null) => void;
  refresh: () => Promise<void>;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: ClientSession | null;
  children: React.ReactNode;
}) {
  const [session, setSession] = React.useState<ClientSession | null>(initialSession);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) { setSession(null); return; }
      const body = await res.json();
      setSession(body.ok && body.data ? body.data : null);
    } catch { setSession(null); }
  }, []);

  const value = React.useMemo(() => ({ session, setSession, refresh }), [session, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export const useSessionUser = (): SessionUser | null => useSession().session?.user ?? null;
export const useWorkspace = (): WorkspaceContext | undefined => useSession().session?.workspace;
