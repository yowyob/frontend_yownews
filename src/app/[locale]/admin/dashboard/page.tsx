import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import DashboardView from '../_components/DashboardView';

export default async function DashboardPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const firstName = session.user.firstName ?? session.user.email.split('@')[0];
  return <DashboardView firstName={firstName} variant="admin" />;
}
