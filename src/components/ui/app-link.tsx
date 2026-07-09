'use client';
import * as React from 'react';
import { useSession } from '@/components/providers/session-provider';
import { Link, useRouter } from '@/i18n/navigation';
import { isMigratedRole, roleSlug } from '@/lib/roles';

function useRolePrefix(): string {
  const { session } = useSession();
  const slug = roleSlug(session?.user.roles, session?.user.permissions);
  return isMigratedRole(slug) ? `/${slug}` : '';
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
