'use client';
// Carrousel d'arrière-plan du hero : fait défiler les couvertures des contenus publiés
// (blogs + podcasts + cours) derrière le titre. CSS pur (fondu enchaîné), sans librairie.
import { useEffect, useMemo, useState } from 'react';
import { usePublicFeed } from './PublicFeedProvider';

// Visuels de repli (thème africain / Cameroun) si aucun contenu publié n'a encore de couverture.
const FALLBACK = [
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80',
  'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1400&q=80',
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1400&q=80',
];

export function HeroCarousel() {
  const { data } = usePublicFeed();

  const covers = useMemo(() => {
    const all = [...data.blogs, ...data.podcasts, ...data.courses].map((i) => i.coverUrl);
    return all.length > 0 ? all.slice(0, 6) : FALLBACK;
  }, [data]);

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (covers.length <= 1) return;
    const t = setInterval(() => setActive((i) => (i + 1) % covers.length), 5000);
    return () => clearInterval(t);
  }, [covers.length]);

  return (
    <div className="lv-hero-carousel" aria-hidden="true">
      {covers.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className={`lv-hero-slide${i === active ? ' is-active' : ''}`}
          style={{ backgroundImage: `url('${url}')` }}
        />
      ))}
      <div className="lv-hero-overlay" />
    </div>
  );
}
