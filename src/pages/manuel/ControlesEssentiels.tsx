// src/pages/manuel/ControlesEssentiels.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

// ==================== STYLES (avec props préfixées $) ====================
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

const ImpactInput = styled.input`
  padding: 4px 8px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  width: 100%;
  min-width: 200px;
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

// ==================== DONNÉES STATIQUES ====================
const CONTROLS = [
  {
    category: "Contrôles d'ensemble",
    items: [
      "S’assurer que les comptes d’attente sont soldés",
      "S’assurer que les comptes de virements internes sont soldés",
      "S'assurer que les balances auxiliaires correspondent bien à la dernière version de la balance",
      "S'assurer que le projet de comptes annuels correspond à la dernière version de la balance",
      "Contrôler par sondages que les enregistrements comptables s’appuient sur une pièce justificative et que l'imputation comptable est correcte (si la comptabilité est tenue par le client)",
      "Contrôler la cohérence des principaux ratios par rapport à ceux de l’exercice précédent",
    ],
  },
  {
    category: "Trésorerie",
    items: [
      "Contrôler l’état de rapprochement de caisse signé par le client",
      "Contrôler par épreuve l’absence de soldes créditeurs en caisse au cours de l’exercice",
      "Vérifier le dénouement des opérations en rapprochement sur l’exercice suivant",
      "Contrôler l’état de rapprochement de banque",
      "Contrôler l’état des valeurs mobilières avec la comptabilité\n=> Vérifier le calcul du coût d’entrée des valeurs au regard de l’option sur les frais accessoires liés à l’acquisition\n=> Vérifier le calcul des éventuelles dépréciations",
      "Contrôler les tableaux d’amortissement des emprunts avec la comptabilité",
      "Obtenir l’accord des associés sur leur compte courant",
    ],
  },
  {
    category: "Achats",
    items: [
      "Analyser les principaux comptes d’achats afin de détecter d’éventuelles anomalies qui pourraient justifier des contrôles complémentaires",
      "Contrôler les comptes des fournisseurs débiteurs",
      "Faire quelques tests pour s’assurer que les soldes des comptes fournisseurs sont validés par des pièces justificatives",
      "S’assurer que les dettes anciennes à la date de clôture ont bien été réglées sur les premières semaines de l’exercice suivant",
      "Vérifier que les soldes débiteurs et créditeurs des fournisseurs ne sont pas compensés",
      "Contrôler la cohérence du ratio fournisseurs",
      "Contrôler la correcte séparation des exercices : FNP, AAR, CCA",
      "Contrôler la concordance entre la comptabilité et les contrats et échéanciers pour crédit-bail, loyer, assurances …",
      "S’assurer que les comptes de charges ne contiennent pas des biens susceptibles de constituer des immobilisations",
      "S’assurer du respect des règles fiscales : Indemnités km, réintégration fiscale pour les VP pris en location, règles fiscale en matière de cadeaux, frais de récéption …",
    ],
  },
  {
    category: "Ventes",
    items: [
      "Valider le chiffre d'affaires comptabilisé avec l’état obtenu du client",
      "Contrôler par épreuve le dénouement en N+1 de certaines créances clients significatives",
      "Contrôler les créances douteuses et leur dépréciation",
      "Contrôler la cohérence du ration crédit clients",
      "Contrôler la correcte séparation des exercices : FAE, AAE, PCA, Fonds dédiés",
      "Contrôler les comptes clients créditeurs",
      "Rapprocher le montant des subventions, concours publics, cotisations/adhésions, dons/mécénats comptabilisés",
      "S’assurer du respect des règles fiscales : en matière de DEB/DES, de faits générateur de TVA, des ventes dans l'UE supérieures à 10M FCFA, ...",
    ],
  },
  {
    category: "Stocks",
    items: [
      "Obtenir du client un état récapitulatif daté et signé",
      "S'assurer que le total des stocks/en cours, et que le montant de la provision figurant sur les états du client sont identiques au montant en comptabilité.",
      "S'assurer de la méthode de valorisation utilisée (dernier prix d’achat, CUMP, etc.)",
      "Vérifier l’ancienneté des références pour d’éventuelles dépréciations",
      "Contrôler, par épreuves, l’application de la méthode de valorisation annoncée et de dépréciation",
      "Contrôler la cohérence du montant des en-cours avec la facturation de l’exercice suivant",
    ],
  },
  {
    category: "Immobilisations",
    items: [
      "Contrôler la concordance avec l’état des immobilisations et des amortissements",
      "Contrôler les mouvements des immobilisations financières",
      "Vérifier de la nécessité ou non de procéder à une dépréciation",
    ],
  },
  {
    category: "Personnel & TNS",
    items: [
      "Contrôler le rapprochement entre les salaires comptabilisés et \n- les DSN\n- le livre de paie",
      "Contrôler les soldes des dettes fiscales et sociales avec les déclarations de la dernière période",
      "Vérifier que les provisions ont été comptabilisées à la fin de l'exercice : Provision CP/RTT, pour primes (PPV, PEPA, …)",
      "Contrôler, le cas échéant, la comptabilisation des indemnités de rupture conventionnelle, de licenciement et d'interressement.",
      "Apprécier le taux global de charges sociales",
      "Contrôler le rapprochement entre les rémunérations versées avec les justificatifs (PV d'AGO, justificatif du montant comptabilisé validé par le client, prise en compte des avantages en nature, …)",
      "Vérifier d'avoir à disposition toutes les informations nécessaires au calcul des TNS (Urssaf, CIPAV, Assurances complémentaires, Madelin avec attestation de déductibilité le cas échéant)",
      "Contrôler la concordance entre les cotisations de TNS calculée avec la rémunération versée au titre de l'exercice.",
    ],
  },
  {
    category: "Etat",
    items: [
      "Contrôler le rapprochement du chiffre d’affaires déclaré en TVA avec la comptabilité",
      "Contrôler le calcul du résultat fiscal et de l’IS",
      "Contrôler le rapprochement des bordereaux des taxes et contributions sociales avec la comptabilité",
      "Contrôler la cohérence des bases de la CFE et du calcul de la VA pour la CVAE, et leur comptabilisation sur l'exercice",
      "Vérifier que les autres contributions et taxes ont été comptabilisées au cours de l'exercice le cas échéant (Taxe sur les véhicules, taxe foncière, taxe sur les bureaux, etc.)",
    ],
  },
  {
    category: "Capitaux propres et provisions",
    items: [
      "Vérifier l’affectation du résultat N-1",
      "Justifier la répartition du capital (si elle a évolué depuis la précédente clôture)",
      "Vérifier le montant de la réserve légale",
      "En cas de distribution de dividendes en cours d’année, justifier l'existence de la déclaration 2777 sur les dividendes, et des IFU.",
      "Valider les soldes des comptes 131 et 139",
      "Valider les soldes des comptes 19 : Rapprochement avec les soldes des comptes 689 et 789",
      "Vérifier que les provisions répondent bien à la définition du PCG, et s'assurer de leur déductibilité",
      "Obtenir l’accord de l’exploitant sur son compte le cas échéant (compte 108)",
      "Vérifier la bonne application des décisions des assemblées",
      "Apprécier, avec le client, les risques et l’opportunité de certaines provisions",
    ],
  },
  {
    category: "Autres comptes",
    items: [
      "Vérifier l’absence de comptes courants débiteurs",
      "Contrôle du régime fiscal des intérêts versés aux associés sur leur compte courant",
      "Contrôle de la numérotation des comptes avec les exigences du PCG en vigueur",
      "Valider / justifier le montant des comptes intercos le cas échéant",
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
  periodicite?: string;
}

interface ControlStatus {
  control_id: string;
  status: "Fait" | "Non Fait" | "NA" | "";
  impact: string;
}

// ==================== COMPOSANT ====================
const ControlesEssentiels: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [controlStatuses, setControlStatuses] = useState<ControlStatus[]>([]);
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
          .select(
            "id, client_code, name, status, niveau_risque, date_cloture, periodicite",
          )
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
        .from("controles_essentiels_status")
        .select("control_id, status, impact")
        .eq("client_id", clientId);

      if (error) throw error;

      // Initialiser tous les statuts avec les valeurs existantes ou vides
      const allControlIds = CONTROLS.flatMap((cat) => cat.items);
      const initialStatuses: ControlStatus[] = allControlIds.map((id) => {
        const existing = data?.find((d: any) => d.control_id === id);
        return {
          control_id: id,
          status: existing?.status || "",
          impact: existing?.impact || "",
        };
      });
      setControlStatuses(initialStatuses);
    } catch (err) {
      console.error("Erreur chargement statuts:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour le statut ou l'impact d'un contrôle
  const updateControl = (
    controlId: string,
    field: keyof ControlStatus,
    value: string,
  ) => {
    setControlStatuses((prev) =>
      prev.map((c) =>
        c.control_id === controlId ? { ...c, [field]: value } : c,
      ),
    );
  };

  // Sauvegarder tous les statuts
  const saveData = async () => {
    if (!selectedClientId || !clientData) return;
    setSaving(true);
    try {
      const updates = controlStatuses.map((cs) => ({
        client_id: selectedClientId,
        control_id: cs.control_id,
        status: cs.status || null,
        impact: cs.impact || null,
        updated_at: new Date().toISOString(),
      }));

      // Supprimer les anciens statuts
      const { error: delError } = await supabase
        .from("controles_essentiels_status")
        .delete()
        .eq("client_id", selectedClientId);

      if (delError) throw delError;

      // Insérer les nouveaux
      const { error: insError } = await supabase
        .from("controles_essentiels_status")
        .insert(updates);

      if (insError) throw insError;

      alert("Contrôles sauvegardés !");
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      alert("Erreur : " + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Annuler : recharger depuis la base
  const cancel = async () => {
    if (!selectedClientId) return;
    await fetchStatuses(selectedClientId);
    setObservationsGenerales(""); // pas encore stocké
  };

  // Export Excel
  const exportExcel = () => {
    if (!clientData) return;

    const rows: any[] = [];
    rows.push(["Les contrôles essentiels"]);
    rows.push([]);
    rows.push(["Client", clientData.name]);
    rows.push([]);
    rows.push([
      "Catégorie",
      "Contrôle",
      "Fait",
      "Non Fait",
      "NA",
      "Impact sur les contrôles",
    ]);

    CONTROLS.forEach((cat) => {
      cat.items.forEach((item) => {
        const status = controlStatuses.find((c) => c.control_id === item);
        const statusValue = status?.status || "";
        const fait = statusValue === "Fait" ? "x" : "";
        const nonFait = statusValue === "Non Fait" ? "x" : "";
        const na = statusValue === "NA" ? "x" : "";
        const impact = status?.impact || "";
        rows.push([cat.category, item, fait, nonFait, na, impact]);
      });
      rows.push([]);
    });

    rows.push([]);
    rows.push(["Observations générales", observationsGenerales]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Controles");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Controles_essentiels_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Rendu du tableau
  const renderTable = () => {
    if (loading) return <p>Chargement...</p>;
    if (!clientData) return <p>Sélectionnez un client.</p>;

    return (
      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ minWidth: "300px" }}>Contrôle</th>
              <th style={{ width: "180px" }}>Statut</th>
              <th style={{ minWidth: "200px" }}>Impact sur les contrôles</th>
            </tr>
          </thead>
          <tbody>
            {CONTROLS.map((cat, idx) => (
              <React.Fragment key={idx}>
                <CategoryRow>
                  <td colSpan={3}>{cat.category}</td>
                </CategoryRow>
                {cat.items.map((item) => {
                  const status = controlStatuses.find(
                    (c) => c.control_id === item,
                  );
                  const currentStatus = status?.status || "";
                  const impact = status?.impact || "";
                  return (
                    <tr key={item}>
                      <td style={{ whiteSpace: "pre-line" }}>{item}</td>
                      <td>
                        <StatusRadioGroup>
                          <RadioLabel $checked={currentStatus === "Fait"}>
                            <input
                              type="radio"
                              name={`status-${item}`}
                              value="Fait"
                              checked={currentStatus === "Fait"}
                              onChange={() =>
                                updateControl(item, "status", "Fait")
                              }
                            />
                            Fait
                          </RadioLabel>
                          <RadioLabel $checked={currentStatus === "Non Fait"}>
                            <input
                              type="radio"
                              name={`status-${item}`}
                              value="Non Fait"
                              checked={currentStatus === "Non Fait"}
                              onChange={() =>
                                updateControl(item, "status", "Non Fait")
                              }
                            />
                            Non Fait
                          </RadioLabel>
                          <RadioLabel $checked={currentStatus === "NA"}>
                            <input
                              type="radio"
                              name={`status-${item}`}
                              value="NA"
                              checked={currentStatus === "NA"}
                              onChange={() =>
                                updateControl(item, "status", "NA")
                              }
                            />
                            NA
                          </RadioLabel>
                        </StatusRadioGroup>
                      </td>
                      <td>
                        <ImpactInput
                          type="text"
                          value={impact}
                          onChange={(e) =>
                            updateControl(item, "impact", e.target.value)
                          }
                          placeholder="Impact / observation..."
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
          <i className="fas fa-check-double"></i> Contrôles essentiels
        </HeaderTitle>
        <ClientBadge $variant="status" $status={clientData.status}>
          {clientData.status || "Actif"}
        </ClientBadge>
      </Header>

      <MetaRow>
        <div>
          <MetaLabel>Exercice (Cameroun) :</MetaLabel>
          <InfoBadge>
            1er janvier – 31 décembre {new Date().getFullYear()}
          </InfoBadge>
        </div>
        <div>
          <MetaLabel>Monnaie :</MetaLabel>
          <InfoBadge>FCFA (XAF)</InfoBadge>
        </div>
      </MetaRow>

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

export default ControlesEssentiels;
