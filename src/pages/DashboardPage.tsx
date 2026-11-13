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
      <div className="mb-7 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-app-primary tracking-tight">
          {t("navigation.dashboard")}
        </h1>
        <p className="text-sm text-app-secondary mt-1.5">
          {t("dashboard.welcome")}
        </p>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
        {kpiData.map((kpi) => (
          <StatCard
            key={kpi.id}
            {...kpi}
            icon={kpiIcons[kpi.id] || "bar-chart"}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <RevenueChart data={dashboard?.charts.engagements ?? []} />
        </div>
        <FindingsTrendChart data={dashboard?.charts.findings ?? []} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
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
