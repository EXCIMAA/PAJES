// src/pages/manuel/BouclageDossier.tsx
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
  $variant: "status" | "risk";
  $status?: string;
}>`
  padding: 4px 16px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  ${({ $variant, $status }) => {
    if ($variant === "status") {
      switch ($status) {
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
    if ($variant === "risk") {
      switch ($status) {
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

const CategoryRow = styled.tr`
  background-color: #1e293b;
  font-weight: bold;
  td {
    color: #4facfe;
    padding: 8px;
  }
`;

const StatusRadioGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const RadioLabel = styled.label<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${({ $checked }) => ($checked ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  input[type="radio"] {
    accent-color: #4facfe;
    width: 16px;
    height: 16px;
    cursor: pointer;
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

const ActionButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ $variant }) => {
    if ($variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if ($variant === "secondary")
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

const ObservationsArea = styled.div`
  margin-top: 24px;
  label {
    display: block;
    color: #94a3b8;
    font-size: 14px;
    margin-bottom: 6px;
  }
  textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: #0f172a;
    color: #e2e8f0;
    font-size: 14px;
    min-height: 80px;
    resize: vertical;
    &:focus {
      outline: none;
      border-color: #4facfe;
    }
  }
`;

const DescriptionText = styled.p`
  color: #94a3b8;
  font-size: 14px;
  font-style: italic;
  margin: 16px 0;
  padding: 12px 16px;
  background: #1e293b;
  border-radius: 8px;
  border-left: 3px solid #4facfe;
