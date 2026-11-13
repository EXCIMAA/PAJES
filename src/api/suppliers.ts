import { api } from "../lib/api";

export interface Supplier {
  id: string;
  name: string;
  alert_date: string | null;
  recurring_day: number | null;
  is_recurring: boolean | null;
  message: string | null;
  total_depenses: number | string | null;
  is_done: boolean | null;
  last_alert_date: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SupplierWrite {
  name: string;
  alert_date: string | null;
  recurring_day: number | null;
  is_recurring: boolean;
  message: string;
  total_depenses: string;
}

export const suppliersApi = {
  list: () => api.get<Supplier[]>("/suppliers"),
  create: (body: SupplierWrite) => api.post<Supplier>("/suppliers", body),
  update: (id: string, body: SupplierWrite) =>
    api.put<Supplier>(`/suppliers/${encodeURIComponent(id)}`, body),
  patch: (
    id: string,
    body: { is_done?: boolean; last_alert_date?: string | null },
  ) => api.patch<Supplier>(`/suppliers/${encodeURIComponent(id)}`, body),
  delete: (id: string) => api.delete<void>(`/suppliers/${encodeURIComponent(id)}`),
};
