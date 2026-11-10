// src/pages/manuel/TableauSuiviActions.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

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
    padding: 6px 8px;
    border-bottom: 1px solid #1e293b;
    text-align: left;
    vertical-align: top;
    min-width: 100px;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
    white-space: nowrap;
  }
  td:first-child {
    color: #e2e8f0;
  }
`;

const Input = styled.input`
  padding: 4px 6px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  width: 100%;
  min-width: 80px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const TextArea = styled.textarea`
  padding: 4px 6px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  width: 100%;
  min-width: 80px;
  min-height: 36px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const StyledSelect = styled.select`
  padding: 4px 6px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  width: 100%;
  min-width: 80px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  ${({ $status }) => {
    switch ($status) {
      case "Fait":
        return "background: #14532d; color: #86efac;";
      case "En cours":
        return "background: #713f12; color: #fcd34d;";
      case "A faire":
        return "background: #7f1d1d; color: #fca5a5;";
      default:
        return "background: #1e293b; color: #94a3b8;";
    }
  }}
`;

const IconButton = styled.button<{ $variant?: "edit" | "delete" | "add" }>`
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ $variant }) => {
    if ($variant === "edit")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if ($variant === "delete")
      return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
    if ($variant === "add")
      return "background: #22c55e; color: #fff; &:hover { background: #16a34a; }";
    return "";
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ExportButton = styled.button`
  padding: 8px 18px;
  background: #22c55e;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    background: #16a34a;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
`;

const RowActions = styled.td`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  min-width: 60px;
`;

// ==================== DONNÉES STATIQUES ====================
const ORIGINES = [
  "Réunion",
  "Suggestion",
  "Réclamation client",
  "Audit - Ctrl",
  "Incident",
  "Fournisseur",
  "Autre",
];

const THEMES = [
  "EC",
  "CAC",
  "Juridique",
  "Social",
  "RH",
  "Organisation interne",
  "Informatique",
  "Documentation",
  "Autre",
];

const ETATS = ["A faire", "En cours", "Fait"];

const EFFICACES = ["Oui", "Non"];

// ==================== INTERFACES ====================
interface Action {
  id: string;
  action_desc: string;
  origine: string;
  date_decision: string;
  theme: string;
  responsable: string;
  date_limite: string;
  moyens: string;
  etat: string;
  suivi: string;
  efficace: string;
  nouvelle_action: string;
  client_id?: string | null;
}

// ==================== COMPOSANT ====================
const TableauSuiviActions: React.FC = () => {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Action>>({});

  const fetchActions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("actions_cabinet")
        .select("*")
        .is("client_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (err) {
      console.error("Erreur chargement:", err);
      setError("Impossible de charger les actions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleAdd = async () => {
    if (!newRow.action_desc) {
      alert("Veuillez renseigner l'action décidée.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("actions_cabinet")
        .insert({
          action_desc: newRow.action_desc || "",
          origine: newRow.origine || "",
          date_decision: newRow.date_decision || "",
          theme: newRow.theme || "",
          responsable: newRow.responsable || "",
          date_limite: newRow.date_limite || "",
          moyens: newRow.moyens || "",
          etat: newRow.etat || "A faire",
          suivi: newRow.suivi || "",
          efficace: newRow.efficace || "",
          nouvelle_action: newRow.nouvelle_action || "",
          client_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      setActions([data, ...actions]);
      setNewRow({});
    } catch (err) {
      console.error("Erreur ajout:", err);
      alert("Erreur lors de l'ajout.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    id: string,
    field: keyof Action,
    value: string,
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("actions_cabinet")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      setActions(
        actions.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
      );
    } catch (err) {
      console.error("Erreur mise à jour:", err);
      alert("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette action ?"))
      return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("actions_cabinet")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setActions(actions.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    if (actions.length === 0) {
      alert("Aucune action à exporter.");
      return;
    }

    const rows: any[] = [
      ["Tableau de suivi des actions du cabinet"],
      [],
      [
        "Action décidée",
        "Origine",
        "Date décision",
        "Thème",
        "Responsable",
        "Date limite",
        "Moyens",
        "État",
        "Suivi",
        "Efficace",
        "Nouvelle action",
      ],
    ];

    actions.forEach((a) => {
      rows.push([
        a.action_desc,
        a.origine,
        a.date_decision,
        a.theme,
        a.responsable,
        a.date_limite,
        a.moyens,
        a.etat,
        a.suivi,
        a.efficace,
        a.nouvelle_action,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Actions");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Suivi_actions_cabinet.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renderSelect = (
    value: string,
    options: string[],
    onChange: (v: string) => void,
  ) => (
    <StyledSelect
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">--</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </StyledSelect>
  );

  const renderTable = () => {
    if (loading) return <p>Chargement...</p>;

    return (
      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ minWidth: "180px" }}>Action décidée</th>
              <th style={{ minWidth: "130px" }}>Origine</th>
              <th style={{ minWidth: "100px" }}>Date décision</th>
              <th style={{ minWidth: "120px" }}>Thème</th>
              <th style={{ minWidth: "100px" }}>Responsable</th>
              <th style={{ minWidth: "100px" }}>Date limite</th>
              <th style={{ minWidth: "130px" }}>Moyens</th>
              <th style={{ minWidth: "100px" }}>État</th>
              <th style={{ minWidth: "150px" }}>Suivi</th>
              <th style={{ minWidth: "100px" }}>Efficace</th>
              <th style={{ minWidth: "150px" }}>Nouvelle action</th>
              <th style={{ width: "70px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Ligne d'ajout */}
            <tr>
              <td>
                <TextArea
                  placeholder="Action décidée"
                  value={newRow.action_desc || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, action_desc: e.target.value })
                  }
                />
              </td>
              <td>
                {renderSelect(newRow.origine || "", ORIGINES, (v) =>
                  setNewRow({ ...newRow, origine: v }),
                )}
              </td>
              <td>
                <Input
                  type="date"
                  value={newRow.date_decision || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, date_decision: e.target.value })
                  }
                />
              </td>
              <td>
                {renderSelect(newRow.theme || "", THEMES, (v) =>
                  setNewRow({ ...newRow, theme: v }),
                )}
              </td>
              <td>
                <Input
                  type="text"
                  placeholder="Qui fait?"
                  value={newRow.responsable || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, responsable: e.target.value })
                  }
                />
              </td>
              <td>
                <Input
                  type="text"
                  placeholder="Pour quand?"
                  value={newRow.date_limite || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, date_limite: e.target.value })
                  }
                />
              </td>
              <td>
                <Input
                  type="text"
                  placeholder="Moyens"
                  value={newRow.moyens || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, moyens: e.target.value })
                  }
                />
              </td>
              <td>
                {renderSelect(newRow.etat || "", ETATS, (v) =>
                  setNewRow({ ...newRow, etat: v }),
                )}
              </td>
              <td>
                <TextArea
                  placeholder="Suivi"
                  value={newRow.suivi || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, suivi: e.target.value })
                  }
                />
              </td>
              <td>
                {renderSelect(newRow.efficace || "", EFFICACES, (v) =>
                  setNewRow({ ...newRow, efficace: v }),
                )}
              </td>
              <td>
                <TextArea
                  placeholder="Nouvelle action"
                  value={newRow.nouvelle_action || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, nouvelle_action: e.target.value })
                  }
                />
              </td>
              <td>
                <IconButton
                  $variant="add"
                  onClick={handleAdd}
                  disabled={saving}
                >
                  <i className="fas fa-plus"></i>
                </IconButton>
              </td>
            </tr>

            {/* Lignes existantes */}
            {actions.map((a) => (
              <tr key={a.id}>
                <td>
                  <TextArea
                    value={a.action_desc}
                    onChange={(e) =>
                      handleUpdate(a.id, "action_desc", e.target.value)
                    }
                  />
                </td>
                <td>
                  {renderSelect(a.origine, ORIGINES, (v) =>
                    handleUpdate(a.id, "origine", v),
                  )}
                </td>
                <td>
                  <Input
                    type="date"
                    value={a.date_decision || ""}
                    onChange={(e) =>
                      handleUpdate(a.id, "date_decision", e.target.value)
                    }
                  />
                </td>
                <td>
                  {renderSelect(a.theme, THEMES, (v) =>
                    handleUpdate(a.id, "theme", v),
                  )}
                </td>
                <td>
                  <Input
                    type="text"
                    value={a.responsable || ""}
                    onChange={(e) =>
                      handleUpdate(a.id, "responsable", e.target.value)
                    }
                  />
                </td>
                <td>
                  <Input
                    type="text"
                    value={a.date_limite || ""}
                    onChange={(e) =>
                      handleUpdate(a.id, "date_limite", e.target.value)
                    }
                  />
                </td>
                <td>
                  <Input
                    type="text"
                    value={a.moyens || ""}
                    onChange={(e) =>
                      handleUpdate(a.id, "moyens", e.target.value)
                    }
                  />
                </td>
                <td>
                  {renderSelect(a.etat, ETATS, (v) =>
                    handleUpdate(a.id, "etat", v),
                  )}
                  <div style={{ marginTop: "4px" }}>
                    <StatusBadge $status={a.etat || ""}>
                      {a.etat || "--"}
                    </StatusBadge>
                  </div>
                </td>
                <td>
                  <TextArea
                    value={a.suivi || ""}
                    onChange={(e) =>
                      handleUpdate(a.id, "suivi", e.target.value)
                    }
                  />
                </td>
                <td>
                  {renderSelect(a.efficace, EFFICACES, (v) =>
                    handleUpdate(a.id, "efficace", v),
                  )}
                </td>
                <td>
                  <TextArea
                    value={a.nouvelle_action || ""}
                    onChange={(e) =>
                      handleUpdate(a.id, "nouvelle_action", e.target.value)
                    }
                  />
                </td>
                <td>
                  <RowActions>
                    <IconButton
                      $variant="delete"
                      onClick={() => handleDelete(a.id)}
                      disabled={saving}
                    >
                      <i className="fas fa-trash"></i>
                    </IconButton>
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </TableWrapper>
    );
  };

  if (loading && actions.length === 0) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement des actions...</p>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-tasks"></i> Tableau de suivi des actions
        </HeaderTitle>
        <ExportButton onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> Exporter Excel
        </ExportButton>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Suivez les actions décidées au cabinet : origine, responsable, échéance,
        état d'avancement et efficacité. Les actions "À faire" sont en rouge,
        "En cours" en orange, "Faites" en vert.
      </Description>

      {error && (
        <div style={{ color: "#dc2626", marginBottom: "16px" }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {renderTable()}
    </Container>
  );
};

export default TableauSuiviActions;
