const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

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

export class BusinessIntelligenceApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BusinessIntelligenceApiError";
  }
}

function csrfToken(): string | undefined {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("pajes_csrf="))
    ?.slice("pajes_csrf=".length);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.method && options.method !== "GET") {
    const token = csrfToken();
    if (token) headers.set("X-CSRF-Token", decodeURIComponent(token));
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/business-intelligence${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new BusinessIntelligenceApiError(
      body?.detail || `Business Intelligence API returned ${response.status}.`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

function dateQuery(startDate: string, endDate: string): string {
  const query = new URLSearchParams();
  if (startDate) query.set("start_date", startDate);
  if (endDate) query.set("end_date", endDate);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export const businessIntelligenceApi = {
  getOverview: (startDate: string, endDate: string) =>
    request<BIOverview>(`/overview${dateQuery(startDate, endDate)}`),
  getFinancial: (startDate: string, endDate: string) =>
    request<Record<string, unknown>>(`/analytics/financial${dateQuery(startDate, endDate)}`),
  getClients: (startDate: string, endDate: string) =>
    request<{ available: boolean; items: Array<{ client: string; revenue: number }> }>(
      `/analytics/clients${dateQuery(startDate, endDate)}`,
    ),
  getEngagements: () =>
    request<{ available: boolean; items: Array<{ status: string; count: number }> }>(
      "/analytics/engagements",
    ),
  getEmployees: () =>
    request<{ available: boolean; items: unknown[]; reason?: string }>(
      "/analytics/employees",
    ),
  getCashFlow: (startDate: string, endDate: string) =>
    request<{
      available: boolean;
      items: Array<{ period: string | null; inflow: number; outflow: number; net: number }>;
    }>(`/analytics/cash-flow${dateQuery(startDate, endDate)}`),
  getStock: () =>
    request<{
      available: boolean;
      valuation: number | null;
      low_stock_count: number | null;
      items: Array<{ name: string; value: number }>;
    }>("/analytics/stock"),
  getExpenses: (startDate: string, endDate: string) =>
    request<{
      available: boolean;
      total: BIMetric;
      categories: Array<{ category: string; value: number }>;
    }>(`/analytics/expenses${dateQuery(startDate, endDate)}`),
  getDataStatus: () =>
    request<{
      checked_at: string;
      refresh_mode: string;
      sources: Record<string, { available: boolean; table: string | null }>;
      powerbi_configured: boolean;
      powerbi_dataset_refresh: string;
    }>("/data-status"),
  getReports: () => request<BIReportList>("/reports"),
  getReportMetadata: (reportId: string) =>
    request<BIReportMetadata>(`/reports/${encodeURIComponent(reportId)}`),
  getEmbedToken: (reportId: string) =>
    request<BIEmbedToken>(`/reports/${encodeURIComponent(reportId)}/embed-token`, {
      method: "POST",
    }),
};
