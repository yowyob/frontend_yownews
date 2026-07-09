import NewsletterWorkspace from '../../editor/newsletter/NewsletterWorkspace';

export default function NewslettersAdminWorkspace({ email }: { email: string }) {
  return <NewsletterWorkspace email={email} />;
}
