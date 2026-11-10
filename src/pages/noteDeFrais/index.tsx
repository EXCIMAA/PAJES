// src/pages/noteDeFrais/index.tsx
import React, { useState } from "react";
import styled from "styled-components";
import { NoteDeFraisList } from "./NoteDeFraisList";
import { NoteDeFraisForm } from "./NoteDeFraisForm";
import { NoteDeFraisDashboard } from "./NoteDeFraisDashboard";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

// ==================== STYLES ====================
const Container = styled.div`
  background: #0f172a;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #1e293b;
  color: #e2e8f0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #1e293b;
`;

const HeaderTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  i {
    color: #4facfe;
  }
`;

const Description = styled.p`
  color: #94a3b8;
  font-size: 14px;
  margin: 12px 0 20px;
  line-height: 1.6;
  i {
    color: #4facfe;
    margin-right: 6px;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #1e293b;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-weight: 500;
  font-size: 14px;
  color: ${({ $active }) => ($active ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  border-bottom: 3px solid
    ${({ $active }) => ($active ? "#4facfe" : "transparent")};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    color: #e2e8f0;
    background: #1e293b;
  }
  i {
    font-size: 16px;
  }
`;

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

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-receipt"></i> Notes de frais
        </HeaderTitle>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Saisissez vos notes de frais, suivez leur validation et consultez les
        statistiques.
      </Description>

      <TabsContainer>
        <TabButton
          $active={activeTab === "liste"}
          onClick={() => setActiveTab("liste")}
        >
          <i className="fas fa-list"></i> Mes notes
        </TabButton>
        {/* ✅ WRAPPED: "Nouvelle note" tab requires create permission */}
        <ProtectedAction module="notes_frais" action="create">
          <TabButton
            $active={activeTab === "nouveau"}
            onClick={() => {
              setSelectedReportId(null);
              setActiveTab("nouveau");
            }}
          >
            <i className="fas fa-plus"></i> Nouvelle note
          </TabButton>
        </ProtectedAction>
        <TabButton
          $active={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
        >
          <i className="fas fa-chart-pie"></i> Tableau de bord
        </TabButton>
      </TabsContainer>

      {activeTab === "liste" && <NoteDeFraisList onEdit={handleEdit} onRefresh={handleRefresh} />}
      {activeTab === "nouveau" && (
        <NoteDeFraisForm
          reportId={selectedReportId || undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
      {activeTab === "dashboard" && <NoteDeFraisDashboard />}
    </Container>
  );
};

export default NoteDeFrais;
