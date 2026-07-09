import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import FeedView from '@/components/feed/FeedView';
import { LANDING_CSS } from '@/components/landing/landingStyles';

export default function PublicCoursesPage() {
  return (
    <div className="lv-root">
      <style>{LANDING_CSS}</style>
      <Header />
      <main style={{ padding: '40px 20px', minHeight: '80vh', background: '#F9FAFB' }}>
        <FeedView contentType="COURSE" />
      </main>
      <Footer />
    </div>
  );
}
