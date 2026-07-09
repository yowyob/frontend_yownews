import { Link } from '@/i18n/navigation';

export function CtaBanner() {
  return (
    <section className="lv-cta-wrap" aria-labelledby="cta-h2">
      <div className="lv-container">
        <div className="lv-cta">
          <h2 id="cta-h2">Prêt à transformer votre apprentissage ?</h2>
          <p>
            Rejoignez des milliers d&apos;apprenants camerounais qui développent leurs compétences
            chaque jour sur YowNews, gratuitement.
          </p>
          <div className="ctas">
            <Link href="/auth/sign-up" className="lv-btn lv-btn-orange">
              Créer mon compte gratuit
            </Link>
            <a href="#blogs" className="lv-btn lv-btn-outline">
              Parcourir le contenu
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
