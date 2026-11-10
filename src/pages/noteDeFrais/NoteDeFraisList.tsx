// src/pages/NoteDeFrais/NoteDeFraisList.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import { addNotification } from "../../lib/notifications";
import { format } from "date-fns";

interface ExpenseReport {
  id: string;
  reference: string;
  collaborateur_name: string;
  mission_id: string;
  client_id: string;
  status: string;
  total_ht: number;
  total_ttc: number;
  net_a_payer: number;
  created_at: string;
  date_debut: string;
  date_fin: string;
}

interface Props {
  onEdit: (id: string) => void;
  onRefresh: () => void;
}

const TableWrapper = styled.div`
  overflow-x: auto;
  margin: 16px 0;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #1e293b;
    text-align: left;
    vertical-align: middle;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  ${({ status }) => {
    switch (status) {
      case "brouillon":
        return "background: #475569; color: #94a3b8;";
      case "soumis":
        return "background: #713f12; color: #fcd34d;";
      case "valide":
        return "background: #14532d; color: #86efac;";
      case "rejete":
        return "background: #7f1d1d; color: #fca5a5;";
      case "rembourse":
        return "background: #1e293b; color: #e2e8f0;";
      default:
        return "";
    }
  }}
`;

const Button = styled.button<{ variant?: "primary" | "danger" }>`
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ variant }) => {
    if (variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if (variant === "danger")
      return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
    return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
`;

export const NoteDeFraisList: React.FC<Props> = ({ onEdit, onRefresh }) => {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expense_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSubmit = async (id: string) => {
    if (!window.confirm("Soumettre cette note de frais à validation ?")) return;
    try {
      const { error } = await supabase
        .from("expense_reports")
        .update({ status: "soumis" })
        .eq("id", id);
      if (error) throw error;
      await loadReports();
      onRefresh();
      void addNotification({
        title: "Note de frais soumise",
        message: "Une note de frais a été soumise pour validation.",
        type: "expense",
      });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette note de frais ?")) return;
    try {
      const { error } = await supabase
        .from("expense_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadReports();
      onRefresh();
      void addNotification({
        title: "Note de frais supprimée",
        message: "Une note de frais a été supprimée.",
        type: "expense",
      });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin"></i> Chargement...
      </LoadingContainer>
    );
  }

  if (error) {
    return <div style={{ color: "#dc2626" }}>Erreur : {error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
        <i
          className="fas fa-receipt"
          style={{ fontSize: "32px", display: "block", marginBottom: "12px" }}
        ></i>
        Aucune note de frais.
      </div>
    );
  }

  return (
    <TableWrapper>
      <StyledTable>
        <thead>
          <tr>
            <th>Référence</th>
            <th>Collaborateur</th>
            <th>Période</th>
            <th>Total HT</th>
            <th>Net à payer</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.reference}</td>
              <td>{report.collaborateur_name}</td>
              <td>
                {report.date_debut && report.date_fin
                  ? `${format(new Date(report.date_debut), "dd/MM/yyyy")} - ${format(
                      new Date(report.date_fin),
                      "dd/MM/yyyy",
                    )}`
                  : "Non défini"}
              </td>
              <td>{report.total_ht.toFixed(0)} FCFA</td>
              <td>{report.net_a_payer.toFixed(0)} FCFA</td>
              <td>
                <StatusBadge status={report.status}>
                  {report.status}
                </StatusBadge>
              </td>
              <td>
                <Button variant="primary" onClick={() => onEdit(report.id)}>
                  Éditer
                </Button>
                {report.status === "brouillon" && (
                  <>
                    <Button
                      style={{ marginLeft: "4px" }}
                      onClick={() => handleSubmit(report.id)}
                    >
                      Soumettre
                    </Button>
                    <Button
                      variant="danger"
                      style={{ marginLeft: "4px" }}
                      onClick={() => handleDelete(report.id)}
                    >
                      Supprimer
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </StyledTable>
    </TableWrapper>
  );
};
