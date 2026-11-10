// src/pages/manuel/TravauxPeriodiques.tsx
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

const ClientBadge = styled.span<{
  variant: "status" | "risk";
  status?: string;
}>`
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

const PeriodTabs = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const PeriodTab = styled.button<{ active: boolean; invalid?: boolean }>`
  padding: 8px 16px;
  border: none;
  background: ${({ active, invalid }) =>
    invalid ? "#1e293b" : active ? "#4facfe" : "transparent"};
  color: ${({ invalid }) => (invalid ? "#475569" : "#e2e8f0")};
  border-radius: 6px;
  cursor: ${({ invalid }) => (invalid ? "not-allowed" : "pointer")};
  font-weight: ${({ active }) => (active ? "600" : "400")};
  transition: all 0.2s;
  &:hover {
    background: ${({ invalid }) => (invalid ? "#1e293b" : "#1e293b")};
  }
  opacity: ${({ invalid }) => (invalid ? 0.5 : 1)};
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
  }
  td:first-child {
    color: #e2e8f0;
  }
`;

const StatusSelect = styled.select`
  padding: 4px 8px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 13px;
  width: 100px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
  option {
    background: #1e293b;
  }
`;

const ObservationInput = styled.input`
  padding: 4px 8px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  width: 100%;
  min-width: 150px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
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

const MetaRow = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: center;
  margin: 16px 0;
`;

const MetaLabel = styled.span`
  color: #94a3b8;
  font-size: 13px;
  margin-right: 8px;
`;

const InfoBadge = styled.span`
  background: #1e293b;
  padding: 4px 12px;
  border-radius: 30px;
  font-size: 13px;
  color: #94a3b8;
