'use client';
import NewsletterPublicationModeration from '../NewsletterPublicationModeration';

// La modération ne porte que sur les PUBLICATIONS : une fois la newsletter validée,
// le rédacteur publie ses contenus lui-même (plus de validation admin des contenus).
export default function AdminNewslettersModerationPage() {
  return <NewsletterPublicationModeration />;
}
