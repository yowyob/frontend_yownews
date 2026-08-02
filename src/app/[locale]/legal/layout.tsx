import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { LANDING_CSS } from '@/components/landing/landingStyles';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lv-root">
      <style>{LANDING_CSS}</style>
      <Header />
      <main style={{ background: '#F9FAFB', minHeight: '80vh' }}>{children}</main>
      <Footer />
    </div>
  );
}
