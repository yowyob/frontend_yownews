import { redirect } from 'next/navigation';

// L'espace Lecteur a migré vers /reader/profile (dashboard + sidebar).
export default function AccountPage() {
  redirect('/reader/profile');
}
