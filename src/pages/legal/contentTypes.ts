export type LegalDocumentId = "terms" | "privacy";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  summary: string;
  version: string;
  effectiveDate: null;
  lastUpdated: null;
  sections: LegalSection[];
}

export type LegalDocuments = Record<LegalDocumentId, LegalDocument>;
