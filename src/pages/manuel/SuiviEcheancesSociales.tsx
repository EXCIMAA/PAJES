// src/pages/manuel/SuiviEcheancesSociales.tsx

import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

// ==================== STYLED COMPONENTS (inchangés) ====================
// ... (je conserve tous les styles précédents, ils sont identiques) ...

const Container = styled.div`
  background: #0f172a;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #1e293b;
  color: #e2e8f0;
`;

const ClientHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #1e293b;
`;

const ClientTitle = styled.div`
  h2 {
    font-size: 22px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    i {
      color: #4facfe;
    }
  }
  .client-sub {
    color: #94a3b8;
    font-size: 14px;
  }
`;

const Badge = styled.span<{ variant: "status" | "risk"; status?: string }>`
  padding: 4px 16px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  ${({ variant, status }) => {
    if (variant === "status") {
      switch (status) {
        case "Actif":
          return "background: #dcfce7; color: #16a34a;";
        case "Suspendu":
          return "background: #fef3c7; color: #d97706;";
        case "Résilié":
          return "background: #fee2e2; color: #dc2626;";
        default:
          return "";
      }
    }
    if (variant === "risk") {
      switch (status) {
        case "Faible":
          return "background: #dbeafe; color: #2563eb;";
        case "Moyen":
          return "background: #fef3c7; color: #d97706;";
        case "Élevé":
          return "background: #fee2e2; color: #dc2626;";
        default:
          return "";
      }
    }
    return "";
  }}
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
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
  option {
    background: #1e293b;
    color: #e2e8f0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin: 16px 0;
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

const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: 16px;
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
    white-space: nowrap;
  }
  th {
    background: #0f172a;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
  }
  td:first-child {
    font-weight: 600;
    color: #e2e8f0;
  }
`;

const StatutClic = styled.span<{ color: string }>`
  display: inline-block;
  padding: 2px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background-color: ${({ color }) => color};
  cursor: pointer;
  transition: 0.2s;
  user-select: none;
  &:hover {
    transform: scale(1.05);
  }
