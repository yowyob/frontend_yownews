import type { LegalDocument } from '@/content/legal/types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <article className="max-w-[820px] mx-auto px-5 py-12">
      <header className="mb-10">
        <p className="font-display text-[13px] font-semibold tracking-wide uppercase text-[#FF6B35] mb-2">
          Yowyob Education — {doc.docControl.system}
        </p>
        <h1 className="font-display text-[30px] md:text-[36px] font-extrabold text-[#0F172A] leading-tight mb-2">
          {doc.title}
        </h1>
        <p className="text-[15px] text-[#64748B] mb-6">{doc.subtitle}</p>

        <div className="rounded-[12px] border border-[#FF6B35]/25 bg-[#FFF3EC] px-5 py-4 text-sm text-[#7A3A1D] leading-relaxed mb-6">
          <strong className="text-[#0F172A]">Important — </strong>
          {doc.importantNotice}
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-[13px] border border-gray-200 rounded-[12px] p-4">
          <div>
            <dt className="text-gray-400">Statut</dt>
            <dd className="text-[#0F172A] font-medium">{doc.docControl.status}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Version</dt>
            <dd className="text-[#0F172A] font-medium">{doc.docControl.version}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Date d&apos;entrée en vigueur</dt>
            <dd className="text-[#0F172A] font-medium">{doc.effectiveDate}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Éditeur</dt>
            <dd className="text-[#0F172A] font-medium">{doc.docControl.publisher}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-gray-400">Périmètre du système</dt>
            <dd className="text-[#0F172A]">{doc.systemScope}</dd>
          </div>
        </dl>
      </header>

      {/* Table des matières */}
      <nav aria-label="Sommaire" className="mb-10 border border-gray-200 rounded-[12px] p-5">
        <p className="font-display text-[13px] font-semibold text-[#0F172A] mb-3">Sommaire</p>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] list-none">
          {doc.sections.map((s) => (
            <li key={s.number}>
              <a
                href={`#section-${s.number}`}
                className="text-[#1F5FBF] hover:text-[#FF6B35] transition-colors"
              >
                {s.number}. {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Résumé / vue d'ensemble */}
      <section className="mb-10">
        <h2 className="font-display text-[20px] font-bold text-[#0F172A] mb-3">{doc.quickTableTitle}</h2>
        <div className="overflow-x-auto rounded-[12px] border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 font-display font-semibold text-[#0F172A] w-[220px]">
                  {doc.quickTableHeaders[0]}
                </th>
                <th className="px-4 py-2.5 font-display font-semibold text-[#0F172A]">
                  {doc.quickTableHeaders[1]}
                </th>
              </tr>
            </thead>
            <tbody>
              {doc.quickTable.map(([term, value]) => (
                <tr key={term} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2.5 font-medium text-[#0F172A]">{term}</td>
                  <td className="px-4 py-2.5 text-[#475569] leading-relaxed">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Corps du document */}
      <div className="space-y-9">
        {doc.sections.map((s) => (
          <section key={s.number} id={`section-${s.number}`} className="scroll-mt-24">
            <h2 className="font-display text-[18px] font-bold text-[#0F172A] mb-2.5">
              {s.number}. {s.heading}
            </h2>
            <div className="space-y-3">
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-[14.5px] text-[#334155] leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Annexes */}
      {doc.appendices.map((a) => (
        <section key={a.title} id={`section-${slugify(a.title)}`} className="mt-10 scroll-mt-24">
          <h2 className="font-display text-[18px] font-bold text-[#0F172A] mb-3">{a.title}</h2>
          {a.kind === 'table' ? (
            <div className="overflow-x-auto rounded-[12px] border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {a.headers.map((h) => (
                      <th key={h} className="px-4 py-2.5 font-display font-semibold text-[#0F172A]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.rows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 align-top">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2.5 text-[#475569] leading-relaxed">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="list-disc pl-5 space-y-1.5 text-[14.5px] text-[#334155] leading-relaxed">
              {a.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* Références juridiques */}
      <section className="mt-10">
        <h2 className="font-display text-[18px] font-bold text-[#0F172A] mb-3">{doc.legalReferencesTitle}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] text-[#64748B] leading-relaxed">
          {doc.legalReferences.map((ref, i) => (
            <li key={i}>{ref}</li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-gray-400 italic leading-relaxed">{doc.legalReferencesNote}</p>
      </section>

      {/* Contacts */}
      <footer className="mt-10 pt-6 border-t border-gray-100 text-[13.5px] text-[#64748B]">{doc.contacts}</footer>
    </article>
  );
}
