import type { ReactNode } from 'react';

export type Taxonomy = { id: string; name: string };

// Champs communs à tout contenu éducatif (base `Education` côté backend).
export type CommonContentBody = {
  title: string;
  description: string;
  domain: string;
  categories: string[];
  tags: string[];
  freeTags: string[];
  freeCategories: string[];
  customDomain?: string;
};

// Résultat de la contribution d'un type concret (blog/podcast/cours).
export type ExtraBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Configuration d'un type de contenu pour l'éditeur générique. Le type concret
 * fournit son endpoint, ses champs spécifiques (`extraFields`) et la construction
 * de son sous-payload (`buildExtraBody`).
 */
// Valeurs initiales pour pré-remplir l'éditeur en mode édition.
export type InitialContent = {
  title?: string;
  description?: string;
  domain?: string;
  customDomain?: string;
  categories?: string[];
  freeCategories?: string[];
  tags?: string[];
  freeTags?: string[];
  coverUrl?: string;
  audioUrl?: string;
};

export type ContentTypeConfig = {
  // Libellé pour l'UI (ex. "article", "podcast").
  noun: string;
  // Endpoint de soumission (POST pour créer, PUT pour modifier).
  createPath: string;
  method?: 'POST' | 'PUT';
  coverPath?: (id: string) => string;
  // Présent uniquement pour les types de contenu supportant un fichier audio (ex. podcast).
  audioPath?: (id: string) => string;
  // Champs spécifiques au type, rendus sous les champs communs.
  extraFields: ReactNode;
  // Construit le sous-payload spécifique (ou renvoie une erreur de validation).
  buildExtraBody: () => ExtraBodyResult;
  // Réinitialise l'état spécifique après création réussie.
  resetExtra: () => void;
  // Clé de cache de brouillon (ex. "blog", "courses", "podcasts") — un brouillon par type.
  draftKey: string;
  // Données spécifiques au type à inclure dans le brouillon local (ex. contenu TipTap).
  getDraftExtra?: () => Record<string, unknown>;
};
