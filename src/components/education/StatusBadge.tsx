const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  PUBLISHED: { label: 'Publié', bg: 'rgba(34,197,94,.1)', color: '#16A34A' },
  SUBMITTED: { label: 'En attente', bg: '#FEF9EC', color: '#B45309' },
  DRAFT: { label: 'Brouillon', bg: 'var(--gray-100)', color: 'var(--gray-600)' },
  REFUSED: { label: 'Rejeté', bg: '#FEF2F2', color: '#DC2626' },
};

// Badge de statut partagé par les listes "Mes contenus" et la modération admin.
export default function StatusBadge({ status }: { status?: string | null }) {
  const badge = STATUS_BADGE[status ?? ''] ?? STATUS_BADGE.DRAFT;
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
      {badge.label}
    </span>
  );
}
