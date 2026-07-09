import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ContentDetailView from '@/components/feed/ContentDetailView';

export default async function EditorBlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  const { id } = await params;
  return <ContentDetailView contentType="BLOG" id={id} />;
}
