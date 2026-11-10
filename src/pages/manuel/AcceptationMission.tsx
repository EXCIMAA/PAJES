// src/pages/manuel/AcceptationMission.tsx

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

const Title = styled.h2`
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

const Subtitle = styled.div`
  color: #94a3b8;
  font-size: 14px;
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

const DecisionGroup = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin: 12px 0;
`;

const DecisionLabel = styled.label<{ checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ checked }) => (checked ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  input {
    width: 18px;
    height: 18px;
    accent-color: #4facfe;
    cursor: pointer;
  }
`;

const SignatureRow = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin: 12px 0;
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

const ClientBadges = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

// ==================== INTERFACES ====================

interface Client {
  id: string;
  client_code: string;
  name: string;
  status?: string;
  niveau_risque?: string;
}

interface AcceptationData {
  id?: string;
  client_id: string;
  rencontre_client: boolean;
  presentation_obtenue: boolean;
  observations_connaissance: string;
  risque_activite: string;
  risque_structure: string;
  risque_si_comptable: string;
  risque_org_comptable: string;
  risque_historique_fiscal: string;
  risque_historique_social: string;
  observations_risques: string;
  repartition_taches_define: boolean;
  volume_ecritures_estime: boolean;
  specificites_identifiees: boolean;
  delais_identifies: boolean;
  observations_besoins: string;
  cabinet_independant: boolean;
  competence_technique: boolean;
  moyens_suffisants: boolean;
  observations_faisabilite: string;
  questionnaire_vigilance_complete: boolean;
  pieces_identite_verifiees: boolean;
  origine_fonds_comprise: boolean;
  observations_lbc: string;
  client_suivi_autre_cabinet: boolean;
  info_confrere_demandee: boolean;
  litige_confrere: boolean;
  observations_ancien_cabinet: string;
  type_client: string;
  decision: string;
  signature_expert: string;
  date_signature: string;
  observations_generales: string;
}

// ==================== COMPOSANT ====================

