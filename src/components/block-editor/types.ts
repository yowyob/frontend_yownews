// Modèle de bloc de l'éditeur — en mémoire uniquement. Le stockage se fait en HTML (voir
// serialize.ts) ; à la réédition on reconstruit les blocs depuis le HTML.

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'quote'
  | 'callout'
  | 'list'
  | 'image'
  | 'button'
  | 'file'
  | 'divider';

export type Block =
  | { id: string; type: 'heading'; level: 1 | 2 | 3; html: string }
  | { id: string; type: 'paragraph'; html: string }
  | { id: string; type: 'quote'; html: string }
  | { id: string; type: 'callout'; html: string }
  | { id: string; type: 'list'; ordered: boolean; html: string } // html = suite de <li>…</li>
  | { id: string; type: 'image'; src: string; alt: string }
  | { id: string; type: 'button'; label: string; href: string }
  | { id: string; type: 'file'; url: string; name: string }
  | { id: string; type: 'divider' };

let counter = 0;
export function newId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}${counter}`;
}

/** Bloc vide d'un type donné (valeurs par défaut). */
export function emptyBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case 'heading':
      return { id, type: 'heading', level: 2, html: '' };
    case 'paragraph':
      return { id, type: 'paragraph', html: '' };
    case 'quote':
      return { id, type: 'quote', html: '' };
    case 'callout':
      return { id, type: 'callout', html: '' };
    case 'list':
      return { id, type: 'list', ordered: false, html: '<li></li>' };
    case 'image':
      return { id, type: 'image', src: '', alt: '' };
    case 'button':
      return { id, type: 'button', label: 'Bouton', href: '' };
    case 'file':
      return { id, type: 'file', url: '', name: '' };
    case 'divider':
      return { id, type: 'divider' };
  }
}