`;

// ==================== DONNÉES STATIQUES ====================
const MONTHS = [
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

// Liste des tâches (avec monnaie FCFA)
const TASKS = [
  {
    id: "suspens_precedent",
    title: "Traitement des points restés en suspens de la période précédente",
    instructions: [
      "Signaler ici les point en suspens significatifs toujours en suspens",
    ],
  },
  {
    id: "classement_pieces",
    title: "Classement des pièces reçues",
    instructions: [
      "Signaler ici les documents manquants ou les remarques sur le classement. Remonter l'information en interne.",
    ],
  },
  {
    id: "saisie_comptable",
    title: "Saisie des pièces comptables reçues",
    instructions: [
      "A la fin de la saisie, renseigner le nombre de lignes saisies ou, le cas échéant, éditer l'état à partir du logiciel",
    ],
  },
  {
    id: "saisie_paie",
    title: "Saisie des écritures de paie",
    instructions: [
      "A la fin de la saisie, renseigner le nombre de lignes saisies ou, le cas échéant, éditer l'état à partir du logiciel",
    ],
  },
  {
    id: "saisie_banque",
    title: "Saisie des opérations de banque",
    instructions: [
      "A la fin de la saisie, renseigner le nombre de lignes saisies ou, le cas échéant, éditer l'état à partir du logiciel",
    ],
  },
  {
    id: "lettrage_clients",
    title: "Lettrage des comptes clients",
    instructions: [
      "En cas de difficultés ou d'anomalies, remonter l'information dans les points en suspens de la période",
    ],
  },
  {
    id: "lettrage_tiers",
    title: "Lettrage des comptes de tiers",
    instructions: [
      "En cas de difficultés ou d'anomalies, remonter l'information dans les points en suspens de la période",
    ],
  },
  {
    id: "lettrage_467",
    title: "Lettrage des comptes 467 débiteurs/créditeurs",
    instructions: [
      "En cas de difficultés ou d'anomalies, remonter l'information dans les points en suspens de la période",
    ],
  },
  {
    id: "solde_471",
    title: "Solde du compte 471 à 0 FCFA ou questions posées au client",
    instructions: [
      "En cas de difficultés ou d'anomalies, remonter l'information dans les points en suspens de la période",
    ],
  },
  {
    id: "solde_580",
    title: "Solde du compte 580 à 0 FCFA",
    instructions: [
      "En cas de difficultés ou d'anomalies, remonter l'information dans les points en suspens de la période",
    ],
  },
  {
    id: "rapprochement_banque",
    title: "Rapprochement de banque",
    instructions: [
      "En cas de difficultés ou d'anomalies, remonter l'information dans les points en suspens de la période",
    ],
  },
  {
    id: "tva",
    title: "TVA (déclaration + envoi au client pour paiement ou télérèglement)",
    instructions: [
      "Signaler ici les difficultés rencontrées (problème/retard de télétransmission, retard du client, etc.)",
    ],
  },
  {
    id: "ecriture_tva",
    title: "Ecriture de TVA",
    instructions: [],
  },
  {
    id: "liste_suspens_client",
    title: "Liste des points en suspens de la période envoyée au client",
    instructions: [
      "Indiquer ici le mode d'envoi de la liste des suspens (mail, courrier, etc.)",
    ],
  },
  {
    id: "retour_pieces",
    title: "Retour des pièces au client",
    instructions: [
      "Indiquer ici le mode de retour des pièces (courrier, coursier, en mains-propres, etc.)",
    ],
  },
  {
    id: "saisie_temps",
    title: "Interne : Saisie des temps dans le logiciel",
    instructions: [
      "Ne pas omettre d'indiquer toute prestation ou travail effectués et non prévus dans la lettre de mission initiale",
    ],
  },
  {
    id: "besoins_client",
    title: "Identifier les besoins du client ou ses préoccupations",
    instructions: [
      "Signaler ici tout besoin formulé par le client ou ses préoccupation en matière de facturation, encaissement des créances, en ressources humaines, en rentabilité, etc.",
    ],
  },
  {
    id: "autre",
    title: "Autre",
    instructions: [],
  },
];

// ==================== INTERFACES ====================
interface Client {
  id: string;
  client_code: string;
  name: string;
  status?: string;
  niveau_risque?: string;
  date_cloture?: string;
  periodicite?: string;
}

interface TaskStatus {
  task_id: string;
  status: "F" | "EC" | "N" | "NA" | "";
  observation: string;
}

interface PeriodInfo {
  number: number;
  monthName: string | null;
  isValid: boolean;
}

// ==================== COMPOSANT PRINCIPAL ====================
const TravauxPeriodiques: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [periodInfos, setPeriodInfos] = useState<PeriodInfo[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la liste des clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select(
            "id, client_code, name, status, niveau_risque, date_cloture, periodicite",
          )
          .order("name");
        if (error) throw error;
        setClients(data || []);
        if (data && data.length > 0) setSelectedClientId(data[0].id);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Mettre à jour les infos du client et les périodes (adaptation Cameroun)
  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;
    setClientData(client);

    // Système camerounais : exercice civil débutant en janvier (mois 1)
    const startMonth = 1; // Janvier
    const frequency = client.periodicite || "Mensuelle";
    const periods: PeriodInfo[] = [];
    for (let i = 1; i <= 12; i++) {
      let offset: number;
      switch (frequency) {
        case "Mensuelle":
          offset = i - 1;
          break;
        case "Trimestrielle":
          offset = (i - 1) * 3;
          break;
        case "Semestrielle":
          offset = (i - 1) * 6;
          break;
        case "Annuelle":
          offset = (i - 1) * 12;
          break;
        default:
          offset = i - 1;
      }
      const isValid = offset <= 11;
      const monthName = isValid ? MONTHS[(startMonth - 1 + offset) % 12] : null;
      periods.push({ number: i, monthName, isValid });
    }
    setPeriodInfos(periods);

    // Charger les status pour la période sélectionnée
    fetchStatuses(client.id, currentPeriod);
  }, [selectedClientId, clients, currentPeriod]);

  // Charger les status depuis Supabase
  const fetchStatuses = async (clientId: string, period: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("periodic_task_statuses")
        .select("task_id, status, observation")
        .eq("client_id", clientId)
        .eq("period_number", period);

      if (error) throw error;

      const initialStatuses: TaskStatus[] = TASKS.map((task) => {
        const existing = data?.find((d: any) => d.task_id === task.id);
        return {
          task_id: task.id,
          status: existing?.status || "",
          observation: existing?.observation || "",
        };
      });
      setTaskStatuses(initialStatuses);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour un status localement
  const updateTaskStatus = (
    taskId: string,
    field: keyof TaskStatus,
    value: string,
  ) => {
    setTaskStatuses((prev) =>
      prev.map((ts) =>
        ts.task_id === taskId ? { ...ts, [field]: value } : ts,
      ),
    );
  };

  // Sauvegarder tous les status pour la période courante
  const savePeriod = async () => {
    if (!selectedClientId || !clientData) return;
    setSaving(true);
    try {
      const updates = taskStatuses.map((ts) => ({
        client_id: selectedClientId,
        period_number: currentPeriod,
        task_id: ts.task_id,
        status: ts.status || null,
        observation: ts.observation || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: delError } = await supabase
        .from("periodic_task_statuses")
        .delete()
        .eq("client_id", selectedClientId)
        .eq("period_number", currentPeriod);

      if (delError) throw delError;

      const { error: insError } = await supabase
        .from("periodic_task_statuses")
        .insert(updates);

      if (insError) throw insError;

      alert("Période sauvegardée !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Annuler : recharger depuis la base
  const cancel = async () => {
    if (!selectedClientId) return;
    await fetchStatuses(selectedClientId, currentPeriod);
  };

  // Export Excel (toutes les périodes)
  const exportExcel = async () => {
    if (!clientData) return;
    try {
      const { data, error } = await supabase
        .from("periodic_task_statuses")
        .select("*")
        .eq("client_id", clientData.id)
        .order("period_number")
        .order("task_id");

      if (error) throw error;

      const wb = XLSX.utils.book_new();

      for (let p = 1; p <= 12; p++) {
        const periodInfo = periodInfos.find((pi) => pi.number === p);
        const monthName = periodInfo?.monthName || "N/A";
        const rows: any[] = [
          [`Période ${p} - ${monthName}`],
          [`Client : ${clientData.name}`],
          [],
          ["Tâche", "Statut", "Observations"],
        ];

        TASKS.forEach((task) => {
          const status = data?.find(
            (d: any) => d.period_number === p && d.task_id === task.id,
          );
          const statusLabel = status?.status || "";
          const observation = status?.observation || "";
          rows.push([task.title, statusLabel, observation]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, `Période ${p}`);
      }

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Travaux_periodiques_${clientData.name}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      console.error(err);
      alert("Erreur export : " + err.message);
    }
  };

  // Rendu du tableau
  const renderStatusTable = () => {
    if (loading) return <p>Chargement...</p>;
    if (!clientData) return <p>Sélectionnez un client.</p>;

    const currentPeriodInfo = periodInfos.find(
      (p) => p.number === currentPeriod,
    );
    const isInvalidPeriod = !currentPeriodInfo?.isValid;

    return (
      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ minWidth: "300px" }}>Tâche</th>
              <th style={{ width: "120px" }}>Statut</th>
              <th style={{ minWidth: "200px" }}>Observations</th>
            </tr>
          </thead>
          <tbody>
            {TASKS.map((task) => {
              const status = taskStatuses.find((ts) => ts.task_id === task.id);
              return (
                <tr key={task.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{task.title}</div>
                    {task.instructions.length > 0 && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginTop: "4px",
                        }}
                      >
                        {task.instructions.map((inst, idx) => (
                          <div key={idx}>• {inst}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusSelect
                      value={status?.status || ""}
                      onChange={(e) =>
                        updateTaskStatus(task.id, "status", e.target.value)
                      }
                      disabled={isInvalidPeriod}
                      style={{
                        backgroundColor: isInvalidPeriod
                          ? "#1e293b"
                          : undefined,
                      }}
                    >
                      <option value="">--</option>
                      <option value="F">Fait</option>
                      <option value="EC">En cours</option>
                      <option value="N">Non fait</option>
                      <option value="NA">Non applicable</option>
                    </StatusSelect>
                  </td>
                  <td>
                    <ObservationInput
                      type="text"
                      value={status?.observation || ""}
                      onChange={(e) =>
                        updateTaskStatus(task.id, "observation", e.target.value)
                      }
                      disabled={isInvalidPeriod}
                      placeholder="Observations..."
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </StyledTable>
      </TableWrapper>
    );
  };

  if (loading && clients.length === 0) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement...</p>
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

  // Année en cours pour afficher la date de clôture (31/12/YYYY)
  const currentYear = new Date().getFullYear();

  return (
    <Container>
      <Selectors>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Client :</span>
          <StyledSelect
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClientId(e.target.value)}
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
          <i className="fas fa-tasks"></i> Travaux périodiques
        </HeaderTitle>
        <ClientBadge variant="status" status={clientData.status}>
          {clientData.status || "Actif"}
        </ClientBadge>
      </Header>

      <MetaRow>
        <div>
          <MetaLabel>Périodicité :</MetaLabel>
          <InfoBadge>{clientData.periodicite || "Mensuelle"}</InfoBadge>
        </div>
        <div>
          <MetaLabel>Exercice (Cameroun) :</MetaLabel>
          <InfoBadge>1er janvier – 31 décembre {currentYear}</InfoBadge>
        </div>
        <div>
          <MetaLabel>Monnaie :</MetaLabel>
          <InfoBadge>FCFA (XAF)</InfoBadge>
        </div>
      </MetaRow>

      <PeriodTabs>
        {periodInfos.map((p) => (
          <PeriodTab
            key={p.number}
            active={p.number === currentPeriod}
            invalid={!p.isValid}
            onClick={() => p.isValid && setCurrentPeriod(p.number)}
            disabled={!p.isValid}
          >
            Période {p.number}
            {p.monthName && ` (${p.monthName})`}
            {!p.isValid && " (N/A)"}
          </PeriodTab>
        ))}
      </PeriodTabs>

      {renderStatusTable()}

      <ButtonGroup>
        <ActionButton variant="primary" onClick={savePeriod} disabled={saving}>
          {saving ? "Sauvegarde..." : "ENREGISTRER LA PÉRIODE"}
        </ActionButton>
        <ActionButton variant="secondary" onClick={cancel} disabled={saving}>
          ANNULER
        </ActionButton>
      </ButtonGroup>
    </Container>
  );
};

export default TravauxPeriodiques;
