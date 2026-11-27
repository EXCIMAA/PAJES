// src/pages/noteDeFrais/index.tsx
import React, { useState } from "react";
import { List, Plus, PieChart, Info } from "lucide-react";
import { NoteDeFraisList } from "./NoteDeFraisList";
import { NoteDeFraisForm } from "./NoteDeFraisForm";
import { NoteDeFraisDashboard } from "./NoteDeFraisDashboard";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED
import { PageHeader } from "../../components/ui/PageHeader";
import { cn } from "../../lib/utils";

// ==================== COMPOSANT PRINCIPAL ====================
const NoteDeFrais: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"liste" | "nouveau" | "dashboard">(
    "liste",
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setSelectedReportId(id);
    setActiveTab("nouveau");
  };

  const handleSuccess = () => {
    setSelectedReportId(null);
    setActiveTab("liste");
  };

  const handleCancel = () => {
    setSelectedReportId(null);
    setActiveTab("liste");
  };

  const handleRefresh = () => {
    // The list refreshes itself after local actions; no extra dashboard state needed here.
  };

  const tabs = [
    { id: "liste" as const, label: "Mes notes", icon: List },
    { id: "dashboard" as const, label: "Tableau de bord", icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes de frais"
        description="Saisissez vos notes de frais, suivez leur validation et consultez les statistiques."
      />

      <div className="card p-5">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b-2 border-app mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-[3px] transition-colors",
                  active
                    ? "border-primary-500 text-primary-500"
                    : "border-transparent text-app-tertiary hover:text-app-primary hover:bg-app-tertiary",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
          {/* ✅ WRAPPED: "Nouvelle note" tab requires create permission */}
          <ProtectedAction module="notes_frais" action="create">
            <button
              onClick={() => {
                setSelectedReportId(null);
                setActiveTab("nouveau");
              }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-[3px] transition-colors",
                activeTab === "nouveau"
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-app-tertiary hover:text-app-primary hover:bg-app-tertiary",
              )}
            >
              <Plus className="h-4 w-4" />
              Nouvelle note
            </button>
          </ProtectedAction>
        </div>

        <div className="flex items-start gap-2 mb-5 text-sm text-app-secondary">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary-500" />
          <p className="leading-relaxed">
            Saisissez vos notes de frais, suivez leur validation et consultez
            les statistiques.
          </p>
        </div>

        {activeTab === "liste" && <NoteDeFraisList onEdit={handleEdit} onRefresh={handleRefresh} />}
        {activeTab === "nouveau" && (
          <NoteDeFraisForm
            reportId={selectedReportId || undefined}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
        {activeTab === "dashboard" && <NoteDeFraisDashboard />}
      </div>
    </div>
  );
};

export default NoteDeFrais;
