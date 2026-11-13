import { api } from "../lib/api";
export { ApiError as BusinessIntelligenceApiError } from "../lib/api";

export interface BIMetric {
  available: boolean;
  value: number | null;
  currency?: string | null;
  unit?: string | null;
  by_currency?: Record<string, number>;
  source?: string | null;
  reason?: string;
}

export interface BIOverview {
  metrics: Record<string, BIMetric>;
  charts: {
    revenue: Array<{ period: string | null; value: number }>;
    expenses: Array<{ period: string | null; value: number }>;
    comparison_available: boolean;
    comparison_reason?: string | null;
  };
  sources: Record<string, { available: boolean; table: string | null }>;
  refresh: { mode: string };
}

export interface DashboardMetric {
  available: boolean;
  value: number | null;
  by_currency?: Record<string, number> | null;
  reason?: string;
}

export interface DashboardData {
  metrics: {
    active_engagements: DashboardMetric;
    open_review_notes: DashboardMetric;
    open_findings: DashboardMetric;
    active_clients: DashboardMetric;
    inventory_value: DashboardMetric;
    asset_value: DashboardMetric;
    open_expenses: DashboardMetric;
  };
  charts: {
    engagements: Array<{ name: string; value: number }>;
    review_notes: Array<{ name: string; value: number }>;
    findings: Array<{ name: string; value: number }>;
  };
  top_clients: Array<{
    clientName: string;
    totalRevenue: number;
    invoiceCount: number;
    averageInvoice: number;
    lastInvoice: string;
  }>;
  activities: Array<{
    id: string;
    title: string;
    message: string;
    date: string;
  }>;
}

export interface BIReport {
  id: string;
  workspace_id: string;
}

export interface BIReportList {
  configured: boolean;
  reports: BIReport[];
}

export interface BIReportMetadata {
  id: string;
  name: string;
  embed_url: string;
  dataset_id?: string | null;
}

export interface BIEmbedToken {
  report_id: string;
  embed_url: string;
  embed_token: string;
  token_type: "Embed";
  expiration: string | null;
}

function dateQuery(startDate: string, endDate: string): string {
  const query = new URLSearchParams();
  if (startDate) query.set("start_date", startDate);
  if (endDate) query.set("end_date", endDate);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export const businessIntelligenceApi = {
  getDashboard: () => api.get<DashboardData>("/business-intelligence/dashboard"),
  getOverview: (startDate: string, endDate: string) =>
    api.get<BIOverview>(`/business-intelligence/overview${dateQuery(startDate, endDate)}`),
  getFinancial: (startDate: string, endDate: string) =>
    api.get<Record<string, unknown>>(
      `/business-intelligence/analytics/financial${dateQuery(startDate, endDate)}`,
    ),
  getClients: (startDate: string, endDate: string) =>
    api.get<{ available: boolean; items: Array<{ client: string; revenue: number }> }>(
      `/business-intelligence/analytics/clients${dateQuery(startDate, endDate)}`,
    ),
  getEngagements: () =>
    api.get<{ available: boolean; items: Array<{ status: string; count: number }> }>(
      "/business-intelligence/analytics/engagements",
    ),
  getEmployees: () =>
    api.get<{ available: boolean; items: unknown[]; reason?: string }>(
      "/business-intelligence/analytics/employees",
    ),
  getCashFlow: (startDate: string, endDate: string) =>
    api.get<{
      available: boolean;
      items: Array<{ period: string | null; inflow: number; outflow: number; net: number }>;
    }>(`/business-intelligence/analytics/cash-flow${dateQuery(startDate, endDate)}`),
  getStock: () =>
    api.get<{
      available: boolean;
      valuation: number | null;
      low_stock_count: number | null;
      items: Array<{ name: string; value: number }>;
    }>("/business-intelligence/analytics/stock"),
  getExpenses: (startDate: string, endDate: string) =>
    api.get<{
      available: boolean;
      total: BIMetric;
      categories: Array<{ category: string; value: number }>;
    }>(`/business-intelligence/analytics/expenses${dateQuery(startDate, endDate)}`),
  getDataStatus: () =>
    api.get<{
      checked_at: string;
      refresh_mode: string;
      sources: Record<string, { available: boolean; table: string | null }>;
      powerbi_configured: boolean;
      powerbi_dataset_refresh: string;
    }>("/business-intelligence/data-status"),
  getReports: () => api.get<BIReportList>("/business-intelligence/reports"),
  getReportMetadata: (reportId: string) =>
    api.get<BIReportMetadata>(
      `/business-intelligence/reports/${encodeURIComponent(reportId)}`,
    ),
  getEmbedToken: (reportId: string) =>
    api.post<BIEmbedToken>(
      `/business-intelligence/reports/${encodeURIComponent(reportId)}/embed-token`,
    ),
};