const AcceptationMission: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [formData, setFormData] = useState<AcceptationData | null>(null);
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

  // Chargement des données du client et du formulaire
  useEffect(() => {
    if (!selectedClientId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: clientInfo, error: clientError } = await supabase
          .from("clients")
          .select("id, client_code, name, status, niveau_risque")
          .eq("id", selectedClientId)
          .single();
        if (clientError) throw clientError;
        setClientData(clientInfo);

        const { data: acceptation, error: acceptationError } = await supabase
          .from("acceptation_mission")
          .select("*")
          .eq("client_id", selectedClientId)
          .single();

        if (acceptationError && acceptationError.code !== "PGRST116") {
          throw acceptationError;
        }

        if (acceptation) {
          setFormData(acceptation);
        } else {
          setFormData({
            client_id: selectedClientId,
            rencontre_client: false,
            presentation_obtenue: false,
            observations_connaissance: "",
            risque_activite: "",
            risque_structure: "",
            risque_si_comptable: "",
            risque_org_comptable: "",
            risque_historique_fiscal: "",
            risque_historique_social: "",
            observations_risques: "",
            repartition_taches_define: false,
            volume_ecritures_estime: false,
            specificites_identifiees: false,
            delais_identifies: false,
            observations_besoins: "",
            cabinet_independant: false,
            competence_technique: false,
            moyens_suffisants: false,
            observations_faisabilite: "",
            questionnaire_vigilance_complete: false,
            pieces_identite_verifiees: false,
            origine_fonds_comprise: false,
            observations_lbc: "",
            client_suivi_autre_cabinet: false,
            info_confrere_demandee: false,
            litige_confrere: false,
            observations_ancien_cabinet: "",
            type_client: "",
            decision: "",
            signature_expert: "",
            date_signature: "",
            observations_generales: "",
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

  // Mise à jour des champs
  const handleChange = (field: keyof AcceptationData, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  // Sauvegarde avec gestion de la date vide
  const saveForm = async () => {
    if (!formData || !selectedClientId) return;
    setSaving(true);
    try {
      const dataToSave = { ...formData };
      if (dataToSave.date_signature === "") {
        dataToSave.date_signature = null as any;
      }

      const { data: existing } = await supabase
        .from("acceptation_mission")
        .select("id")
        .eq("client_id", selectedClientId)
        .single();

      let result;
      if (existing) {
        result = await supabase
          .from("acceptation_mission")
          .update(dataToSave)
          .eq("client_id", selectedClientId);
      } else {
        result = await supabase
          .from("acceptation_mission")
          .insert([dataToSave]);
      }
      if (result.error) throw result.error;
      alert("Formulaire d'acceptation sauvegardé !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Annulation (recharger depuis la base)
  const cancel = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("acceptation_mission")
        .select("*")
        .eq("client_id", selectedClientId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setFormData(data);
      } else {
        setFormData({
          client_id: selectedClientId,
          rencontre_client: false,
          presentation_obtenue: false,
          observations_connaissance: "",
          risque_activite: "",
          risque_structure: "",
          risque_si_comptable: "",
          risque_org_comptable: "",
          risque_historique_fiscal: "",
          risque_historique_social: "",
          observations_risques: "",
          repartition_taches_define: false,
          volume_ecritures_estime: false,
          specificites_identifiees: false,
          delais_identifies: false,
          observations_besoins: "",
          cabinet_independant: false,
          competence_technique: false,
          moyens_suffisants: false,
          observations_faisabilite: "",
          questionnaire_vigilance_complete: false,
          pieces_identite_verifiees: false,
          origine_fonds_comprise: false,
          observations_lbc: "",
          client_suivi_autre_cabinet: false,
          info_confrere_demandee: false,
          litige_confrere: false,
          observations_ancien_cabinet: "",
          type_client: "",
          decision: "",
          signature_expert: "",
          date_signature: "",
          observations_generales: "",
        });
      }
    } catch (err: any) {
      console.error(err);
      alert("Erreur annulation : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export Excel
  const exportExcel = () => {
    if (!formData || !clientData) return;

    const rows: any[] = [];
    rows.push(["ACCEPTATION ET MAINTIEN DE MISSION"]);
    rows.push([]);
    rows.push(["Client", clientData.name, "Code", clientData.client_code]);
    rows.push([]);

    rows.push(["1. PRISE DE CONNAISSANCE DU CLIENT"]);
    rows.push([
      "Le cabinet a-t-il rencontré le client ?",
      formData.rencontre_client ? "Oui" : "Non",
    ]);
    rows.push([
      "Une présentation a-t-elle été obtenue ?",
      formData.presentation_obtenue ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_connaissance || ""]);
    rows.push([]);

    rows.push(["2. ANALYSE DES RISQUES"]);
    rows.push(["Activité", formData.risque_activite || ""]);
    rows.push(["Structure juridique", formData.risque_structure || ""]);
    rows.push(["SI comptable", formData.risque_si_comptable || ""]);
    rows.push(["Organisation comptable", formData.risque_org_comptable || ""]);
    rows.push(["Historique fiscal", formData.risque_historique_fiscal || ""]);
    rows.push(["Historique social", formData.risque_historique_social || ""]);
    rows.push(["Observations", formData.observations_risques || ""]);
    rows.push([]);

    rows.push(["3. ANALYSE DES BESOINS"]);
    rows.push([
      "Répartition des tâches définie ?",
      formData.repartition_taches_define ? "Oui" : "Non",
    ]);
    rows.push([
      "Volume d'écritures estimé ?",
      formData.volume_ecritures_estime ? "Oui" : "Non",
    ]);
    rows.push([
      "Spécificités identifiées ?",
      formData.specificites_identifiees ? "Oui" : "Non",
    ]);
    rows.push([
      "Délais identifiés ?",
      formData.delais_identifies ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_besoins || ""]);
    rows.push([]);

    rows.push(["4. FAISABILITÉ"]);
    rows.push([
      "Cabinet indépendant ?",
      formData.cabinet_independant ? "Oui" : "Non",
    ]);
    rows.push([
      "Compétence technique ?",
      formData.competence_technique ? "Oui" : "Non",
    ]);
    rows.push([
      "Moyens suffisants ?",
      formData.moyens_suffisants ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_faisabilite || ""]);
    rows.push([]);

    rows.push(["5. CONFORMITÉ LBC/FT"]);
    rows.push([
      "Questionnaire vigilance complété ?",
      formData.questionnaire_vigilance_complete ? "Oui" : "Non",
    ]);
    rows.push([
      "Pièces d'identité vérifiées ?",
      formData.pieces_identite_verifiees ? "Oui" : "Non",
    ]);
    rows.push([
      "Origine des fonds comprise ?",
      formData.origine_fonds_comprise ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_lbc || ""]);
    rows.push([]);

    rows.push(["6. RELATION AVEC UN ANCIEN CABINET"]);
    rows.push([
      "Client suivi par un autre cabinet ?",
      formData.client_suivi_autre_cabinet ? "Oui" : "Non",
    ]);
    rows.push([
      "Information du confrère demandée ?",
      formData.info_confrere_demandee ? "Oui" : "Non",
    ]);
    rows.push([
      "Litige avec le précédent cabinet ?",
      formData.litige_confrere ? "Oui" : "Non",
    ]);
    rows.push(["Observations", formData.observations_ancien_cabinet || ""]);
    rows.push([]);

    rows.push(["7. DÉCISION"]);
    rows.push([
      "Type de client",
      formData.type_client === "nouveau"
        ? "Nouveau client"
        : formData.type_client === "ancien"
          ? "Ancien client"
          : "",
    ]);
    rows.push(["Décision", formData.decision || ""]);
    rows.push([]);

    rows.push(["SIGNATURE"]);
    rows.push(["Expert-comptable", formData.signature_expert || ""]);
    rows.push(["Date", formData.date_signature || ""]);
    rows.push([]);

    rows.push(["OBSERVATIONS GÉNÉRALES"]);
    rows.push([formData.observations_generales || ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Acceptation");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Acceptation_mission_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Rendu des cases à cocher
  const renderCheckbox = (field: keyof AcceptationData, label: string) => {
    if (!formData) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Checkbox
          type="checkbox"
          checked={(formData[field] as boolean) || false}
          onChange={(e) => handleChange(field, e.target.checked)}
        />
        <span style={{ fontSize: "14px", color: "#e2e8f0" }}>{label}</span>
      </div>
    );
  };

  // Rendu des radios pour les risques
  const renderRiskRadio = (field: keyof AcceptationData) => {
    if (!formData) return null;
    const value = (formData[field] as string) || "";
    return (
      <RadioGroup>
        <RadioLabel checked={value === "E"}>
          <input
            type="radio"
            checked={value === "E"}
            onChange={() => handleChange(field, "E")}
          />
          E
        </RadioLabel>
        <RadioLabel checked={value === "M"}>
          <input
            type="radio"
            checked={value === "M"}
            onChange={() => handleChange(field, "M")}
          />
          M
        </RadioLabel>
        <RadioLabel checked={value === "F"}>
          <input
            type="radio"
            checked={value === "F"}
            onChange={() => handleChange(field, "F")}
          />
          F
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
        <Title>
          <i className="fas fa-file-signature"></i> Acceptation et maintien de
          mission
        </Title>
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
      </Header>

      <Subtitle style={{ marginBottom: "16px" }}>
        <strong>{clientData.name}</strong> · {clientData.client_code}
      </Subtitle>

      {/* Sections du formulaire (inchangées) */}
      {/* 1. PRISE DE CONNAISSANCE */}
      <Section>
        <SectionTitle>🔹 1. PRISE DE CONNAISSANCE DU CLIENT</SectionTitle>
        <Grid>
          <GridLabel>
            Le cabinet a-t-il rencontré le client et compris son activité ?
          </GridLabel>
          <div>{renderCheckbox("rencontre_client", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Une présentation de l'entreprise a-t-elle été obtenue ?
          </GridLabel>
          <div>{renderCheckbox("presentation_obtenue", "")}</div>
          <div></div>
          <div></div>
        </Grid>
        <div style={{ marginTop: "8px" }}>
          <TextArea
            placeholder="Observations…"
            value={formData.observations_connaissance || ""}
            onChange={(e) =>
              handleChange("observations_connaissance", e.target.value)
            }
          />
        </div>
      </Section>

      {/* 2. ANALYSE DES RISQUES */}
      <Section>
        <SectionTitle>🔹 2. ANALYSE DES RISQUES CLIENT</SectionTitle>
        <Grid>
          <GridLabel>Activité (secteur, complexité, informel)</GridLabel>
          <div>{renderRiskRadio("risque_activite")}</div>
          <div></div>
          <div></div>
          <GridLabel>Structure juridique et gouvernance</GridLabel>
          <div>{renderRiskRadio("risque_structure")}</div>
          <div></div>
          <div></div>
          <GridLabel>Fiabilité du système d'information comptable</GridLabel>
          <div>{renderRiskRadio("risque_si_comptable")}</div>
          <div></div>
          <div></div>
          <GridLabel>Organisation comptable interne</GridLabel>
          <div>{renderRiskRadio("risque_org_comptable")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Historique fiscal (DGI : redressements, contrôles)
          </GridLabel>
          <div>{renderRiskRadio("risque_historique_fiscal")}</div>
          <div></div>
          <div></div>
          <GridLabel>Historique social (CNPS : contentieux, retard)</GridLabel>
          <div>{renderRiskRadio("risque_historique_social")}</div>
          <div></div>
          <div></div>
        </Grid>
        <div style={{ marginTop: "8px" }}>
          <TextArea
            placeholder="Observations…"
            value={formData.observations_risques || ""}
            onChange={(e) =>
              handleChange("observations_risques", e.target.value)
            }
          />
        </div>
      </Section>

      {/* 3. ANALYSE DES BESOINS */}
      <Section>
        <SectionTitle>🔹 3. ANALYSE DES BESOINS DU CLIENT</SectionTitle>
        <Grid>
          <GridLabel>
            Répartition des tâches entre client et cabinet définie ?
          </GridLabel>
          <div>{renderCheckbox("repartition_taches_define", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>Volume d'écritures comptables estimé ?</GridLabel>
          <div>{renderCheckbox("volume_ecritures_estime", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Spécificités fiscales / comptables (OHADA) identifiées ?
          </GridLabel>
          <div>{renderCheckbox("specificites_identifiees", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>Délais spécifiques du client identifiés ?</GridLabel>
          <div>{renderCheckbox("delais_identifies", "")}</div>
          <div></div>
          <div></div>
        </Grid>
        <div style={{ marginTop: "8px" }}>
          <TextArea
            placeholder="Observations…"
            value={formData.observations_besoins || ""}
            onChange={(e) =>
              handleChange("observations_besoins", e.target.value)
            }
          />
        </div>
      </Section>

      {/* 4. FAISABILITÉ */}
      <Section>
        <SectionTitle>🔹 4. FAISABILITÉ DE LA MISSION</SectionTitle>
        <Grid>
          <GridLabel>Le cabinet est-il indépendant du client ?</GridLabel>
          <div>{renderCheckbox("cabinet_independant", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Le cabinet a-t-il la compétence technique nécessaire ?
          </GridLabel>
          <div>{renderCheckbox("competence_technique", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Les moyens humains et matériels sont-ils suffisants ?
          </GridLabel>
          <div>{renderCheckbox("moyens_suffisants", "")}</div>
          <div></div>
          <div></div>
        </Grid>
        <div style={{ marginTop: "8px" }}>
          <TextArea
            placeholder="Observations…"
            value={formData.observations_faisabilite || ""}
            onChange={(e) =>
              handleChange("observations_faisabilite", e.target.value)
            }
          />
        </div>
      </Section>

      {/* 5. LBC / FT */}
      <Section>
        <SectionTitle>🔹 5. CONFORMITÉ – LBC / FT</SectionTitle>
        <Grid>
          <GridLabel>Questionnaire de vigilance client complété ?</GridLabel>
          <div>{renderCheckbox("questionnaire_vigilance_complete", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>Pièces d'identité du dirigeant vérifiées ?</GridLabel>
          <div>{renderCheckbox("pieces_identite_verifiees", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>Origine de l'activité et des fonds comprise ?</GridLabel>
          <div>{renderCheckbox("origine_fonds_comprise", "")}</div>
          <div></div>
          <div></div>
        </Grid>
        <div style={{ marginTop: "8px" }}>
          <TextArea
            placeholder="Observations…"
            value={formData.observations_lbc || ""}
            onChange={(e) => handleChange("observations_lbc", e.target.value)}
          />
        </div>
      </Section>

      {/* 6. RELATION ANCIEN CABINET */}
      <Section>
        <SectionTitle>🔹 6. RELATION AVEC UN ANCIEN CABINET</SectionTitle>
        <Grid>
          <GridLabel>
            Le client est-il suivi par un autre expert-comptable ?
          </GridLabel>
          <div>{renderCheckbox("client_suivi_autre_cabinet", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>Si oui : information du confrère demandée ?</GridLabel>
          <div>{renderCheckbox("info_confrere_demandee", "")}</div>
          <div></div>
          <div></div>
          <GridLabel>
            Y a-t-il opposition ou litige avec le précédent cabinet ?
          </GridLabel>
          <div>{renderCheckbox("litige_confrere", "")}</div>
          <div></div>
          <div></div>
        </Grid>
        <div style={{ marginTop: "8px" }}>
          <TextArea
            placeholder="Observations…"
            value={formData.observations_ancien_cabinet || ""}
            onChange={(e) =>
              handleChange("observations_ancien_cabinet", e.target.value)
            }
          />
        </div>
      </Section>

      {/* 7. DÉCISION */}
      <Section>
        <SectionTitle>🔹 7. DÉCISION D'ACCEPTATION DE MISSION</SectionTitle>
        <div style={{ marginBottom: "12px" }}>
          <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>
            Type de client :
          </span>
          <DecisionGroup>
            <DecisionLabel checked={formData.type_client === "nouveau"}>
              <input
                type="radio"
                checked={formData.type_client === "nouveau"}
                onChange={() => handleChange("type_client", "nouveau")}
              />
              🆕 Nouveau client
            </DecisionLabel>
            <DecisionLabel checked={formData.type_client === "ancien"}>
              <input
                type="radio"
                checked={formData.type_client === "ancien"}
                onChange={() => handleChange("type_client", "ancien")}
              />
              🔄 Ancien client
            </DecisionLabel>
          </DecisionGroup>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>
            Décision :
          </span>
          <DecisionGroup>
            <DecisionLabel checked={formData.decision === "accepter"}>
              <input
                type="radio"
                checked={formData.decision === "accepter"}
                onChange={() => handleChange("decision", "accepter")}
                disabled={formData.type_client !== "nouveau"}
              />
              ✅ J'accepte la mission comptable
            </DecisionLabel>
            <DecisionLabel checked={formData.decision === "refuser"}>
              <input
                type="radio"
                checked={formData.decision === "refuser"}
                onChange={() => handleChange("decision", "refuser")}
                disabled={formData.type_client !== "nouveau"}
              />
              ❌ Je refuse la mission comptable
            </DecisionLabel>
            <DecisionLabel checked={formData.decision === "maintenir"}>
              <input
                type="radio"
                checked={formData.decision === "maintenir"}
                onChange={() => handleChange("decision", "maintenir")}
                disabled={formData.type_client !== "ancien"}
              />
              ✅ Je maintiens la mission
            </DecisionLabel>
            <DecisionLabel checked={formData.decision === "ne_pas_maintenir"}>
              <input
                type="radio"
                checked={formData.decision === "ne_pas_maintenir"}
                onChange={() => handleChange("decision", "ne_pas_maintenir")}
                disabled={formData.type_client !== "ancien"}
              />
              ❌ Je ne maintiens pas la mission
            </DecisionLabel>
          </DecisionGroup>
        </div>
      </Section>

      {/* Signature */}
      <Section style={{ borderLeftColor: "#22c55e" }}>
        <SectionTitle style={{ color: "#22c55e" }}>✍️ SIGNATURE</SectionTitle>
        <SignatureRow>
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
              Expert-comptable
            </label>
            <SignatureInput
              placeholder="Nom et signature"
              value={formData.signature_expert || ""}
              onChange={(e) => handleChange("signature_expert", e.target.value)}
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
        </SignatureRow>
      </Section>

      {/* Observations générales */}
      <Section>
        <SectionTitle>📝 OBSERVATIONS GÉNÉRALES</SectionTitle>
        <TextArea
          placeholder="Observations générales…"
          value={formData.observations_generales || ""}
          onChange={(e) =>
            handleChange("observations_generales", e.target.value)
          }
          style={{ minHeight: "80px" }}
        />
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

export default AcceptationMission;
