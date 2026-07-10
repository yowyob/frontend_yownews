// CSS de la landing « v5 » (contexte Cameroun) adapté de la maquette landing_v5.html.
// TOUS les sélecteurs sont préfixés par `.lv-root` pour rester confinés à la page d'accueil
// et ne jamais entrer en collision avec globals.css (utilisé par le reste de l'app).

export const LANDING_CSS = `
.lv-root{--b50:#eaf2ff;--b400:#4a8fe7;--b500:#2f72d6;--b600:#1f5fbf;--b700:#1a4f9e;--b900:#0f3a7a;
  --lv-orange:#ff6b35;--lv-orange2:#e85a28;--lv-ink:#0f172a;--lv-muted:#64748b;--lv-bg:#fcfbf8;
  font-family:'Inter',system-ui,sans-serif;color:var(--lv-ink);background:#fff;line-height:1.5}
.lv-root *{box-sizing:border-box}
.lv-root img{max-width:100%;display:block}
.lv-root a{text-decoration:none;color:inherit}
.lv-container{max-width:1200px;margin:0 auto;padding:0 24px}
.lv-grad{background:radial-gradient(1200px 600px at 80% -10%,rgba(255,255,255,.18),transparent 60%),linear-gradient(135deg,var(--b500),var(--b700))}

/* NAV */
.lv-nav{background:var(--b600);color:#fff;position:sticky;top:0;z-index:50}
.lv-nav-inner{display:flex;align-items:center;justify-content:space-between;height:68px}
.lv-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px}
.lv-logo{width:34px;height:34px;border-radius:9px;background:var(--lv-orange);display:grid;place-items:center;font-size:18px}
.lv-nav-links{display:flex;gap:28px;font-size:14px;font-weight:500}
.lv-nav-links a:hover{color:#ffd0a8}
.lv-nav-cta{display:flex;align-items:center;gap:16px;font-size:14px}

/* BUTTONS */
.lv-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;transition:.2s;border:0}
.lv-btn-orange{background:var(--lv-orange);color:#fff}
.lv-btn-orange:hover{background:var(--lv-orange2)}
.lv-btn-ghost{background:rgba(255,255,255,.12);color:#fff;backdrop-filter:blur(6px)}
.lv-btn-ghost:hover{background:rgba(255,255,255,.22)}
.lv-btn-outline{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)}

/* HERO + CARROUSEL */
.lv-hero{position:relative;color:#fff;min-height:600px;display:flex;align-items:center;overflow:hidden;background:var(--b700)}
.lv-hero-carousel{position:absolute;inset:0;z-index:0}
.lv-hero-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.2s ease-in-out;filter:grayscale(100%) brightness(35%) contrast(110%)}
.lv-hero-slide.is-active{opacity:1}
.lv-hero-overlay{position:absolute;inset:0;z-index:1;background:rgba(31,95,191,.82)}
.lv-hero .lv-container{position:relative;z-index:2;padding-top:96px;padding-bottom:96px;width:100%}
.lv-tag{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.18);color:#fff;font-size:13px;font-weight:600;backdrop-filter:blur(6px)}
.lv-tag.light{background:rgba(255,107,53,.18);color:#ffb380}
.lv-hero h1{font-size:clamp(40px,6vw,76px);font-weight:900;line-height:1.05;margin-top:22px;max-width:820px}
.lv-hero h1 .o{color:#ffb380}
.lv-hero p.lead{margin-top:22px;max-width:560px;color:rgba(255,255,255,.92);font-size:18px}
.lv-hero .ctas{margin-top:30px;display:flex;flex-wrap:wrap;gap:12px}
.lv-hero .checks{margin-top:26px;display:flex;flex-wrap:wrap;gap:22px;font-size:14px;color:rgba(255,255,255,.9)}
.lv-hero-nav{margin-top:22px;display:flex;flex-wrap:wrap;gap:28px;font-size:15px;font-weight:600}
.lv-hero-nav a{color:#fff;transition:.2s}
.lv-hero-nav a:hover{color:#ffd0a8}

/* STATS */
.lv-stats{background:var(--lv-bg);padding:56px 0}
.lv-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center}
.lv-stat-ic{width:52px;height:52px;border-radius:14px;background:#ffe5d6;color:var(--lv-orange);display:grid;place-items:center;margin:0 auto 12px;font-size:22px}
.lv-stat-n{font-size:34px;font-weight:900;color:var(--b700)}
.lv-stat-l{color:var(--lv-muted);font-size:14px;margin-top:4px}

/* SECTIONS */
.lv-section{padding:80px 0}
.lv-section.dark{color:#fff}
.lv-section-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:40px;gap:16px;flex-wrap:wrap}
.lv-section h2{font-size:38px;font-weight:900;margin-top:12px;line-height:1.1}
.lv-section.dark h2{color:#fff}
.lv-link-more{color:var(--lv-orange);font-weight:600;font-size:14px}
.lv-section.dark .lv-link-more{color:#ffb380}
.lv-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}

/* CARDS */
.lv-card-glass{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden;backdrop-filter:blur(8px);transition:.25s;display:block}
.lv-card-glass:hover{transform:translateY(-4px);background:rgba(255,255,255,.12)}
.lv-card-glass.light{background:#fff;border-color:#eee}
.lv-card-glass.light:hover{background:#fff;box-shadow:0 12px 30px rgba(15,58,122,.12)}
.lv-card-img{height:200px;background-size:cover;background-position:center;position:relative;background-color:var(--b600)}
.lv-card-img .badge{position:absolute;top:14px;left:14px;background:rgba(255,107,53,.95);color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;padding:5px 10px;border-radius:6px}
.lv-card-img .meta{position:absolute;top:14px;right:14px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;padding:4px 10px;border-radius:6px}
.lv-card-body{padding:22px}
.lv-card-body h3{font-size:18px;font-weight:800;line-height:1.3;margin-bottom:10px;color:#fff}
.lv-card-glass.light .lv-card-body h3{color:var(--lv-ink)}
.lv-card-body p{color:rgba(255,255,255,.75);font-size:14px;margin-bottom:18px}
.lv-card-glass.light .lv-card-body p{color:var(--lv-muted)}
.lv-card-foot{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:rgba(255,255,255,.7);border-top:1px solid rgba(255,255,255,.08);padding-top:14px}
.lv-card-glass.light .lv-card-foot{color:var(--lv-muted);border-color:#eee}
.lv-card-foot .price{color:var(--lv-orange);font-weight:700}
.lv-empty{color:rgba(255,255,255,.75);font-size:15px;grid-column:1/-1;padding:20px 0}
.lv-section:not(.dark) .lv-empty{color:var(--lv-muted)}

/* FEATURES */
.lv-features{background:var(--lv-bg);padding:80px 0}
.lv-features h2{font-size:38px;font-weight:900;text-align:center;margin-bottom:50px;color:var(--lv-ink)}
.lv-grid-feat{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.lv-feat{background:#fff;border-radius:18px;padding:32px;box-shadow:0 4px 20px rgba(15,58,122,.06);transition:.25s}
.lv-feat:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(15,58,122,.12)}
.lv-feat-ic{width:56px;height:56px;border-radius:14px;background:#ffe5d6;color:var(--lv-orange);display:grid;place-items:center;font-size:24px;margin-bottom:20px}
.lv-feat h3{font-size:18px;font-weight:800;margin-bottom:10px}
.lv-feat p{color:var(--lv-muted);font-size:14px}

/* TESTIMONIALS */
.lv-testi-wrap{padding:80px 0;color:#fff}
.lv-testi-wrap h2{font-size:38px;font-weight:900;text-align:center;margin-bottom:50px}
.lv-grid-3.lv-testi-grid{grid-template-columns:repeat(3,1fr)}
.lv-testi{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:28px;backdrop-filter:blur(8px)}
.lv-testi .q{color:#ffb380;font-size:32px;line-height:1;margin-bottom:12px}
.lv-testi p.quote{color:rgba(255,255,255,.92);font-size:15px;line-height:1.55;margin-bottom:22px}
.lv-testi .who{display:flex;align-items:center;gap:12px}
.lv-testi .who .avatar{width:46px;height:46px;border-radius:50%;background:var(--lv-orange);display:grid;place-items:center;font-weight:800;color:#fff}
.lv-testi .who .n{font-weight:700}
.lv-testi .who .r{font-size:12px;color:rgba(255,255,255,.65)}
.lv-stars{color:#ff6b35;margin-top:12px;display:flex;gap:3px}

/* CTA */
.lv-cta-wrap{background:var(--lv-bg);padding:80px 0}
.lv-cta{background:linear-gradient(135deg,var(--b500),var(--b700));border-radius:24px;padding:64px 40px;text-align:center;color:#fff;box-shadow:0 20px 50px rgba(15,58,122,.25)}
.lv-cta h2{font-size:38px;font-weight:900;margin-bottom:14px}
.lv-cta p{color:rgba(255,255,255,.85);max-width:560px;margin:0 auto 30px;font-size:16px}
.lv-cta .ctas{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}

/* FOOTER */
.lv-footer{background:#0a1d3f;color:rgba(255,255,255,.7);padding:60px 0 30px;font-size:14px}
.lv-footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px}
.lv-footer h4{color:#fff;font-size:14px;font-weight:700;margin-bottom:16px;letter-spacing:.5px;text-transform:uppercase}
.lv-footer ul{list-style:none;margin:0;padding:0}
.lv-footer li{margin-bottom:8px}
.lv-footer a:hover{color:#ffb380}
.lv-footer .bot{border-top:1px solid rgba(255,255,255,.1);padding-top:24px;text-align:center;font-size:13px}

@media(max-width:960px){
  .lv-nav-links{display:none}
  .lv-grid-3,.lv-grid-feat,.lv-stats-grid,.lv-footer-grid,.lv-testi-grid{grid-template-columns:1fr 1fr}
  .lv-hero{min-height:auto}
}
@media(max-width:560px){
  .lv-grid-3,.lv-grid-feat,.lv-stats-grid,.lv-footer-grid,.lv-testi-grid{grid-template-columns:1fr}
  .lv-section h2,.lv-cta h2,.lv-features h2,.lv-testi-wrap h2{font-size:30px}
}
`;
