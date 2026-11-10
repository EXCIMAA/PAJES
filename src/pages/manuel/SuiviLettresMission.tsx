// src/pages/manuel/SuiviLettresMission.tsx

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

interface Lettre {
  id?: string;
  client_id: string;
  date_envoi: string;
  numero_lm: string;
  interlocuteur: string;
  nom_document: string;
  redige_par: string;
  type_envoi: string;
  nature_mission: string;
  budget_prevu: number;
  date_retour: string;
  date_relance: string;
  reponse_donnee: string;
  commentaires: string;
}

interface ParametresLettres {
  alert_jours_1: number;
  alert_jours_2: number;
  redacteurs: string[];
  natures_missions: string[];
}

// ==================== COMPOSANT ====================

const SuiviLettresMission: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [lettres, setLettres] = useState<Lettre[]>([]);
  const [parametres, setParametres] = useState<ParametresLettres>({
    alert_jours_1: 15,
    alert_jours_2: 30,
    redacteurs: ["FBI", "TPA", "LG", "MS", "DN"],
    natures_missions: ["Compta", "Social", "Juridique", "Conseil", "Formation"],
  });
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
        .from("lettres_mission_parametres")
        .select("*")
        .eq("client_id", selectedClientId)
        .single();
      if (params) {
        setParametres({
          alert_jours_1: params.alert_jours_1,
          alert_jours_2: params.alert_jours_2,
          redacteurs: params.redacteurs || [],
          natures_missions: params.natures_missions || [],
        });
      }
      const { data: lettresData } = await supabase
        .from("lettres_mission")
        .select("*")
        .eq("client_id", selectedClientId)
        .order("date_envoi", { ascending: false });
      if (lettresData) setLettres(lettresData);
      setLoading(false);
    };
    fetchData();
  }, [selectedClientId]);

  const joursDepuis = (date: string): number => {
    if (!date) return 0;
    const diff = new Date().getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getAlertColor = (jours: number): string => {
    if (jours <= parametres.alert_jours_1) return "#22c55e";
    if (jours <= parametres.alert_jours_2) return "#f59e0b";
    return "#ef4444";
  };

  const saveAll = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("lettres_mission_parametres")
        .select("id")
        .eq("client_id", selectedClientId)
        .single();
      const paramsToSave = {
        client_id: selectedClientId,
        alert_jours_1: parametres.alert_jours_1,
        alert_jours_2: parametres.alert_jours_2,
        redacteurs: parametres.redacteurs,
        natures_missions: parametres.natures_missions,
      };
      if (existing) {
        await supabase
          .from("lettres_mission_parametres")
          .update(paramsToSave)
          .eq("client_id", selectedClientId);
      } else {
        await supabase
          .from("lettres_mission_parametres")
          .insert([paramsToSave]);
      }
      await supabase
        .from("lettres_mission")
        .delete()
        .eq("client_id", selectedClientId);
      if (lettres.length > 0) {
        const toInsert = lettres.map(({ id, ...rest }) => rest);
        await supabase.from("lettres_mission").insert(toInsert);
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
        .from("lettres_mission_parametres")
        .select("*")
        .eq("client_id", selectedClientId)
        .single();
      if (params) {
        setParametres({
          alert_jours_1: params.alert_jours_1,
          alert_jours_2: params.alert_jours_2,
          redacteurs: params.redacteurs || [],
          natures_missions: params.natures_missions || [],
        });
      }
      const { data: lettresData } = await supabase
        .from("lettres_mission")
        .select("*")
        .eq("client_id", selectedClientId)
        .order("date_envoi", { ascending: false });
      if (lettresData) setLettres(lettresData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!clientData) return;
    const rows: any[] = [
      ["Suivi des lettres de mission"],
      ["Client", clientData.name],
      [],
      [
        "Date envoi",
        "Nb jours",
        "Numéro LM",
        "Interlocuteur",
        "Document",
        "Rédigé par",
        "Type envoi",
        "Nature mission",
        "Budget",
        "Date retour",
        "Date relance",
        "Réponse",
        "Commentaires",
      ],
    ];
    lettres.forEach((l) => {
      rows.push([
        l.date_envoi,
        joursDepuis(l.date_envoi),
        l.numero_lm,
        l.interlocuteur,
        l.nom_document,
        l.redige_par,
        l.type_envoi,
        l.nature_mission,
        l.budget_prevu,
        l.date_retour,
        l.date_relance,
        l.reponse_donnee,
        l.commentaires,
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lettres mission");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Lettres_mission_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const total = lettres.length;
  const accords = lettres.filter((l) => l.reponse_donnee === "Accord").length;
  const refus = lettres.filter((l) => l.reponse_donnee === "Refus").length;
  const enAttente = lettres.filter(
    (l) => l.reponse_donnee === "En attente / Le client réfléchit",
  ).length;
  const sansReponse = lettres.filter(
    (l) => l.reponse_donnee === "Sans réponse / Aucune suite donnée",
  ).length;

  if (loading && clients.length === 0) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement...</p>
      </LoadingContainer>
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
          <i className="fas fa-envelope"></i> Suivi des lettres de mission
        </HeaderTitle>
        <div>
          <span style={{ color: "#94a3b8" }}>{clientData.name}</span>
        </div>
      </Header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#1e293b",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#e2e8f0" }}
          >
            {total}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Envoyées</div>
        </div>
        <div
          style={{
            background: "#1e293b",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#22c55e" }}
          >
            {accords}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Accords</div>
        </div>
        <div
          style={{
            background: "#1e293b",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}
          >
            {refus}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Refus</div>
        </div>
        <div
          style={{
            background: "#1e293b",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}
          >
            {enAttente}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>En attente</div>
        </div>
        <div
          style={{
            background: "#1e293b",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#64748b" }}
          >
            {sansReponse}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Sans réponse</div>
        </div>
      </div>

      <Section>
        <SectionTitle>⚙️ Paramètres d'alerte</SectionTitle>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Délai de relance (jours)
            </label>
            <input
              type="number"
              value={parametres.alert_jours_1}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  alert_jours_1: Number(e.target.value),
                })
              }
              style={{
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
                width: "100px",
              }}
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "12px" }}>
              Délai critique (jours)
            </label>
            <input
              type="number"
              value={parametres.alert_jours_2}
              onChange={(e) =>
                setParametres({
                  ...parametres,
                  alert_jours_2: Number(e.target.value),
                })
              }
              style={{
                padding: "4px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
                width: "100px",
              }}
            />
          </div>
        </div>
      </Section>

      <Section>
        <SectionTitle>📋 Liste des lettres</SectionTitle>
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
                <th style={{ padding: "6px", textAlign: "left" }}>
                  Date envoi
                </th>
                <th style={{ padding: "6px", textAlign: "center" }}>Jours</th>
                <th style={{ padding: "6px", textAlign: "left" }}>N° LM</th>
                <th style={{ padding: "6px", textAlign: "left" }}>
                  Interlocuteur
                </th>
                <th style={{ padding: "6px", textAlign: "left" }}>Document</th>
                <th style={{ padding: "6px", textAlign: "left" }}>
                  Rédigé par
                </th>
                <th style={{ padding: "6px", textAlign: "left" }}>
                  Type envoi
                </th>
                <th style={{ padding: "6px", textAlign: "left" }}>Nature</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Budget</th>
                <th style={{ padding: "6px", textAlign: "left" }}>Réponse</th>
                <th style={{ padding: "6px", textAlign: "left" }}>
                  Commentaires
                </th>
              </tr>
            </thead>
            <tbody>
              {lettres.map((l, idx) => {
                const jours = joursDepuis(l.date_envoi);
                const color = getAlertColor(jours);
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "6px" }}>
                      <input
                        type="date"
                        value={l.date_envoi}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].date_envoi = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          width: "130px",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "center",
                        color: color,
                        fontWeight: "bold",
                      }}
                    >
                      {jours}
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input
                        type="text"
                        value={l.numero_lm}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].numero_lm = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          width: "80px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input
                        type="text"
                        value={l.interlocuteur}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].interlocuteur = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          width: "120px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input
                        type="text"
                        value={l.nom_document}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].nom_document = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          width: "120px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px" }}>
                      <select
                        value={l.redige_par}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].redige_par = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                        }}
                      >
                        {parametres.redacteurs.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input
                        type="text"
                        value={l.type_envoi}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].type_envoi = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          width: "80px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px" }}>
                      <select
                        value={l.nature_mission}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].nature_mission = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                        }}
                      >
                        {parametres.natures_missions.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "6px", textAlign: "right" }}>
                      <input
                        type="number"
                        value={l.budget_prevu}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].budget_prevu = Number(e.target.value);
                          setLettres(newLettres);
                        }}
                        style={{
                          width: "80px",
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          textAlign: "right",
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px" }}>
                      <select
                        value={l.reponse_donnee}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].reponse_donnee = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                        }}
                      >
                        <option value="">--</option>
                        <option value="Accord">Accord</option>
                        <option value="Refus">Refus</option>
                        <option value="En attente / Le client réfléchit">
                          En attente
                        </option>
                        <option value="Sans réponse / Aucune suite donnée">
                          Sans réponse
                        </option>
                      </select>
                    </td>
                    <td style={{ padding: "6px" }}>
                      <input
                        type="text"
                        value={l.commentaires}
                        onChange={(e) => {
                          const newLettres = [...lettres];
                          newLettres[idx].commentaires = e.target.value;
                          setLettres(newLettres);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#e2e8f0",
                          width: "120px",
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ActionButton
          variant="secondary"
          onClick={() => {
            setLettres([
              ...lettres,
              {
                client_id: selectedClientId!,
                date_envoi: "",
                numero_lm: "",
                interlocuteur: "",
                nom_document: "",
                redige_par: "",
                type_envoi: "",
                nature_mission: "",
                budget_prevu: 0,
                date_retour: "",
                date_relance: "",
                reponse_donnee: "",
                commentaires: "",
              },
            ]);
          }}
          style={{ marginTop: "12px" }}
        >
          + Ajouter une lettre
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

export default SuiviLettresMission;
