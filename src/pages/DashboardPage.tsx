import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { businessIntelligenceApi } from "../api/businessIntelligence";
import { useAuth } from "../contexts/AuthContext";
import type {
  DashboardData,
  DashboardMetric,
} from "../api/businessIntelligence";
import { StatCard } from "../components/ui/StatCard";
import { QuickActions } from "../components/dashboard/QuickActions";
import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import {
  RevenueChart,
  CategoryChart,
  FindingsTrendChart,
} from "../components/dashboard/DashboardCharts";
import { TopClientsTable } from "../components/dashboard/TopClientsTable";
import { abbreviateNumber } from "../lib/utils";

const kpiIcons: Record<string, string> = {
  "active-engagements": "bar-chart",
  "open-review-notes": "alert-triangle",
  "open-findings": "search",
  "active-clients": "briefcase",
  "inventory-value": "package",
  "asset-value": "landmark",
  "open-expenses": "receipt",
};

function metricValue(metric: DashboardMetric | undefined, monetary = false) {
  if (!metric?.available || metric.value === null || metric.value === undefined) {
    return "—";
  }
  return monetary ? abbreviateNumber(metric.value) : metric.value;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDemo } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (isDemo) {
      setDashboard(null);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    businessIntelligenceApi
      .getDashboard()
      .then((result) => {
        if (active) setDashboard(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : t("common.error"),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isDemo, t]);

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case "new-engagement":
        navigate("/engagements");
        break;
      case "new-finding":
        navigate("/findings");
        break;
      case "stock-in":
        navigate("/stock");
        break;
      case "request-leave":
        navigate("/leave");
        break;
      case "upload-paper":
        navigate("/upload");
        break;
      case "new-expense":
        navigate("/note-de-frais");
        break;
      case "new-collaborateur":
        navigate("/collaborateurs");
        break;
      case "new-invoice":
        navigate("/factures");
        break;
      default:
        console.warn("Action non reconnue :", actionId);
    }
  };

  const kpiData = [
    {
      id: "active-engagements",
      label: t("dashboard.activeEngagements"),
      value: metricValue(dashboard?.metrics.active_engagements),
      color: "primary" as const,
    },
    {
      id: "open-review-notes",
      label: t("dashboard.openReviewNotes"),
      value: metricValue(dashboard?.metrics.open_review_notes),
      color: "warning" as const,
    },
    {
      id: "open-findings",
      label: t("dashboard.openFindings"),
      value: metricValue(dashboard?.metrics.open_findings),
      color: "error" as const,
    },
    {
      id: "active-clients",
      label: t("dashboard.activeClients"),
      value: metricValue(dashboard?.metrics.active_clients),
      color: "royal" as const,
    },
    {
      id: "inventory-value",
      label: t("dashboard.inventoryValue"),
      value: metricValue(dashboard?.metrics.inventory_value, true),
      color: "emerald" as const,
    },
    {
      id: "asset-value",
      label: t("dashboard.assetValue"),
      value: metricValue(dashboard?.metrics.asset_value, true),
      color: "cyan" as const,
    },
    {
      id: "open-expenses",
      label: t("dashboard.openExpenses"),
      value: metricValue(dashboard?.metrics.open_expenses),
      color: "primary" as const,
    },
  ];

  return (
    <div className="page-container">
      <section className="relative mb-7 overflow-hidden rounded-2xl border border-primary-200/70 bg-gradient-to-br from-[#eaf2ff] via-white to-[#f2f6ff] p-5 shadow-sm dark:border-primary-900/60 dark:from-primary-950/70 dark:via-slate-900 dark:to-slate-900 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-primary-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/75 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-800 dark:bg-slate-900/60 dark:text-primary-300">
              <Sparkles className="h-3.5 w-3.5" />
              Pilotage du cabinet
            </div>
            <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {t("dashboard.welcome")}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Retrouvez vos indicateurs clés, vos priorités et les dernières activités de votre équipe au même endroit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              <CalendarDays className="h-4 w-4 text-primary-600" />
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}
            </div>
            <button onClick={() => navigate("/reports")} className="btn-primary btn-md rounded-xl shadow-lg shadow-primary-600/20">
              Voir les rapports <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="card border border-error-500/30 p-4 mb-6 text-sm text-error-700 dark:text-error-300"
        >
          {t("common.error")}: {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-app-secondary mb-6">{t("common.loading")}</p>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="page-eyebrow">Vue synthétique</p>
          <h2 className="mt-1 text-lg font-bold text-app-primary">Les chiffres du cabinet</h2>
        </div>
        <span className="hidden text-xs text-app-tertiary sm:block">Données actualisées automatiquement</span>
      </div>
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {kpiData.map((kpi) => (
          <StatCard
            key={kpi.id}
            {...kpi}
            icon={kpiIcons[kpi.id] || "bar-chart"}
          />
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={dashboard?.charts.engagements ?? []} />
        </div>
        <FindingsTrendChart data={dashboard?.charts.findings ?? []} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <CategoryChart data={dashboard?.charts.review_notes ?? []} />
        <TopClientsTable
          data={dashboard?.top_clients ?? []}
          loading={loading}
        />
        <QuickActions onAction={handleQuickAction} className="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-app-primary">
              {t("dashboard.recentActivities")}
            </h3>
            <button
              onClick={() => navigate("/notifications")}
              className="text-xs font-medium text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
            >
              {t("common.viewAll")}
            </button>
          </div>
          {dashboard?.activities.length ? (
            <div className="space-y-3">
              {dashboard.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 shrink-0" />
                  <div>
                    <p className="text-app-primary">{activity.title}</p>
                    <p className="text-xs text-app-secondary truncate">
                      {activity.message}
                    </p>
                    <p className="text-2xs text-app-tertiary">
                      {activity.date
                        ? new Date(activity.date).toLocaleDateString("fr-FR")
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-app-secondary py-8 text-center">
              {t("dashboard.noRecentActivities")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
