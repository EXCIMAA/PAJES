// src/pages/manuel/SuiviObjectifs.tsx
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
  font-size: 14px;
  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #1e293b;
    text-align: left;
    vertical-align: top;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
    white-space: nowrap;
  }
  td:first-child {
    color: #e2e8f0;
  }
`;

const Input = styled.input`
  padding: 4px 8px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  width: 100%;
  min-width: 100px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const TextArea = styled.textarea`
  padding: 4px 8px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  width: 100%;
  min-width: 100px;
  min-height: 40px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const IconButton = styled.button<{ $variant?: "edit" | "delete" | "add" }>`
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
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
`;

// ==================== INTERFACES ====================
interface Objectif {
  id: string;
  domaine: string;
  objectif_general: string;
  objectif_chiffre: string;
  collaborateurs_concernes: string;
  traduction_objectif_collab: string;
  mise_en_place_suivi: string;
  client_id?: string | null;
}

// ==================== COMPOSANT ====================
const SuiviObjectifs: React.FC = () => {
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Objectif>>({});

  const fetchObjectifs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("objectifs_cabinet")
        .select("*")
        .is("client_id", null)
        .order("domaine", { ascending: true });

      if (error) throw error;
      setObjectifs(data || []);
    } catch (err) {
      console.error("Erreur chargement:", err);
      setError("Impossible de charger les objectifs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectifs();
  }, []);

  const handleAdd = async () => {
    if (!newRow.domaine || !newRow.objectif_general) {
      alert("Veuillez remplir au moins le Domaine et l'Objectif général.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("objectifs_cabinet")
        .insert({
          domaine: newRow.domaine || "",
          objectif_general: newRow.objectif_general || "",
          objectif_chiffre: newRow.objectif_chiffre || "",
          collaborateurs_concernes: newRow.collaborateurs_concernes || "",
          traduction_objectif_collab: newRow.traduction_objectif_collab || "",
          mise_en_place_suivi: newRow.mise_en_place_suivi || "",
          client_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      setObjectifs([...objectifs, data]);
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
    field: keyof Objectif,
    value: string,
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("objectifs_cabinet")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      setObjectifs(
        objectifs.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
      );
    } catch (err) {
      console.error("Erreur mise à jour:", err);
      alert("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette ligne ?")) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("objectifs_cabinet")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setObjectifs(objectifs.filter((o) => o.id !== id));
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    if (objectifs.length === 0) {
      alert("Aucun objectif à exporter.");
      return;
    }

    const rows: any[] = [
      ["Tableau pour la mise en place et le suivi des objectifs"],
      [],
      [
        "Domaine",
        "Objectifs généraux",
        "Objectifs chiffrés",
        "Collaborateurs concernés",
        "Traduction en objectifs collaborateur",
        "Mise en place / Suivi",
      ],
    ];

    objectifs.forEach((o) => {
      rows.push([
        o.domaine,
        o.objectif_general,
        o.objectif_chiffre,
        o.collaborateurs_concernes,
        o.traduction_objectif_collab,
        o.mise_en_place_suivi,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Objectifs");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Objectifs_cabinet.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renderTable = () => {
    if (loading) return <p>Chargement...</p>;

    return (
      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th>Domaine</th>
              <th>Objectifs généraux</th>
              <th>Objectifs chiffrés</th>
              <th>Collaborateurs concernés</th>
              <th>Traduction en objectifs collaborateur</th>
              <th>Mise en place / Suivi</th>
              <th style={{ width: "120px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Ligne d'ajout */}
            <tr>
              <td>
                <Input
                  type="text"
                  placeholder="Domaine"
                  value={newRow.domaine || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, domaine: e.target.value })
                  }
                />
              </td>
              <td>
                <TextArea
                  placeholder="Objectif général"
                  value={newRow.objectif_general || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, objectif_general: e.target.value })
                  }
                />
              </td>
              <td>
                <TextArea
                  placeholder="Objectif chiffré"
                  value={newRow.objectif_chiffre || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, objectif_chiffre: e.target.value })
                  }
                />
              </td>
              <td>
                <Input
                  type="text"
                  placeholder="Collaborateurs concernés"
                  value={newRow.collaborateurs_concernes || ""}
                  onChange={(e) =>
                    setNewRow({
                      ...newRow,
                      collaborateurs_concernes: e.target.value,
                    })
                  }
                />
              </td>
              <td>
                <TextArea
                  placeholder="Traduction collaborateur"
                  value={newRow.traduction_objectif_collab || ""}
                  onChange={(e) =>
                    setNewRow({
                      ...newRow,
                      traduction_objectif_collab: e.target.value,
                    })
                  }
                />
              </td>
              <td>
                <TextArea
                  placeholder="Mise en place / Suivi"
                  value={newRow.mise_en_place_suivi || ""}
                  onChange={(e) =>
                    setNewRow({
                      ...newRow,
                      mise_en_place_suivi: e.target.value,
                    })
                  }
                />
              </td>
              <td>
                <IconButton
                  $variant="add"
                  onClick={handleAdd}
                  disabled={saving}
                >
                  <i className="fas fa-plus"></i> Ajouter
                </IconButton>
              </td>
            </tr>

            {/* Lignes existantes */}
            {objectifs.map((obj) => (
              <tr key={obj.id}>
                <td>
                  <Input
                    type="text"
                    value={obj.domaine}
                    onChange={(e) =>
                      handleUpdate(obj.id, "domaine", e.target.value)
                    }
                  />
                </td>
                <td>
                  <TextArea
                    value={obj.objectif_general}
                    onChange={(e) =>
                      handleUpdate(obj.id, "objectif_general", e.target.value)
                    }
                  />
                </td>
                <td>
                  <TextArea
                    value={obj.objectif_chiffre}
                    onChange={(e) =>
                      handleUpdate(obj.id, "objectif_chiffre", e.target.value)
                    }
                  />
                </td>
                <td>
                  <Input
                    type="text"
                    value={obj.collaborateurs_concernes}
                    onChange={(e) =>
                      handleUpdate(
                        obj.id,
                        "collaborateurs_concernes",
                        e.target.value,
                      )
                    }
                  />
                </td>
                <td>
                  <TextArea
                    value={obj.traduction_objectif_collab}
                    onChange={(e) =>
                      handleUpdate(
                        obj.id,
                        "traduction_objectif_collab",
                        e.target.value,
                      )
                    }
                  />
                </td>
                <td>
                  <TextArea
                    value={obj.mise_en_place_suivi}
                    onChange={(e) =>
                      handleUpdate(
                        obj.id,
                        "mise_en_place_suivi",
                        e.target.value,
                      )
                    }
                  />
                </td>
                <td>
                  <RowActions>
                    <IconButton
                      $variant="delete"
                      onClick={() => handleDelete(obj.id)}
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

  if (loading && objectifs.length === 0) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement des objectifs...</p>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-bullseye"></i> Mise en place et suivi des
          objectifs
        </HeaderTitle>
        <ExportButton onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> Exporter Excel
        </ExportButton>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Définissez vos objectifs par domaine, déclinez-les en objectifs
        chiffrés, identifiez les collaborateurs concernés, traduisez-les en
        objectifs individuels et précisez les outils de suivi.
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

export default SuiviObjectifs;
