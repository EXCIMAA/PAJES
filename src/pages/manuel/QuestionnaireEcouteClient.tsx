// src/pages/manuel/QuestionnaireEcouteClientInteractif.tsx
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

const Section = styled.div`
  margin: 24px 0 16px;
  padding: 16px 20px;
  background: #1e293b;
  border-radius: 8px;
  border-left: 3px solid #4facfe;
`;

const SectionTitle = styled.h3`
  color: #4facfe;
  font-size: 16px;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SubSection = styled.div`
  margin: 16px 0;
  padding: 12px 0;
  border-bottom: 1px solid #334155;
  &:last-child {
    border-bottom: none;
  }
`;

const SubSectionTitle = styled.h4`
  color: #94a3b8;
  font-size: 14px;
  margin: 0 0 8px 0;
`;

const Row = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
  margin: 8px 0;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 150px;
  label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  input,
  textarea,
  select {
    padding: 6px 10px;
    border: 1px solid #334155;
    border-radius: 4px;
    background: #0f172a;
    color: #e2e8f0;
    font-size: 13px;
    &:focus {
      outline: none;
      border-color: #4facfe;
    }
  }
  textarea {
    min-height: 60px;
    resize: vertical;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin: 4px 0;
`;

const RadioLabel = styled.label<{ checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${({ checked }) => (checked ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  input[type="radio"] {
    accent-color: #4facfe;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin: 6px 0;
`;

const CheckboxLabel = styled.label<{ checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${({ checked }) => (checked ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  input[type="checkbox"] {
    accent-color: #4facfe;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

const LegendBox = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 8px 0;
  font-size: 12px;
  color: #94a3b8;
  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  strong {
    color: #e2e8f0;
  }
`;

const Button = styled.button<{ $variant?: "primary" | "secondary" | "danger" }>`
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ $variant }) => {
    if ($variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if ($variant === "secondary")
      return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
    if ($variant === "danger")
      return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
    return "background: #1e293b; color: #e2e8f0; &:hover { background: #334155; }";
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

const SuccessMessage = styled.div`
  background: #14532d;
  color: #86efac;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 12px 0;
  border-left: 4px solid #22c55e;
`;

// ==================== TYPES ====================
interface Client {
  id: string;
  client_code: string;
  name: string;
}

interface Reponse {
  id?: string;
  client_id: string;
  nom_client: string;
  entreprise: string;
  fonction: string;
  // Relations
  accueil_local: string; // TS, S, I, TI
  accueil_telephone: string;
  ecoute: string; // TA, A, PA, PTA
  disponible: string;
  delais: string;
  conseil: string;
  connaissance_entreprise: string;
  commentaire_relations: string;
  // Qualité prestations
  prestation_besoins: string; // TF, F, B, TB, pc
  prestation_comptes: string;
  prestation_social: string;
  prestation_juridique: string;
  prestation_ponctuelle: string;
  commentaire_qualite: string;
  // Honoraires
  honoraires: string; // Tres eleves, Eleves, Adaptes, Bon marche
  facturation: string; // Pas assez claire, Claire et detaillee
  commentaire_honoraires: string;
  // Besoins
  flash_info: string; // Oui, Non, Sans opinion
  flash_sujets: string;
  services_ligne: string;
  services_ligne_sujets: string;
  moyen_info: string[]; // Plaquette papier, Mail, Rendez-vous de presentation
  sujets_interet: string[];
  autre_sujet: string;
  // Autres questions
  connait_autres_cabinets: string; // Oui, Non
  prestations_autres: string;
  sentiment_client: string; // Anonyme, Reconnu, Privilegie
  sentiment_fournisseur: string; // Oblige, Comme les autres, Utile, Indispensable
  preconise: string; // Oui, Non, Pas encore
  pret_a_preconiser: string; // Oui, Non
  pourquoi_non_preconise: string;
  commentaires_suggestions: string;
}

// ==================== COMPOSANT ====================
const QuestionnaireEcouteClientInteractif: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // État du formulaire
  const [form, setForm] = useState<Reponse>({
    client_id: "",
    nom_client: "",
    entreprise: "",
    fonction: "",
    accueil_local: "",
    accueil_telephone: "",
    ecoute: "",
    disponible: "",
    delais: "",
    conseil: "",
    connaissance_entreprise: "",
    commentaire_relations: "",
    prestation_besoins: "",
    prestation_comptes: "",
    prestation_social: "",
    prestation_juridique: "",
    prestation_ponctuelle: "",
    commentaire_qualite: "",
    honoraires: "",
    facturation: "",
    commentaire_honoraires: "",
    flash_info: "",
    flash_sujets: "",
    services_ligne: "",
    services_ligne_sujets: "",
    moyen_info: [],
    sujets_interet: [],
    autre_sujet: "",
    connait_autres_cabinets: "",
    prestations_autres: "",
    sentiment_client: "",
    sentiment_fournisseur: "",
    preconise: "",
    pret_a_preconiser: "",
    pourquoi_non_preconise: "",
    commentaires_suggestions: "",
  });

  // Charger les clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select("id, client_code, name")
          .order("name");
        if (error) throw error;
        setClients(data || []);
        if (data && data.length > 0) {
          setSelectedClientId(data[0].id);
          loadReponse(data[0].id);
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

  const loadReponse = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("questionnaire_ecoute_reponses")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        // Convertir les champs array si nécessaire
        const moyen_info = data.moyen_info || [];
        const sujets_interet = data.sujets_interet || [];
        setForm({ ...data, moyen_info, sujets_interet });
        // Remplir les champs affichés
      } else {
        // Réinitialiser avec le client sélectionné
        const client = clients.find((c) => c.id === clientId);
        setForm({
          client_id: clientId,
          nom_client: client?.name || "",
          entreprise: "",
          fonction: "",
          accueil_local: "",
          accueil_telephone: "",
          ecoute: "",
          disponible: "",
          delais: "",
          conseil: "",
          connaissance_entreprise: "",
          commentaire_relations: "",
          prestation_besoins: "",
          prestation_comptes: "",
          prestation_social: "",
          prestation_juridique: "",
          prestation_ponctuelle: "",
          commentaire_qualite: "",
          honoraires: "",
          facturation: "",
          commentaire_honoraires: "",
          flash_info: "",
          flash_sujets: "",
          services_ligne: "",
          services_ligne_sujets: "",
          moyen_info: [],
          sujets_interet: [],
          autre_sujet: "",
          connait_autres_cabinets: "",
          prestations_autres: "",
          sentiment_client: "",
          sentiment_fournisseur: "",
          preconise: "",
          pret_a_preconiser: "",
          pourquoi_non_preconise: "",
          commentaires_suggestions: "",
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    loadReponse(clientId);
  };

  const handleChange = (field: keyof Reponse, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxArray = (
    field: keyof Reponse,
    value: string,
    checked: boolean,
  ) => {
    const current = (form[field] as string[]) || [];
    if (checked) {
      if (!current.includes(value)) {
        setForm((prev) => ({ ...prev, [field]: [...current, value] }));
      }
    } else {
      setForm((prev) => ({
        ...prev,
        [field]: current.filter((v) => v !== value),
      }));
    }
  };

  const saveReponse = async () => {
    if (!selectedClientId) {
      alert("Veuillez sélectionner un client.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...form, client_id: selectedClientId };
      // Vérifier si une réponse existe déjà
      const { data: existing } = await supabase
        .from("questionnaire_ecoute_reponses")
        .select("id")
        .eq("client_id", selectedClientId)
        .maybeSingle();
      let error;
      if (existing) {
        const result = await supabase
          .from("questionnaire_ecoute_reponses")
          .update(payload)
          .eq("id", existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("questionnaire_ecoute_reponses")
          .insert([payload]);
        error = result.error;
      }
      if (error) throw error;
      setSuccess("Réponses sauvegardées !");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    if (!selectedClientId) {
      alert("Sélectionnez un client.");
      return;
    }
    const client = clients.find((c) => c.id === selectedClientId);
    const rows: any[] = [
      ["Questionnaire d'écoute client"],
      [`Client : ${client?.name || ""}`],
      [],
      ["Section", "Question", "Réponse"],
    ];

    // Fonction pour ajouter une ligne
    const addRow = (section: string, question: string, reponse: any) => {
      rows.push([section, question, reponse]);
    };

    // Informations
    addRow("Vous", "Nom du client", form.nom_client);
    addRow("Vous", "Entreprise", form.entreprise);
    addRow("Vous", "Fonction", form.fonction);

    // Relations
    addRow("Relations", "Accueil dans nos locaux", form.accueil_local);
    addRow("Relations", "Accueil téléphonique", form.accueil_telephone);
    addRow("Relations", "Nous savons vous écouter", form.ecoute);
    addRow("Relations", "Disponibles et réactifs", form.disponible);
    addRow("Relations", "Respect des délais", form.delais);
    addRow("Relations", "Nous vous conseillons", form.conseil);
    addRow(
      "Relations",
      "Connaissance de votre entreprise",
      form.connaissance_entreprise,
    );
    addRow("Relations", "Commentaires", form.commentaire_relations);

    // Prestations
    addRow("Prestations", "Correspond à vos besoins", form.prestation_besoins);
    addRow("Prestations", "Arrêté des comptes", form.prestation_comptes);
    addRow("Prestations", "Prestations sociales", form.prestation_social);
    addRow("Prestations", "Prestations juridiques", form.prestation_juridique);
    addRow(
      "Prestations",
      "Prestations ponctuelles",
      form.prestation_ponctuelle,
    );
    addRow("Prestations", "Commentaires", form.commentaire_qualite);

    // Honoraires
    addRow("Honoraires", "Jugement des honoraires", form.honoraires);
    addRow("Honoraires", "Facturation", form.facturation);
    addRow("Honoraires", "Commentaires", form.commentaire_honoraires);

    // Besoins
    addRow("Besoins", "Flash d'infos par mail", form.flash_info);
    addRow("Besoins", "Sujets flash", form.flash_sujets);
    addRow("Besoins", "Services en ligne", form.services_ligne);
    addRow("Besoins", "Sujets services en ligne", form.services_ligne_sujets);
    addRow("Besoins", "Moyens d'information", form.moyen_info?.join(", "));
    addRow("Besoins", "Sujets d'intérêt", form.sujets_interet?.join(", "));
    addRow("Besoins", "Autre sujet", form.autre_sujet);

    // Autres
    addRow("Autres", "Connaît d'autres cabinets", form.connait_autres_cabinets);
    addRow("Autres", "Prestations autres cabinets", form.prestations_autres);
    addRow("Autres", "Sentiment client", form.sentiment_client);
    addRow("Autres", "Sentiment fournisseur", form.sentiment_fournisseur);
    addRow("Autres", "A préconisé le cabinet", form.preconise);
    addRow("Autres", "Prêt à préconiser", form.pret_a_preconiser);
    addRow("Autres", "Pourquoi non", form.pourquoi_non_preconise);
    addRow(
      "Autres",
      "Commentaires et suggestions",
      form.commentaires_suggestions,
    );

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questionnaire");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Questionnaire_${client?.client_code || "client"}.xlsx`;
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

  const radioOptions = (
    name: string,
    options: { value: string; label: string }[],
    currentValue: string,
  ) => {
    return (
      <RadioGroup>
        {options.map((opt) => (
          <RadioLabel key={opt.value} checked={currentValue === opt.value}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={currentValue === opt.value}
              onChange={() => handleChange(name as keyof Reponse, opt.value)}
            />
            {opt.label}
          </RadioLabel>
        ))}
      </RadioGroup>
    );
  };

  const renderCheckboxGroup = (
    field: keyof Reponse,
    options: { value: string; label: string }[],
  ) => {
    const selected = (form[field] as string[]) || [];
    return (
      <CheckboxGrid>
        {options.map((opt) => (
          <CheckboxLabel key={opt.value} checked={selected.includes(opt.value)}>
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={(e) =>
                handleCheckboxArray(field, opt.value, e.target.checked)
              }
            />
            {opt.label}
          </CheckboxLabel>
        ))}
      </CheckboxGrid>
    );
  };

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-clipboard-question"></i> Questionnaire d'écoute
          client
        </HeaderTitle>
        <div style={{ display: "flex", gap: "8px" }}>
          <ExportButton onClick={exportExcel}>
            <i className="fas fa-file-excel"></i> Exporter Excel
          </ExportButton>
          <Button $variant="primary" onClick={saveReponse} disabled={saving}>
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </div>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Questionnaire de satisfaction client. Remplissez-le pour recueillir
        l'avis de vos clients sur l'accueil, la qualité des prestations, les
        honoraires et leurs besoins.
      </Description>

      <Selectors>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Client :</span>
          <StyledSelect
            value={selectedClientId}
            onChange={(e) => handleClientChange(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.client_code})
              </option>
            ))}
          </StyledSelect>
        </div>
      </Selectors>

      {error && (
        <div style={{ color: "#dc2626", marginBottom: "12px" }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}
      {success && (
        <SuccessMessage>
          <i className="fas fa-check-circle"></i> {success}
        </SuccessMessage>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Informations client */}
        <Section>
          <SectionTitle>
            <i className="fas fa-user"></i> Vous
          </SectionTitle>
          <Row>
            <Field>
              <label>Votre nom</label>
              <input
                type="text"
                value={form.nom_client}
                onChange={(e) => handleChange("nom_client", e.target.value)}
                placeholder="Nom du client"
              />
            </Field>
            <Field>
              <label>Votre entreprise</label>
              <input
                type="text"
                value={form.entreprise}
                onChange={(e) => handleChange("entreprise", e.target.value)}
                placeholder="Entreprise"
              />
            </Field>
          </Row>
          <Row>
            <Field>
              <label>Votre fonction</label>
              <input
                type="text"
                value={form.fonction}
                onChange={(e) => handleChange("fonction", e.target.value)}
                placeholder="Fonction"
              />
            </Field>
          </Row>
        </Section>

        {/* Relations */}
        <Section>
          <SectionTitle>
            <i className="fas fa-handshake"></i> Vos relations avec notre
            cabinet
          </SectionTitle>
          <SubSection>
            <SubSectionTitle>Qualité de l'accueil</SubSectionTitle>
            <Row>
              <Field>
                <label>La qualité de l'accueil dans nos locaux</label>
                {radioOptions(
                  "accueil_local",
                  [
                    { value: "TS", label: "TS" },
                    { value: "S", label: "S" },
                    { value: "I", label: "I" },
                    { value: "TI", label: "TI" },
                  ],
                  form.accueil_local,
                )}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>La qualité de notre accueil téléphonique</label>
                {radioOptions(
                  "accueil_telephone",
                  [
                    { value: "TS", label: "TS" },
                    { value: "S", label: "S" },
                    { value: "I", label: "I" },
                    { value: "TI", label: "TI" },
                  ],
                  form.accueil_telephone,
                )}
              </Field>
            </Row>
            <LegendBox>
              <span>
                <strong>TS</strong> : très satisfaisant
              </span>
              <span>
                <strong>S</strong> : satisfaisant
              </span>
              <span>
                <strong>I</strong> : insatisfaisant
              </span>
              <span>
                <strong>TI</strong> : très insatisfaisant
              </span>
            </LegendBox>
          </SubSection>
          <SubSection>
            <SubSectionTitle>Appréciation de nos services</SubSectionTitle>
            <Row>
              <Field>
                <label>Nous savons vous écouter</label>
                {radioOptions(
                  "ecoute",
                  [
                    { value: "TA", label: "TA" },
                    { value: "A", label: "A" },
                    { value: "PA", label: "PA" },
                    { value: "PTA", label: "PTA" },
                  ],
                  form.ecoute,
                )}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>Nous sommes disponibles et réactifs</label>
                {radioOptions(
                  "disponible",
                  [
                    { value: "TA", label: "TA" },
                    { value: "A", label: "A" },
                    { value: "PA", label: "PA" },
                    { value: "PTA", label: "PTA" },
                  ],
                  form.disponible,
                )}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>Nous respectons les délais</label>
                {radioOptions(
                  "delais",
                  [
                    { value: "TA", label: "TA" },
                    { value: "A", label: "A" },
                    { value: "PA", label: "PA" },
                    { value: "PTA", label: "PTA" },
                  ],
                  form.delais,
                )}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>Nous vous conseillons</label>
                {radioOptions(
                  "conseil",
                  [
                    { value: "TA", label: "TA" },
                    { value: "A", label: "A" },
                    { value: "PA", label: "PA" },
                    { value: "PTA", label: "PTA" },
                  ],
                  form.conseil,
                )}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>
                  Nous vous donnons l'impression de bien connaître votre
                  entreprise
                </label>
                {radioOptions(
                  "connaissance_entreprise",
                  [
                    { value: "TA", label: "TA" },
                    { value: "A", label: "A" },
                    { value: "PA", label: "PA" },
                    { value: "PTA", label: "PTA" },
                  ],
                  form.connaissance_entreprise,
                )}
              </Field>
            </Row>
            <LegendBox>
              <span>
                <strong>TA</strong> : tout à fait d'accord
              </span>
              <span>
                <strong>A</strong> : d'accord
              </span>
              <span>
                <strong>PA</strong> : peu d'accord
              </span>
              <span>
                <strong>PTA</strong> : pas du tout d'accord
              </span>
            </LegendBox>
          </SubSection>
          <Row>
            <Field>
              <label>Commentaires</label>
              <textarea
                value={form.commentaire_relations}
                onChange={(e) =>
                  handleChange("commentaire_relations", e.target.value)
                }
                placeholder="Vos commentaires..."
              />
            </Field>
          </Row>
        </Section>

        {/* Prestations */}
        <Section>
          <SectionTitle>
            <i className="fas fa-chart-line"></i> Votre opinion concernant la
            qualité de nos prestations
          </SectionTitle>
          <Row>
            <Field>
              <label>
                La qualité de nos prestations correspond-elle à vos besoins ?
              </label>
              {radioOptions(
                "prestation_besoins",
                [
                  { value: "TF", label: "TF" },
                  { value: "F", label: "F" },
                  { value: "B", label: "B" },
                  { value: "TB", label: "TB" },
                  { value: "pc", label: "pc" },
                ],
                form.prestation_besoins,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>
                La qualité de nos prestations liées à l'arrêté des comptes
              </label>
              {radioOptions(
                "prestation_comptes",
                [
                  { value: "TF", label: "TF" },
                  { value: "F", label: "F" },
                  { value: "B", label: "B" },
                  { value: "TB", label: "TB" },
                  { value: "pc", label: "pc" },
                ],
                form.prestation_comptes,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>La qualité de nos prestations sociales</label>
              {radioOptions(
                "prestation_social",
                [
                  { value: "TF", label: "TF" },
                  { value: "F", label: "F" },
                  { value: "B", label: "B" },
                  { value: "TB", label: "TB" },
                  { value: "pc", label: "pc" },
                ],
                form.prestation_social,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>La qualité de nos prestations juridiques</label>
              {radioOptions(
                "prestation_juridique",
                [
                  { value: "TF", label: "TF" },
                  { value: "F", label: "F" },
                  { value: "B", label: "B" },
                  { value: "TB", label: "TB" },
                  { value: "pc", label: "pc" },
                ],
                form.prestation_juridique,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>La qualité de nos prestations ponctuelles</label>
              {radioOptions(
                "prestation_ponctuelle",
                [
                  { value: "TF", label: "TF" },
                  { value: "F", label: "F" },
                  { value: "B", label: "B" },
                  { value: "TB", label: "TB" },
                  { value: "pc", label: "pc" },
                ],
                form.prestation_ponctuelle,
              )}
            </Field>
          </Row>
          <LegendBox>
            <span>
              <strong>TF</strong> : très faible
            </span>
            <span>
              <strong>F</strong> : faible
            </span>
            <span>
              <strong>B</strong> : bonne
            </span>
            <span>
              <strong>TB</strong> : très bonne
            </span>
            <span>
              <strong>pc</strong> : pas concerné
            </span>
          </LegendBox>
          <Row>
            <Field>
              <label>Commentaires</label>
              <textarea
                value={form.commentaire_qualite}
                onChange={(e) =>
                  handleChange("commentaire_qualite", e.target.value)
                }
                placeholder="Vos commentaires..."
              />
            </Field>
          </Row>
        </Section>

        {/* Honoraires */}
        <Section>
          <SectionTitle>
            <i className="fas fa-euro-sign"></i> Votre appréciation de nos
            honoraires
          </SectionTitle>
          <Row>
            <Field>
              <label>Jugez-vous pour ces missions nos honoraires ?</label>
              {radioOptions(
                "honoraires",
                [
                  { value: "Tres eleves", label: "Très élevés" },
                  { value: "Eleves", label: "Élevés" },
                  { value: "Adaptes", label: "Adaptés" },
                  { value: "Bon marche", label: "Bon marché" },
                ],
                form.honoraires,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>Que pensez-vous de la facturation ?</label>
              {radioOptions(
                "facturation",
                [
                  {
                    value: "Pas assez claire",
                    label: "Pas assez claire et détaillée",
                  },
                  {
                    value: "Claire et detaillee",
                    label: "Claire et détaillée",
                  },
                ],
                form.facturation,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>Commentaires</label>
              <textarea
                value={form.commentaire_honoraires}
                onChange={(e) =>
                  handleChange("commentaire_honoraires", e.target.value)
                }
                placeholder="Vos commentaires..."
              />
            </Field>
          </Row>
        </Section>

        {/* Besoins */}
        <Section>
          <SectionTitle>
            <i className="fas fa-lightbulb"></i> Vos besoins
          </SectionTitle>
          <SubSection>
            <SubSectionTitle>Flash d'informations</SubSectionTitle>
            <Row>
              <Field>
                <label>
                  Souhaiteriez-vous recevoir un flash d'informations gratuit par
                  mail ?
                </label>
                {radioOptions(
                  "flash_info",
                  [
                    { value: "Oui", label: "Oui" },
                    { value: "Non", label: "Non" },
                    {
                      value: "Sans opinion",
                      label: "Sans opinion aujourd'hui",
                    },
                  ],
                  form.flash_info,
                )}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>Si oui, sur quels sujets en particulier ?</label>
                <textarea
                  value={form.flash_sujets}
                  onChange={(e) => handleChange("flash_sujets", e.target.value)}
                  placeholder="Sujets..."
                />
              </Field>
            </Row>
          </SubSection>
          <SubSection>
            <SubSectionTitle>Services en ligne</SubSectionTitle>
            <Row>
              <Field>
                <label>
                  Souhaiteriez-vous avoir accès à des nouveaux services en ligne
                  ?
                </label>
                {radioOptions(
                  "services_ligne",
                  [
                    { value: "Oui", label: "Oui" },
                    { value: "Non", label: "Non" },
                    {
                      value: "Sans opinion",
                      label: "Sans opinion aujourd'hui",
                    },
                  ],
                  form.services_ligne,
                )}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>
                  Si oui, sur quels sujets en particuliers (comptabilité, paie,
                  tableau de bord, etc...) ?
                </label>
                <textarea
                  value={form.services_ligne_sujets}
                  onChange={(e) =>
                    handleChange("services_ligne_sujets", e.target.value)
                  }
                  placeholder="Sujets..."
                />
              </Field>
            </Row>
          </SubSection>
          <SubSection>
            <SubSectionTitle>
              Moyens d'information et sujets d'intérêt
            </SubSectionTitle>
            <Row>
              <Field>
                <label>
                  Par quels principaux moyens souhaitez-vous être informé
                  régulièrement sur les missions nouvelles et les différents
                  services proposés par le cabinet ?
                </label>
                {renderCheckboxGroup("moyen_info", [
                  { value: "Plaquette papier", label: "Plaquette papier" },
                  { value: "Mail", label: "Mail" },
                  {
                    value: "Rendez-vous de presentation",
                    label: "Rendez-vous de présentation",
                  },
                ])}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>Sur quels sujets ?</label>
                {renderCheckboxGroup("sujets_interet", [
                  {
                    value: "Suivi regulier (tableau de bord)",
                    label:
                      "Suivi régulier de mon activité sous forme de tableau de bord",
                  },
                  {
                    value: "Optimiser patrimoine personnel",
                    label: "Optimiser mon patrimoine personnel",
                  },
                  {
                    value: "Prevision d'activite",
                    label: "Prévision d'activité en début d'année",
                  },
                  {
                    value: "Evaluation entreprise",
                    label: "Evaluation de mon entreprise",
                  },
                  {
                    value: "Avenir professionnel",
                    label:
                      "Point sur mon avenir professionnel (retraite, prévoyance et patrimoine)",
                  },
                  {
                    value: "Accompagnement juridique/fiscal",
                    label:
                      "Accompagnement juridique ou fiscal de mon entreprise",
                  },
                  {
                    value: "Acquisition/integration partenaires",
                    label: "Acquisition ou intégration de nouveaux partenaires",
                  },
                  {
                    value: "Externalisation paie",
                    label: "Externalisation de la paie",
                  },
                ])}
              </Field>
            </Row>
            <Row>
              <Field>
                <label>Un autre sujet :</label>
                <input
                  type="text"
                  value={form.autre_sujet}
                  onChange={(e) => handleChange("autre_sujet", e.target.value)}
                  placeholder="Autre sujet..."
                />
              </Field>
            </Row>
          </SubSection>
        </Section>

        {/* Autres questions */}
        <Section>
          <SectionTitle>
            <i className="fas fa-comments"></i> Continuez à nous parler
            franchement...
          </SectionTitle>
          <Row>
            <Field>
              <label>
                Connaissez-vous d'autres cabinets d'expertise-comptable ?
              </label>
              {radioOptions(
                "connait_autres_cabinets",
                [
                  { value: "Oui", label: "Oui" },
                  { value: "Non", label: "Non" },
                ],
                form.connait_autres_cabinets,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>
                Si oui, quelles sont les prestations apportées par ces cabinets
                que vous souhaiteriez nous voir mettre en place pour vous ?
              </label>
              <textarea
                value={form.prestations_autres}
                onChange={(e) =>
                  handleChange("prestations_autres", e.target.value)
                }
                placeholder="Décrivez..."
              />
            </Field>
          </Row>
          <Row>
            <Field>
              <label>
                Avez-vous le sentiment de n'être pour notre cabinet qu'un client
                ?
              </label>
              {radioOptions(
                "sentiment_client",
                [
                  { value: "Anonyme", label: "Anonyme" },
                  { value: "Reconnu", label: "Reconnu" },
                  { value: "Privilegie", label: "Privilégié" },
                ],
                form.sentiment_client,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>
                Avez-vous le sentiment que nous sommes pour votre entreprise
                qu'un fournisseur ?
              </label>
              {radioOptions(
                "sentiment_fournisseur",
                [
                  { value: "Oblige", label: "Obligé" },
                  { value: "Comme les autres", label: "Comme les autres" },
                  { value: "Utile", label: "Utile" },
                  { value: "Indispensable", label: "Indispensable" },
                ],
                form.sentiment_fournisseur,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>
                Avez-vous préconisé notre cabinet à certaines de vos relations ?
              </label>
              {radioOptions(
                "preconise",
                [
                  { value: "Oui", label: "Oui" },
                  { value: "Non", label: "Non" },
                  { value: "Pas encore", label: "Pas encore" },
                ],
                form.preconise,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>Seriez-vous prêt à le faire ?</label>
              {radioOptions(
                "pret_a_preconiser",
                [
                  { value: "Oui", label: "Oui" },
                  { value: "Non", label: "Non" },
                ],
                form.pret_a_preconiser,
              )}
            </Field>
          </Row>
          <Row>
            <Field>
              <label>Si non, pourquoi ?</label>
              <textarea
                value={form.pourquoi_non_preconise}
                onChange={(e) =>
                  handleChange("pourquoi_non_preconise", e.target.value)
                }
                placeholder="Raison..."
              />
            </Field>
          </Row>
        </Section>

        {/* Commentaires finaux */}
        <Section>
          <SectionTitle>
            <i className="fas fa-pen"></i> Vos commentaires et suggestions
          </SectionTitle>
          <Row>
            <Field>
              <textarea
                value={form.commentaires_suggestions}
                onChange={(e) =>
                  handleChange("commentaires_suggestions", e.target.value)
                }
                placeholder="Laissez votre client s'exprimer librement..."
                rows={4}
              />
            </Field>
          </Row>
        </Section>

        <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
          <Button $variant="primary" onClick={saveReponse} disabled={saving}>
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </Button>
          <Button
            $variant="secondary"
            onClick={() => loadReponse(selectedClientId)}
            disabled={saving}
          >
            Annuler
          </Button>
        </div>
      </form>

      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid #1e293b",
          fontSize: "12px",
          color: "#475569",
          textAlign: "center",
        }}
      >
        Toute l'équipe du cabinet vous remercie du temps que vous avez bien
        voulu consacrer.
      </div>
    </Container>
  );
};

export default QuestionnaireEcouteClientInteractif;
