// src/pages/manuel/PlanningClient.tsx

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

// ==================== STYLED COMPONENTS (thème sombre) ====================

const Container = styled.div`
  background: #0f172a;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #1e293b;
  animation: fadeIn 0.3s ease;
  color: #e2e8f0;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const ClientHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #1e293b;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const ClientTitle = styled.div`
  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
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
    margin-top: 4px;
  }
`;

const ClientBadges = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
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

const TabsContainer = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #1e293b;
  margin-bottom: 24px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 2px;
  }
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

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 13px;
    span {
      display: none;
    }
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid #1e293b;

  label {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  span {
    font-size: 14px;
    color: #e2e8f0;
    font-weight: 500;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #334155;
  border-radius: 6px;
  font-size: 14px;
  color: #e2e8f0;
  background: #1e293b;
  transition: border 0.2s;
  &:focus {
    outline: none;
    border-color: #4facfe;
    box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.2);
  }
  &:read-only {
    background: #0f172a;
    color: #94a3b8;
    cursor: default;
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #334155;
  border-radius: 6px;
  font-size: 14px;
  color: #e2e8f0;
  background: #1e293b;
  &:focus {
    outline: none;
    border-color: #4facfe;
    box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.2);
  }
  option {
    background: #1e293b;
    color: #e2e8f0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 16px 0 8px;
`;

const ActionButton = styled.button<{
  variant?: "primary" | "secondary" | "danger";
}>`
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ variant }) => {
    switch (variant) {
      case "primary":
        return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
      case "secondary":
        return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
      case "danger":
        return "background: #ef4444; color: #fff; &:hover { background: #dc2626; }";
      default:
        return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    }
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EcheancesContainer = styled.div`
  overflow-x: auto;
`;

const EcheancesTitle = styled.h3`
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: #e2e8f0;

  i {
    color: #4facfe;
  }

  .sub {
    font-size: 0.8rem;
    font-weight: normal;
    color: #94a3b8;
    margin-left: 1rem;
  }
`;

const EcheancesGrid = styled.div`
  display: grid;
  grid-template-columns: 100px repeat(5, 1fr);
  gap: 8px 12px;
  min-width: 700px;

  @media (max-width: 768px) {
    grid-template-columns: 80px repeat(5, 1fr);
    min-width: 500px;
  }
`;

const EcheancesHeader = styled.div`
  display: contents;
  font-weight: 600;
  color: #94a3b8;

  span {
    padding: 8px 4px;
    border-bottom: 2px solid #334155;
  }
