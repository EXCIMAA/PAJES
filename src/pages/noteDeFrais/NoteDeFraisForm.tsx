// src/pages/NoteDeFrais/NoteDeFraisForm.tsx
import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import { addNotification } from "../../lib/notifications";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ==================== TYPES ====================
interface ExpenseLine {
  id?: string;
  date: string;
  designation: string;
  quantite: number;
  devise: string;
  montant_ht: number;
  tva: number;
}

interface ExpenseReport {
  id: string;
  reference: string;
  collaborateur_name: string;
  collaborateur_initials: string;
  collaborateur_phone: string;
  collaborateur_address: string;
  mission_id: string;
  client_id: string;
  date_debut: string;
  date_fin: string;
  mois: string;
  taux_tva: number;
  avance: number;
  modalite_reglement: string;
  status: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  net_a_payer: number;
  montant_lettres: string;
  signature: boolean;
  lines: ExpenseLine[];
}

interface Props {
  reportId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// ==================== STYLES ====================
const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #0f172a;
  padding: 24px;
  border-radius: 12px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  input,
  select {
    padding: 6px 10px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: #1e293b;
    color: #e2e8f0;
    font-size: 13px;
    &:focus {
      outline: none;
      border-color: #4facfe;
    }
  }
`;

const LineTableWrapper = styled.div`
  overflow-x: auto;
  margin: 12px 0;
`;

const LineTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 6px 8px;
    border: 1px solid #1e293b;
    text-align: left;
  }
  th {
    background: #1e293b;
    color: #94a3b8;
    text-transform: uppercase;
    font-size: 10px;
  }
  input,
  select {
    width: 100%;
    background: transparent;
    border: none;
    color: #e2e8f0;
    padding: 4px;
    &:focus {
      outline: 1px solid #4facfe;
    }
  }
  select option {
    background: #1e293b;
  }
`;

const Button = styled.button<{ variant?: "primary" | "secondary" | "danger" }>`
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ variant }) => {
    if (variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if (variant === "secondary")
      return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
    if (variant === "danger")
      return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
    return "background: #1e293b; color: #e2e8f0; &:hover { background: #334155; }";
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TotalRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 30px;
  padding: 12px 0;
  border-top: 2px solid #334155;
  margin-top: 12px;
  .total-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    span:first-child {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    span:last-child {
      font-size: 16px;
      font-weight: 700;
      color: #e2e8f0;
    }
  }
`;

const SignatureSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 12px 0;
  label {
    color: #94a3b8;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }
  }
  input[type="text"] {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: #1e293b;
    color: #e2e8f0;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
`;

// ==================== CONFIG DES DÉSIGNATIONS ====================
const DESIGNATION_MAP: Record<string, number> = {
  Restauration: 5000,
  "Taxi ville": 5000,
  "Train A/R": 30000,
  "Bus A/R": 20000,
  Logement: 25000,
};
const DESIGNATIONS = Object.keys(DESIGNATION_MAP);

// ==================== COMPOSANT ====================
export const NoteDeFraisForm: React.FC<Props> = ({
  reportId,
  onSuccess,
  onCancel,
}) => {
  const [header, setHeader] = useState<Partial<ExpenseReport>>({
    collaborateur_name: "",
    collaborateur_initials: "",
    collaborateur_phone: "",
    collaborateur_address: "",
    date_debut: "",
    date_fin: "",
    mois: "",
    taux_tva: 0,
    avance: 0,
    modalite_reglement: "Chèque",
    status: "brouillon",
    signature: false,
  });
  const [lines, setLines] = useState<ExpenseLine[]>([
    {
      date: "",
      designation: "",
      quantite: 1,
      devise: "Fcfa",
      montant_ht: 0,
      tva: 0,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Charger missions et clients
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingMissions(true);
        const [missionsRes, clientsRes] = await Promise.all([
          supabase
            .from("weekly_missions")
            .select("id, subject")
            .order("subject"),
          supabase.from("clients").select("id, name").order("name"),
        ]);
        if (missionsRes.error) {
          console.error("Erreur chargement missions:", missionsRes.error);
          setError("Impossible de charger les missions.");
        } else {
          setMissions(missionsRes.data || []);
        }
        if (clientsRes.error) {
          console.error("Erreur chargement clients:", clientsRes.error);
        } else {
          setClients(clientsRes.data || []);
        }
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des données.");
      } finally {
        setLoadingMissions(false);
      }
    };
    fetchData();
  }, []);

  // Charger une note existante
  useEffect(() => {
    if (reportId) {
      const fetchReport = async () => {
        try {
          setLoading(true);
          const { data: report, error } = await supabase
            .from("expense_reports")
            .select("*, lines:expense_lines(*)")
            .eq("id", reportId)
            .single();
          if (error) throw error;
          setHeader(report);
          if (report.lines) {
            setLines(report.lines);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchReport();
    }
  }, [reportId]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        date: header.date_debut || "",
        designation: "",
        quantite: 1,
        devise: "Fcfa",
        montant_ht: 0,
        tva: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof ExpenseLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "designation") {
      const preset = DESIGNATION_MAP[value];
      if (preset !== undefined) {
        updated[index].montant_ht = preset;
      }
    }
    setLines(updated);
  };

  const handleHeaderChange = (field: keyof ExpenseReport, value: any) => {
    setHeader({ ...header, [field]: value });
  };

  const calculateTotals = () => {
    const total_ht = lines.reduce(
      (sum, l) => sum + l.quantite * l.montant_ht,
      0,
    );
    const taux_tva = header.taux_tva || 0;
    const total_tva = total_ht * (taux_tva / 100);
    const total_ttc = total_ht + total_tva;
    const avance = header.avance || 0;
    const net_a_payer = total_ttc - avance;
    return { total_ht, total_tva, total_ttc, net_a_payer };
  };

  const { total_ht, total_tva, total_ttc, net_a_payer } = calculateTotals();

  // ============ SOUMISSION ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header.collaborateur_name) {
      alert("Veuillez renseigner le nom du collaborateur.");
      return;
    }
    if (lines.length === 0 || lines.some((l) => !l.designation)) {
      alert(
        "Veuillez remplir toutes les lignes de frais (désignation obligatoire).",
      );
      return;
    }

    try {
      setLoading(true);

      // Générer la référence
      let reference = header.reference;
      if (!reference) {
        const initials = header.collaborateur_initials || "XX";
        const today = new Date();
        const dateStr = format(today, "ddMMyy");
        reference = `NDF_${dateStr}_${initials}`;
      }

      // Nettoyer les dates ("" → null)
      const dateDebut = header.date_debut || null;
      const dateFin = header.date_fin || null;
      const moisDate = header.mois ? header.mois + "-01" : null;

      // ✅ VALIDATION DES CLÉS ÉTRANGÈRES : ne envoyer que des IDs existants
      let missionId = null;
      if (header.mission_id && header.mission_id.trim() !== "") {
        const missionExists = missions.some((m) => m.id === header.mission_id);
        if (missionExists) {
          missionId = header.mission_id;
        } else {
          console.warn(
            "Mission ID invalide ou inexistante, mise à null:",
            header.mission_id,
          );
        }
      }

      let clientId = null;
      if (header.client_id && header.client_id.trim() !== "") {
        const clientExists = clients.some((c) => c.id === header.client_id);
        if (clientExists) {
          clientId = header.client_id;
        } else {
          console.warn(
            "Client ID invalide ou inexistant, mise à null:",
            header.client_id,
          );
        }
      }

      const headerData = {
        collaborateur_name: header.collaborateur_name,
        collaborateur_initials: header.collaborateur_initials,
        collaborateur_phone: header.collaborateur_phone,
        collaborateur_address: header.collaborateur_address,
        date_debut: dateDebut,
        date_fin: dateFin,
        mois: moisDate,
        taux_tva: header.taux_tva || 0,
        avance: header.avance || 0,
        modalite_reglement: header.modalite_reglement || "Chèque",
        status: header.status || "brouillon",
        signature: header.signature || false,
        reference,
        mission_id: missionId,
        client_id: clientId,
        total_ht,
        total_tva,
        total_ttc,
        net_a_payer,
      };

      let savedReportId = reportId;

      if (reportId) {
        const { error } = await supabase
          .from("expense_reports")
          .update(headerData)
          .eq("id", reportId);
        if (error) throw error;
        await supabase
          .from("expense_lines")
          .delete()
          .eq("expense_report_id", reportId);
      } else {
        const { data, error } = await supabase
          .from("expense_reports")
          .insert([headerData])
          .select()
          .single();
        if (error) throw error;
        savedReportId = data.id;
      }

      if (savedReportId) {
        const linesToInsert = lines.map((l) => ({
          expense_report_id: savedReportId,
          date: l.date || null,
          designation: l.designation,
          quantite: l.quantite,
          devise: l.devise,
          montant_ht: l.montant_ht,
          tva: l.tva || 0,
        }));
        const { error } = await supabase
          .from("expense_lines")
          .insert(linesToInsert);
        if (error) throw error;
      }

      void addNotification({
        title: reportId ? "Note mise à jour" : "Nouvelle note",
        message: reportId
          ? "La note a été mise à jour."
          : "La note a été créée.",
        type: "expense",
      });
      onSuccess();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ EXPORT PDF ============
  const exportPDF = async () => {
    if (!printRef.current) return;
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`NoteFrais_${header.reference || "export"}.pdf`);
    } catch (err) {
      console.error("Erreur export PDF:", err);
      alert("Erreur lors de la génération du PDF.");
    }
  };

  const getMissionName = () => {
    const found = missions.find((m) => m.id === header.mission_id);
    return found ? found.subject : "Non définie";
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div style={{ color: "#dc2626" }}>Erreur : {error}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <FormContainer>
        {/* ====== ZONE D'IMPRESSION (PDF) ====== */}
        <div
          ref={printRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "210mm",
            background: "white",
            padding: "20px",
            color: "#000",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <img
              src="/logos/ExicimaaLogo"
              alt="Logo"
              style={{ height: "60px", objectFit: "contain" }}
            />
            <div style={{ textAlign: "right" }}>
              <h2 style={{ margin: 0, color: "#1e3a5f" }}>NOTE DE FRAIS</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                Réf: {header.reference || "N/A"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "16px",
              fontSize: "13px",
            }}
          >
            <div>
              <strong>Collaborateur :</strong> {header.collaborateur_name}
            </div>
            <div>
              <strong>Initiales :</strong> {header.collaborateur_initials}
            </div>
            <div>
              <strong>Tél :</strong> {header.collaborateur_phone}
            </div>
            <div>
              <strong>Adresse :</strong> {header.collaborateur_address}
            </div>
            <div>
              <strong>Période :</strong> {header.date_debut} - {header.date_fin}
            </div>
            <div>
              <strong>Mission :</strong> {getMissionName()}
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              marginTop: "10px",
            }}
          >
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "left",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "left",
                  }}
                >
                  Désignation
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "center",
                  }}
                >
                  Qté
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "center",
                  }}
                >
                  Devise
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "right",
                  }}
                >
                  Montant HT
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "right",
                  }}
                >
                  TVA
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "right",
                  }}
                >
                  Net HT
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>
                    {l.date}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>
                    {l.designation}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px",
                      textAlign: "center",
                    }}
                  >
                    {l.quantite}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px",
                      textAlign: "center",
                    }}
                  >
                    {l.devise}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px",
                      textAlign: "right",
                    }}
                  >
                    {l.montant_ht.toFixed(0)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px",
                      textAlign: "right",
                    }}
                  >
                    {l.tva.toFixed(0)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px",
                      textAlign: "right",
                    }}
                  >
                    {(l.quantite * l.montant_ht).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              marginTop: "15px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "30px",
              fontSize: "13px",
            }}
          >
            <div>
              <strong>Total HT :</strong> {total_ht.toFixed(0)} FCFA
            </div>
            <div>
              <strong>TVA ({header.taux_tva || 0}%) :</strong>{" "}
              {total_tva.toFixed(0)} FCFA
            </div>
            <div>
              <strong>TTC :</strong> {total_ttc.toFixed(0)} FCFA
            </div>
            <div>
              <strong>Avance :</strong> {header.avance || 0} FCFA
            </div>
            <div>
              <strong>Net à payer :</strong> {net_a_payer.toFixed(0)} FCFA
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              borderTop: "1px solid #ccc",
              paddingTop: "10px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong>Modalité de règlement :</strong>{" "}
              {header.modalite_reglement}
            </div>
            <div>
              <strong>Signature du collaborateur :</strong>{" "}
              {header.signature ? "Signé" : "Non signé"}
              <span style={{ marginLeft: "10px", fontStyle: "italic" }}>
                {header.collaborateur_name}
              </span>
            </div>
            <div>
              <em>
                Fait à {header.collaborateur_address || "..."}, le{" "}
                {new Date().toLocaleDateString()}
              </em>
            </div>
          </div>
        </div>

        {/* ====== FORMULAIRE VISIBLE ====== */}
        <Grid>
          <Field>
            <label>Collaborateur</label>
            <input
              value={header.collaborateur_name || ""}
              onChange={(e) =>
                handleHeaderChange("collaborateur_name", e.target.value)
              }
              placeholder="Nom complet"
              required
            />
          </Field>
          <Field>
            <label>Initiales</label>
            <input
              value={header.collaborateur_initials || ""}
              onChange={(e) =>
                handleHeaderChange("collaborateur_initials", e.target.value)
              }
              placeholder="MJ"
              maxLength={10}
            />
          </Field>
          <Field>
            <label>Téléphone</label>
            <input
              value={header.collaborateur_phone || ""}
              onChange={(e) =>
                handleHeaderChange("collaborateur_phone", e.target.value)
              }
            />
          </Field>
          <Field>
            <label>Adresse</label>
            <input
              value={header.collaborateur_address || ""}
              onChange={(e) =>
                handleHeaderChange("collaborateur_address", e.target.value)
              }
            />
          </Field>
          <Field>
            <label>Date début</label>
            <input
              type="date"
              value={header.date_debut || ""}
              onChange={(e) => handleHeaderChange("date_debut", e.target.value)}
            />
          </Field>
          <Field>
            <label>Date fin</label>
            <input
              type="date"
              value={header.date_fin || ""}
              onChange={(e) => handleHeaderChange("date_fin", e.target.value)}
            />
          </Field>
          <Field>
            <label>Mois</label>
            <input
              type="month"
              value={header.mois || ""}
              onChange={(e) => handleHeaderChange("mois", e.target.value)}
            />
          </Field>
          <Field>
            <label>Mission</label>
            <select
              value={header.mission_id || ""}
              onChange={(e) => handleHeaderChange("mission_id", e.target.value)}
              disabled={loadingMissions}
            >
              <option value="">-- Sélectionner --</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.subject}
                </option>
              ))}
            </select>
            {loadingMissions && (
              <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                Chargement des missions...
              </span>
            )}
          </Field>
          <Field>
            <label>Client</label>
            <select
              value={header.client_id || ""}
              onChange={(e) => handleHeaderChange("client_id", e.target.value)}
            >
              <option value="">-- Sélectionner --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <label>Taux TVA (%)</label>
            <input
              type="number"
              step="0.01"
              value={header.taux_tva || 0}
              onChange={(e) =>
                handleHeaderChange("taux_tva", parseFloat(e.target.value) || 0)
              }
            />
          </Field>
          <Field>
            <label>Avance</label>
            <input
              type="number"
              value={header.avance || 0}
              onChange={(e) =>
                handleHeaderChange("avance", parseFloat(e.target.value) || 0)
              }
            />
          </Field>
          <Field>
            <label>Modalité de règlement</label>
            <select
              value={header.modalite_reglement || "Chèque"}
              onChange={(e) =>
                handleHeaderChange("modalite_reglement", e.target.value)
              }
            >
              <option value="Chèque">Chèque</option>
              <option value="Virement">Virement</option>
              <option value="Espèce">Espèce</option>
            </select>
          </Field>
          <Field>
            <label>Statut</label>
            <select
              value={header.status || "brouillon"}
              onChange={(e) => handleHeaderChange("status", e.target.value)}
            >
              <option value="brouillon">Brouillon</option>
              <option value="soumis">Soumis</option>
              <option value="valide">Validé</option>
              <option value="rejete">Rejeté</option>
              <option value="rembourse">Remboursé</option>
            </select>
          </Field>
        </Grid>

        <h4 style={{ color: "#94a3b8", marginTop: "12px" }}>Lignes de frais</h4>
        <LineTableWrapper>
          <LineTable>
            <thead>
              <tr>
                <th style={{ width: "120px" }}>Date</th>
                <th>Désignation</th>
                <th style={{ width: "70px" }}>Qté</th>
                <th style={{ width: "80px" }}>Devise</th>
                <th style={{ width: "100px" }}>Montant HT</th>
                <th style={{ width: "80px" }}>TVA</th>
                <th style={{ width: "100px" }}>Net HT</th>
                <th style={{ width: "60px" }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="date"
                      value={line.date || ""}
                      onChange={(e) => updateLine(idx, "date", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={line.designation}
                      onChange={(e) =>
                        updateLine(idx, "designation", e.target.value)
                      }
                      style={{ width: "100%" }}
                    >
                      <option value="">-- Sélectionner --</option>
                      {DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                      <option value="autre">Autre...</option>
                    </select>
                    {line.designation === "autre" && (
                      <input
                        type="text"
                        placeholder="Saisir une autre désignation"
                        value={
                          line.designation === "autre" ? "" : line.designation
                        }
                        onChange={(e) =>
                          updateLine(idx, "designation", e.target.value)
                        }
                        style={{ marginTop: "2px" }}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={line.quantite}
                      onChange={(e) =>
                        updateLine(
                          idx,
                          "quantite",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={line.devise}
                      onChange={(e) =>
                        updateLine(idx, "devise", e.target.value)
                      }
                      style={{ width: "70px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={line.montant_ht}
                      onChange={(e) =>
                        updateLine(
                          idx,
                          "montant_ht",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={line.tva || 0}
                      onChange={(e) =>
                        updateLine(idx, "tva", parseFloat(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td>{(line.quantite * line.montant_ht).toFixed(0)}</td>
                  <td>
                    <Button
                      variant="danger"
                      type="button"
                      onClick={() => removeLine(idx)}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </LineTable>
        </LineTableWrapper>
        <Button variant="secondary" type="button" onClick={addLine}>
          <i className="fas fa-plus"></i> Ajouter une ligne
        </Button>

        <TotalRow>
          <div className="total-item">
            <span>Total HT</span>
            <span>{total_ht.toFixed(0)} FCFA</span>
          </div>
          <div className="total-item">
            <span>Montant TVA</span>
            <span>{total_tva.toFixed(0)} FCFA</span>
          </div>
          <div className="total-item">
            <span>Montant TTC</span>
            <span>{total_ttc.toFixed(0)} FCFA</span>
          </div>
          <div className="total-item">
            <span>Total NDF</span>
            <span>{total_ttc.toFixed(0)} FCFA</span>
          </div>
          <div className="total-item">
            <span>Net à payer</span>
            <span>{net_a_payer.toFixed(0)} FCFA</span>
          </div>
        </TotalRow>

        <SignatureSection>
          <label>
            <input
              type="checkbox"
              checked={header.signature || false}
              onChange={(e) =>
                handleHeaderChange("signature", e.target.checked)
              }
            />
            Signature du collaborateur
          </label>
          <input
            type="text"
            placeholder="Nom du signataire"
            value={header.collaborateur_name || ""}
            onChange={(e) =>
              handleHeaderChange("collaborateur_name", e.target.value)
            }
            style={{ flex: 1 }}
          />
        </SignatureSection>

        <ActionButtons>
          <Button variant="secondary" type="button" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="secondary" type="button" onClick={exportPDF}>
            <i className="fas fa-file-pdf"></i> Exporter PDF
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading
              ? "Enregistrement..."
              : reportId
                ? "Mettre à jour"
                : "Créer la note"}
          </Button>
        </ActionButtons>
      </FormContainer>
    </form>
  );
};
