import { type Block, newId } from './types';

// ── Blocs → HTML ─────────────────────────────────────────────────────────────────────────────
// Chaque bloc devient UN élément de premier niveau, dans l'ordre. Ce HTML est ce qui est stocké
// (champ `contenu`/`content`) et envoyé dans l'email de newsletter.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Couleurs LITTÉRALES (pas de var CSS) : ces styles inline doivent survivre dans un email, où les
// feuilles de style et les variables CSS ne s'appliquent pas. Palette yownews.
const C = { primary: '#1F5FBF', accent: '#FF6B35', blueLight: '#EBF3FF', line: '#E5E7EB', dark: '#111827', body: '#374151', muted: '#4B5563' };

// Styles inline par bloc → le HTML stocké est AUTO-STYLÉ : rend pareil dans l'éditeur, sur les pages
// de lecture, et dans l'email (qui supprime les <style>). Les classes sont conservées en parallèle.
// Tailles/graisses par niveau : mêmes valeurs que HEADING_STYLE de l'éditeur, pour que la page
// publiée et l'email restituent la hiérarchie choisie (indispensable face au reset des <h> en CSS).
const HEADING: Record<1 | 2 | 3, string> = {
  1: 'font-size:30px;font-weight:800;line-height:1.2',
  2: 'font-size:24px;font-weight:700;line-height:1.25',
  3: 'font-size:19px;font-weight:700;line-height:1.3',
};

const S = {
  heading: `margin:18px 0 8px;color:${C.dark}`,
  paragraph: `margin:0 0 16px;line-height:1.7;color:${C.body}`,
  quote: `border-left:3px solid ${C.accent};padding-left:14px;margin:16px 0;font-style:italic;color:${C.muted}`,
  callout: `background:${C.blueLight};border-left:3px solid ${C.primary};padding:14px 18px;border-radius:10px;margin:18px 0`,
  list: `padding-left:22px;margin:0 0 16px;color:${C.body}`,
  image: `max-width:100%;height:auto;border-radius:10px;display:block;margin:16px 0`,
  button: `display:inline-block;background:${C.accent};color:#fff;font-weight:700;text-decoration:none;padding:11px 22px;border-radius:10px;margin:8px 0`,
  file: `display:inline-flex;align-items:center;gap:8px;border:1px solid ${C.line};border-radius:10px;padding:9px 14px;text-decoration:none;color:${C.dark};font-weight:600;margin:8px 0`,
  fileBadge: `font-size:10px;font-weight:700;color:#fff;background:${C.accent};padding:3px 6px;border-radius:4px`,
  divider: `border:0;border-top:1px solid ${C.line};margin:18px 0`,
};

export function serializeBlock(b: Block): string {
  switch (b.type) {
    case 'heading':
      return `<h${b.level} style="${S.heading};${HEADING[b.level]}">${b.html}</h${b.level}>`;
    case 'paragraph':
      return `<p style="${S.paragraph}">${b.html}</p>`;
    case 'quote':
      return `<blockquote style="${S.quote}">${b.html}</blockquote>`;
    case 'callout':
      return `<div class="callout" style="${S.callout}">${b.html}</div>`;
    case 'list':
      return b.ordered ? `<ol style="${S.list}">${b.html}</ol>` : `<ul style="${S.list}">${b.html}</ul>`;
    case 'image':
      return b.src ? `<img src="${esc(b.src)}" alt="${esc(b.alt)}" style="${S.image}">` : '';
    case 'button':
      return `<a class="content-btn" href="${esc(b.href)}" style="${S.button}">${esc(b.label)}</a>`;
    case 'file':
      return b.url
        ? `<a class="content-file" href="${esc(b.url)}" download data-name="${esc(b.name)}" style="${S.file}"><span style="${S.fileBadge}">PDF</span> ${esc(b.name || 'Télécharger le fichier')}</a>`
        : '';
    case 'divider':
      return `<hr style="${S.divider}">`;
  }
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks.map(serializeBlock).filter(Boolean).join('\n');
}

// ── HTML → Blocs (réédition) ─────────────────────────────────────────────────────────────────
// Best-effort : on mappe chaque élément de premier niveau vers un bloc. Suffisant pour le jeu de
// blocs produit ci-dessus ; les structures inattendues retombent en paragraphe.

export function parseHtml(html: string): Block[] {
  if (!html || !html.trim()) return [];
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: Block[] = [];

  for (const el of Array.from(doc.body.children)) {
    const tag = el.tagName.toLowerCase();
    const inner = el.innerHTML;

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = Number(tag[1]) as 1 | 2 | 3;
      blocks.push({ id: newId(), type: 'heading', level, html: inner });
    } else if (tag === 'blockquote') {
      blocks.push({ id: newId(), type: 'quote', html: inner });
    } else if (tag === 'ul' || tag === 'ol') {
      blocks.push({ id: newId(), type: 'list', ordered: tag === 'ol', html: inner || '<li></li>' });
    } else if (tag === 'hr') {
      blocks.push({ id: newId(), type: 'divider' });
    } else if (tag === 'img') {
      blocks.push({ id: newId(), type: 'image', src: el.getAttribute('src') ?? '', alt: el.getAttribute('alt') ?? '' });
    } else if (tag === 'a' && el.classList.contains('content-file')) {
      blocks.push({ id: newId(), type: 'file', url: el.getAttribute('href') ?? '', name: el.getAttribute('data-name') ?? el.textContent ?? '' });
    } else if (tag === 'a' && el.classList.contains('content-btn')) {
      blocks.push({ id: newId(), type: 'button', label: el.textContent ?? 'Bouton', href: el.getAttribute('href') ?? '' });
    } else if (tag === 'div' && el.classList.contains('callout')) {
      blocks.push({ id: newId(), type: 'callout', html: inner });
    } else if (tag === 'p') {
      // Un <p> ne contenant qu'une image → bloc image.
      const onlyImg = el.children.length === 1 && el.children[0].tagName.toLowerCase() === 'img';
      if (onlyImg) {
        const img = el.children[0] as HTMLImageElement;
        blocks.push({ id: newId(), type: 'image', src: img.getAttribute('src') ?? '', alt: img.getAttribute('alt') ?? '' });
      } else {
        blocks.push({ id: newId(), type: 'paragraph', html: inner });
      }
    } else {
      // Élément inattendu : on préserve son contenu comme paragraphe.
      blocks.push({ id: newId(), type: 'paragraph', html: inner });
    }
  }
  return blocks;
}
