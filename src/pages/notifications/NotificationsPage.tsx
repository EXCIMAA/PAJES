// src/pages/notifications/NotificationsPage.tsx

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CalendarDays,
  Target,
  Users,
  Trash2,
  Check,
  Building2,
  Receipt,
  Package,
  Landmark,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { cn, formatRelativeTime } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm, notify } from "../../contexts/NotificationContext";
import { notificationsApi } from "../../api/notifications";
import type { Notification } from "../../types";

const REFRESH_INTERVAL_MS = 30_000;

// ==================== ICÔNES ET COULEURS ====================

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  assignment: Target,
  alert: AlertTriangle,
  leave: CalendarDays,
  document: FileText,
  engagement: Target,
  team: Users,
  client: Building2,
  invoice: Receipt,
  stock: Package,
  asset: Landmark,
  report: FileSpreadsheet,
  review_note: FileText,
  working_paper: FileText,
  finding: AlertTriangle,
  expense: Receipt,
};

const typeColors: Record<string, string> = {
  assignment: "text-royal-500 bg-royal-50 dark:bg-royal-950/40",
  alert: "text-red-500 bg-red-50 dark:bg-red-950/40",
  leave: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
  document: "text-royal-500 bg-royal-50 dark:bg-royal-950/40",
  engagement: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
  team: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40",
  client: "text-slate-500 bg-slate-100 dark:bg-slate-800",
  invoice: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
  stock: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
  asset: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40",
  report: "text-royal-500 bg-royal-50 dark:bg-royal-950/40",
  review_note: "text-violet-500 bg-violet-50 dark:bg-violet-950/40",
  working_paper: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
  finding: "text-red-500 bg-red-50 dark:bg-red-950/40",
  expense: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40",
};

const typeLabels: Record<string, string> = {
  all: "Toutes",
  assignment: "Assignations",
  alert: "Alertes",
  leave: "Congés",
  document: "Documents",
  engagement: "Missions",
  team: "Équipe",
  client: "Clients",
  invoice: "Factures",
  stock: "Stocks",
  asset: "Immobilisations",
  report: "Rapports",
  review_note: "Notes de revue",
  working_paper: "Documents de travail",
  finding: "Constats",
  expense: "Notes de frais",
};

export function NotificationsPage() {
  const { user, isDemo } = useAuth();
  const confirm = useConfirm();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!user?.id || isDemo) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
      setError(null);
    } catch (err: unknown) {
      console.error("Erreur chargement notifications:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [isDemo, user?.id]);

  useEffect(() => {
    void fetchNotifications(true);
    const intervalId = window.setInterval(
      () => void fetchNotifications(),
      REFRESH_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      const updated = await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? updated : n)),
      );
    } catch (err) {
      console.error("Erreur marquage lu:", err);
      notify.error("Impossible de marquer la notification comme lue.");
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      notify.success("Toutes les notifications ont été marquées comme lues.");
    } catch (err) {
      console.error("Erreur tout marquer lu:", err);
      notify.error("Erreur lors de la mise à jour des notifications.");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Supprimer la notification ?",
      message: "Cette notification sera définitivement retirée de votre centre de notifications.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      notify.success("Notification supprimée.");
    } catch (err) {
      console.error("Erreur suppression:", err);
      notify.error("Impossible de supprimer cette notification.");
    }
  };

  const filtered = notifications.filter(
    (n) => typeFilter === "all" || n.type === typeFilter,
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 w-full bg-slate-200/70 dark:bg-slate-800/50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-red-900 dark:text-red-200">
            Erreur de chargement
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => void fetchNotifications(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`}
        actions={
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-40 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Tout marquer lu</span>
          </button>
        }
      />

      {/* Filtres par catégorie */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {Object.keys(typeLabels).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
              typeFilter === t
                ? "bg-royal-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700",
            )}
          >
            {typeLabels[t]}
          </button>
        ))}
      </div>

      {/* Liste des notifications */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Bell className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Aucune notification
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {notifications.length === 0
              ? "Vous êtes à jour ! Aucune nouvelle notification pour le moment."
              : "Aucune notification ne correspond à ce filtre sélectionné."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((notification) => {
            const Icon = typeIcons[notification.type] ?? Bell;
            const colorClass =
              typeColors[notification.type] ?? "text-slate-500 bg-slate-100 dark:bg-slate-800";

            return (
              <div
                key={notification.id}
                onClick={() => markRead(notification.id)}
                className={cn(
                  "p-4 rounded-xl border flex items-start gap-4 group cursor-pointer transition-all duration-200",
                  !notification.read
                    ? "border-royal-200 dark:border-royal-900/60 bg-royal-50/40 dark:bg-royal-950/20 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    colorClass,
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        !notification.read
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-300",
                      )}
                    >
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-royal-600 dark:bg-royal-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                    {notification.message}
                  </p>
                  <span className="mt-1.5 inline-block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  {!notification.read && (
                    <button
                      type="button"
                      title="Marquer comme lu"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(notification.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-royal-600 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="p-1.5 rounded-lg opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