`;

const Legend = styled.div`
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #94a3b8;
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  span {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 4px;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
`;

// ==================== INTERFACES ====================

interface Client {
  id: string;
  client_code: string;
  name: string;
  status?: string;
  niveau_risque?: string;
  industry?: string;
  address?: string;
  nb_salaries?: number;
}

interface EcheanceSociale {
  id: string;
  nom: string;
  periodicite: string;
  mois_debut: number | null;
  condition_tranche: any;
  active: boolean;
}

interface EcheanceClient {
  id?: string;
  client_id: string;
  echeance_id: string;
  mois: number;
  annee: number;
  statut: string;
}

// ==================== COMPOSANT ====================

const SuiviEcheancesSociales: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [echeancesSociales, setEcheancesSociales] = useState<EcheanceSociale[]>(
    [],
  );
  const [echeancesClient, setEcheancesClient] = useState<EcheanceClient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);

  // Ref pour savoir si les échéances client ont déjà été chargées pour le client/année courant
  const loadedRef = useRef<string>("");

  // Chargement des clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select(
            "id, client_code, name, status, niveau_risque, industry, address, nb_salaries",
          )
          .order("name");
        if (error) throw error;
        setClients(data || []);
        if (data && data.length > 0) {
          setSelectedClientId(data[0].id);
        } else {
          setError("Aucun client trouvé.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Chargement des échéances sociales (définition)
  useEffect(() => {
    const fetchEcheances = async () => {
      const { data, error } = await supabase
        .from("echeances_sociales")
        .select("*")
        .eq("active", true)
        .order("nom");
      if (error) {
        console.error("Erreur chargement échéances sociales:", error);
        setError("Impossible de charger les échéances sociales.");
      } else {
        setEcheancesSociales(data || []);
      }
    };
    fetchEcheances();
  }, []);

  // Chargement des données client (infos générales)
  useEffect(() => {
    if (!selectedClientId) return;
    const fetchClientData = async () => {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", selectedClientId)
          .single();
        if (error) throw error;
        setClientData(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    };
    fetchClientData();
  }, [selectedClientId]);

  // Chargement des échéances client (une seule fois par combinaison client/année)
  useEffect(() => {
    if (!selectedClientId || !clientData || echeancesSociales.length === 0)
      return;
    const key = `${selectedClientId}-${selectedYear}`;
    if (loadedRef.current === key) return; // déjà chargé

    const loadEcheances = async () => {
      try {
        const { data, error } = await supabase
          .from("echeances_client")
          .select("*")
          .eq("client_id", selectedClientId)
          .eq("annee", selectedYear);
        if (error) throw error;
        if (data && data.length > 0) {
          setEcheancesClient(data);
        } else {
          // Générer les lignes par défaut
          const defaultRows: EcheanceClient[] = [];
          echeancesSociales.forEach((e) => {
            let moisConcernes: number[] = [];
            if (e.periodicite === "mensuelle") {
              moisConcernes = Array.from({ length: 12 }, (_, i) => i + 1);
            } else if (e.periodicite === "trimestrielle") {
              moisConcernes = [1, 4, 7, 10];
            } else if (e.periodicite === "annuelle") {
              const mois = e.mois_debut || 12;
              moisConcernes = [mois];
            }
            let estConcerné = true;
            if (e.condition_tranche && clientData.nb_salaries !== undefined) {
              const { min, max } = e.condition_tranche;
              if (min !== undefined && clientData.nb_salaries < min)
                estConcerné = false;
              if (max !== undefined && clientData.nb_salaries > max)
                estConcerné = false;
            }
            if (estConcerné) {
              moisConcernes.forEach((mois) => {
                defaultRows.push({
                  client_id: selectedClientId,
                  echeance_id: e.id,
                  mois,
                  annee: selectedYear,
                  statut: "À faire",
                });
              });
            }
          });
          if (defaultRows.length > 0) {
            const { error: insertError } = await supabase
              .from("echeances_client")
              .insert(defaultRows);
            if (insertError) throw insertError;
            const { data: freshData } = await supabase
              .from("echeances_client")
              .select("*")
              .eq("client_id", selectedClientId)
              .eq("annee", selectedYear);
            setEcheancesClient(freshData || []);
          } else {
            setEcheancesClient([]);
          }
        }
        loadedRef.current = key;
      } catch (err: any) {
        console.error(err);
      }
    };
    loadEcheances();
  }, [selectedClientId, selectedYear, echeancesSociales, clientData]);

  // Sauvegarde des échéances client
  const saveEcheances = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await supabase
        .from("echeances_client")
        .delete()
        .eq("client_id", selectedClientId)
        .eq("annee", selectedYear);
      const insertData = echeancesClient.map(({ id, ...rest }) => rest);
      const { error } = await supabase
        .from("echeances_client")
        .insert(insertData);
      if (error) throw error;
      alert("Échéances sauvegardées !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Annulation (recharger depuis la base)
  const annuler = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("echeances_client")
        .select("*")
        .eq("client_id", selectedClientId)
        .eq("annee", selectedYear);
      if (error) throw error;
      setEcheancesClient(data || []);
    } catch (err: any) {
      console.error(err);
      alert("Erreur annulation : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Changement de statut
  const toggleStatut = (echeanceId: string, mois: number) => {
    setEcheancesClient((prev) => {
      const existingIndex = prev.findIndex(
        (e) => e.echeance_id === echeanceId && e.mois === mois,
      );
      const current =
        existingIndex !== -1 ? prev[existingIndex].statut : "À faire";
      const cycle: Record<string, string> = {
        "À faire": "En cours",
        "En cours": "Fait",
        Fait: "NA",
        NA: "À faire",
      };
      const newStatut = cycle[current] || "À faire";
      if (existingIndex !== -1) {
        const newArray = [...prev];
        newArray[existingIndex] = {
          ...newArray[existingIndex],
          statut: newStatut,
        };
        return newArray;
      } else {
        return [
          ...prev,
          {
            client_id: selectedClientId!,
            echeance_id: echeanceId,
            mois,
            annee: selectedYear,
            statut: newStatut,
          },
        ];
      }
    });
  };

  const renderStatut = (statut: string, onClick: () => void) => {
    const colors: Record<string, string> = {
      "À faire": "#f59e0b",
      "En cours": "#3b82f6",
      Fait: "#22c55e",
      NA: "#94a3b8",
    };
    const color = colors[statut] || "#94a3b8";
    return (
      <StatutClic color={color} onClick={onClick}>
        {statut}
      </StatutClic>
    );
  };

  // Export Excel
  const exportExcel = () => {
    if (!clientData) return;
    const moisLabels = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];
    const colonnes = echeancesSociales.filter((e) => e.active);
    const data = moisLabels.map((mois, idx) => {
      const row: any = { Mois: mois };
      colonnes.forEach((e) => {
        const entry = echeancesClient.find(
          (ec) => ec.echeance_id === e.id && ec.mois === idx + 1,
        );
        row[e.nom] = entry ? entry.statut : "À faire";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Échéances sociales");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Echeances_sociales_${clientData.name}_${selectedYear}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Construction du tableau
  const moisLabels = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  const colonnes = echeancesSociales.filter((e) => e.active);

  if (loading && clients.length === 0) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement des clients...</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <Container>
        <p style={{ color: "#dc2626" }}>Erreur : {error}</p>
      </Container>
    );
  }

  if (!clientData) {
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
            onChange={(e) => setSelectedClientId(e.target.value)}
            style={{ minWidth: "200px" }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.client_code})
              </option>
            ))}
          </StyledSelect>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Année :</span>
          <StyledSelect
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: "110px" }}
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - 2 + i,
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </StyledSelect>
        </div>
        <ExportButton onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> Exporter Excel
        </ExportButton>
      </Selectors>

      <ClientHeader>
        <ClientTitle>
          <h2>
            <i className="fas fa-building"></i> {clientData.name}
          </h2>
          <div className="client-sub">
            {clientData.client_code} · {clientData.industry || "—"} ·{" "}
            {clientData.address || "—"}
          </div>
        </ClientTitle>
        <div style={{ display: "flex", gap: "10px" }}>
          <Badge variant="status" status={clientData.status}>
            {clientData.status || "Actif"}
          </Badge>
          {clientData.niveau_risque && (
            <Badge variant="risk" status={clientData.niveau_risque}>
              Risque {clientData.niveau_risque}
            </Badge>
          )}
        </div>
      </ClientHeader>

      <ButtonGroup>
        <ActionButton
          variant="primary"
          onClick={saveEcheances}
          disabled={saving}
        >
          {saving ? "Sauvegarde..." : "ENREGISTRER"}
        </ActionButton>
        <ActionButton variant="secondary" onClick={annuler} disabled={saving}>
          ANNULER
        </ActionButton>
      </ButtonGroup>

      {colonnes.length === 0 ? (
        <EmptyState>
          <p>
            Aucune échéance sociale définie. Veuillez contacter
            l'administrateur.
          </p>
        </EmptyState>
      ) : (
        <TableWrapper>
          <StyledTable>
            <thead>
              <tr>
                <th>Mois</th>
                {colonnes.map((e) => (
                  <th key={e.id}>{e.nom}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moisLabels.map((mois, index) => {
                const moisNum = index + 1;
                return (
                  <tr key={moisNum}>
                    <td>{mois}</td>
                    {colonnes.map((echeance) => {
                      const entry = echeancesClient.find(
                        (ec) =>
                          ec.echeance_id === echeance.id && ec.mois === moisNum,
                      );
                      const statut = entry ? entry.statut : "À faire";
                      const handleClick = () =>
                        toggleStatut(echeance.id, moisNum);
                      return (
                        <td key={echeance.id}>
                          {renderStatut(statut, handleClick)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </StyledTable>
          <Legend>
            <span>
              <span
                className="dot"
                style={{ backgroundColor: "#22c55e" }}
              ></span>{" "}
              Fait
            </span>
            <span>
              <span
                className="dot"
                style={{ backgroundColor: "#3b82f6" }}
              ></span>{" "}
              En cours
            </span>
            <span>
              <span
                className="dot"
                style={{ backgroundColor: "#f59e0b" }}
              ></span>{" "}
              À faire
            </span>
            <span>
              <span
                className="dot"
                style={{ backgroundColor: "#94a3b8" }}
              ></span>{" "}
              NA
            </span>
          </Legend>
        </TableWrapper>
      )}
    </Container>
  );
};

export default SuiviEcheancesSociales;
