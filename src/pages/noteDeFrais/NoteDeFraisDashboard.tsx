// src/pages/noteDeFrais/NoteDeFraisDashboard.tsx
import React, { useState, useEffect } from "react";
import { ClipboardList, List, FilePlus2, Loader2 } from "lucide-react";
import { dbApi } from "../../lib/apiClient";
import { NoteDeFraisForm } from "./NoteDeFraisForm";
import { NoteDeFraisList } from "./NoteDeFraisList";
import { addNotification } from "../../lib/notifications";
import { PageHeader } from "../../components/ui/PageHeader";
import { cn } from "../../lib/utils";

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  brouillon: { label: "Brouillon", badge: "badge badge-neutral" },
  soumis: { label: "Soumis", badge: "badge badge-warning" },
  valide: { label: "Validé", badge: "badge badge-success" },
  rejete: { label: "Rejeté", badge: "badge badge-error" },
  rembourse: { label: "Remboursé", badge: "badge badge-neutral" },
};

// ==================== COMPOSANT PRINCIPAL ====================
export const NoteDeFraisDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "list" | "form">(
    "dashboard",
  );
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<{
    count: number;
    total_ht: number;
    by_status: Record<string, number>;
  }>({ count: 0, total_ht: 0, by_status: {} });
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const reports = await dbApi.list<any>("expense_reports", {
        limit: 1000,
      });

      const by_status: Record<string, number> = {};
      let total_ht = 0;
      reports.forEach((r: any) => {
        by_status[r.status] = (by_status[r.status] || 0) + r.total_ht;
        total_ht += r.total_ht;
      });

      setStats({
        count: reports.length,
        total_ht,
        by_status,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setActiveTab("form");
  };

  const handleFormSuccess = () => {
    setEditingId(undefined);
    setActiveTab("list");
    loadStats();
    void addNotification({
      title: "Note de frais enregistrée",
      message: "La note a été sauvegardée avec succès.",
      type: "expense",
    });
  };

  const handleCancelForm = () => {
    setEditingId(undefined);
    setActiveTab("list");
  };

  const tabs = [
    { id: "dashboard" as const, label: "Tableau de bord", icon: ClipboardList },
    { id: "list" as const, label: "Liste des notes", icon: List },
    { id: "form" as const, label: editingId ? "Modifier" : "Nouvelle note", icon: FilePlus2 },
  ];

  const renderStats = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
      <div className="card p-4 text-center border-l-4 border-l-primary-500">
        <div className="text-2xl font-bold text-app-primary">{stats.count}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-app-tertiary">
          Nombre de notes
        </div>
      </div>
      <div className="card p-4 text-center border-l-4 border-l-primary-500">
        <div className="text-2xl font-bold text-app-primary">
          {stats.total_ht.toFixed(0)} FCFA
        </div>
        <div className="mt-1 text-xs uppercase tracking-wide text-app-tertiary">
          Total HT
        </div>
      </div>
      {Object.entries(stats.by_status).map(([status, total]) => {
        const config =
          STATUS_CONFIG[status] || { label: status, badge: "badge badge-primary" };
        return (
          <div key={status} className="card p-4 text-center border-l-4 border-l-primary-500">
            <div className="text-2xl font-bold text-app-primary">
              {total.toFixed(0)} FCFA
            </div>
            <div className="mt-1">
              <span className={config.badge}>{config.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Notes de frais" description="Suivi et statistiques des notes de frais." />

      <div className="card p-5">
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "form") {
                    setEditingId(undefined);
                  }
                  setActiveTab(tab.id);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-app-tertiary text-primary-500"
                    : "text-app-tertiary hover:bg-app-tertiary hover:text-app-primary",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "dashboard" && (
          <>
            {loadingStats ? (
              <div className="flex items-center gap-2 py-8 text-app-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des statistiques...
              </div>
            ) : (
              renderStats()
            )}
          </>
        )}

        {activeTab === "list" && (
          <NoteDeFraisList onEdit={handleEdit} onRefresh={loadStats} />
        )}

        {activeTab === "form" && (
          <NoteDeFraisForm
            reportId={editingId}
            onSuccess={handleFormSuccess}
            onCancel={handleCancelForm}
          />
        )}
      </div>
    </div>
  );
};
