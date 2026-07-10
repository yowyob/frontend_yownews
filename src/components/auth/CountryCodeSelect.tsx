'use client';
import { COUNTRY_CODES, FlagIcon } from './countryFlags';

type Props = {
  value: string;
  onChange: (dial: string) => void;
};

/**
 * <select> natif conservé (clavier, picker mobile natif, lecteurs d'écran) mais décoré
 * d'un drapeau SVG fiable — les emoji drapeaux ne s'affichent pas correctement sous Windows.
 */
export function CountryCodeSelect({ value, onChange }: Props) {
  const current = COUNTRY_CODES.find((c) => c.dial === value) ?? COUNTRY_CODES[0];

  return (
    <div className="relative flex-shrink-0">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        <FlagIcon iso={current.iso} />
      </div>
      <select
        id="countryCode"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Indicatif pays"
        className="h-full pl-9 pr-6 py-[11px] rounded-l-[10px] border-[1.5px] border-r-0 border-gray-200 bg-white text-sm text-[#0F172A] cursor-pointer focus:outline-none focus:border-[#1F5FBF] min-w-[104px] appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.iso} value={c.dial}>
            {c.iso} {c.dial}
          </option>
        ))}
      </select>
    </div>
  );
}
