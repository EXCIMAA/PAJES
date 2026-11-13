import { api } from "../lib/api";

export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  ref_pf?: string | null;
  date_emission: string;
  date_contrat?: string | null;
  total_general: number | string;
  acompte_regle?: number | string;
  status: string;
  currency: string;
  client_id?: string | null;
  type_document: string;
  invoice_type?: string | null;
  client_details_snapshot?: {
    name?: string;
    address_bp?: string;
    nui?: string;
    rccm?: string;
    contract_ref?: string;
    country?: string;
  } | null;
  signature_company?: string | null;
  signature_client?: string | null;
  payment_method?: string | null;
  [key: string]: unknown;
};

export type InvoiceLineRecord = {
  id: string;
  invoice_id: string;
  section: "HONORAIRES" | "RETENUS" | "DEBOURS";
  designation: string;
  unite: number | null;
  taux: number | null;
  montant: number | string;
  sort_order: number;
  comments?: string | null;
};

export interface InvoiceListResponse {
  items: InvoiceRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvoiceDetailResponse {
  invoice: InvoiceRecord;
  lines: InvoiceLineRecord[];
}

export interface InvoiceLineInput {
  section: "HONORAIRES" | "RETENUS" | "DEBOURS";
  designation: string;
  unite: number | null;
  taux: number | null;
  sort_order: number;
  comments?: string | null;
}

export interface InvoiceWriteInput {
  date_emission: string;
  date_contrat: string | null;
  client_id: string;
  currency: string;
  country: string;
  type_document: "FACTURE" | "PRO-FORMA" | "AVOIR";
  acompte_regle: number;
  payment_method: string;
  signature_company: string | null;
  signature_client: string | null;
  initials: string;
  reference_base: string;
  lines: InvoiceLineInput[];
}

export const invoicesApi = {
  list: (country: string, limit = 100, offset = 0) => {
    const query = new URLSearchParams({
      country,
      limit: String(limit),
      offset: String(offset),
    });
    return api.get<InvoiceListResponse>(`/invoices?${query}`);
  },
  get: (invoiceId: string) =>
    api.get<InvoiceDetailResponse>(`/invoices/${encodeURIComponent(invoiceId)}`),
  previewNumber: (values: {
    date_emission: string;
    initials: string;
    reference_base: string;
  }) => {
    const query = new URLSearchParams(values);
    return api.get<{ invoice_number: string; ref_pf: string }>(
      `/invoices/number-preview?${query}`,
    );
  },
  create: (values: InvoiceWriteInput) =>
    api.post<InvoiceDetailResponse>("/invoices", values),
  update: (invoiceId: string, values: InvoiceWriteInput) =>
    api.put<InvoiceDetailResponse>(
      `/invoices/${encodeURIComponent(invoiceId)}`,
      values,
    ),
  archive: (invoiceId: string) =>
    api.patch<void>(`/invoices/${encodeURIComponent(invoiceId)}/archive`),
  updateStatus: (
    invoiceId: string,
    status: "draft" | "sent" | "paid" | "cancelled" | "pending",
  ) =>
    api.patch<void>(`/invoices/${encodeURIComponent(invoiceId)}/status`, {
      status,
    }),
};
