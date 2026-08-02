export type LegalSection = { number: string; heading: string; paragraphs: string[] };

export type LegalAppendixTable = { title: string; kind: 'table'; headers: string[]; rows: string[][] };
export type LegalAppendixList = { title: string; kind: 'list'; items: string[] };
export type LegalAppendix = LegalAppendixTable | LegalAppendixList;

export type LegalDocControl = {
  status: string;
  version: string;
  date: string;
  publisher: string;
  system: string;
  document: string;
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  importantNotice: string;
  effectiveDate: string;
  docControl: LegalDocControl;
  systemScope: string;
  officialSource: string;
  federatedArchitecture: string;
  quickTableTitle: string;
  quickTableHeaders: [string, string];
  /** Paires [terme, valeur] — un tuple plutôt qu'un objet : ordre d'affichage garanti, pas de clé à nommer. */
  quickTable: [string, string][];
  sections: LegalSection[];
  appendices: LegalAppendix[];
  legalReferencesTitle: string;
  legalReferences: string[];
  legalReferencesNote: string;
  contacts: string;
};
