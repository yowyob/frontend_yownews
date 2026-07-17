import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import ContentDetailView from '@/components/feed/ContentDetailView';
import { LANDING_CSS } from '@/components/landing/landingStyles';

export default async function PublicPodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="lv-root">
      <style>{LANDING_CSS}</style>
      <Header />
      <main style={{ padding: '40px 20px', minHeight: '80vh', background: '#fff' }}>
        <ContentDetailView contentType="PODCAST" id={id} bleed={false} />
      </main>
      <Footer />
    </div>
  );
}
