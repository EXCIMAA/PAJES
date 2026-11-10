// src/pages/manuel/DemandeDocumentsClient.tsx

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

const TabsContainer = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #1e293b;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ active: boolean }>`
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-weight: 500;
  font-size: 14px;
  color: ${({ active }) => (active ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  border-bottom: 3px solid
    ${({ active }) => (active ? "#4facfe" : "transparent")};
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
    padding: 6px 10px;
    border-bottom: 1px solid #1e293b;
    text-align: left;
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

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #4facfe;
  cursor: pointer;
  background: #1e293b;
  border: 1px solid #334155;
  &:checked {
    accent-color: #4facfe;
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

const SignatureInput = styled.input`
  padding: 6px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 14px;
  flex: 1;
  min-width: 150px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const MetaRow = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin: 16px 0;
  align-items: center;
`;

const MetaLabel = styled.label`
  color: #94a3b8;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
`;

// ==================== DONNÉES DES LISTES ====================

const repriseDocuments = [
  {
    category: "Documents juridiques",
    items: [
      "Kbis récent et inscriptions légales",
      "Statuts à jour",
      "Récépissé du dépôt en préfecture des dernières modifications",
      "Copie du registre spécial prévu par les associations",
      "Organigramme de la structure récent",
      "Liste des associés/membres du conseil d'administration/ directoire et leurs coordonnées",
      "Document officiel d’identité (carte d’identité, passeport, permis de conduire…) du/des dirigeant(s)",
      "Justificatif de domicile ou d’une copie de la déclaration de revenus du/des dirigeant(s)",
      "Pactes d'actionnaires",
      "Registre des mouvements de titres et comptes actionnaires",
      "Procès verbaux des conseils d'administration des trois derniers exercices",
      "Procès verbaux des directoires des trois derniers exercices",
      "Procès verbaux des assemblées générales des trois derniers exercices",
      "Rapport de gestion des trois dernires exercices",
      "Modalités de délégation de signature et de pouvoirs",
      "Baux",
      "Acte de propriété ou attestation notariée",
      "Contrat de crédit bail",
      "Contrat de prêt",
      "Contrat d'assurances",
      "Principales conventions conclues",
      "Principaux contrats de location et de sous-traitance",
      "Liste des nantissements, état des inscriptions hypothécaires, autres)",
      "Litiges éventuels en relation avec les droits de propriété intellectuelle",
      "Etat des litiges en cours et évaluation du conseil (avocat) qui suit ces litiges",
      "Liste des principaux risques et litiges non encore déclarés",
    ],
  },
  {
    category: "Documents comptables",
    items: [
      "Comptes annuels du dernier exercice",
      "Balance générale/auxiliaire du dernier exercice clos",
      "Grand-Livre général/auxiliaire du dernier exercice clos",
      "Journaux",
      "Fichier des écritures comptables du dernier exercice clos",
      "Relevés bancaires du dernier mois du dernier exercice clos",
      "Rapprochement bancaire du dernier mois du dernier exercice clos",
      "Relevés des placements financiers",
      "Liste des immobilisations à la clôture du dernier exercice clos (avec la copie des factures d’achat si possible)",
      "Inventaire des stocks de clôture de l'exercice précédent",
      "Etat des amortissements à la clôture du dernier exercice clos",
      "Rapports du commissaire aux comptes du dernier exercice",
      "Rapports d'audits (intervenants extérieurs et audit interne)",
      "Notification des derniers contrôles Urssaf et fiscal",
      "Manuel de procédures administratives et comptables",
    ],
  },
  {
    category: "Documents fiscaux",
    items: [
      "Liasse fiscale du dernier exercice",
      "Déclarations de TVA du dernier exercice",
      "Déclaration d'IS du dernier exercice clos",
      "Déclarations CVAE/CFE (acomptes et soldes)",
      "DAS 2 (déclaration d’honoraires) du dernier exercice clos",
      "Notification des derniers contrôles fiscaux",
    ],
  },
  {
    category: "Documents sociaux (liés au statut de TNS)",
    items: [
      "2042 de l'année civile N-1 (déclarée cette année)",
      "Contrats Madelins",
      "Historique des revenus sur les trois dernières années",
      "Notification des derniers contrôles URSSAF",
    ],
  },
];

const preparationDocuments = [
  {
    category: "Documents juridiques",
    items: [
      "Procès-verbal de l'assemblée générale d'approbation des comptes de l'exercice précédent",
      "Déclaration 2777 relative aux dividendes dans l'exercice et envoyée aux impôts",
      "Conventions : mise à disposition/refacturation de locaux, personnels, autres…",
      "Liste des litiges en cours éventuels",
    ],
  },
  {
    category: "Documents comptables & financiers",
    items: [
      "Relevés bancaires et souches de chéquiers de l'exercice clos encore en votre possession",
      "Inventaire physique de la caisse à la clôture de l'exercice",
      "Etat de votre portefeuille de placements à la clôture (état adressé par la banque)",
      "Tableau d’amortissement des emprunts souscrits en cours d’exercice",
      "Factures d’investissements encore en votre possession",
      "Factures d’achats et frais généraux de l'exercice encore en votre possession",
      "Liste des factures restant à recevoir à la date de clôture de la part de vos fournisseurs pour des travaux ou achats effectués avant la date de clôture",
      "Liste des factures reçues de vos fournisseurs avant la date de clôture pour des achats ou prestations non réalisées à cette date",
      "Liste et justificatifs des notes de frais à payer (dirigeants et salariés) concernant l'exercice mais établies ou réglées sur l'exercice suivant",
      "Justificatifs du nombre de kilomètres effectués au cours de l'exercice à titre professionnel avec votre véhicule personnel accompagné de la copie de la carte grise du véhicule",
      "Inventaire physique du stock valorisé à la clôture de l'exercice (document récapitulatif signé du dirigeant)",
      "Détail des travaux en cours à la clôture valorisés à leur coût de revient (matières + coût de la main-d’œuvre)",
      "Liste des factures/avoirs restant à établir à la date de clôture à vos clients pour des livraisons ou prestations réalisées avant la date de clôture",
      "Liste des factures établies à vos clients avant la date de clôture pour des livraisons ou prestations non réalisées à cette date",
      "Détail de vos factures clients dont l'encaissement est incertain",
      "Tableau de suivi de votre chiffre d’affaires",
      "Cessions et mises au rebut d’immobilisations au cours de l’année",
    ],
  },
  {
    category: "Documents fiscaux",
    items: [
      "Déclarations de TVA établies par vos soins au cours de l'exercice",
      "Déclaration d'IS du dernier exercice clos établie par vos soins",
      "Déclarations CVAE/CFE (acomptes et soldes) établies et déclarés par vos soins",
      "Déclaration 2777 relative aux dividendes dans l'exercice et envoyée aux impôts",
      "IFU relatif aux opérations de l'année (état reçu de la banque)",
      "Fichier des écritures comptables après saisie et validation des écritures du Cabinet",
    ],
  },
  {
    category: "Documents sociaux (liés au statut de TNS)",
    items: [
      "Bordereaux d’appel de cotisation (URSSAF, CIPAV, AVA, ORGANIC…)",
      "Notifications annuelles URSSAF",
      "Détail de vos rémunérations versées au cours de l'exercice et à retenir pour la déclaration TNS",
    ],
  },
  {
    category: "Documents sociaux (liés aux salariés)",
    items: [
      "Bordereaux trimestriels ou mensuels et TR de cotisations sociales (URSSAF, retraite, prévoyance, autres organismes)",
      "DSN mensuelle et évènementielle le cas échéant",
      "Bulletins de paye du dernier mois de l'exercice",
      "Etat des soldes de congés payés restant au dernier jour du mois de l'exercice",
      "Liste des régularisations de salaires provisionnées (primes, compléments,...)",
      "Liste des notes de frais à payer (concernant 2024 mais réglées ou avec une demande de remboursement en 2025)",
      "Etat récapitulatif des salaires issus du logiciel de paye",
      "Etats récapitulatifs des charges sociales issus du logiciel de paye",
      "Etats individuels issus du logiciel de paye",
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
}

type DocState = { requested: boolean; returned: boolean };
type DocumentsJSON = Record<string, DocState>;

interface DocumentData {
  id?: string;
  client_id: string;
  type: "reprise" | "preparation";
  documents: DocumentsJSON;
  date_envoi: string;
  date_retour: string;
  signature: string;
}

// ==================== COMPOSANT ====================

const DemandeDocumentsClient: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<"reprise" | "preparation">(
    "reprise",
  );
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Chargement des clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select("id, client_code, name, status, niveau_risque")
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

  // Chargement des données pour le client sélectionné et l'onglet actif
  useEffect(() => {
    if (!selectedClientId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        // Infos client
        const { data: clientInfo } = await supabase
          .from("clients")
          .select("id, client_code, name, status, niveau_risque")
          .eq("id", selectedClientId)
          .single();
        setClientData(clientInfo);

        // Données documents pour le type actif
        const { data: docData, error } = await supabase
          .from("documents_client")
          .select("*")
          .eq("client_id", selectedClientId)
          .eq("type", activeTab)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (docData) {
          setData(docData);
        } else {
          // Créer un objet JSON avec tous les documents à false
          const docList =
            activeTab === "reprise" ? repriseDocuments : preparationDocuments;
          const docObj: DocumentsJSON = {};
          docList.forEach((cat) => {
            cat.items.forEach((item) => {
              docObj[item] = { requested: false, returned: false };
            });
          });
          setData({
            client_id: selectedClientId,
            type: activeTab,
            documents: docObj,
            date_envoi: "",
            date_retour: "",
            signature: "",
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedClientId, activeTab]);

  // Mise à jour d'un document
  const toggleDocument = (docName: string, field: "requested" | "returned") => {
    if (!data) return;
    const newDocs = { ...data.documents };
    if (!newDocs[docName])
      newDocs[docName] = { requested: false, returned: false };
    newDocs[docName] = {
      ...newDocs[docName],
      [field]: !newDocs[docName][field],
    };
    setData({ ...data, documents: newDocs });
  };

  // Mise à jour des champs méta
  const handleMetaChange = (
    field: keyof Pick<DocumentData, "date_envoi" | "date_retour" | "signature">,
    value: string,
  ) => {
    if (data) setData({ ...data, [field]: value });
  };

  // Sauvegarde
  const saveData = async () => {
    if (!data || !selectedClientId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("documents_client")
        .select("id")
        .eq("client_id", selectedClientId)
        .eq("type", activeTab)
        .single();

      if (existing) {
        await supabase
          .from("documents_client")
          .update(data)
          .eq("client_id", selectedClientId)
          .eq("type", activeTab);
      } else {
        await supabase.from("documents_client").insert([data]);
      }
      alert("Données sauvegardées !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Annulation : recharger depuis la base
  const cancel = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const { data: docData, error } = await supabase
        .from("documents_client")
        .select("*")
        .eq("client_id", selectedClientId)
        .eq("type", activeTab)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (docData) {
        setData(docData);
      } else {
        // Réinitialiser avec tous les documents à false
        const docList =
          activeTab === "reprise" ? repriseDocuments : preparationDocuments;
        const docObj: DocumentsJSON = {};
        docList.forEach((cat) => {
          cat.items.forEach((item) => {
            docObj[item] = { requested: false, returned: false };
          });
        });
        setData({
          client_id: selectedClientId,
          type: activeTab,
          documents: docObj,
          date_envoi: "",
          date_retour: "",
          signature: "",
        });
      }
    } catch (err: any) {
      console.error(err);
      alert("Erreur annulation : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export Excel (deux feuilles : Reprise et Préparation)
  const exportExcel = () => {
    if (!clientData) return;
    const wb = XLSX.utils.book_new();

    // Fonction pour créer une feuille
    const createSheet = (type: "reprise" | "preparation", title: string) => {
      const docList =
        type === "reprise" ? repriseDocuments : preparationDocuments;
      const rows: any[] = [
        [title],
        ["Client", clientData.name],
        [],
        ["Document", "Documents demandés", "Documents retournés"],
      ];
      docList.forEach((cat) => {
        rows.push([cat.category, "", ""]);
        cat.items.forEach((item) => {
          const docState = data?.documents?.[item] || {
            requested: false,
            returned: false,
          };
          rows.push([
            item,
            docState.requested ? "X" : "",
            docState.returned ? "X" : "",
          ]);
        });
        rows.push([]);
      });
      rows.push([]);
      rows.push(["Date d'envoi de la demande", data?.date_envoi || ""]);
      rows.push(["Date de retour des documents", data?.date_retour || ""]);
      rows.push(["Signature", data?.signature || ""]);
      return XLSX.utils.aoa_to_sheet(rows);
    };

    const wsReprise = createSheet(
      "reprise",
      "Liste des documents à obtenir pour la reprise d'un dossier",
    );
    XLSX.utils.book_append_sheet(wb, wsReprise, "Reprise");

    const wsPrep = createSheet(
      "preparation",
      "Liste des documents nécessaire pour l'arrêté des comptes",
    );
    XLSX.utils.book_append_sheet(wb, wsPrep, "Préparation");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Documents_client_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Rendu de la table des documents pour l'onglet actif
  const renderDocumentTable = () => {
    const docList =
      activeTab === "reprise" ? repriseDocuments : preparationDocuments;
    if (!data) return <p>Chargement...</p>;

    return (
      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ minWidth: "300px" }}>Document</th>
              <th style={{ width: "120px", textAlign: "center" }}>
                Documents demandés
              </th>
              <th style={{ width: "120px", textAlign: "center" }}>
                Documents retournés
              </th>
            </tr>
          </thead>
          <tbody>
            {docList.map((category, idx) => (
              <React.Fragment key={idx}>
                <tr style={{ backgroundColor: "#1e293b", fontWeight: "bold" }}>
                  <td colSpan={3} style={{ color: "#4facfe", padding: "8px" }}>
                    {category.category}
                  </td>
                </tr>
                {category.items.map((item, i) => {
                  const state = data.documents[item] || {
                    requested: false,
                    returned: false,
                  };
                  return (
                    <tr key={i}>
                      <td>{item}</td>
                      <td style={{ textAlign: "center" }}>
                        <Checkbox
                          type="checkbox"
                          checked={state.requested}
                          onChange={() => toggleDocument(item, "requested")}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Checkbox
                          type="checkbox"
                          checked={state.returned}
                          onChange={() => toggleDocument(item, "returned")}
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
      </Container>
    );
  }

  if (!clientData || !data) {
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
          <i className="fas fa-file-alt"></i> Demande de documents au client
        </HeaderTitle>
        <ClientBadge variant="status" status={clientData.status}>
          {clientData.status || "Actif"}
        </ClientBadge>
      </Header>

      <TabsContainer>
        <TabButton
          active={activeTab === "reprise"}
          onClick={() => setActiveTab("reprise")}
        >
          <i className="fas fa-folder-open"></i> Reprise d'un dossier
        </TabButton>
        <TabButton
          active={activeTab === "preparation"}
          onClick={() => setActiveTab("preparation")}
        >
          <i className="fas fa-calculator"></i> Préparation des comptes
        </TabButton>
      </TabsContainer>

      {renderDocumentTable()}

      <MetaRow>
        <div style={{ flex: 1 }}>
          <MetaLabel>Date d'envoi de la demande</MetaLabel>
          <SignatureInput
            type="date"
            value={data.date_envoi || ""}
            onChange={(e) => handleMetaChange("date_envoi", e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <MetaLabel>Date de retour des documents</MetaLabel>
          <SignatureInput
            type="date"
            value={data.date_retour || ""}
            onChange={(e) => handleMetaChange("date_retour", e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <MetaLabel>Signature</MetaLabel>
          <SignatureInput
            type="text"
            placeholder="Signature"
            value={data.signature || ""}
            onChange={(e) => handleMetaChange("signature", e.target.value)}
          />
        </div>
      </MetaRow>

      <ButtonGroup>
        <ActionButton variant="primary" onClick={saveData} disabled={saving}>
          {saving ? "Sauvegarde..." : "ENREGISTRER"}
        </ActionButton>
        <ActionButton variant="secondary" onClick={cancel} disabled={saving}>
          ANNULER
        </ActionButton>
      </ButtonGroup>
    </Container>
  );
};

export default DemandeDocumentsClient;
