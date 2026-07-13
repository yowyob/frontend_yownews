'use client';
import { useRef, useState } from 'react';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Lecteur audio à l'identité visuelle de l'app (bouton play rond en accent, barre de
 * progression cliquable) — remplace le widget `<audio controls>` par défaut du navigateur,
 * qui détonne à côté des autres composants stylés.
 */
export default function AudioPlayer({ src, style }: { src: string; style?: React.CSSProperties }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Réinitialise l'état de lecture quand la source change, sans passer par un effet
  // (pattern React "adjusting state during render" — évite un rendu en cascade).
  const [trackedSrc, setTrackedSrc] = useState(src);
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '14px', background: 'var(--gray-50, #f8fafc)', ...style }}>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Mettre en pause' : 'Écouter'}
        style={{
          flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--accent, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(255,107,53,.35)',
        }}
      >
        {playing ? (
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24" style={{ marginLeft: '2px' }}><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          ref={trackRef}
          onClick={seek}
          style={{ position: 'relative', height: '6px', borderRadius: '3px', background: 'var(--gray-200, #e5e7eb)', cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${progress}%`, borderRadius: '3px', background: 'var(--accent, #f97316)' }} />
          <div style={{ position: 'absolute', top: '50%', left: `${progress}%`, transform: 'translate(-50%,-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent, #f97316)', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--gray-400, #9ca3af)' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
