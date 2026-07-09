'use client';

// Cache locale (localStorage) du formulaire de création de contenu (Blog/Cours/Podcast) — évite
// de perdre le texte saisi en changeant d'onglet (Créer ↔ Mes blogs) ou en quittant la section.
// Ne s'applique qu'au flux de CRÉATION (pas à l'édition d'un contenu existant).

export type DraftCommon = {
  title: string;
  description: string;
  domain: string;
  customDomain: string;
  selectedCats: string[];
  freeCategories: string[];
  selectedTags: string[];
  freeTags: string[];
};

export type DraftEntry = DraftCommon & {
  extra: Record<string, unknown>;
  savedAt: number;
};

function storageKey(kind: string) {
  return `yn:draft:${kind}`;
}

export function loadDraft(kind: string): DraftEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(kind));
    return raw ? (JSON.parse(raw) as DraftEntry) : null;
  } catch {
    return null;
  }
}

export function saveDraft(kind: string, entry: DraftEntry) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(kind), JSON.stringify(entry));
  } catch {
    /* quota dépassé / navigation privée — best-effort, on ignore */
  }
}

export function clearDraft(kind: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(kind));
  } catch {
    /* idem */
  }
}

export function isDraftMeaningful(d: DraftCommon | null | undefined): d is DraftCommon {
  return Boolean(d && (d.title.trim() || d.description.trim()));
}
