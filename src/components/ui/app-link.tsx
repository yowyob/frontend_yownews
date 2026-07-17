'use client';
import * as React from 'react';
import { useSession } from '@/components/providers/session-provider';
import { Link, useRouter } from '@/i18n/navigation';
import { roleVariant } from '@/lib/roles';

// Le préfixe de route reflète toujours le variant d'interface de la session (admin/editor/reader
// — cf. roleVariant, déjà utilisé par la sidebar), jamais un slug dérivé de roles[0] : ce tableau
// d'autorités KSM n'est pas ordonné de façon stable, donc en indexer le premier élément produisait
// un préfixe arbitraire (voire une chaîne vide pour un rôle "nu" sans autorité élevée), menant vers
// des routes inexistantes (404 forum, unités de cours inaccessibles).
function useRolePrefix(): string {
  const { session } = useSession();
  return `/${roleVariant(session?.user.permissions ?? session?.user.roles)}`;
}

export function withRolePrefix(prefix: string, href: string): string {
  if (!prefix || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return href;
  if (href === prefix || href.startsWith(`${prefix}/`)) return href;
  return `${prefix}${href}`;
}

export function AppLink({ href, ...rest }: React.ComponentProps<typeof Link>) {
  const prefix = useRolePrefix();
  const resolved = typeof href === 'string' ? withRolePrefix(prefix, href) : href;
  return <Link href={resolved} {...rest} />;
}

export function useAppRouter() {
  const router = useRouter();
  const prefix = useRolePrefix();
  return React.useMemo(
    () => ({
      push:    (href: string, opts?: Parameters<typeof router.push>[1])    => router.push(withRolePrefix(prefix, href), opts),
      replace: (href: string, opts?: Parameters<typeof router.replace>[1]) => router.replace(withRolePrefix(prefix, href), opts),
      back:    () => router.back(),
      forward: () => router.forward(),
      refresh: () => router.refresh(),
      prefetch:(href: string) => router.prefetch(withRolePrefix(prefix, href)),
    }),
    [router, prefix],
  );
}
