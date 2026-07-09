import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import BlogWorkspace from './BlogWorkspace';

export default async function EditorBlogPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <BlogWorkspace />;
}
