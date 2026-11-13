import { api } from "../lib/api";
import type {
  Etablissement as EtablissementRecord,
  EtablissementType,
} from "../types";

export interface ClientDocumentLink {
    id: number;
    client_id: string;
    document_id: number;
    status: "a_fournir" | "fourni" | "non_applicable";
    date_fourni?: string | null;
    commentaire?: string | null;
}

export interface ClientTaxLink {
    id: number;
    client_id: string;
    taxe_id: number;
    assujetti: boolean;
    date_derniere_declaration?: string | null;
    commentaire?: string | null;
}

export interface ClientLinks {
  documents: ClientDocumentLink[];
  taxes: ClientTaxLink[];
}

export interface ClientLinksInput {
  documents: Array<Pick<ClientDocumentLink, "document_id" | "status">>;
  taxes: Array<Pick<ClientTaxLink, "taxe_id" | "assujetti">>;
}

export interface ClientReferences {
  formes: Array<{ id: number; label: string }>;
  statuts: Array<{ id: number; label: string }>;
  regimes: Array<{ id: number; label: string }>;
  natures: Array<{ id: number; label: string }>;
  taxes: Array<{
    id: number;
    code: string;
    libelle: string;
    obligation: string;
    deadline: string;
    assujettis_condition: string;
    legal_ref: string;
    periodicite: string;
  }>;
  categories: Array<{ id: number; label: string }>;
  documents: Array<{
    id: number;
    category_id: number;
    label: string;
    ref_categories_documents?: { id: number; label: string } | null;
  }>;
}

export type Etablissement = Omit<EtablissementRecord, "type"> & {
  type: EtablissementType;
};

export const clientsApi = {
  list() {
    return api.get<Record<string, unknown>[]>("/clients");
  },
  references() {
    return api.get<ClientReferences>("/clients/references");
  },
  nextCode(country: string) {
    return api.get<{ client_code: string }>(
      `/clients/next-code?country=${encodeURIComponent(country)}`,
    );
  },
  create(client: Record<string, unknown>) {
    return api.post<Record<string, unknown>>("/clients", client);
  },
  update(clientId: string, client: Record<string, unknown>) {
    return api.put<Record<string, unknown>>(
      `/clients/${encodeURIComponent(clientId)}`,
      client,
    );
  },
  delete(clientId: string) {
    return api.delete<void>(`/clients/${encodeURIComponent(clientId)}`);
  },
  links(clientId: string) {
    return api.get<ClientLinks>(
      `/clients/${encodeURIComponent(clientId)}/links`,
    );
  },
  saveLinks(clientId: string, links: ClientLinksInput) {
    return api.put<ClientLinks>(
      `/clients/${encodeURIComponent(clientId)}/links`,
      links,
    );
  },
  establishments(clientId: string, activeOnly = false) {
    const query = activeOnly ? "?active_only=true" : "";
    return api.get<Etablissement[]>(
      `/clients/${encodeURIComponent(clientId)}/establishments${query}`,
    );
  },
  createEstablishment(clientId: string, values: Record<string, unknown>) {
    return api.post<Etablissement>(
      `/clients/${encodeURIComponent(clientId)}/establishments`,
      values,
    );
  },
  updateEstablishment(
    clientId: string,
    establishmentId: string,
    values: Record<string, unknown>,
  ) {
    return api.put<Etablissement>(
      `/clients/${encodeURIComponent(clientId)}/establishments/${encodeURIComponent(establishmentId)}`,
      values,
    );
  },
  deleteEstablishment(clientId: string, establishmentId: string) {
    return api.delete<void>(
      `/clients/${encodeURIComponent(clientId)}/establishments/${encodeURIComponent(establishmentId)}`,
    );
  },
};
