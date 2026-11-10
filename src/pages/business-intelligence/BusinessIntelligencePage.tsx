import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Download,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import * as XLSX from "xlsx";
import {
  BusinessIntelligenceApiError,
  businessIntelligenceApi,
  type BIOverview,
  type BIReportList,
} from "../../api/businessIntelligence";
import { PowerBIReportViewer } from "../../components/business-intelligence/PowerBIReportViewer";
import { usePermission } from "../../hooks/usePermission";
import type { ModuleId } from "../../lib/permissions";

type TabKey =
  | "overview"
  | "financial"
  | "profitability"
  | "clients"
  | "engagements"
  | "employees"
  | "cash"
  | "stock"
  | "expenses"
  | "custom"
  | "powerbi"
  | "status";

type PeriodPreset = "month" | "quarter" | "year" | "custom";

const tabDefinitions: Array<{
  key: TabKey;
  modules: ModuleId[];
}> = [
  { key: "overview", modules: ["factures", "clients", "missions", "stock", "caisse", "immobilisations", "notes_frais", "collaborateur_performance"] },
  { key: "financial", modules: ["factures", "notes_frais"] },
  { key: "profitability", modules: ["factures", "notes_frais"] },
  { key: "clients", modules: ["clients"] },
  { key: "engagements", modules: ["missions"] },
  { key: "employees", modules: ["collaborateurs", "collaborateur_performance"] },
  { key: "cash", modules: ["caisse"] },
  { key: "stock", modules: ["stock"] },
  { key: "expenses", modules: ["notes_frais"] },
  { key: "custom", modules: ["factures", "clients", "missions", "stock", "caisse", "notes_frais"] },
  { key: "powerbi", modules: ["factures", "clients", "missions", "stock", "caisse", "notes_frais"] },
  { key: "status", modules: ["factures", "clients", "missions", "stock", "caisse", "immobilisations", "notes_frais", "collaborateur_performance"] },
];

const metricLabels: Record<string, string> = {
  revenue: "revenue",
  expenses: "expenses",
  gross_profit: "grossProfit",
  net_profit: "netProfit",
  outstanding_invoices: "outstanding",
  collection_rate: "collectionRate",
  cash_balance: "cashBalance",
  active_clients: "activeClients",
  active_engagements: "activeEngagements",
  fixed_asset_value: "fixedAssetValue",
  employee_utilization: "utilization",
  billable_hours: "billableHours",
  non_billable_hours: "nonBillableHours",
};
const overviewCardKeys = [
  ["revenue", "revenue"],
  ["expenses", "expenses"],
  ["gross_profit", "grossProfit"],
  ["net_profit", "netProfit"],
  ["outstanding_invoices", "outstanding"],
  ["collection_rate", "collectionRate"],
  ["cash_balance", "cashBalance"],
  ["active_clients", "activeClients"],
  ["active_engagements", "activeEngagements"],
  ["fixed_asset_value", "fixedAssetValue"],
  ["employee_utilization", "utilization"],
  ["billable_hours", "billableHours"],
  ["non_billable_hours", "nonBillableHours"],
] as const;

const chartColors = {
  revenue: "#38bdf8",
  expenses: "#fb7185",
  profit: "#34d399",
  cash: "#a78bfa",
};

function getDefaultRange(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now);
  if (preset === "month") start.setDate(1);
  else if (preset === "quarter") {
    const firstMonth = Math.floor(now.getMonth() / 3) * 3;
    start.setMonth(firstMonth, 1);
  } else start.setMonth(0, 1);
  return { start: start.toISOString().slice(0, 10), end };
}

