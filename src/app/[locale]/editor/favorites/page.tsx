import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import FavoritesView from '@/components/feed/FavoritesView';

export default async function EditorFavoritesPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <FavoritesView />;
}
