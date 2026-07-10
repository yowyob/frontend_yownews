'use client';

/**
 * Mini-drapeaux SVG (bandes de couleur simplifiées) utilisés pour l'indicatif téléphonique.
 * On évite les emoji drapeaux : ils s'affichent en code ISO brut sous Windows (rendu cassé),
 * l'app cible en priorité des utilisateurs mobiles africains sur des OS/navigateurs variés.
 */
export type CountryCode = {
  iso: string;
  dial: string;
  name: string;
};

export const COUNTRY_CODES: CountryCode[] = [
  { iso: 'CI', dial: '+225', name: 'Côte d’Ivoire' },
  { iso: 'SN', dial: '+221', name: 'Sénégal' },
  { iso: 'CM', dial: '+237', name: 'Cameroun' },
  { iso: 'KE', dial: '+254', name: 'Kenya' },
  { iso: 'NG', dial: '+234', name: 'Nigeria' },
  { iso: 'GH', dial: '+233', name: 'Ghana' },
  { iso: 'MA', dial: '+212', name: 'Maroc' },
  { iso: 'DZ', dial: '+213', name: 'Algérie' },
  { iso: 'TN', dial: '+216', name: 'Tunisie' },
  { iso: 'CD', dial: '+243', name: 'RD Congo' },
  { iso: 'BF', dial: '+226', name: 'Burkina Faso' },
  { iso: 'ML', dial: '+223', name: 'Mali' },
  { iso: 'GN', dial: '+224', name: 'Guinée' },
  { iso: 'FR', dial: '+33', name: 'France' },
  { iso: 'US', dial: '+1', name: 'États-Unis' },
  { iso: 'GB', dial: '+44', name: 'Royaume-Uni' },
];

function Stripes({ dir, colors }: { dir: 'h' | 'v'; colors: string[] }) {
  const n = colors.length;
  return (
    <>
      {colors.map((c, i) =>
        dir === 'v' ? (
          <rect key={i} x={(20 / n) * i} y="0" width={20 / n} height="14" fill={c} />
        ) : (
          <rect key={i} x="0" y={(14 / n) * i} width="20" height={14 / n} fill={c} />
        ),
      )}
    </>
  );
}

const FLAGS: Record<string, React.ReactNode> = {
  CI: <Stripes dir="v" colors={['#FF8200', '#FFFFFF', '#009A44']} />,
  SN: <Stripes dir="v" colors={['#00853F', '#FDEF42', '#E31B23']} />,
  CM: <Stripes dir="v" colors={['#007A33', '#CE1126', '#FCD116']} />,
  KE: <Stripes dir="h" colors={['#000000', '#FFFFFF', '#BB0000', '#FFFFFF', '#006600']} />,
  NG: <Stripes dir="v" colors={['#008751', '#FFFFFF', '#008751']} />,
  GH: <Stripes dir="h" colors={['#CE1126', '#FCD116', '#006B3F']} />,
  ML: <Stripes dir="v" colors={['#14B53A', '#FCD116', '#CE1126']} />,
  GN: <Stripes dir="v" colors={['#CE1126', '#FCD116', '#009460']} />,
  FR: <Stripes dir="v" colors={['#0055A4', '#FFFFFF', '#EF4135']} />,
  BF: <Stripes dir="h" colors={['#EF2B2D', '#009E49']} />,
  DZ: <Stripes dir="v" colors={['#006233', '#FFFFFF']} />,
  MA: (
    <>
      <rect width="20" height="14" fill="#C1272D" />
      <path d="M10 4.5l.9 2.77h2.9l-2.35 1.7.9 2.77L10 10.04l-2.35 1.7.9-2.77L6.2 7.27h2.9z" fill="none" stroke="#006233" strokeWidth="0.6" />
    </>
  ),
  TN: (
    <>
      <rect width="20" height="14" fill="#E70013" />
      <circle cx="10" cy="7" r="3.4" fill="#FFFFFF" />
      <circle cx="10.9" cy="7" r="2.5" fill="#E70013" />
    </>
  ),
  CD: (
    <>
      <rect width="20" height="14" fill="#007FFF" />
      <polygon points="0,14 6,14 20,0 14,0" fill="#F7D618" />
      <polygon points="0,14 4,14 18,0 14,0" fill="#CE1021" />
    </>
  ),
  US: (
    <>
      <Stripes dir="h" colors={['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234']} />
      <rect width="9" height="6" fill="#3C3B6E" />
    </>
  ),
  GB: (
    <>
      <rect width="20" height="14" fill="#00247D" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#FFFFFF" strokeWidth="2.4" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#CF142B" strokeWidth="1" />
      <path d="M10 0v14M0 7h20" stroke="#FFFFFF" strokeWidth="3.6" />
      <path d="M10 0v14M0 7h20" stroke="#CF142B" strokeWidth="1.6" />
    </>
  ),
};

export function FlagIcon({ iso, className }: { iso: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 14"
      width="20"
      height="14"
      className={`rounded-[2px] shrink-0 ${className ?? ''}`}
      role="img"
      aria-hidden="true"
    >
      {FLAGS[iso] ?? <rect width="20" height="14" fill="#E2E8F0" />}
    </svg>
  );
}
