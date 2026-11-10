// src/pages/NoteDeFrais/NoteDeFraisDashboard.tsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import { NoteDeFraisForm } from "./NoteDeFraisForm";
import { NoteDeFraisList } from "./NoteDeFraisList";
import { addNotification } from "../../lib/notifications";

// ==================== STYLES ====================
const Container = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h1 {
    color: #e2e8f0;
    font-size: 1.5rem;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  button {
    background: transparent;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    color: #94a3b8;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: #1e293b;
      color: #e2e8f0;
    }
    &.active {
      background: #1e293b;
      color: #4facfe;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div<{ $color?: string }>`
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  border-left: 4px solid ${({ $color }) => $color || "#4facfe"};
  .value {
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
  }
  .label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }
`;

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
      const { data: reports, error } = await supabase
        .from("expense_reports")
        .select("status, total_ht");
      if (error) throw error;

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

  const renderStats = () => (
    <StatsGrid>
      <StatCard>
        <div className="value">{stats.count}</div>
        <div className="label">Nombre de notes</div>
      </StatCard>
      <StatCard>
        <div className="value">{stats.total_ht.toFixed(0)} FCFA</div>
        <div className="label">Total HT</div>
      </StatCard>
      {Object.entries(stats.by_status).map(([status, total]) => {
        const config = {
          brouillon: { label: "Brouillon", color: "#475569" },
          soumis: { label: "Soumis", color: "#fcd34d" },
          valide: { label: "Validé", color: "#86efac" },
          rejete: { label: "Rejeté", color: "#fca5a5" },
          rembourse: { label: "Remboursé", color: "#94a3b8" },
        }[status] || { label: status, color: "#4facfe" };
        return (
          <StatCard key={status} $color={config.color}>
            <div className="value">{total.toFixed(0)} FCFA</div>
            <div className="label">{config.label}</div>
          </StatCard>
        );
      })}
    </StatsGrid>
  );

  return (
    <Container>
      <Header>
        <h1>📋 Notes de frais</h1>
      </Header>

      <Tabs>
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          Tableau de bord
        </button>
        <button
          className={activeTab === "list" ? "active" : ""}
          onClick={() => setActiveTab("list")}
        >
          Liste des notes
        </button>
        <button
          className={activeTab === "form" ? "active" : ""}
          onClick={() => {
            setEditingId(undefined);
            setActiveTab("form");
          }}
        >
          {editingId ? "Modifier" : "Nouvelle note"}
        </button>
      </Tabs>

      {activeTab === "dashboard" && (
        <>
          {loadingStats ? (
            <div style={{ color: "#94a3b8" }}>
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
    </Container>
  );
};
