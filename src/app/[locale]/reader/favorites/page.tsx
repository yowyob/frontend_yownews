import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import FavoritesView from '@/components/feed/FavoritesView';

export default async function ReaderFavoritesPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <FavoritesView />;
}
