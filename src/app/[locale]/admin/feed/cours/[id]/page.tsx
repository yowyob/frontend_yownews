import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ContentDetailView from '@/components/feed/ContentDetailView';

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  const { id } = await params;
  return <ContentDetailView contentType="COURSE" id={id} />;
}
