import { api } from "../lib/api";

export interface ReportModule {
  id: string;
  label: string;
}

export type ReportRow = Record<string, unknown>;

export interface ReportRows {
  items: ReportRow[];
  truncated: boolean;
}

export interface CustomReportResponse {
  data: Record<string, ReportRow[]>;
  truncated: string[];
}

export const reportsApi = {
  getCatalog: () => api.get<ReportModule[]>("/reports/catalog"),
  getStandard: (reportType: "audit" | "hr") =>
    api.get<ReportRows>(`/reports/standard/${reportType}`),
  generateCustom: (body: {
    modules: string[];
    start_date: string;
    end_date: string;
    ignore_dates: boolean;
  }) => api.post<CustomReportResponse>("/reports/custom", body),
};
