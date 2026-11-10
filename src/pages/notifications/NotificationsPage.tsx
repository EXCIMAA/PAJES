// src/pages/notifications/NotificationsPage.tsx

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { cn, formatRelativeTime } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import type { Notification } from "../../types";

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
  assignment: "text-primary-400 bg-primary-500/10",
  alert: "text-error-400 bg-error-500/10",
  leave: "text-warning-400 bg-warning-500/10",
  document: "text-royal-400 bg-royal-500/10",
  engagement: "text-emerald-400 bg-emerald-500/10",
  team: "text-cyan-400 bg-cyan-500/10",
  client: "text-slate-400 bg-slate-500/10",
  invoice: "text-amber-400 bg-amber-500/10",
  stock: "text-emerald-400 bg-emerald-500/10",
  asset: "text-cyan-400 bg-cyan-500/10",
  report: "text-royal-400 bg-royal-500/10",
  review_note: "text-violet-400 bg-violet-500/10",
  working_paper: "text-emerald-400 bg-emerald-500/10",
  finding: "text-error-400 bg-error-500/10",
  expense: "text-yellow-400 bg-yellow-500/10",
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

// ==================== COMPOSANT ====================

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchNotifications = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Erreur chargement notifications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // === SOUSCRIPTION EN TEMPS RÉEL ===
  useEffect(() => {
    let channel: any;
    let mounted = true;

    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      await fetchNotifications();

      // 1. Créer le canal
      // 2. Ajouter les listeners (.on)
      // 3. Appeler .subscribe() ENFIN
      channel = supabase
        .channel("notifications_changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!mounted) return;
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!mounted) return;
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n)),
            );
          },
        )
        .subscribe();
    };

    init();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ===== GESTIONNAIRES =====
  const markRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("Erreur marquage lu:", err);
    }
  };

  const markAllRead = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Erreur tout marquer lu:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette notification ?")) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  const filtered = notifications.filter(
    (n) => typeFilter === "all" || n.type === typeFilter,
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-error-500">Erreur : {error}</p>
        <button
          onClick={fetchNotifications}
          className="btn-secondary btn-sm mt-4"
        >
          Réessayer
        </button>
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
            className="btn-secondary btn-md gap-1.5"
            disabled={unreadCount === 0}
          >
            <CheckCircle2 className="w-4 h-4" />
            Tout marquer lu
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Object.keys(typeLabels).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap",
              typeFilter === t
                ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                : "text-slate-400 hover:bg-slate-700/40",
            )}
          >
            {typeLabels[t]}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {notifications.length === 0
              ? "Aucune notification pour le moment."
              : "Aucune notification ne correspond à ce filtre."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const Icon = typeIcons[notification.type] ?? Bell;
            const colorClass =
              typeColors[notification.type] ?? "text-slate-400 bg-slate-500/10";

            return (
              <div
                key={notification.id}
                className={cn(
                  "card-hover p-4 flex items-start gap-4 group cursor-pointer",
                  !notification.read &&
                    "border-primary-500/20 bg-primary-500/5",
                )}
                onClick={() => markRead(notification.id)}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    colorClass,
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {notification.message}
                  </p>
                  <span className="text-2xs text-slate-500">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(notification.id);
                      }}
                      className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-primary-300"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700/50 text-slate-400 hover:text-error-400"
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
