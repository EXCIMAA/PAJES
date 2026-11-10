// src/pages/manuel/LutteAntiBlanchiment.tsx

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px 1fr;
  gap: 8px 12px;
  align-items: center;
  @media (max-width: 768px) {
    grid-template-columns: 1fr 60px 60px 1fr;
  }
`;

const GridLabel = styled.span`
  color: #e2e8f0;
  font-size: 14px;
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

const RadioGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const RadioLabel = styled.label<{ checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ checked }) => (checked ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  input {
    width: 16px;
    height: 16px;
    accent-color: #4facfe;
    cursor: pointer;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
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
  status?: string;
  niveau_risque?: string;
}

interface LabData {
  id?: string;
  client_id: string;
  entite_document_acceptation: boolean;
  entite_lettre_mission_reference: boolean;
  entite_document_identite: boolean;
  entite_double_verification: boolean;
  entite_changements_juridiques: boolean;
  entite_controle_fiscal_redressement: boolean;
  observations_entite: string;
  beneficiaire_associes_connus: boolean;
  beneficiaire_registre_consulte: boolean;
  beneficiaire_dirigeants_rencontres: boolean;
  beneficiaire_changements_representant: boolean;
  observations_beneficiaire: string;
  actionnariat_ppe: boolean;
  actionnariat_actionnaires_inconnus: boolean;
  actionnariat_doutes_reputation: boolean;
  observations_actionnariat: string;
  dirigeants_fausse_resultats: boolean;
  dirigeants_depart_recent: boolean;
  dirigeants_changements_frequents: boolean;
  observations_dirigeants: string;
  structure_complexe: boolean;
  structure_filiales_etrangeres: boolean;
  observations_structure: string;
  operations_complexes: boolean;
  operations_liquidite_importante: boolean;
  operations_secteur_sensible: boolean;
  operations_montants_anormaux: boolean;
  operations_sans_justification: boolean;
  operations_origine_fonds_justifiee: boolean;
  operations_pays_sensible: boolean;
  observations_operations: string;
  risque_client: string;
  risque_activite: string;
  risque_localisation: string;
  risque_nature_mission: string;
  commentaires_risque: string;
  signataire: string;
  date_signature: string;
}

// ==================== COMPOSANT ====================

const LutteAntiBlanchiment: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [formData, setFormData] = useState<LabData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedClientId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: clientInfo } = await supabase
          .from("clients")
          .select("id, client_code, name, status, niveau_risque")
          .eq("id", selectedClientId)
          .single();
        setClientData(clientInfo);

        const { data: labData, error } = await supabase
          .from("lab_questionnaire")
          .select("*")
          .eq("client_id", selectedClientId)
          .single();
        if (error && error.code !== "PGRST116") throw error;
        if (labData) {
          setFormData(labData);
        } else {
          setFormData({
            client_id: selectedClientId,
            entite_document_acceptation: false,
            entite_lettre_mission_reference: false,
            entite_document_identite: false,
            entite_double_verification: false,
            entite_changements_juridiques: false,
            entite_controle_fiscal_redressement: false,
            observations_entite: "",
            beneficiaire_associes_connus: false,
            beneficiaire_registre_consulte: false,
            beneficiaire_dirigeants_rencontres: false,
            beneficiaire_changements_representant: false,
            observations_beneficiaire: "",
            actionnariat_ppe: false,
            actionnariat_actionnaires_inconnus: false,
            actionnariat_doutes_reputation: false,
            observations_actionnariat: "",
            dirigeants_fausse_resultats: false,
            dirigeants_depart_recent: false,
            dirigeants_changements_frequents: false,
            observations_dirigeants: "",
            structure_complexe: false,
            structure_filiales_etrangeres: false,
            observations_structure: "",
            operations_complexes: false,
            operations_liquidite_importante: false,
            operations_secteur_sensible: false,
            operations_montants_anormaux: false,
            operations_sans_justification: false,
            operations_origine_fonds_justifiee: false,
            operations_pays_sensible: false,
            observations_operations: "",
            risque_client: "",
            risque_activite: "",
            risque_localisation: "",
            risque_nature_mission: "",
            commentaires_risque: "",
            signataire: "",
            date_signature: "",
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
  }, [selectedClientId]);

  const handleChange = (field: keyof LabData, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const saveForm = async () => {
    if (!formData || !selectedClientId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("lab_questionnaire")
        .select("id")
        .eq("client_id", selectedClientId)
        .single();
      if (existing) {
        await supabase
          .from("lab_questionnaire")
          .update(formData)
          .eq("client_id", selectedClientId);
      } else {
        await supabase.from("lab_questionnaire").insert([formData]);
      }
      alert("Questionnaire LBC-FT sauvegardé !");
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
      const { data, error } = await supabase
        .from("lab_questionnaire")
        .select("*")
        .eq("client_id", selectedClientId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setFormData(data);
      } else {
        setFormData({
          client_id: selectedClientId,
          entite_document_acceptation: false,
          entite_lettre_mission_reference: false,
          entite_document_identite: false,
          entite_double_verification: false,
          entite_changements_juridiques: false,
          entite_controle_fiscal_redressement: false,
          observations_entite: "",
          beneficiaire_associes_connus: false,
          beneficiaire_registre_consulte: false,
          beneficiaire_dirigeants_rencontres: false,
          beneficiaire_changements_representant: false,
          observations_beneficiaire: "",
          actionnariat_ppe: false,
          actionnariat_actionnaires_inconnus: false,
          actionnariat_doutes_reputation: false,
          observations_actionnariat: "",
          dirigeants_fausse_resultats: false,
          dirigeants_depart_recent: false,
          dirigeants_changements_frequents: false,
          observations_dirigeants: "",
          structure_complexe: false,
          structure_filiales_etrangeres: false,
          observations_structure: "",
          operations_complexes: false,
          operations_liquidite_importante: false,
          operations_secteur_sensible: false,
          operations_montants_anormaux: false,
          operations_sans_justification: false,
          operations_origine_fonds_justifiee: false,
          operations_pays_sensible: false,
          observations_operations: "",
          risque_client: "",
          risque_activite: "",
          risque_localisation: "",
          risque_nature_mission: "",
          commentaires_risque: "",
          signataire: "",
          date_signature: "",
        });
      }
    } catch (err: any) {
      console.error(err);
      alert("Erreur annulation : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!formData || !clientData) return;
    const rows: any[] = [];
    rows.push(["QUESTIONNAIRE LBC-FT"]);
    rows.push(["Client", clientData.name, "Code", clientData.client_code]);
    rows.push([]);
    rows.push(["1. VIGILANCE VIS-À-VIS DE L'ENTITÉ"]);
    rows.push([
      "Document d'acceptation signé ?",
      formData.entite_document_acceptation ? "Oui" : "Non",
    ]);
    rows.push([
      "Lettre de mission référence LBC-FT ?",
      formData.entite_lettre_mission_reference ? "Oui" : "Non",
    ]);
    rows.push([
      "Documents d'identité vérifiés ?",
      formData.entite_document_identite ? "Oui" : "Non",
    ]);
    rows.push([
      "Double vérification si client absent ?",
      formData.entite_double_verification ? "Oui" : "Non",
    ]);
    rows.push([
      "Changements juridiques fréquents ?",
      formData.entite_changements_juridiques ? "Oui" : "Non",
    ]);
    rows.push([
      "Contrôle fiscal avec redressements ?",
      formData.entite_controle_fiscal_redressement ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_entite || ""]);
    rows.push([]);
    rows.push(["2. VIGILANCE VIS-À-VIS DU BÉNÉFICIAIRE"]);
    rows.push([
      "Associés >25% connus ?",
      formData.beneficiaire_associes_connus ? "Oui" : "Non",
    ]);
    rows.push([
      "Registre des BE consulté ?",
      formData.beneficiaire_registre_consulte ? "Oui" : "Non",
    ]);
    rows.push([
      "Dirigeants rencontrés ?",
      formData.beneficiaire_dirigeants_rencontres ? "Oui" : "Non",
    ]);
    rows.push([
      "Changements de représentant fréquents ?",
      formData.beneficiaire_changements_representant ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_beneficiaire || ""]);
    rows.push([]);
    rows.push(["3. ACTIONNARIAT"]);
    rows.push([
      "PPE parmi les actionnaires ?",
      formData.actionnariat_ppe ? "Oui" : "Non",
    ]);
    rows.push([
      "Actionnaires inconnus ?",
      formData.actionnariat_actionnaires_inconnus ? "Oui" : "Non",
    ]);
    rows.push([
      "Doutes sur réputation ?",
      formData.actionnariat_doutes_reputation ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_actionnariat || ""]);
    rows.push([]);
    rows.push(["4. DIRIGEANTS"]);
    rows.push([
      "Risque de fausse résultats ?",
      formData.dirigeants_fausse_resultats ? "Oui" : "Non",
    ]);
    rows.push([
      "Départ de personnes clés ?",
      formData.dirigeants_depart_recent ? "Oui" : "Non",
    ]);
    rows.push([
      "Changements fréquents de conseils ?",
      formData.dirigeants_changements_frequents ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_dirigeants || ""]);
    rows.push([]);
    rows.push(["5. STRUCTURE"]);
    rows.push([
      "Structure complexe ?",
      formData.structure_complexe ? "Oui" : "Non",
    ]);
    rows.push([
      "Filiales à l'étranger ?",
      formData.structure_filiales_etrangeres ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_structure || ""]);
    rows.push([]);
    rows.push(["6. OPÉRATIONS"]);
    rows.push([
      "Opérations complexes ?",
      formData.operations_complexes ? "Oui" : "Non",
    ]);
    rows.push([
      "Liquidité importante ?",
      formData.operations_liquidite_importante ? "Oui" : "Non",
    ]);
    rows.push([
      "Secteur sensible ?",
      formData.operations_secteur_sensible ? "Oui" : "Non",
    ]);
    rows.push([
      "Montants anormaux ?",
      formData.operations_montants_anormaux ? "Oui" : "Non",
    ]);
    rows.push([
      "Sans justification ?",
      formData.operations_sans_justification ? "Oui" : "Non",
    ]);
    rows.push([
      "Origine des fonds justifiée ?",
      formData.operations_origine_fonds_justifiee ? "Oui" : "Non",
    ]);
    rows.push([
      "Pays sensible ?",
      formData.operations_pays_sensible ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_operations || ""]);
    rows.push([]);
    rows.push(["ÉVALUATION DES RISQUES"]);
    rows.push(["Client", formData.risque_client || ""]);
    rows.push(["Activité", formData.risque_activite || ""]);
    rows.push(["Localisation", formData.risque_localisation || ""]);
    rows.push(["Nature mission", formData.risque_nature_mission || ""]);
    rows.push(["Commentaires", formData.commentaires_risque || ""]);
    rows.push([]);
    rows.push(["SIGNATURE"]);
    rows.push(["Signataire", formData.signataire || ""]);
    rows.push(["Date", formData.date_signature || ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LBC-FT");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `LBC-FT_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renderCheckbox = (field: keyof LabData) => {
    if (!formData) return null;
    return (
      <Checkbox
        type="checkbox"
        checked={!!formData[field]}
        onChange={(e) => handleChange(field, e.target.checked)}
      />
    );
  };

  const renderRiskRadio = (field: keyof LabData) => {
    if (!formData) return null;
    const value = (formData[field] as string) || "";
    return (
      <RadioGroup>
        <RadioLabel checked={value === "F"}>
          <input
            type="radio"
            checked={value === "F"}
            onChange={() => handleChange(field, "F")}
          />
          <span>F</span>
        </RadioLabel>
        <RadioLabel checked={value === "M"}>
          <input
            type="radio"
            checked={value === "M"}
            onChange={() => handleChange(field, "M")}
          />
          <span>M</span>
        </RadioLabel>
        <RadioLabel checked={value === "E"}>
          <input
            type="radio"
            checked={value === "E"}
            onChange={() => handleChange(field, "E")}
          />
          <span>E</span>
        </RadioLabel>
      </RadioGroup>
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

  if (!formData || !clientData) {
    return (
      <Container>
        <p>Sélectionnez un client pour commencer.</p>
      </Container>
    );
  }

  const risqueValues = [
    formData.risque_client,
    formData.risque_activite,
    formData.risque_localisation,
    formData.risque_nature_mission,
  ];
  const hasHigh = risqueValues.includes("E");
  const hasMedium = risqueValues.includes("M");
  const conclusion = hasHigh
    ? "Risque élevé"
    : hasMedium
      ? "Risque moyen"
      : "Risque faible";
  const vigilance = hasHigh ? "Renforcée" : "Standard";

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
          <i className="fas fa-shield-alt"></i> Questionnaire LBC-FT
        </HeaderTitle>
        <div>
          <ClientBadge variant="status" status={clientData.status}>
            {clientData.status || "Actif"}
          </ClientBadge>
          {clientData.niveau_risque && (
            <ClientBadge variant="risk" status={clientData.niveau_risque}>
              Risque {clientData.niveau_risque}
            </ClientBadge>
          )}
        </div>
      </Header>

      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <span>
          <strong>Client :</strong> {clientData.name}
        </span>
        <span>
          <strong>Code :</strong> {clientData.client_code}
        </span>
      </div>

      <Section>
        <SectionTitle>🔹 Vigilance vis-à-vis de l'entité</SectionTitle>
        <Grid>
          <GridLabel>
            Existe-t-il un document matérialisant l'acceptation ?
          </GridLabel>
          <div>{renderCheckbox("entite_document_acceptation")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            La lettre de mission intègre-t-elle des références à la LBC-FT ?
          </GridLabel>
          <div>{renderCheckbox("entite_lettre_mission_reference")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Le dossier contient-il des documents officiels d'identité ?
          </GridLabel>
          <div>{renderCheckbox("entite_document_identite")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Double vérification de l'identité si client absent ?
          </GridLabel>
          <div>{renderCheckbox("entite_double_verification")}</div>
          <div></div>
          <div></div>
          <GridLabel>Changements juridiques fréquents ?</GridLabel>
          <div>{renderCheckbox("entite_changements_juridiques")}</div>
          <div></div>
          <div></div>
          <GridLabel>Contrôle fiscal avec redressements importants ?</GridLabel>
          <div>{renderCheckbox("entite_controle_fiscal_redressement")}</div>
          <div></div>
          <div></div>
        </Grid>
        <TextArea
          placeholder="Observations…"
          value={formData.observations_entite || ""}
          onChange={(e) => handleChange("observations_entite", e.target.value)}
        />
      </Section>

      <Section>
        <SectionTitle>🔹 Vigilance vis-à-vis du bénéficiaire</SectionTitle>
        <Grid>
          {/* ✅ Correction : remplacer > par &gt; */}
          <GridLabel>Connaissons-nous les associés &gt;25% ?</GridLabel>
          <div>{renderCheckbox("beneficiaire_associes_connus")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Avons-nous identifié le(s) BE (registre consulté) ?
          </GridLabel>
          <div>{renderCheckbox("beneficiaire_registre_consulte")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Avons-nous rencontré le(s) dirigeants effectif(s) ?
          </GridLabel>
          <div>{renderCheckbox("beneficiaire_dirigeants_rencontres")}</div>
          <div></div>
          <div></div>
          <GridLabel>Changements fréquents de représentant légal ?</GridLabel>
          <div>{renderCheckbox("beneficiaire_changements_representant")}</div>
          <div></div>
          <div></div>
        </Grid>
        <TextArea
          placeholder="Observations…"
          value={formData.observations_beneficiaire || ""}
          onChange={(e) =>
            handleChange("observations_beneficiaire", e.target.value)
          }
        />
      </Section>

      <Section>
        <SectionTitle>🔹 Informations sur l'actionnariat</SectionTitle>
        <Grid>
          <GridLabel>
            Existe-t-il des PPE parmi les actionnaires ou dirigeants ?
          </GridLabel>
          <div>{renderCheckbox("actionnariat_ppe")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Part de capital détenue par des actionnaires inconnus ?
          </GridLabel>
          <div>{renderCheckbox("actionnariat_actionnaires_inconnus")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Doutes sur l'intégrité ou réputation des actionnaires ?
          </GridLabel>
          <div>{renderCheckbox("actionnariat_doutes_reputation")}</div>
          <div></div>
          <div></div>
        </Grid>
        <TextArea
          placeholder="Observations…"
          value={formData.observations_actionnariat || ""}
          onChange={(e) =>
            handleChange("observations_actionnariat", e.target.value)
          }
        />
      </Section>

      <Section>
        <SectionTitle>🔹 Informations sur les dirigeants</SectionTitle>
        <Grid>
          <GridLabel>
            Éléments laissant penser que la direction pourrait fausser les
            résultats ?
          </GridLabel>
          <div>{renderCheckbox("dirigeants_fausse_resultats")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Des personnes clés ont-elles quitté l'entité récemment ?
          </GridLabel>
          <div>{renderCheckbox("dirigeants_depart_recent")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Les dirigeants changent-ils souvent de banque, avocat,
            expert-comptable ?
          </GridLabel>
          <div>{renderCheckbox("dirigeants_changements_frequents")}</div>
          <div></div>
          <div></div>
        </Grid>
        <TextArea
          placeholder="Observations…"
          value={formData.observations_dirigeants || ""}
          onChange={(e) =>
            handleChange("observations_dirigeants", e.target.value)
          }
        />
      </Section>

      <Section>
        <SectionTitle>🔹 Structure de l'entité</SectionTitle>
        <Grid>
          <GridLabel>La structure de l'entité est-elle complexe ?</GridLabel>
          <div>{renderCheckbox("structure_complexe")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Opérations, filiales ou comptes bancaires significatifs à l'étranger
            sans lien apparent ?
          </GridLabel>
          <div>{renderCheckbox("structure_filiales_etrangeres")}</div>
          <div></div>
          <div></div>
        </Grid>
        <TextArea
          placeholder="Observations…"
          value={formData.observations_structure || ""}
          onChange={(e) =>
            handleChange("observations_structure", e.target.value)
          }
        />
      </Section>

      <Section>
        <SectionTitle>🔹 Vigilance liée aux opérations</SectionTitle>
        <Grid>
          <GridLabel>Existe-t-il des opérations complexes ?</GridLabel>
          <div>{renderCheckbox("operations_complexes")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Activité générant d'importants mouvements d'argent liquide ?
          </GridLabel>
          <div>{renderCheckbox("operations_liquidite_importante")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Activité dans un secteur sensible (casinos, immobilier, etc.) ?
          </GridLabel>
          <div>{renderCheckbox("operations_secteur_sensible")}</div>
          <div></div>
          <div></div>
          <GridLabel>Montants anormalement élevés ?</GridLabel>
          <div>{renderCheckbox("operations_montants_anormaux")}</div>
          <div></div>
          <div></div>
          <GridLabel>Opérations sans justification économique ?</GridLabel>
          <div>{renderCheckbox("operations_sans_justification")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            L'origine des fonds est-elle suffisamment justifiée ?
          </GridLabel>
          <div>{renderCheckbox("operations_origine_fonds_justifiee")}</div>
          <div></div>
          <div></div>
          <GridLabel>Transactions avec des pays à vigilance ?</GridLabel>
          <div>{renderCheckbox("operations_pays_sensible")}</div>
          <div></div>
          <div></div>
        </Grid>
        <TextArea
          placeholder="Observations…"
          value={formData.observations_operations || ""}
          onChange={(e) =>
            handleChange("observations_operations", e.target.value)
          }
        />
      </Section>

      <Section style={{ borderLeftColor: "#f59e0b" }}>
        <SectionTitle>🎯 Détermination du niveau de risque</SectionTitle>
        <Grid>
          <GridLabel>Client</GridLabel>
          <div>{renderRiskRadio("risque_client")}</div>
          <div></div>
          <div></div>
          <GridLabel>Activité</GridLabel>
          <div>{renderRiskRadio("risque_activite")}</div>
          <div></div>
          <div></div>
          <GridLabel>Localisation</GridLabel>
          <div>{renderRiskRadio("risque_localisation")}</div>
          <div></div>
          <div></div>
          <GridLabel>Nature de la mission</GridLabel>
          <div>{renderRiskRadio("risque_nature_mission")}</div>
          <div></div>
          <div></div>
        </Grid>
        <div
          style={{
            marginTop: "12px",
            background: "#0f172a",
            padding: "12px",
            borderRadius: "8px",
          }}
        >
          <p>
            <strong>Conclusion :</strong> {conclusion}
          </p>
          <p>
            <strong>Niveau de vigilance :</strong> {vigilance}
          </p>
        </div>
        <TextArea
          placeholder="Commentaires sur le risque…"
          value={formData.commentaires_risque || ""}
          onChange={(e) => handleChange("commentaires_risque", e.target.value)}
        />
      </Section>

      <Section style={{ borderLeftColor: "#22c55e" }}>
        <SectionTitle style={{ color: "#22c55e" }}>✍️ SIGNATURE</SectionTitle>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                color: "#94a3b8",
                fontSize: "12px",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Signataire
            </label>
            <SignatureInput
              placeholder="Nom du signataire"
              value={formData.signataire || ""}
              onChange={(e) => handleChange("signataire", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                color: "#94a3b8",
                fontSize: "12px",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Date
            </label>
            <SignatureInput
              type="date"
              value={formData.date_signature || ""}
              onChange={(e) => handleChange("date_signature", e.target.value)}
            />
          </div>
        </div>
      </Section>

      <ButtonGroup>
        <ActionButton variant="primary" onClick={saveForm} disabled={saving}>
          {saving ? "Sauvegarde..." : "ENREGISTRER"}
        </ActionButton>
        <ActionButton variant="secondary" onClick={cancel} disabled={saving}>
          ANNULER
        </ActionButton>
      </ButtonGroup>
    </Container>
  );
};

export default LutteAntiBlanchiment;
