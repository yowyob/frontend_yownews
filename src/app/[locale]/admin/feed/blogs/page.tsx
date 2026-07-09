import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import FeedView from '@/components/feed/FeedView';

export default async function AdminBlogsFeedPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <FeedView contentType="BLOG" />;
}