function MetricCard({
  label,
  value,
  available,
  currency,
  unit,
  description,
}: {
  label: string;
  value: number | null | undefined;
  available: boolean;
  currency?: string | null;
  unit?: string | null;
  description?: string;
}) {
  const shown =
    !available || value === null || value === undefined
      ? "—"
      : currency
        ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
        : new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
  return (
    <article className="rounded-2xl border border-app bg-app-secondary p-4 shadow-sm">
      <p className="text-sm text-app-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-app-primary">
        {shown}
        {currency && available && value !== null && value !== undefined ? (
          <span className="ml-1 text-sm font-medium text-app-tertiary">{currency}</span>
        ) : null}
        {unit && available && value !== null && value !== undefined ? (
          <span className="ml-1 text-sm font-medium text-app-tertiary">{unit}</span>
        ) : null}
      </p>
      {!available && <p className="mt-2 text-xs text-app-tertiary">{description || "Source unavailable"}</p>}
      {available && value === null && description && (
        <p className="mt-2 text-xs text-app-tertiary">{description}</p>
      )}
    </article>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-app text-sm text-app-tertiary">
      {children}
    </div>
  );
}

export default function BusinessIntelligencePage() {
  const { t } = useTranslation();
  const { can, role } = usePermission();
  const allowedTabs = useMemo(
    () =>
      tabDefinitions.filter((tab) =>
        tab.modules.some((module) => can(module, "view")),
      ),
    [can],
  );
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [preset, setPreset] = useState<PeriodPreset>("year");
  const [range, setRange] = useState(() => getDefaultRange("year"));
  const [overview, setOverview] = useState<BIOverview | null>(null);
  const [dataStatus, setDataStatus] = useState<Awaited<
    ReturnType<typeof businessIntelligenceApi.getDataStatus>
  > | null>(null);
  const [panelData, setPanelData] = useState<Record<string, unknown> | null>(null);
  const [reports, setReports] = useState<BIReportList | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const canSeeAnyBI = allowedTabs.length > 0;
  const canSeePowerBI = [
    "super_admin",
    "associe_gerant",
    "directeur_bureau",
    "manageur",
    "responsable_admin_fin",
  ].includes(role || "");
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, statusResult] = await Promise.all([
        businessIntelligenceApi.getOverview(range.start, range.end),
        businessIntelligenceApi.getDataStatus(),
      ]);
      setOverview(overviewResult);
      setDataStatus(statusResult);
    } catch (cause) {
      setError(
        cause instanceof BusinessIntelligenceApiError && cause.status === 401
          ? t("businessIntelligence.backendLogin")
          : cause instanceof Error
            ? cause.message
            : "Unable to load analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, [range.end, range.start, t]);

  useEffect(() => {
    if (canSeeAnyBI) void loadOverview();
  }, [canSeeAnyBI, loadOverview]);

  useEffect(() => {
    if (activeTab === "overview" || activeTab === "powerbi" || activeTab === "status") {
      setPanelData(null);
      setPanelError(null);
      return;
    }
    let active = true;
    setPanelLoading(true);
    setPanelError(null);
    const loadPanel = async () => {
      try {
        let result: unknown;
        if (activeTab === "financial" || activeTab === "profitability") {
          result = await businessIntelligenceApi.getFinancial(range.start, range.end);
        } else if (activeTab === "clients") {
          result = await businessIntelligenceApi.getClients(range.start, range.end);
        } else if (activeTab === "engagements") {
          result = await businessIntelligenceApi.getEngagements();
        } else if (activeTab === "employees") {
          result = await businessIntelligenceApi.getEmployees();
        } else if (activeTab === "cash") {
          result = await businessIntelligenceApi.getCashFlow(range.start, range.end);
        } else if (activeTab === "stock") {
          result = await businessIntelligenceApi.getStock();
        } else {
          result = await businessIntelligenceApi.getExpenses(range.start, range.end);
        }
        if (active) setPanelData(result as Record<string, unknown>);
      } catch (cause) {
        if (active) {
          setPanelError(
            cause instanceof BusinessIntelligenceApiError && cause.status === 401
              ? t("businessIntelligence.backendLogin")
              : cause instanceof Error
                ? cause.message
                : "Unable to load this analytics section.",
          );
        }
      } finally {
        if (active) setPanelLoading(false);
      }
    };
    void loadPanel();
    return () => {
      active = false;
    };
  }, [activeTab, range.end, range.start, refreshSequence, t]);

  useEffect(() => {
    if (activeTab !== "powerbi") return;
    let active = true;
    setPanelLoading(true);
    setPanelError(null);
    void businessIntelligenceApi
      .getReports()
      .then((result) => {
        if (active) {
          setReports(result);
          setSelectedReportId(result.reports[0]?.id ?? null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setPanelError(
            cause instanceof Error ? cause.message : "Unable to load Power BI reports.",
          );
        }
      })
      .finally(() => {
        if (active) setPanelLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, refreshSequence]);

  const changePreset = (next: PeriodPreset) => {
    setPreset(next);
    if (next !== "custom") setRange(getDefaultRange(next));
  };

  const refresh = () => {
    setRefreshSequence((sequence) => sequence + 1);
    void loadOverview();
    if (activeTab === "status") {
      void businessIntelligenceApi
        .getDataStatus()
        .then(setDataStatus)
        .catch((cause: unknown) =>
          setPanelError(cause instanceof Error ? cause.message : "Refresh failed."),
        );
    }
  };

  const exportExcel = () => {
    if (!overview) return;
    const rows = Object.entries(overview.metrics).map(([key, metric]) => ({
      Metric: t(`businessIntelligence.${metricLabels[key] || key}`),
      Value: metric.available ? metric.value : null,
      Available: metric.available,
      Source: metric.source || "",
      Note: metric.reason || "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Overview");
    XLSX.writeFile(workbook, "pajes-business-intelligence.xlsx");
  };

  const shownTabs = allowedTabs.filter(
    (tab) => tab.key !== "powerbi" || (canSeePowerBI && can("factures", "view")),
  );

  if (!canSeeAnyBI) {
    return (
      <div className="rounded-2xl border border-app bg-app-secondary p-8 text-app-secondary">
        {t("businessIntelligence.noPermission")}
      </div>
    );
  }

  const metric = (key: string) => overview?.metrics[key];
  const dateControls = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-app-secondary">
        {t("businessIntelligence.period")}
        <select
          className="rounded-lg border border-app bg-app-secondary px-3 py-2 text-sm text-app-primary"
          value={preset}
          onChange={(event) => changePreset(event.target.value as PeriodPreset)}
        >
          {(["month", "quarter", "year", "custom"] as const).map((value) => (
            <option key={value} value={value}>{t(`businessIntelligence.${value === "custom" ? "customRange" : value}`)}</option>
          ))}
        </select>
      </label>
      {preset === "custom" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-app-secondary">
            {t("businessIntelligence.startDate")}
            <input
              type="date"
              className="rounded-lg border border-app bg-app-secondary px-3 py-2 text-sm text-app-primary"
              value={range.start}
              onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-app-secondary">
            {t("businessIntelligence.endDate")}
            <input
              type="date"
              className="rounded-lg border border-app bg-app-secondary px-3 py-2 text-sm text-app-primary"
              value={range.end}
              onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))}
            />
          </label>
        </>
      )}
      <button
        type="button"
        onClick={refresh}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {t("businessIntelligence.refresh")}
      </button>
      {overview && (
        <>
          <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-secondary hover:bg-app-tertiary">
            <Download className="h-4 w-4" /> {t("businessIntelligence.exportExcel")}
          </button>
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-app px-3 py-2 text-sm text-app-secondary hover:bg-app-tertiary">
            {t("businessIntelligence.exportPdf")}
          </button>
        </>
      )}
    </div>
  );

  const chartData = useMemo(() => {
    if (!overview?.charts.comparison_available) return [];
    const revenues = overview?.charts.revenue ?? [];
    const expenses = overview?.charts.expenses ?? [];
    const combined = new Map<string, { period: string; revenue?: number; expenses?: number }>();
    for (const point of revenues) {
      if (point.period) combined.set(point.period, { ...combined.get(point.period), period: point.period, revenue: point.value });
    }
    for (const point of expenses) {
      if (point.period) combined.set(point.period, { ...combined.get(point.period), period: point.period, expenses: point.value });
    }
    return [...combined.values()].sort((a, b) => a.period.localeCompare(b.period));
  }, [overview]);

  const renderPanel = () => {
    if (panelLoading) return <p className="py-16 text-center text-sm text-app-secondary">{t("common.loading")}</p>;
    if (panelError) return <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-500">{panelError}</div>;
    if (activeTab === "powerbi") {
      if (!reports?.configured) {
        return <div className="rounded-2xl border border-dashed border-app p-8 text-sm text-app-secondary">{t("businessIntelligence.powerbiUnconfigured")}</div>;
      }
      if (!selectedReportId) return <p className="text-sm text-app-secondary">{t("businessIntelligence.noData")}</p>;
      return (
        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm text-app-secondary">
            Report
            <select
              className="max-w-lg rounded-lg border border-app bg-app-secondary px-3 py-2 text-app-primary"
              value={selectedReportId}
              onChange={(event) => setSelectedReportId(event.target.value)}
            >
              {reports.reports.map((report) => <option key={report.id} value={report.id}>{report.id}</option>)}
            </select>
          </label>
          <PowerBIReportViewer reportId={selectedReportId} />
          <p className="text-xs text-app-tertiary">{t("businessIntelligence.powerbiSetup")}</p>
        </div>
      );
    }
    if (activeTab === "status") {
      const sources = dataStatus?.sources ?? overview?.sources ?? {};
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-app-secondary p-4 text-sm text-app-secondary">
            <p>{t("businessIntelligence.liveRefresh")}</p>
            <p className="mt-1 text-xs text-app-tertiary">
              {t("businessIntelligence.lastChecked")}: {dataStatus?.checked_at ? new Date(dataStatus.checked_at).toLocaleString() : "—"}
            </p>
            <p className="mt-1 text-xs text-app-tertiary">{t("businessIntelligence.powerbiSetup")}</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-app">
            <table className="w-full text-left text-sm">
              <thead className="bg-app-tertiary text-app-secondary"><tr><th className="px-4 py-3">{t("businessIntelligence.source")}</th><th className="px-4 py-3">{t("common.status")}</th><th className="px-4 py-3">Table</th></tr></thead>
              <tbody>
                {Object.entries(sources).map(([key, source]) => (
                  <tr key={key} className="border-t border-app">
                    <td className="px-4 py-3 text-app-primary">{key}</td>
                    <td className="px-4 py-3 text-app-secondary">{source.available ? t("businessIntelligence.available") : t("businessIntelligence.unavailable")}</td>
                    <td className="px-4 py-3 text-app-tertiary">{source.table || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (activeTab === "financial" || activeTab === "profitability") {
      const financialMetrics = overview?.metrics;
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(["revenue", "expenses", "gross_profit", "net_profit", "outstanding_invoices", "collection_rate"] as const).map((key) => {
              const item = financialMetrics?.[key];
              return (
                <MetricCard
                  key={key}
                  label={t(`businessIntelligence.${metricLabels[key]}`)}
                  value={item?.value}
                  available={Boolean(item?.available)}
                  currency={item?.currency || null}
                  unit={item?.unit || null}
                  description={item?.reason}
                />
              );
            })}
          </div>
          {chartData.length ? (
            <div className="h-80 rounded-xl border border-app bg-app-secondary p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="revenue" name={t("businessIntelligence.revenue")} stroke={chartColors.revenue} connectNulls />
                  <Line dataKey="expenses" name={t("businessIntelligence.expenses")} stroke={chartColors.expenses} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart>{overview?.charts.comparison_reason || t("businessIntelligence.noData")}</EmptyChart>}
        </div>
      );
    }
    if (activeTab === "clients") {
      const result = panelData as { available?: boolean; reason?: string; items?: Array<{ client: string; label?: string; revenue: number; currency?: string | null }> } | null;
      return result?.available && result.items?.length ? (
        <div className="h-80 rounded-xl border border-app bg-app-secondary p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.items} layout="vertical" margin={{ left: 18, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="label" width={130} />
              <Tooltip />
              <Bar dataKey="revenue" name={t("businessIntelligence.revenue")} fill={chartColors.revenue} radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="rounded-xl border border-dashed border-app p-8 text-sm text-app-secondary">{result?.reason || t("businessIntelligence.noData")}</div>;
    }
    if (activeTab === "engagements") {
      const result = panelData as { available?: boolean; items?: Array<{ status: string; count: number }> } | null;
      return result?.available && result.items?.length ? (
        <div className="h-80 rounded-xl border border-app bg-app-secondary p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.items}>
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name={t("businessIntelligence.activeEngagements")} fill={chartColors.profit} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart>{t("businessIntelligence.noData")}</EmptyChart>;
    }
    if (activeTab === "employees") {
      const result = panelData as { reason?: string } | null;
      return <div className="rounded-xl border border-dashed border-app p-8 text-sm text-app-secondary">{result?.reason || t("businessIntelligence.sourceMissing")}</div>;
    }
    if (activeTab === "cash") {
      const result = panelData as { available?: boolean; items?: Array<{ period: string | null; inflow: number; outflow: number; net: number }> } | null;
      return result?.available && result.items?.length ? (
        <div className="h-80 rounded-xl border border-app bg-app-secondary p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.items}>
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="inflow" name="Inflow" stroke={chartColors.profit} />
              <Line dataKey="outflow" name="Outflow" stroke={chartColors.expenses} />
              <Line dataKey="net" name="Net" stroke={chartColors.cash} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart>{t("businessIntelligence.noData")}</EmptyChart>;
    }
    if (activeTab === "stock") {
      const result = panelData as { available?: boolean; valuation?: number | null; low_stock_count?: number | null; items?: Array<{ name: string; value: number }> } | null;
      if (!result?.available) return <EmptyChart>{t("businessIntelligence.sourceMissing")}</EmptyChart>;
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Stock valuation" value={result.valuation} available={result.valuation !== null} />
            <MetricCard label="Low / out-of-stock items" value={result.low_stock_count} available={result.low_stock_count !== null} />
          </div>
          {result.items?.length ? (
            <div className="h-80 rounded-xl border border-app bg-app-secondary p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.items}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Value" fill={chartColors.cash} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart>{t("businessIntelligence.noData")}</EmptyChart>}
        </div>
      );
    }
    if (activeTab === "expenses") {
      const result = panelData as { available?: boolean; total?: { available: boolean; value: number | null; currency?: string | null }; categories?: Array<{ category: string; value: number }> } | null;
      return result?.available && result.categories?.length ? (
        <div className="space-y-4">
          <MetricCard label={t("businessIntelligence.expenses")} value={result.total?.value} available={Boolean(result.total?.available)} currency={result.total?.currency || null} />
          <div className="h-80 rounded-xl border border-app bg-app-secondary p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.categories}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name={t("businessIntelligence.expenses")} fill={chartColors.expenses} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : <EmptyChart>{t("businessIntelligence.noData")}</EmptyChart>;
    }
    if (activeTab === "custom") {
      const metrics = overview?.metrics ?? {};
      return (
        <div className="overflow-x-auto rounded-xl border border-app">
          <table className="w-full text-left text-sm">
            <thead className="bg-app-tertiary text-app-secondary"><tr><th className="px-4 py-3">Metric</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Source</th></tr></thead>
            <tbody>{Object.entries(metrics).map(([key, value]) => (
              <tr key={key} className="border-t border-app">
                <td className="px-4 py-3 text-app-primary">{t(`businessIntelligence.${metricLabels[key] || key}`)}</td>
                <td className="px-4 py-3 text-app-secondary">{value.available ? value.value ?? "—" : t("businessIntelligence.unavailable")}</td>
                <td className="px-4 py-3 text-app-tertiary">{value.source || value.reason || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
    }
    return null;
  };

  const tabIcon: Partial<Record<TabKey, typeof BarChart3>> = {
    overview: BarChart3,
    financial: CircleDollarSign,
    profitability: CircleDollarSign,
    clients: Building2,
    engagements: Briefcase,
    employees: Users,
    cash: Wallet,
    stock: CalendarRange,
    expenses: CircleDollarSign,
  };

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-500">
            <BarChart3 className="h-4 w-4" /> PAJES analytics
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-app-primary sm:text-3xl">
            {t("businessIntelligence.title")}
          </h1>
          <p className="mt-1 text-sm text-app-secondary">{t("businessIntelligence.subtitle")}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-app px-3 py-2 text-xs text-app-secondary">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {t("businessIntelligence.liveRefresh")}
        </div>
      </header>

      <section className="rounded-2xl border border-app bg-app-secondary p-4">
        {dateControls}
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-2" aria-label={t("businessIntelligence.title")}>
        {shownTabs.map((tab) => {
          const Icon = tabIcon[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                activeTab === tab.key
                  ? "bg-primary-500 text-white"
                  : "border border-app bg-app-secondary text-app-secondary hover:bg-app-tertiary"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {t(`businessIntelligence.tabs.${tab.key}`)}
            </button>
          );
        })}
      </nav>

      {error && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      {loading && !overview ? (
        <div className="py-16 text-center text-sm text-app-secondary">{t("common.loading")}</div>
      ) : (
        <>
          {activeTab === "overview" && overview && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {overviewCardKeys.map(([key, label]) => {
                  const item = metric(key);
                  return (
                    <MetricCard
                      key={key}
                      label={t(`businessIntelligence.${label}`)}
                      value={item?.value}
                      available={Boolean(item?.available)}
                      currency={item?.currency || null}
                      unit={item?.unit || null}
                      description={item?.reason}
                    />
                  );
                })}
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <article className="rounded-2xl border border-app bg-app-secondary p-4">
                  <h2 className="mb-4 font-semibold text-app-primary">Revenue and expenses</h2>
                  {chartData.length ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line dataKey="revenue" name={t("businessIntelligence.revenue")} stroke={chartColors.revenue} connectNulls />
                          <Line dataKey="expenses" name={t("businessIntelligence.expenses")} stroke={chartColors.expenses} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyChart>{t("businessIntelligence.noData")}</EmptyChart>}
                </article>
                <article className="rounded-2xl border border-app bg-app-secondary p-4">
                  <h2 className="mb-4 font-semibold text-app-primary">{t("businessIntelligence.insights")}</h2>
                  <div className="space-y-3">
                    {Object.entries(overview.sources)
                      .filter(([, source]) => !source.available)
                      .map(([source]) => (
                        <div key={source} className="rounded-xl bg-app-tertiary p-3 text-sm">
                          <p className="font-medium text-app-primary">{source}</p>
                          <p className="mt-1 text-xs text-app-secondary">{t("businessIntelligence.sourceMissing")}</p>
                        </div>
                      ))}
                    {Object.entries(overview.metrics)
                      .filter(([, item]) => Boolean(item.reason) && item.available)
                      .map(([key, item]) => (
                        <div key={key} className="rounded-xl bg-app-tertiary p-3 text-sm">
                          <p className="font-medium text-app-primary">{t(`businessIntelligence.${metricLabels[key] || key}`)}</p>
                          <p className="mt-1 text-xs text-app-secondary">{item.reason}</p>
                        </div>
                      ))}
                    {Object.values(overview.sources).every((source) => source.available) &&
                      Object.values(overview.metrics).every((item) => !item.reason) && (
                        <p className="text-sm text-app-secondary">{t("businessIntelligence.noData")}</p>
                      )}
                  </div>
                </article>
              </section>
            </div>
          )}
          {activeTab !== "overview" && renderPanel()}
        </>
      )}
    </main>
  );
}
