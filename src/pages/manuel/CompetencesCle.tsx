// src/pages/manuel/CompetencesCle.tsx
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
    border: 1px solid #1e293b;
    text-align: center;
    vertical-align: middle;
    min-width: 60px;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    background: #1e293b;
    border-bottom: 2px solid #334155;
  }
  td:first-child {
    text-align: left;
    color: #e2e8f0;
    font-weight: 500;
    min-width: 180px;
  }
`;

const CategoryRow = styled.tr`
  background-color: #0f172a;
  td {
    color: #4facfe;
    font-weight: 700;
    text-align: left;
    padding: 8px 12px;
    font-size: 14px;
    border-top: 2px solid #334155;
    border-bottom: 2px solid #334155;
  }
`;

const StyledSelect = styled.select`
  padding: 2px 4px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  width: 100%;
  min-width: 40px;
  text-align: center;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
  option {
    background: #0f172a;
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
  min-width: 60px;
  text-align: center;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const AddButton = styled.button`
  padding: 4px 12px;
  background: #22c55e;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    background: #16a34a;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DeleteButton = styled.button`
  padding: 2px 8px;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  &:hover {
    background: #b91c1c;
  }
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

const Legend = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 12px 0 20px;
  padding: 12px 16px;
  background: #1e293b;
  border-radius: 8px;
  align-items: center;
  span {
    font-size: 12px;
    color: #94a3b8;
  }
  .level {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .dot {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }
`;

const LegendDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background-color: ${({ $color }) => $color};
`;

const getNiveauColor = (niveau: string): string => {
  switch (niveau) {
    case "1":
      return "#bfdbfe"; // bleu clair
    case "2":
      return "#93c5fd"; // bleu
    case "3":
      return "#86efac"; // vert clair
    case "4":
      return "#22c55e"; // vert foncé
    case "NA":
      return "#475569"; // gris
    default:
      return "transparent";
  }
};

// ==================== DONNÉES STATIQUES ====================
const COMPETENCES = [
  {
    category: "Expertise comptable",
    items: [
      "Maîtrise technique",
      "Tenue des comptes",
      "Enregistrer les pièces comptables",
      "Etablir les déclarations fiscales et sociales",
      "Procéder à la révision annuelle des écritures comptables",
      "Elaborer le bilan, le compte de résultat et les annexes comptables",
    ],
  },
  {
    category: "Surveillance comptable",
    items: [
      "Réviser les comptes et contrôler les écritures comptables",
      "Contrôler et réviser les déclarations fiscales et sociales",
      "Etablir les situations comptables intermédiaires",
    ],
  },
  {
    category: "Etablissement des comptes annuels",
    items: [
      "Contrôler l'inventaire",
      "Vérifier et établir les écritures de clôture",
      "Etablir le bilan et compte de résultat",
      "Etablir la liasse fiscale",
      "Etablir les comptes consolidés",
    ],
  },
  {
    category: "Spécialisation - Expertise comptable",
    items: ["Secteur commerces", "Secteur associations"],
  },
  {
    category: "CAC",
    items: [
      "Maîtrise technique",
      "Audit des comptes sociaux",
      "Audit des comptes consolidés - règles CRC 99-02",
      "Audit des comptes consolidés - normes IFRS",
      "Audit d'opérations relatives au capital",
      "Audit d'opérations de transformation",
      "Audit d'opérations relatives aux dividendes",
      "Audit et/ou rédaction de procédures de contrôle interne",
      "Commissariat aux apports",
      "Commissariat à la fusion",
      "Commissariat aux avantages particuliers",
      "Evaluation d'entreprise",
    ],
  },
  {
    category: "Spécialisation - CAC",
    items: ["Secteur commerces", "Secteur associations"],
  },
  {
    category: "Social",
    items: [
      "Gestion de la paie (bulletins, journal de paie, congés payés)",
      "Elaboration des déclarations des charges sociales",
      "Procédure d'embauche (déclaration URSSAF, caisses retraite et prévoyance, contrat)",
      "Procédure de rupture de contrat",
      "Procédure de contentieux",
      "Mise en place IRP",
      "Optimisation de rémunération",
      "Indemnité de fin de carrière",
      "Mise en place intéressement, du PEE",
      "Bilan social",
      "Audit des risques sociaux",
    ],
  },
  {
    category: "Spécialisation - Social",
    items: ["Convention collective de branche XX"],
  },
  {
    category: "Juridique",
    items: [
      "Constitution d'une SARL",
      "Constitution d'une SA",
      "Constitution d'une SAS",
      "Constitution d'une SCI",
      "Juridique lié à l'approbation des comptes",
      "Participation aux assemblées générales / conseils",
      "Cession de titres",
      "Dissolution - Liquidation",
      "Dépôt de marques",
      "Baux",
      "Contrats divers",
      "Augmentation de capital",
      "Apport partiel d'actifs",
      "Fusion",
      "Transmission universelle du patrimoine",
      "Transformation d'une société en une autre forme",
      "Pacte d'associés",
      "Audit et conseil juridique",
    ],
  },
  {
    category: "Savoirs techniques",
    items: [
      "Connaissance et respect des règles éthiques",
      "Maîtrise de la fiscalité",
      "Maîtrise du droit des affaires",
      "Maîtrise du droit social",
      "Compréhension de l'ERP",
      "Maîtrise des IFRS",
    ],
  },
];

// ==================== INTERFACES ====================
interface Collaborateur {
  id: string;
  nom: string;
  niveau_poste: string;
}

// ==================== COMPOSANT ====================
const CompetencesCle: React.FC = () => {
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([]);
  const [evaluations, setEvaluations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateCompetenceId = (category: string, item: string): string => {
    return `${category}_${item}`.replace(/[^a-zA-Z0-9_]/g, "_");
  };

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Charger les collaborateurs
        const { data: collabData, error: collabError } = await supabase
          .from("collaborateurs_cabinet")
          .select("*")
          .order("nom");

        if (collabError) throw collabError;

        // Charger les évaluations
        const { data: evalData, error: evalError } = await supabase
          .from("competences_evaluations")
          .select("*");

        if (evalError) throw evalError;

        setCollaborateurs(collabData || []);

        // Construire l'objet d'évaluations
        const evalMap: Record<string, Record<string, string>> = {};
        (collabData || []).forEach((c) => {
          evalMap[c.id] = {};
        });
        (evalData || []).forEach((e) => {
          if (evalMap[e.collaborateur_id]) {
            evalMap[e.collaborateur_id][e.competence_id] = e.niveau;
          }
        });
        setEvaluations(evalMap);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Ajouter un collaborateur
  const addCollaborateur = async () => {
    const newNom = `Coll ${collaborateurs.length + 1}`;
    const newNiveau = "N1";
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("collaborateurs_cabinet")
        .insert([{ nom: newNom, niveau_poste: newNiveau }])
        .select()
        .single();
      if (error) throw error;
      setCollaborateurs([...collaborateurs, data]);
      setEvaluations({ ...evaluations, [data.id]: {} });
    } catch (err: any) {
      alert("Erreur ajout collaborateur: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un collaborateur
  const deleteCollaborateur = async (id: string) => {
    if (!window.confirm("Supprimer ce collaborateur ?")) return;
    try {
      setSaving(true);
      await supabase.from("collaborateurs_cabinet").delete().eq("id", id);
      await supabase
        .from("competences_evaluations")
        .delete()
        .eq("collaborateur_id", id);
      setCollaborateurs(collaborateurs.filter((c) => c.id !== id));
      const newEvals = { ...evaluations };
      delete newEvals[id];
      setEvaluations(newEvals);
    } catch (err: any) {
      alert("Erreur suppression: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour un champ collaborateur (nom ou niveau)
  const updateCollaborateur = async (
    id: string,
    field: "nom" | "niveau_poste",
    value: string,
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("collaborateurs_cabinet")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
      setCollaborateurs(
        collaborateurs.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
      );
    } catch (err: any) {
      alert("Erreur mise à jour: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour une évaluation
  const updateEvaluation = async (
    collabId: string,
    competenceId: string,
    value: string,
  ) => {
    try {
      setSaving(true);
      // Mettre à jour localement
      const newEvals = { ...evaluations };
      if (!newEvals[collabId]) newEvals[collabId] = {};
      newEvals[collabId][competenceId] = value;
      setEvaluations(newEvals);

      // En base
      const { error } = await supabase.from("competences_evaluations").upsert(
        {
          collaborateur_id: collabId,
          competence_id: competenceId,
          niveau: value,
        },
        { onConflict: "collaborateur_id, competence_id" },
      );
      if (error) throw error;
    } catch (err: any) {
      alert("Erreur sauvegarde évaluation: " + err.message);
      // Recharger les données pour annuler la modification locale
      // (simple pour l'exemple)
    } finally {
      setSaving(false);
    }
  };

  // Export Excel
  const exportExcel = () => {
    const rows: any[] = [];
    const allCompetences = COMPETENCES.flatMap((cat) =>
      cat.items.map((item) => ({ category: cat.category, item })),
    );

    // En-têtes
    const headers = ["Catégorie", "Compétence"];
    collaborateurs.forEach((c) => {
      headers.push(c.nom);
    });
    rows.push(headers);

    // Ligne des niveaux de poste
    const niveauRow = ["", "Niveau occupé"];
    collaborateurs.forEach((c) => {
      niveauRow.push(c.niveau_poste);
    });
    rows.push(niveauRow);

    // Lignes de compétences
    allCompetences.forEach(({ category, item }) => {
      const row = [category, item];
      collaborateurs.forEach((c) => {
        const compId = generateCompetenceId(category, item);
        const niveau = evaluations[c.id]?.[compId] || "";
        row.push(niveau);
      });
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compétences");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Competences_cle_cabinet.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement...</p>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-brain"></i> Identification des compétences clés
        </HeaderTitle>
        <ExportButton onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> Exporter Excel
        </ExportButton>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Évaluez les compétences de chaque collaborateur (1 = connaissance
        théorique, 2 = avec assistance, 3 = en autonomie, 4 = expert, NA = non
        applicable). Les couleurs vous aident à visualiser rapidement les forces
        et faiblesses du cabinet.
      </Description>

      <Legend>
        <span>Légende :</span>
        <div className="level">
          <LegendDot $color="#bfdbfe" /> 1 – Connaissance théorique
        </div>
        <div className="level">
          <LegendDot $color="#93c5fd" /> 2 – Fait avec assistance
        </div>
        <div className="level">
          <LegendDot $color="#86efac" /> 3 – Fait en autonomie
        </div>
        <div className="level">
          <LegendDot $color="#22c55e" /> 4 – Expert
        </div>
        <div className="level">
          <LegendDot $color="#475569" /> NA – Non applicable
        </div>
      </Legend>

      {error && (
        <div style={{ color: "#dc2626", marginBottom: "12px" }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <AddButton onClick={addCollaborateur} disabled={saving}>
          <i className="fas fa-plus"></i> Ajouter un collaborateur
        </AddButton>
      </div>

      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ minWidth: "180px" }}>Catégorie / Compétence</th>
              {collaborateurs.map((c) => (
                <th key={c.id} style={{ minWidth: "100px" }}>
                  <div>
                    <Input
                      value={c.nom}
                      onChange={(e) =>
                        updateCollaborateur(c.id, "nom", e.target.value)
                      }
                      style={{ width: "80px", marginBottom: "4px" }}
                      disabled={saving}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        justifyContent: "center",
                      }}
                    >
                      <Input
                        value={c.niveau_poste}
                        onChange={(e) =>
                          updateCollaborateur(
                            c.id,
                            "niveau_poste",
                            e.target.value,
                          )
                        }
                        style={{ width: "40px" }}
                        disabled={saving}
                      />
                      <DeleteButton
                        onClick={() => deleteCollaborateur(c.id)}
                        disabled={saving}
                      >
                        <i className="fas fa-trash"></i>
                      </DeleteButton>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPETENCES.map((cat, catIdx) => {
              const rows = [];
              // Ligne de catégorie
              rows.push(
                <CategoryRow key={`cat-${catIdx}`}>
                  <td colSpan={collaborateurs.length + 1}>{cat.category}</td>
                </CategoryRow>,
              );
              // Lignes de compétences
              cat.items.forEach((item) => {
                const compId = generateCompetenceId(cat.category, item);
                rows.push(
                  <tr key={compId}>
                    <td>{item}</td>
                    {collaborateurs.map((c) => {
                      const niveau = evaluations[c.id]?.[compId] || "";
                      const bgColor = getNiveauColor(niveau);
                      return (
                        <td
                          key={c.id}
                          style={{ backgroundColor: bgColor, minWidth: "60px" }}
                        >
                          <StyledSelect
                            value={niveau}
                            onChange={(e) =>
                              updateEvaluation(c.id, compId, e.target.value)
                            }
                            disabled={saving}
                            style={{ backgroundColor: bgColor }}
                          >
                            <option value="">-</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="NA">NA</option>
                          </StyledSelect>
                        </td>
                      );
                    })}
                  </tr>,
                );
              });
              return rows;
            })}
          </tbody>
        </StyledTable>
      </TableWrapper>
    </Container>
  );
};

export default CompetencesCle;
