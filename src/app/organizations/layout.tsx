import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Yowyob Education. Apprenez. Explorez. Grandissez.',
  description: 'La plateforme éducative  qui réunit blogs, podcasts .',
};

export default function OrganizationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