`;

// ==================== DONNÉES STATIQUES ====================
const DOCUMENTS = [
  {
    category: "Documents comptables, juridiques et fiscaux",
    items: [
      "Balance définitive",
      "Comptes annuels définitifs",
      "Feuilles de travail et feuilles maîtresses à jour avec la version définitive des comptes",
      "Liasse fiscale définitive (copie signée / accusé de réception si TDFC)",
      "Documents juridiques liés à l'approbation des comptes annuels",
      "Documents d'identification de client et de ses éventuels bénéficiaires effectif",
    ],
  },
  {
    category: "Autres éléments",
    items: [
      "Questionnaire de prise de connaissance générale de l'entité.",
      "Questionnaire d'acceptation ou du maintien de la mission.",
      "Questionnaire des obligations anti-blanchiment",
      "Lettre de mission signée",
      "Examen de cohérence et de vraisemblance (si Mission de Présentation des comptes)",
      "Conclusions sur les travaux effectués et attestation (ou rapport si présence d'un commissaire aux comptes)",
      "Liste des points en suspens de l'exercice",
      "Liste des points en suspens à suivre en N+1",
      "Note de synthèse",
      "Compte-rendu au client",
      "Rapports du commissaire aux comptes (le cas échéant)",
    ],
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
}

interface DocumentStatus {
  document_id: string;
  status: "Oui" | "Non" | "NA" | "";
  observation: string;
}

// ==================== COMPOSANT ====================
const BouclageDossier: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>(
    [],
  );
  const [observationsGenerales, setObservationsGenerales] =
    useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper pour les erreurs
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "Une erreur inconnue est survenue";
  };

  // Charger la liste des clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select("id, client_code, name, status, niveau_risque, date_cloture")
          .order("name");
        if (error) throw error;
        setClients(data || []);
        if (data && data.length > 0) setSelectedClientId(data[0].id);
      } catch (err) {
        console.error("Erreur chargement clients:", err);
        setError("Impossible de charger les clients.");
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Charger les statuts pour le client sélectionné
  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;
    setClientData(client);
    fetchStatuses(client.id);
  }, [selectedClientId, clients]);

  const fetchStatuses = async (clientId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bouclage_dossier_status")
        .select("document_id, status, observation")
        .eq("client_id", clientId);

      if (error) throw error;

      const allDocumentIds = DOCUMENTS.flatMap((cat) => cat.items);
      const initialStatuses: DocumentStatus[] = allDocumentIds.map((id) => {
        const existing = data?.find((d: any) => d.document_id === id);
        return {
          document_id: id,
          status: existing?.status || "",
          observation: existing?.observation || "",
        };
      });
      setDocumentStatuses(initialStatuses);
    } catch (err) {
      console.error("Erreur chargement statuts:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = (
    documentId: string,
    field: keyof DocumentStatus,
    value: string,
  ) => {
    setDocumentStatuses((prev) =>
      prev.map((d) =>
        d.document_id === documentId ? { ...d, [field]: value } : d,
      ),
    );
  };

  const saveData = async () => {
    if (!selectedClientId || !clientData) return;
    setSaving(true);
    try {
      const updates = documentStatuses.map((ds) => ({
        client_id: selectedClientId,
        document_id: ds.document_id,
        status: ds.status || null,
        observation: ds.observation || null,
        observations_generales: observationsGenerales || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: delError } = await supabase
        .from("bouclage_dossier_status")
        .delete()
        .eq("client_id", selectedClientId);

      if (delError) throw delError;

      const { error: insError } = await supabase
        .from("bouclage_dossier_status")
        .insert(updates);

      if (insError) throw insError;

      alert("Bouclage du dossier sauvegardé !");
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      alert("Erreur : " + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!selectedClientId) return;
    await fetchStatuses(selectedClientId);
    setObservationsGenerales("");
  };

  const exportExcel = () => {
    if (!clientData) return;

    const rows: any[] = [];
    rows.push(["Bouclage final du dossier"]);
    rows.push([]);
    rows.push(["Client", clientData.name]);
    rows.push([
      "Date de clôture",
      clientData.date_cloture
        ? new Date(clientData.date_cloture).toLocaleDateString("fr-FR")
        : "Non définie",
    ]);
    rows.push([]);
    rows.push(["Document", "Oui", "Non", "NA", "Observations"]);

    DOCUMENTS.forEach((cat) => {
      rows.push([cat.category, "", "", "", ""]);
      cat.items.forEach((item) => {
        const status = documentStatuses.find((d) => d.document_id === item);
        const statusValue = status?.status || "";
        const oui = statusValue === "Oui" ? "x" : "";
        const non = statusValue === "Non" ? "x" : "";
        const na = statusValue === "NA" ? "x" : "";
        const observation = status?.observation || "";
        rows.push([item, oui, non, na, observation]);
      });
      rows.push([]);
    });

    rows.push([]);
    rows.push(["Observations générales", observationsGenerales]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bouclage");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Bouclage_dossier_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renderTable = () => {
    if (loading) return <p>Chargement...</p>;
    if (!clientData) return <p>Sélectionnez un client.</p>;

    return (
      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ minWidth: "300px" }}>Document</th>
              <th style={{ width: "160px" }}>Statut</th>
              <th style={{ minWidth: "200px" }}>Observations</th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((cat, idx) => (
              <React.Fragment key={idx}>
                <CategoryRow>
                  <td colSpan={3}>{cat.category}</td>
                </CategoryRow>
                {cat.items.map((item) => {
                  const status = documentStatuses.find(
                    (d) => d.document_id === item,
                  );
                  const currentStatus = status?.status || "";
                  const observation = status?.observation || "";
                  return (
                    <tr key={item}>
                      <td>{item}</td>
                      <td>
                        <StatusRadioGroup>
                          <RadioLabel $checked={currentStatus === "Oui"}>
                            <input
                              type="radio"
                              name={`status-${item}`}
                              value="Oui"
                              checked={currentStatus === "Oui"}
                              onChange={() =>
                                updateDocument(item, "status", "Oui")
                              }
                            />
                            Oui
                          </RadioLabel>
                          <RadioLabel $checked={currentStatus === "Non"}>
                            <input
                              type="radio"
                              name={`status-${item}`}
                              value="Non"
                              checked={currentStatus === "Non"}
                              onChange={() =>
                                updateDocument(item, "status", "Non")
                              }
                            />
                            Non
                          </RadioLabel>
                          <RadioLabel $checked={currentStatus === "NA"}>
                            <input
                              type="radio"
                              name={`status-${item}`}
                              value="NA"
                              checked={currentStatus === "NA"}
                              onChange={() =>
                                updateDocument(item, "status", "NA")
                              }
                            />
                            NA
                          </RadioLabel>
                        </StatusRadioGroup>
                      </td>
                      <td>
                        <ObservationInput
                          type="text"
                          value={observation}
                          onChange={(e) =>
                            updateDocument(item, "observation", e.target.value)
                          }
                          placeholder="Observation..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
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
        <button onClick={() => window.location.reload()}>Réessayer</button>
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
          <i className="fas fa-folder-check"></i> Bouclage final du dossier
        </HeaderTitle>
        <ClientBadge $variant="status" $status={clientData.status}>
          {clientData.status || "Actif"}
        </ClientBadge>
      </Header>

      <MetaRow>
        <div>
          <MetaLabel>Date de clôture :</MetaLabel>
          <InfoBadge>
            {clientData.date_cloture
              ? new Date(clientData.date_cloture).toLocaleDateString("fr-FR")
              : "Non définie"}
          </InfoBadge>
        </div>
        <div>
          <MetaLabel>Exercice (Cameroun) :</MetaLabel>
          <InfoBadge>
            1er janvier – 31 décembre {new Date().getFullYear()}
          </InfoBadge>
        </div>
      </MetaRow>

      <DescriptionText>
        <i
          className="fas fa-info-circle"
          style={{ color: "#4facfe", marginRight: "8px" }}
        ></i>
        Vérifier que tous les éléments suivants figurent dans le dossier. Liste
        non exhaustive pouvant être modifiée ou complétée.
      </DescriptionText>

      {renderTable()}

      <ObservationsArea>
        <label htmlFor="obsGenerales">Observations générales</label>
        <textarea
          id="obsGenerales"
          value={observationsGenerales}
          onChange={(e) => setObservationsGenerales(e.target.value)}
          placeholder="Saisissez ici vos observations générales..."
        />
      </ObservationsArea>

      <ButtonGroup>
        <ActionButton $variant="primary" onClick={saveData} disabled={saving}>
          {saving ? "Sauvegarde..." : "ENREGISTRER"}
        </ActionButton>
        <ActionButton $variant="secondary" onClick={cancel} disabled={saving}>
          ANNULER
        </ActionButton>
      </ButtonGroup>
    </Container>
  );
};

export default BouclageDossier;
