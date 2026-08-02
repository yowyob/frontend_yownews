'use client';
import { useCallback, useRef, useState } from 'react';

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Bouton de confirmation rouge (action destructive). Par défaut `true` : tous les usages
   *  actuels sont des suppressions/retraits/révocations. */
  danger?: boolean;
};

function ConfirmModal({
  message, title, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = true, onConfirm, onCancel,
}: ConfirmOptions & { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)' }}
      >
        {title && <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '17px', fontWeight: 800, margin: '0 0 10px' }}>{title}</h2>}
        <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ border: '1px solid var(--gray-200)', background: '#fff', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--gray-700)' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#fff', background: danger ? '#DC2626' : 'var(--accent)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Remplace `window.confirm()` par une modale React cohérente avec le reste de l'UI. Usage :
 * `const { confirm, ConfirmDialog } = useConfirm();` puis `if (!(await confirm('...'))) return;`,
 * en rendant `{ConfirmDialog}` une fois dans le JSX du composant.
 */
export function useConfirm() {
  const [state, setState] = useState<{ message: string; options?: ConfirmOptions } | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    setState({ message, options });
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  function settle(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  }

  const ConfirmDialog = state ? (
    <ConfirmModal
      message={state.message}
      title={state.options?.title}
      confirmLabel={state.options?.confirmLabel}
      cancelLabel={state.options?.cancelLabel}
      danger={state.options?.danger}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