`;

const EcheancesRow = styled.div`
  display: contents;

  span {
    padding: 8px 4px;
    border-bottom: 1px solid #1e293b;
    display: flex;
    align-items: center;
  }

  .mois {
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

// ======== Barre supérieure ========

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
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

// ======== Modal ========

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: #1e293b;
  border-radius: 16px;
  padding: 28px 32px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #334155;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  color: #e2e8f0;

  h3 {
    margin-top: 0;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    gap: 10px;
    i {
      color: #4facfe;
    }
  }
`;

const ModalRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
`;

const ModalLabel = styled.label`
  font-weight: 600;
  color: #94a3b8;
  min-width: 80px;
  font-size: 14px;
`;

const FileInput = styled.input`
  color: #94a3b8;
  padding: 8px 0;
  width: 100%;
  &::file-selector-button {
    background: #334155;
    color: #e2e8f0;
    border: none;
    border-radius: 6px;
    padding: 6px 14px;
    cursor: pointer;
    margin-right: 12px;
    &:hover {
      background: #475569;
    }
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
`;

const StatusMessage = styled.p<{ type?: "success" | "error" }>`
  padding: 8px 12px;
  border-radius: 6px;
  margin: 8px 0;
  ${({ type }) => {
    if (type === "success") return "background: #064e3b; color: #34d399;";
    if (type === "error") return "background: #7f1d1d; color: #fca5a5;";
    return "background: #1e293b; color: #94a3b8;";
  }}
`;

// ==================== INTERFACES ====================

interface Client {
  id: string;
  client_code: string;
  name: string;
  industry?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  fiscal_year_end?: string;
  status?: string;
  niveau_risque?: string;
  date_cloture?: string;
  regime_ohada?: string;
  etats_financiers?: string;
  bilan_ohada?: string;
  compte_resultat?: string;
  flux_tresorerie?: string;
  annexes?: string;
  depot_ef?: string;
  ag_annuelle?: string;
  approbation_comptes?: string;
  modifications_statutaires?: string;
  renouvellement_rccm?: string;
  observations_juridiques?: string;
  centre_impots?: string;
  regime_fiscal?: string;
  assujetti_tva?: string;
  periodicite_tva?: string;
  declaration_tva?: string;
  acompte_is?: string;
  solde_is?: string;
  dsf?: string;
  retenues_source?: string;
  ircm?: string;
  patente?: string;
  taxe_fonciere?: string;
  controle_fiscal?: string;
  historique_fiscal?: string;
  num_employeur_cnps?: string;
  nb_salaries?: number;
  gestion_paie?: string;
  bulletins_paie?: string;
  declarations_cnps?: string;
  paiement_cnps?: string;
  contrats_archives?: string;
  registre_employeur?: string;
  medecine_travail?: string;
  controle_cnps?: string;
  observations_sociales?: string;
  [key: string]: any;
}

interface Echeance {
  id?: string;
  client_id: string;
  mois: string;
  tva_statut: string;
  cnps_statut: string;
  acompte_is_statut: string;
  dsf_statut: string;
  ag_statut: string;
}

type TabKey = "general" | "comptable" | "fiscal" | "social" | "echeances";

// ==================== COMPOSANT PRINCIPAL ====================

const PlanningClient: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("tous");

  // États pour l'import
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Chargement de la liste des clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select(
            "id, client_code, name, industry, contact_person, email, phone, address, tax_number, fiscal_year_end, status",
          )
          .order("name");

        if (error) throw error;
        setClients(data || []);
        if (data && data.length > 0) {
          setSelectedClientId(data[0].id);
        } else {
          setError("Aucun client trouvé. Créez d'abord des clients.");
        }
      } catch (err: any) {
        console.error("Erreur chargement clients:", err);
        setError(err.message || "Impossible de charger les clients.");
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Chargement des données du client sélectionné
  useEffect(() => {
    if (!selectedClientId) return;

    const fetchClientData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", selectedClientId)
          .single();

        if (error) throw error;
        setClientData(data);
        setError(null);
      } catch (err: any) {
        console.error("Erreur chargement client:", err);
        setError(err.message || "Impossible de charger les données du client.");
      } finally {
        setLoading(false);
      }
    };
    fetchClientData();

    // Chargement des échéances
    const fetchEcheances = async () => {
      try {
        const { data, error } = await supabase
          .from("echeances")
          .select("*")
          .eq("client_id", selectedClientId)
          .order("mois");

        if (error) throw error;
        if (data && data.length > 0) {
          setEcheances(data);
        } else {
          const moisList = [
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
          const defaultEcheances = moisList.map((mois) => ({
            client_id: selectedClientId,
            mois,
            tva_statut: "À faire",
            cnps_statut: "À faire",
            acompte_is_statut: "À faire",
            dsf_statut: "À faire",
            ag_statut: "À faire",
          }));
          setEcheances(defaultEcheances as Echeance[]);
        }
      } catch (err: any) {
        console.error("Erreur chargement échéances:", err);
      }
    };
    fetchEcheances();
  }, [selectedClientId]);

  // Mise à jour d'un champ du client
  const handleClientChange = (field: keyof Client, value: any) => {
    if (clientData) {
      setClientData({ ...clientData, [field]: value });
    }
  };

  // Sauvegarde du client
  const saveClient = async () => {
    if (!clientData || !selectedClientId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", selectedClientId);
      if (error) throw error;
      alert("Client sauvegardé avec succès !");
    } catch (err: any) {
      console.error("Erreur sauvegarde client:", err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde des échéances
  const saveEcheances = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await supabase
        .from("echeances")
        .delete()
        .eq("client_id", selectedClientId);
      const insertData = echeances.map(({ id, ...rest }) => rest);
      const { error } = await supabase.from("echeances").insert(insertData);
      if (error) throw error;
      alert("Échéances sauvegardées !");
    } catch (err: any) {
      console.error("Erreur sauvegarde échéances:", err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde globale
  const handleSaveAll = async () => {
    await saveClient();
    await saveEcheances();
  };

  // Annulation
  const handleCancel = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const { data: clientDataFresh, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", selectedClientId)
        .single();
      if (clientError) throw clientError;
      setClientData(clientDataFresh);

      const { data: echeancesFresh, error: echeancesError } = await supabase
        .from("echeances")
        .select("*")
        .eq("client_id", selectedClientId)
        .order("mois");
      if (echeancesError) throw echeancesError;
      if (echeancesFresh && echeancesFresh.length > 0) {
        setEcheances(echeancesFresh);
      } else {
        const moisList = [
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
        const defaultEcheances = moisList.map((mois) => ({
          client_id: selectedClientId,
          mois,
          tva_statut: "À faire",
          cnps_statut: "À faire",
          acompte_is_statut: "À faire",
          dsf_statut: "À faire",
          ag_statut: "À faire",
        }));
        setEcheances(defaultEcheances as Echeance[]);
      }
    } catch (err: any) {
      console.error("Erreur annulation:", err);
      alert("Erreur lors de l'annulation : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cycle des statuts
  const toggleStatut = (index: number, field: keyof Echeance) => {
    const current = echeances[index][field] as string;
    const cycle: Record<string, string> = {
      "À faire": "En cours",
      "En cours": "Fait",
      Fait: "À faire",
      "En retard": "À faire",
    };
    const newVal = cycle[current] || "À faire";
    const newEcheances = [...echeances];
    newEcheances[index] = { ...newEcheances[index], [field]: newVal };
    setEcheances(newEcheances);
  };

  const renderStatutClic = (statut: string, onClick: () => void) => {
    const colors: Record<string, string> = {
      "À faire": "#f59e0b",
      "En cours": "#3b82f6",
      Fait: "#22c55e",
      "En retard": "#ef4444",
    };
    const color = colors[statut] || "#94a3b8";
    return (
      <StatutClic color={color} onClick={onClick}>
        {statut}
      </StatutClic>
    );
  };

  // Rendu champ lecture seule (Générales)
  const renderReadOnlyField = (
    label: string,
    value: string | number | undefined,
  ) => {
    return (
      <InfoItem>
        <label>{label}</label>
        <span>{value || "—"}</span>
      </InfoItem>
    );
  };

  // Rendu champ modifiable
  const renderEditableInput = (
    label: string,
    field: keyof Client,
    type: string = "text",
  ) => {
    if (!clientData) return null;
    return (
      <InfoItem>
        <label>{label}</label>
        <StyledInput
          type={type}
          value={clientData[field] ?? ""}
          onChange={(e) => handleClientChange(field, e.target.value)}
          readOnly={!isEditing}
        />
      </InfoItem>
    );
  };

  const renderEditableSelect = (
    label: string,
    field: keyof Client,
    options: string[],
  ) => {
    if (!clientData) return null;
    return (
      <InfoItem>
        <label>{label}</label>
        <StyledSelect
          value={clientData[field] ?? ""}
          onChange={(e) => handleClientChange(field, e.target.value)}
          disabled={!isEditing}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </StyledSelect>
      </InfoItem>
    );
  };

  // Filtrer les échéances selon le mois sélectionné
  const filteredEcheances =
    selectedMonth === "tous"
      ? echeances
      : echeances.filter((e) => e.mois === selectedMonth);

  const monthDisplay =
    selectedMonth === "tous" ? "Tous les mois" : `Mois : ${selectedMonth}`;

  // ====== EXPORT EXCEL ======

  const handleExport = () => {
    if (!clientData) {
      alert("Aucun client sélectionné.");
      return;
    }

    const clientRows = [
      ["Code client", clientData.client_code],
      ["Nom", clientData.name],
      ["Secteur", clientData.industry || ""],
      ["Personne de contact", clientData.contact_person || ""],
      ["Email", clientData.email || ""],
      ["Téléphone", clientData.phone || ""],
      ["Adresse", clientData.address || ""],
      ["Numéro fiscal", clientData.tax_number || ""],
      ["Clôture fiscale", clientData.fiscal_year_end || ""],
      ["Statut", clientData.status || ""],
      ["Niveau de risque", clientData.niveau_risque || ""],
    ];

    const comptableRows = [
      ["Date de clôture de l'exercice", clientData.date_cloture || ""],
      ["Régime comptable OHADA", clientData.regime_ohada || ""],
      ["Établissement des états financiers", clientData.etats_financiers || ""],
      ["Bilan OHADA", clientData.bilan_ohada || ""],
      ["Compte de résultat", clientData.compte_resultat || ""],
      ["Tableau des flux de trésorerie", clientData.flux_tresorerie || ""],
      ["Annexes comptables", clientData.annexes || ""],
      ["Dépôt des états financiers", clientData.depot_ef || ""],
      ["Assemblée générale annuelle", clientData.ag_annuelle || ""],
      ["Approbation des comptes", clientData.approbation_comptes || ""],
      ["Modifications statutaires", clientData.modifications_statutaires || ""],
      ["Renouvellement RCCM", clientData.renouvellement_rccm || ""],
      ["Observations juridiques", clientData.observations_juridiques || ""],
    ];

    const fiscalRows = [
      ["Centre des impôts de rattachement", clientData.centre_impots || ""],
      ["Régime fiscal", clientData.regime_fiscal || ""],
      ["Assujetti TVA", clientData.assujetti_tva || ""],
      ["Périodicité TVA", clientData.periodicite_tva || ""],
      ["Déclaration TVA", clientData.declaration_tva || ""],
      ["Acompte IS", clientData.acompte_is || ""],
      ["Solde IS", clientData.solde_is || ""],
      ["DSF", clientData.dsf || ""],
      ["Retenues à la source", clientData.retenues_source || ""],
      ["IRCM", clientData.ircm || ""],
      ["Patente", clientData.patente || ""],
      ["Taxe foncière", clientData.taxe_fonciere || ""],
      ["Contrôle fiscal en cours", clientData.controle_fiscal || ""],
      ["Historique fiscal", clientData.historique_fiscal || ""],
    ];

    const socialRows = [
      ["Numéro employeur CNPS", clientData.num_employeur_cnps || ""],
      ["Nombre de salariés", clientData.nb_salaries || ""],
      ["Gestion de la paie", clientData.gestion_paie || ""],
      ["Établissement des bulletins de paie", clientData.bulletins_paie || ""],
      ["Déclarations CNPS", clientData.declarations_cnps || ""],
      ["Paiement cotisations CNPS", clientData.paiement_cnps || ""],
      ["Contrats de travail archivés", clientData.contrats_archives || ""],
      ["Registre employeur disponible", clientData.registre_employeur || ""],
      ["Médecine du travail", clientData.medecine_travail || ""],
      ["Contrôle CNPS", clientData.controle_cnps || ""],
      ["Observations sociales", clientData.observations_sociales || ""],
    ];

    const echeancesData = filteredEcheances.map((e) => ({
      Mois: e.mois,
      TVA: e.tva_statut,
      CNPS: e.cnps_statut,
      "Acompte IS": e.acompte_is_statut,
      DSF: e.dsf_statut,
      AG: e.ag_statut,
    }));

    const wb = XLSX.utils.book_new();

    const wsClient = XLSX.utils.aoa_to_sheet([
      ["INFORMATIONS GÉNÉRALES DU CLIENT"],
      [],
      ...clientRows.map((row) => [row[0], row[1]]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsClient, "Client");

    const wsComptable = XLSX.utils.aoa_to_sheet([
      ["INFORMATIONS COMPTABLES"],
      [],
      ...comptableRows.map((row) => [row[0], row[1]]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsComptable, "Comptable");

    const wsFiscal = XLSX.utils.aoa_to_sheet([
      ["INFORMATIONS FISCALES"],
      [],
      ...fiscalRows.map((row) => [row[0], row[1]]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsFiscal, "Fiscal");

    const wsSocial = XLSX.utils.aoa_to_sheet([
      ["INFORMATIONS SOCIALES"],
      [],
      ...socialRows.map((row) => [row[0], row[1]]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsSocial, "Social");

    if (echeancesData.length > 0) {
      const wsEcheances = XLSX.utils.json_to_sheet(echeancesData);
      XLSX.utils.book_append_sheet(wb, wsEcheances, "Échéances");
    } else {
      const wsEcheances = XLSX.utils.aoa_to_sheet([
        ["Aucune échéance pour le client et le mois sélectionnés."],
      ]);
      XLSX.utils.book_append_sheet(wb, wsEcheances, "Échéances");
    }

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const moisLabel = selectedMonth === "tous" ? "Tous" : selectedMonth;
    link.download = `Client_${clientData.name}_${moisLabel}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // ====== IMPORT EXCEL ======

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheets = workbook.SheetNames;

        const readKeyValueSheet = (sheetName: string) => {
          if (!sheets.includes(sheetName)) return null;
          const ws = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
          const result: Record<string, string> = {};
          for (const row of json) {
            if (row.length >= 2) {
              const key = String(row[0]).trim();
              const value = String(row[1] ?? "").trim();
              if (key) result[key] = value;
            }
          }
          return result;
        };

        const clientDataRaw = readKeyValueSheet("Client");
        const comptableDataRaw = readKeyValueSheet("Comptable");
        const fiscalDataRaw = readKeyValueSheet("Fiscal");
        const socialDataRaw = readKeyValueSheet("Social");

        let echeancesDataRaw: any[] = [];
        if (sheets.includes("Échéances")) {
          const ws = workbook.Sheets["Échéances"];
          const json = XLSX.utils.sheet_to_json(ws) as any[];
          echeancesDataRaw = json.map((row: any) => ({
            mois: row.Mois || "",
            tva_statut: row.TVA || "À faire",
            cnps_statut: row.CNPS || "À faire",
            acompte_is_statut: row["Acompte IS"] || "À faire",
            dsf_statut: row.DSF || "À faire",
            ag_statut: row.AG || "À faire",
          }));
        }

        const preview = {
          client: clientDataRaw,
          comptable: comptableDataRaw,
          fiscal: fiscalDataRaw,
          social: socialDataRaw,
          echeances: echeancesDataRaw,
        };
        setImportPreview(preview);
        setImportError(null);
      } catch (err: any) {
        setImportError("Erreur de lecture du fichier : " + err.message);
        setImportPreview(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!importPreview) {
      setImportError("Aucune donnée à importer.");
      return;
    }
    if (!selectedClientId) {
      setImportError("Aucun client sélectionné.");
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      // Mapping des libellés
      const clientFieldMap: Record<string, keyof Client> = {
        "Code client": "client_code",
        Nom: "name",
        Secteur: "industry",
        "Personne de contact": "contact_person",
        Email: "email",
        Téléphone: "phone",
        Adresse: "address",
        "Numéro fiscal": "tax_number",
        "Clôture fiscale": "fiscal_year_end",
        Statut: "status",
        "Niveau de risque": "niveau_risque",
      };

      const comptableFieldMap: Record<string, keyof Client> = {
        "Date de clôture de l'exercice": "date_cloture",
        "Régime comptable OHADA": "regime_ohada",
        "Établissement des états financiers": "etats_financiers",
        "Bilan OHADA": "bilan_ohada",
        "Compte de résultat": "compte_resultat",
        "Tableau des flux de trésorerie": "flux_tresorerie",
        "Annexes comptables": "annexes",
        "Dépôt des états financiers": "depot_ef",
        "Assemblée générale annuelle": "ag_annuelle",
        "Approbation des comptes": "approbation_comptes",
        "Modifications statutaires": "modifications_statutaires",
        "Renouvellement RCCM": "renouvellement_rccm",
        "Observations juridiques": "observations_juridiques",
      };

      const fiscalFieldMap: Record<string, keyof Client> = {
        "Centre des impôts de rattachement": "centre_impots",
        "Régime fiscal": "regime_fiscal",
        "Assujetti TVA": "assujetti_tva",
        "Périodicité TVA": "periodicite_tva",
        "Déclaration TVA": "declaration_tva",
        "Acompte IS": "acompte_is",
        "Solde IS": "solde_is",
        DSF: "dsf",
        "Retenues à la source": "retenues_source",
        IRCM: "ircm",
        Patente: "patente",
        "Taxe foncière": "taxe_fonciere",
        "Contrôle fiscal en cours": "controle_fiscal",
        "Historique fiscal": "historique_fiscal",
      };

      const socialFieldMap: Record<string, keyof Client> = {
        "Numéro employeur CNPS": "num_employeur_cnps",
        "Nombre de salariés": "nb_salaries",
        "Gestion de la paie": "gestion_paie",
        "Établissement des bulletins de paie": "bulletins_paie",
        "Déclarations CNPS": "declarations_cnps",
        "Paiement cotisations CNPS": "paiement_cnps",
        "Contrats de travail archivés": "contrats_archives",
        "Registre employeur disponible": "registre_employeur",
        "Médecine du travail": "medecine_travail",
        "Contrôle CNPS": "controle_cnps",
        "Observations sociales": "observations_sociales",
      };

      // Fusionner les données importées avec les données existantes
      const updatedClient: Client = { ...clientData } as Client;

      if (importPreview.client) {
        for (const [label, value] of Object.entries(importPreview.client)) {
          const field = clientFieldMap[label];
          if (field && value) {
            updatedClient[field] = value;
          }
        }
      }

      if (importPreview.comptable) {
        for (const [label, value] of Object.entries(importPreview.comptable)) {
          const field = comptableFieldMap[label];
          if (field && value) {
            updatedClient[field] = value;
          }
        }
      }

      if (importPreview.fiscal) {
        for (const [label, value] of Object.entries(importPreview.fiscal)) {
          const field = fiscalFieldMap[label];
          if (field && value) {
            updatedClient[field] = value;
          }
        }
      }

      if (importPreview.social) {
        for (const [label, value] of Object.entries(importPreview.social)) {
          const field = socialFieldMap[label];
          if (field && value) {
            updatedClient[field] = value;
          }
        }
      }

      setClientData(updatedClient);
      const { error: updateError } = await supabase
        .from("clients")
        .update(updatedClient)
        .eq("id", selectedClientId);
      if (updateError) throw updateError;

      if (importPreview.echeances && importPreview.echeances.length > 0) {
        await supabase
          .from("echeances")
          .delete()
          .eq("client_id", selectedClientId);
        const insertData = importPreview.echeances.map((e: any) => ({
          client_id: selectedClientId,
          mois: e.mois,
          tva_statut: e.tva_statut,
          cnps_statut: e.cnps_statut,
          acompte_is_statut: e.acompte_is_statut,
          dsf_statut: e.dsf_statut,
          ag_statut: e.ag_statut,
        }));
        const { error: insertError } = await supabase
          .from("echeances")
          .insert(insertData);
        if (insertError) throw insertError;
        const { data: freshEcheances } = await supabase
          .from("echeances")
          .select("*")
          .eq("client_id", selectedClientId)
          .order("mois");
        if (freshEcheances) setEcheances(freshEcheances);
      }

      setImportSuccess("Import terminé avec succès !");
      setImportPreview(null);
      setImportFile(null);
      setTimeout(() => {
        setShowImportModal(false);
        setImportSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("Erreur import:", err);
      setImportError("Erreur lors de l'import : " + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const closeModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
    setImportSuccess(null);
  };

  // ====== RENDU ======

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
      <TopBar>
        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, color: "#94a3b8" }}>Client :</span>
            <StyledSelect
              value={selectedClientId ?? ""}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{ width: "auto", minWidth: "200px" }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.client_code})
                </option>
              ))}
            </StyledSelect>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, color: "#94a3b8" }}>Mois :</span>
            <StyledSelect
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: "auto", minWidth: "150px" }}
            >
              <option value="tous">Tous les mois</option>
              <option value="Janvier">Janvier</option>
              <option value="Février">Février</option>
              <option value="Mars">Mars</option>
              <option value="Avril">Avril</option>
              <option value="Mai">Mai</option>
              <option value="Juin">Juin</option>
              <option value="Juillet">Juillet</option>
              <option value="Août">Août</option>
              <option value="Septembre">Septembre</option>
              <option value="Octobre">Octobre</option>
              <option value="Novembre">Novembre</option>
              <option value="Décembre">Décembre</option>
            </StyledSelect>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <ExportButton onClick={handleExport}>
            <i className="fas fa-file-excel"></i> Exporter Excel
          </ExportButton>
          <ExportButton
            onClick={() => setShowImportModal(true)}
            style={{ background: "#4facfe" }}
          >
            <i className="fas fa-file-import"></i> Importer Excel
          </ExportButton>
        </div>
      </TopBar>

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
        <ClientBadges>
          <Badge variant="status" status={clientData.status}>
            {clientData.status || "Actif"}
          </Badge>
          {clientData.niveau_risque && (
            <Badge variant="risk" status={clientData.niveau_risque}>
              Risque {clientData.niveau_risque}
            </Badge>
          )}
        </ClientBadges>
      </ClientHeader>

      <ButtonGroup>
        <ActionButton
          variant="primary"
          onClick={handleSaveAll}
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "ENREGISTRER"}
        </ActionButton>
        <ActionButton
          variant="secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          ANNULER
        </ActionButton>
        <ActionButton
          variant="secondary"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "Désactiver édition" : "Activer édition"}
        </ActionButton>
      </ButtonGroup>

      <TabsContainer>
        <TabButton
          active={activeTab === "general"}
          onClick={() => setActiveTab("general")}
        >
          <i className="fas fa-info-circle"></i> <span>Générales</span>
        </TabButton>
        <TabButton
          active={activeTab === "comptable"}
          onClick={() => setActiveTab("comptable")}
        >
          <i className="fas fa-balance-scale"></i> <span>Comptable</span>
        </TabButton>
        <TabButton
          active={activeTab === "fiscal"}
          onClick={() => setActiveTab("fiscal")}
        >
          <i className="fas fa-file-invoice-dollar"></i> <span>Fiscal</span>
        </TabButton>
        <TabButton
          active={activeTab === "social"}
          onClick={() => setActiveTab("social")}
        >
          <i className="fas fa-users"></i> <span>Social</span>
        </TabButton>
        <TabButton
          active={activeTab === "echeances"}
          onClick={() => setActiveTab("echeances")}
        >
          <i className="fas fa-calendar-alt"></i> <span>Échéances</span>
        </TabButton>
      </TabsContainer>

      {/* Onglet Générales */}
      {activeTab === "general" && (
        <>
          <div
            style={{
              marginBottom: "1rem",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            <i className="fas fa-calendar-alt"></i> {monthDisplay}
          </div>
          <InfoGrid>
            {renderReadOnlyField("Nom", clientData.name)}
            {renderReadOnlyField("Secteur", clientData.industry)}
            {renderReadOnlyField(
              "Personne de contact",
              clientData.contact_person,
            )}
            {renderReadOnlyField("Email", clientData.email)}
            {renderReadOnlyField("Téléphone", clientData.phone)}
            {renderReadOnlyField("Numéro fiscal", clientData.tax_number)}
            {renderReadOnlyField("Clôture fiscale", clientData.fiscal_year_end)}
          </InfoGrid>
        </>
      )}

      {/* Onglet Comptable */}
      {activeTab === "comptable" && (
        <>
          <div
            style={{
              marginBottom: "1rem",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            <i className="fas fa-calendar-alt"></i> {monthDisplay}
          </div>
          <InfoGrid>
            {renderEditableInput(
              "Date de Clôture de l'Exercice",
              "date_cloture",
            )}
            {renderEditableSelect("Régime Comptable OHADA", "regime_ohada", [
              "Normal",
              "Allégé",
              "Minimal",
            ])}
            {renderEditableSelect(
              "Établissement des États Financiers",
              "etats_financiers",
              ["Oui", "Non"],
            )}
            {renderEditableSelect("Bilan OHADA", "bilan_ohada", ["Oui", "Non"])}
            {renderEditableSelect("Compte de Résultat", "compte_resultat", [
              "Oui",
              "Non",
            ])}
            {renderEditableSelect(
              "Tableau des Flux de Trésorerie",
              "flux_tresorerie",
              ["Oui", "Non"],
            )}
            {renderEditableSelect("Annexes Comptables", "annexes", [
              "Oui",
              "Non",
            ])}
            {renderEditableInput("Dépôt des États Financiers", "depot_ef")}
            {renderEditableInput("Assemblée Générale Annuelle", "ag_annuelle")}
            {renderEditableInput(
              "Approbation des Comptes",
              "approbation_comptes",
            )}
            {renderEditableSelect(
              "Modifications Statutaires",
              "modifications_statutaires",
              ["Oui", "Non"],
            )}
            {renderEditableInput("Renouvellement RCCM", "renouvellement_rccm")}
            {renderEditableInput(
              "Observations Juridiques",
              "observations_juridiques",
            )}
          </InfoGrid>
        </>
      )}

      {/* Onglet Fiscal */}
      {activeTab === "fiscal" && (
        <>
          <div
            style={{
              marginBottom: "1rem",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            <i className="fas fa-calendar-alt"></i> {monthDisplay}
          </div>
          <InfoGrid>
            {renderEditableInput(
              "Centre des Impôts de Rattachement",
              "centre_impots",
            )}
            {renderEditableSelect("Régime Fiscal", "regime_fiscal", [
              "Réel",
              "Simplifié",
              "Libératoire",
            ])}
            {renderEditableSelect("Assujetti TVA", "assujetti_tva", [
              "Oui",
              "Non",
            ])}
            {renderEditableSelect("Périodicité TVA", "periodicite_tva", [
              "Mensuelle",
              "Trimestrielle",
            ])}
            {renderEditableInput("Déclaration TVA", "declaration_tva")}
            {renderEditableInput("Acompte IS", "acompte_is")}
            {renderEditableInput("Solde IS", "solde_is")}
            {renderEditableInput(
              "Déclaration Statistique et Fiscale (DSF)",
              "dsf",
            )}
            {renderEditableSelect("Retenues à la Source", "retenues_source", [
              "Oui",
              "Non",
            ])}
            {renderEditableSelect(
              "Impôt sur les Revenus des Capitaux Mobiliers",
              "ircm",
              ["Oui", "Non"],
            )}
            {renderEditableInput("Patente", "patente")}
            {renderEditableInput("Taxe Foncière", "taxe_fonciere")}
            {renderEditableSelect(
              "Contrôle Fiscal en Cours",
              "controle_fiscal",
              ["Oui", "Non"],
            )}
            {renderEditableInput("Historique Fiscal", "historique_fiscal")}
          </InfoGrid>
        </>
      )}

      {/* Onglet Social */}
      {activeTab === "social" && (
        <>
          <div
            style={{
              marginBottom: "1rem",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            <i className="fas fa-calendar-alt"></i> {monthDisplay}
          </div>
          <InfoGrid>
            {renderEditableInput("Numéro Employeur CNPS", "num_employeur_cnps")}
            {renderEditableInput("Nombre de Salariés", "nb_salaries")}
            {renderEditableSelect("Gestion de la Paie", "gestion_paie", [
              "Interne",
              "Cabinet",
            ])}
            {renderEditableSelect(
              "Établissement des Bulletins de Paie",
              "bulletins_paie",
              ["Oui", "Non"],
            )}
            {renderEditableInput("Déclarations CNPS", "declarations_cnps")}
            {renderEditableSelect(
              "Paiement Cotisations CNPS",
              "paiement_cnps",
              ["À jour", "En retard"],
            )}
            {renderEditableSelect(
              "Contrats de Travail Archivés",
              "contrats_archives",
              ["Oui", "Non"],
            )}
            {renderEditableSelect(
              "Registre Employeur Disponible",
              "registre_employeur",
              ["Oui", "Non"],
            )}
            {renderEditableSelect("Médecine du Travail", "medecine_travail", [
              "Conforme",
              "Non conforme",
            ])}
            {renderEditableSelect("Contrôle CNPS", "controle_cnps", [
              "Oui",
              "Non",
            ])}
            {renderEditableInput(
              "Observations Sociales",
              "observations_sociales",
            )}
          </InfoGrid>
        </>
      )}

      {/* Onglet Échéances */}
      {activeTab === "echeances" && (
        <EcheancesContainer>
          <EcheancesTitle>
            <i className="fas fa-calendar-check"></i> Suivi mensuel des
            échéances
            <span className="sub">Cliquez sur un statut pour le changer</span>
          </EcheancesTitle>
          <EcheancesGrid>
            <EcheancesHeader>
              <span>Mois</span>
              <span>TVA</span>
              <span>CNPS</span>
              <span>Acompte IS</span>
              <span>DSF</span>
              <span>AG</span>
            </EcheancesHeader>
            {filteredEcheances.map((e, idx) => {
              const realIndex = echeances.findIndex((ec) => ec.id === e.id);
              return (
                <EcheancesRow key={idx}>
                  <span className="mois">{e.mois}</span>
                  <span>
                    {renderStatutClic(e.tva_statut, () =>
                      toggleStatut(realIndex, "tva_statut"),
                    )}
                  </span>
                  <span>
                    {renderStatutClic(e.cnps_statut, () =>
                      toggleStatut(realIndex, "cnps_statut"),
                    )}
                  </span>
                  <span>
                    {renderStatutClic(e.acompte_is_statut, () =>
                      toggleStatut(realIndex, "acompte_is_statut"),
                    )}
                  </span>
                  <span>
                    {renderStatutClic(e.dsf_statut, () =>
                      toggleStatut(realIndex, "dsf_statut"),
                    )}
                  </span>
                  <span>
                    {renderStatutClic(e.ag_statut, () =>
                      toggleStatut(realIndex, "ag_statut"),
                    )}
                  </span>
                </EcheancesRow>
              );
            })}
          </EcheancesGrid>
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
                style={{ backgroundColor: "#ef4444" }}
              ></span>{" "}
              En retard
            </span>
          </Legend>
        </EcheancesContainer>
      )}

      {/* ====== MODAL D'IMPORT ====== */}
      {showImportModal && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h3>
              <i className="fas fa-file-import"></i> Importer les données du
              client
            </h3>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              Sélectionnez un fichier Excel contenant les feuilles :
              <strong> Client</strong>, <strong>Comptable</strong>,{" "}
              <strong>Fiscal</strong>, <strong>Social</strong>,{" "}
              <strong>Échéances</strong>.
              <br />
              Les données seront fusionnées avec les données existantes.
            </p>

            <ModalRow>
              <ModalLabel>Fichier :</ModalLabel>
              <FileInput
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
            </ModalRow>

            {importError && (
              <StatusMessage type="error">{importError}</StatusMessage>
            )}
            {importSuccess && (
              <StatusMessage type="success">{importSuccess}</StatusMessage>
            )}

            {importPreview && (
              <div>
                <p
                  style={{
                    margin: "12px 0 6px",
                    fontWeight: 600,
                    color: "#94a3b8",
                  }}
                >
                  Aperçu des données extraites :
                </p>
                <ul
                  style={{
                    color: "#e2e8f0",
                    fontSize: "14px",
                    listStyle: "none",
                    padding: 0,
                  }}
                >
                  <li>
                    Client : {Object.keys(importPreview.client || {}).length}{" "}
                    champs
                  </li>
                  <li>
                    Comptable :{" "}
                    {Object.keys(importPreview.comptable || {}).length} champs
                  </li>
                  <li>
                    Fiscal : {Object.keys(importPreview.fiscal || {}).length}{" "}
                    champs
                  </li>
                  <li>
                    Social : {Object.keys(importPreview.social || {}).length}{" "}
                    champs
                  </li>
                  <li>
                    Échéances : {importPreview.echeances?.length || 0} lignes
                  </li>
                </ul>
              </div>
            )}

            <ModalActions>
              <ActionButton variant="secondary" onClick={closeModal}>
                Annuler
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleImport}
                disabled={importLoading || !importPreview}
              >
                {importLoading ? "Import en cours..." : "Importer"}
              </ActionButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default PlanningClient;
