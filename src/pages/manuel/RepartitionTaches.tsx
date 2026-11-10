// src/pages/manuel/RepartitionTaches.tsx

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

// ==================== STYLED COMPONENTS ====================

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

const Selectors = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 20px;
`;

const StyledSelect = styled.select`
  padding: 6px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 14px;
  min-width: 200px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
  option {
    background: #1e293b;
    color: #e2e8f0;
  }
`;

const Section = styled.div`
  margin: 24px 0;
  padding: 16px 20px;
  background: #1e293b;
  border-radius: 12px;
  border-left: 3px solid #4facfe;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #4facfe;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin: 20px 0;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ variant?: "primary" | "secondary" }>`
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ variant }) => {
    if (variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if (variant === "secondary")
      return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
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
  border-radius: 8px;
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

// ==================== INTERFACES ====================

interface Client {
  id: string;
  client_code: string;
  name: string;
}

interface Parametres {
  id?: string;
  client_id: string;
  taux_horaire_n1: number;
  taux_horaire_n2: number;
  taux_horaire_n3: number;
  taux_horaire_n4: number;
  taux_horaire_n5: number;
  mode_calcul_piece: string;
  taux_piece: number;
  temps_piece_minutes: number;
  niveau_saisie_piece: string;
}

interface LigneTache {
  id?: string;
  client_id: string;
  categorie: string;
  detail_travaux: string;
  periodicite: string;
  attributaire: string;
  quantite: number;
  unite: string;
  taux_saisi: number;
  budget_calcule: number;
  ordre: number;
}

// ==================== COMPOSANT ====================

const RepartitionTaches: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [lignes, setLignes] = useState<LigneTache[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, client_code, name")
        .order("name");
      if (data) setClients(data);
      if (data && data.length > 0) {
        setSelectedClientId(data[0].id);
        setClientData(data[0]);
      }
      setLoading(false);
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: params } = await supabase
        .from("repartition_parametres")
        .select("*")
        .eq("client_id", selectedClientId)
        .single();
      if (params) {
        setParametres(params);
      } else {
        setParametres({
          client_id: selectedClientId,
          taux_horaire_n1: 150,
          taux_horaire_n2: 125,
          taux_horaire_n3: 110,
          taux_horaire_n4: 75,
          taux_horaire_n5: 50,
          mode_calcul_piece: "forfait_piece",
          taux_piece: 2.5,
          temps_piece_minutes: 3,
          niveau_saisie_piece: "N4",
        });
      }
      const { data: lignesData } = await supabase
        .from("repartition_lignes")
        .select("*")
        .eq("client_id", selectedClientId)
        .order("ordre", { ascending: true });
      if (lignesData && lignesData.length > 0) {
        setLignes(lignesData);
      } else {
        setLignes([
          {
            client_id: selectedClientId,
            categorie: "Mission de Présentation des comptes",
            detail_travaux: "Définition de l'organisation de la mission",
            periodicite: "",
            attributaire: "Le Cabinet",
            quantite: 0,
            unite: "Heures_N4",
            taux_saisi: 0,
            budget_calcule: 0,
            ordre: 1,
          },
          {
            client_id: selectedClientId,
            categorie: "Mission comptable",
            detail_travaux: "Enregistrement des écritures",
            periodicite: "",
            attributaire: "Le Cabinet",
            quantite: 0,
            unite: "pièces",
            taux_saisi: 0,
            budget_calcule: 0,
            ordre: 2,
          },
        ]);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedClientId]);

  const calculerTaux = (ligne: LigneTache): number => {
    if (!parametres) return 0;
    if (ligne.unite === "Déclaration/Acte/Forfait")
      return ligne.taux_saisi || 0;
    if (ligne.unite === "pièces") {
      if (parametres.mode_calcul_piece === "forfait_piece")
        return parametres.taux_piece || 0;
      if (parametres.mode_calcul_piece === "temps_piece") {
        const niveau = parametres.niveau_saisie_piece || "N4";
        const tauxHoraire =
          (parametres as any)[`taux_horaire_${niveau.toLowerCase()}`] || 0;
        return ((parametres.temps_piece_minutes || 0) / 60) * tauxHoraire;
      }
      return 0;
    }
    const niveau = ligne.unite.replace("Heures_", "");
    const tauxHoraire =
      (parametres as any)[`taux_horaire_${niveau.toLowerCase()}`] || 0;
    return tauxHoraire;
  };

  useEffect(() => {
    if (!parametres) return;
    setLignes((prev) =>
      prev.map((ligne) => {
        const taux = calculerTaux(ligne);
        return { ...ligne, budget_calcule: (ligne.quantite || 0) * taux };
      }),
    );
  }, [parametres]);

  const updateLigne = (index: number, field: keyof LigneTache, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setLignes(newLignes);
    setTimeout(() => {
      const ligne = newLignes[index];
      const taux = calculerTaux(ligne);
      newLignes[index] = {
        ...ligne,
        budget_calcule: (ligne.quantite || 0) * taux,
      };
      setLignes(newLignes);
    }, 0);
  };

  const saveAll = async () => {
    if (!selectedClientId || !parametres) return;
    setSaving(true);
    try {
      const { data: existingParams } = await supabase
        .from("repartition_parametres")
        .select("id")
        .eq("client_id", selectedClientId)
        .single();
      if (existingParams) {
        await supabase
          .from("repartition_parametres")
          .update(parametres)
          .eq("client_id", selectedClientId);
      } else {
        await supabase.from("repartition_parametres").insert([parametres]);
      }
      await supabase
        .from("repartition_lignes")
        .delete()
        .eq("client_id", selectedClientId);
      if (lignes.length > 0) {
        const lignesToInsert = lignes.map(({ id, ...rest }) => rest);
        await supabase.from("repartition_lignes").insert(lignesToInsert);
      }
      alert("Données sauvegardées !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const { data: params } = await supabase
        .from("repartition_parametres")
        .select("*")
        .eq("client_id", selectedClientId)
        .single();
      if (params) setParametres(params);
      const { data: lignesData } = await supabase
        .from("repartition_lignes")
        .select("*")
        .eq("client_id", selectedClientId)
        .order("ordre", { ascending: true });
      if (lignesData) setLignes(lignesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!clientData) return;
    const rows: any[] = [
      ["Répartition des tâches et budget"],
      ["Client", clientData.name],
      [],
      [
        "Détail des travaux",
        "Périodicité",
        "Attributaire",
        "Quantité",
        "Unité",
        "Taux",
        "Budget",
      ],
    ];
    lignes.forEach((l) => {
      rows.push([
        l.detail_travaux,
        l.periodicite,
        l.attributaire,
        l.quantite,
        l.unite,
        calculerTaux(l),
        l.budget_calcule,
      ]);
    });
    rows.push([]);
    rows.push([
      "Total budget",
      "",
      "",
      "",
      "",
      "",
      lignes.reduce((sum, l) => sum + l.budget_calcule, 0),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Répartition");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Repartition_taches_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (loading && clients.length === 0) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement...</p>
      </LoadingContainer>
    );
  }

  if (!clientData || !parametres) {
    return (
      <Container>
        <p>Sélectionnez un client pour commencer.</p>
      </Container>
    );
  }

  return (
    <Container>
      <Selectors>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Client :</span>
          <StyledSelect
            value={selectedClientId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedClientId(id);
              const client = clients.find((c) => c.id === id);
              if (client) setClientData(client);
            }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.client_code})
              </option>
            ))}
          </StyledSelect>
        </div>
        <ExportButton onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> Exporter Excel
        </ExportButton>
      </Selectors>

      <Header>
        <HeaderTitle>
          <i className="fas fa-tasks"></i> Répartition des tâches
        </HeaderTitle>
        <div>
          <span style={{ color: "#94a3b8" }}>{clientData.name}</span>
        </div>
      </Header>

      <Section>
        <SectionTitle>⚙️ Paramètres</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "12px",
          }}
        >
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Taux N1
            </label>
            <input
              type="number"
              value={parametres.taux_horaire_n1}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  taux_horaire_n1: Number(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
              }}
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Taux N2
            </label>
            <input
              type="number"
              value={parametres.taux_horaire_n2}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  taux_horaire_n2: Number(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
              }}
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Taux N3
            </label>
            <input
              type="number"
              value={parametres.taux_horaire_n3}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  taux_horaire_n3: Number(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
              }}
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Taux N4
            </label>
            <input
              type="number"
              value={parametres.taux_horaire_n4}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  taux_horaire_n4: Number(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
              }}
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Taux N5
            </label>
            <input
              type="number"
              value={parametres.taux_horaire_n5}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  taux_horaire_n5: Number(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
              }}
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Mode calcul pièces
            </label>
            <select
              value={parametres.mode_calcul_piece}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  mode_calcul_piece: e.target.value,
                })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
              }}
            >
              <option value="forfait_piece">Forfait par pièce</option>
              <option value="temps_piece">Temps de saisie</option>
            </select>
          </div>
          {parametres.mode_calcul_piece === "forfait_piece" && (
            <div>
              <label style={{ color: "#94a3b8", fontSize: "12px" }}>
                Taux par pièce
              </label>
              <input
                type="number"
                value={parametres.taux_piece}
                onChange={(e) =>
                  setParametres({
                    ...parametres,
                    taux_piece: Number(e.target.value),
                  })
                }
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "4px",
                  color: "#e2e8f0",
                }}
              />
            </div>
          )}
          {parametres.mode_calcul_piece === "temps_piece" && (
            <>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px" }}>
                  Temps (minutes)
                </label>
                <input
                  type="number"
                  value={parametres.temps_piece_minutes}
                  onChange={(e) =>
                    setParametres({
                      ...parametres,
                      temps_piece_minutes: Number(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "4px",
                    color: "#e2e8f0",
                  }}
                />
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px" }}>
                  Niveau saisie
                </label>
                <select
                  value={parametres.niveau_saisie_piece}
                  onChange={(e) =>
                    setParametres({
                      ...parametres,
                      niveau_saisie_piece: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "4px",
                    color: "#e2e8f0",
                  }}
                >
                  <option value="N1">N1</option>
                  <option value="N2">N2</option>
                  <option value="N3">N3</option>
                  <option value="N4">N4</option>
                  <option value="N5">N5</option>
                </select>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section>
        <SectionTitle>📋 Liste des tâches</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{ color: "#94a3b8", borderBottom: "2px solid #334155" }}
              >
                <th style={{ padding: "8px", textAlign: "left" }}>
                  Détail des travaux
                </th>
                <th style={{ padding: "8px", textAlign: "left" }}>
                  Périodicité
                </th>
                <th style={{ padding: "8px", textAlign: "left" }}>
                  Attributaire
                </th>
                <th style={{ padding: "8px", textAlign: "center" }}>
                  Quantité
                </th>
                <th style={{ padding: "8px", textAlign: "left" }}>Unité</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Taux</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Budget</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "6px" }}>
                    <input
                      type="text"
                      value={ligne.detail_travaux}
                      onChange={(e) =>
                        updateLigne(index, "detail_travaux", e.target.value)
                      }
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#e2e8f0",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px" }}>
                    <input
                      type="text"
                      value={ligne.periodicite}
                      onChange={(e) =>
                        updateLigne(index, "periodicite", e.target.value)
                      }
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#e2e8f0",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px" }}>
                    <select
                      value={ligne.attributaire}
                      onChange={(e) =>
                        updateLigne(index, "attributaire", e.target.value)
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#e2e8f0",
                      }}
                    >
                      <option value="Vous">Vous</option>
                      <option value="Le Cabinet">Le Cabinet</option>
                      <option value="Non concerné/Non prévu">
                        Non concerné
                      </option>
                    </select>
                  </td>
                  <td style={{ padding: "6px", textAlign: "center" }}>
                    <input
                      type="number"
                      value={ligne.quantite}
                      onChange={(e) =>
                        updateLigne(index, "quantite", Number(e.target.value))
                      }
                      style={{
                        width: "80px",
                        background: "transparent",
                        border: "none",
                        color: "#e2e8f0",
                        textAlign: "center",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px" }}>
                    <select
                      value={ligne.unite}
                      onChange={(e) =>
                        updateLigne(index, "unite", e.target.value)
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#e2e8f0",
                      }}
                    >
                      <option value="Heures_N1">Heures N1</option>
                      <option value="Heures_N2">Heures N2</option>
                      <option value="Heures_N3">Heures N3</option>
                      <option value="Heures_N4">Heures N4</option>
                      <option value="Heures_N5">Heures N5</option>
                      <option value="pièces">Pièces</option>
                      <option value="Déclaration/Acte/Forfait">Forfait</option>
                    </select>
                  </td>
                  <td style={{ padding: "6px", textAlign: "right" }}>
                    {ligne.unite === "Déclaration/Acte/Forfait" ? (
                      <input
                        type="number"
                        value={ligne.taux_saisi}
                        onChange={(e) =>
                          updateLigne(
                            index,
                            "taux_saisi",
                            Number(e.target.value),
                          )
                        }
                        style={{
                          width: "80px",
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          textAlign: "right",
                        }}
                      />
                    ) : (
                      calculerTaux(ligne).toFixed(2)
                    )}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: "#4facfe",
                    }}
                  >
                    {ligne.budget_calcule.toFixed(0)} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "right",
                    padding: "12px",
                    fontWeight: "bold",
                  }}
                >
                  Total budget :
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px",
                    fontWeight: "bold",
                    color: "#22c55e",
                  }}
                >
                  {lignes
                    .reduce((sum, l) => sum + l.budget_calcule, 0)
                    .toFixed(0)}{" "}
                  FCFA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ActionButton
          variant="secondary"
          onClick={() => {
            setLignes([
              ...lignes,
              {
                client_id: selectedClientId!,
                categorie: "",
                detail_travaux: "Nouvelle tâche",
                periodicite: "",
                attributaire: "Le Cabinet",
                quantite: 0,
                unite: "Heures_N4",
                taux_saisi: 0,
                budget_calcule: 0,
                ordre: lignes.length + 1,
              },
            ]);
          }}
          style={{ marginTop: "12px" }}
        >
          + Ajouter une ligne
        </ActionButton>
      </Section>

      <ButtonGroup>
        <ActionButton variant="primary" onClick={saveAll} disabled={saving}>
          {saving ? "Sauvegarde..." : "ENREGISTRER"}
        </ActionButton>
        <ActionButton variant="secondary" onClick={cancel} disabled={saving}>
          ANNULER
        </ActionButton>
      </ButtonGroup>
    </Container>
  );
};

export default RepartitionTaches;
