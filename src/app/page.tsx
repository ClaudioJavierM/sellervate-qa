import { redirect } from 'next/navigation';
import { getViewer, isLead } from '@/server/viewer';

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  redirect(isLead(viewer) ? '/queue' : '/feedback');
}
