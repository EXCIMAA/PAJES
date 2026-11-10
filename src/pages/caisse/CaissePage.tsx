// src/pages/Caisse/CaissePage.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { addNotification } from "../../lib/notifications";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Plus,
  X,
  Printer,
} from "lucide-react";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

// ========== STYLES (unchanged) ==========
const Container = styled.div`
  padding: 24px;
  color: #e2e8f0;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    gap: 12px;
    svg {
      color: #4facfe;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
`;

const StatCard = styled.div<{ color?: string }>`
  background: #1e293b;
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid ${({ color }) => color || "#4facfe"};
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 4px;
  }
  .stat-label {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .stat-sub {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }
`;

const RecapWidget = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 28px;
  border: 1px solid #334155;
  .widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    h3 {
      color: #94a3b8;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4facfe;
    }
  }
`;

const RecapTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th {
    background: #1e3a5f;
    color: #fff;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    padding: 10px 12px;
    border-bottom: 2px solid #2a4f7f;
    text-align: left;
    &:nth-child(3),
    &:nth-child(4),
    &:nth-child(5) {
      text-align: right;
    }
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #2d3748;
    color: #e2e8f0;
    vertical-align: middle;
    &:nth-child(3),
    &:nth-child(4),
    &:nth-child(5) {
      text-align: right;
    }
  }
  .recette {
    color: #86efac;
  }
  .depense {
    color: #fca5a5;
  }
  .solde {
    font-weight: 600;
    color: #4facfe;
  }
  .total-row {
    background: #0f172a;
    font-weight: 600;
    td {
      border-top: 2px solid #4facfe;
      padding-top: 12px;
      color: #fff;
    }
    td:first-child {
      color: #4facfe;
    }
  }
`;

const TypeSelector = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  button {
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: #1e293b;
    color: #94a3b8;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    &.active {
      background: #1e3a5f;
      color: #fff;
      box-shadow: 0 4px 12px rgba(30, 58, 95, 0.4);
    }
    &:hover:not(.active) {
      background: #334155;
    }
  }
`;

const FormContainer = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid #334155;
`;

const FormTitle = styled.h3`
  color: #4facfe;
  font-size: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
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
    font-weight: 600;
  }
  input,
  textarea {
    padding: 8px 12px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: #0f172a;
    color: #e2e8f0;
    font-size: 13px;
    transition: border-color 0.2s;
    &:focus {
      outline: none;
      border-color: #4facfe;
    }
  }
  textarea {
    resize: vertical;
    min-height: 60px;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding-top: 8px;
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #94a3b8;
    cursor: pointer;
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #4facfe;
      cursor: pointer;
    }
  }
`;

const Button = styled.button<{ variant?: "primary" | "secondary" | "danger" }>`
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${({ variant }) => {
    switch (variant) {
      case "primary":
        return "background: #1e3a5f; color: #fff; &:hover { background: #2a4f7f; }";
      case "secondary":
        return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
      case "danger":
        return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
      default:
        return "background: #1e293b; color: #e2e8f0; &:hover { background: #334155; }";
    }
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #334155;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: 16px;
  background: #1e293b;
  border-radius: 12px;
  padding: 16px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #2d3748;
    text-align: left;
    vertical-align: middle;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
  }
  td {
    color: #e2e8f0;
  }
`;

const Badge = styled.span<{ type: string }>`
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  ${({ type }) =>
    type === "DEPENSE"
      ? "background: #7f1d1d; color: #fca5a5;"
      : "background: #14532d; color: #86efac;"}
`;

const SignatureBadge = styled.span<{ signed: boolean }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  ${({ signed }) =>
    signed
      ? "background: #14532d; color: #86efac;"
      : "background: #475569; color: #94a3b8;"}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  svg {
    margin-bottom: 12px;
    opacity: 0.5;
  }
  p {
    font-size: 14px;
  }
`;

// ========== COMPOSANT PRINCIPAL ==========
export const CaissePage: React.FC = () => {
  const { t } = useTranslation();
  const [type, setType] = useState<"DEPENSE" | "APPROVISIONNEMENT">("DEPENSE");
  const [form, setForm] = useState({
    destinataire: "",
    recu_de: "",
    somme: "",
    motif: "",
    lieu: "",
    date_piece: format(new Date(), "yyyy-MM-dd"),
    signature_dg: false,
    signature_caisse: false,
    signature_beneficiaire: false,
  });
  const [pieces, setPieces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportingRecap, setExportingRecap] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("caisse")
        .select("*")
        .order("date_piece", { ascending: true });
      if (error) throw error;
      setPieces(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const recapData = React.useMemo(() => {
    let solde = 0;
    const rows = pieces.map((p) => {
      const isDepense = p.type === "DEPENSE";
      const montant = p.somme;
      const recette = isDepense ? 0 : montant;
      const depense = isDepense ? montant : 0;
      solde = solde + recette - depense;

      let description = "";
      if (isDepense) {
        description = p.motif || "Dépense";
      } else {
        description = `Reçu de ${p.recu_de || "N/A"}`;
      }

      return {
        date: p.date_piece,
        description,
        recette,
        depense,
        solde,
        tier: "Caisse",
        raw: p,
      };
    });
    const totalRecettes = rows.reduce((acc, r) => acc + r.recette, 0);
    const totalDepenses = rows.reduce((acc, r) => acc + r.depense, 0);
    const soldeFinal = rows.length > 0 ? rows[rows.length - 1].solde : 0;
    return { rows, totalRecettes, totalDepenses, soldeFinal };
  }, [pieces]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type: inputType, checked } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: inputType === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.somme || parseFloat(form.somme) <= 0) {
      alert(t("errors.generic"));
      return;
    }
    if (!form.lieu) {
      alert(t("errors.generic"));
      return;
    }
    if (!form.date_piece) {
      alert(t("errors.generic"));
      return;
    }
    if (type === "DEPENSE" && !form.destinataire) {
      alert(t("errors.generic"));
      return;
    }
    if (type === "APPROVISIONNEMENT" && !form.recu_de) {
      alert(t("errors.generic"));
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        type,
        somme: parseFloat(form.somme),
        lieu: form.lieu,
        date_piece: form.date_piece,
        signature_dg: form.signature_dg,
        signature_caisse: form.signature_caisse,
      };

      if (type === "DEPENSE") {
        payload.destinataire = form.destinataire;
        payload.motif = form.motif || "";
        payload.signature_beneficiaire = form.signature_beneficiaire;
        payload.recu_de = null;
      } else {
        payload.recu_de = form.recu_de;
        payload.destinataire = null;
        payload.motif = null;
        payload.signature_beneficiaire = null;
      }

      const { error } = await supabase.from("caisse").insert([payload]);
      if (error) throw error;

      void addNotification({
        title: "Pièce de caisse créée",
        message: `La pièce ${type} a été enregistrée.`,
        type: "caisse",
      });

      setForm({
        destinataire: "",
        recu_de: "",
        somme: "",
        motif: "",
        lieu: "",
        date_piece: format(new Date(), "yyyy-MM-dd"),
        signature_dg: false,
        signature_caisse: false,
        signature_beneficiaire: false,
      });
      await loadData();
    } catch (err: any) {
      alert(t("errors.savingError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("confirms.deletePiece"))) return;
    try {
      const { error } = await supabase.from("caisse").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      void addNotification({
        title: "Pièce supprimée",
        message: "La pièce a été supprimée.",
        type: "caisse",
      });
    } catch (err: any) {
      alert(t("errors.deletingError"));
    }
  };

  const exportPDF = async (piece: any) => {
    setExportingId(piece.id);
    try {
      const printContent = document.createElement("div");
      printContent.style.position = "absolute";
      printContent.style.left = "-9999px";
      printContent.style.top = "0";
      printContent.style.width = "210mm";
      printContent.style.background = "white";
      printContent.style.padding = "20px";
      printContent.style.color = "#000";
      printContent.style.fontFamily = "Arial, sans-serif";
      printContent.style.fontSize = "12px";

      const logoUrl = "/logos/ExicimaaLogo.png";
      const logoHtml = `<img src="${logoUrl}" style="height:50px; object-fit:contain;" />`;

      const isDepense = piece.type === "DEPENSE";
      const title = isDepense
        ? "PIÈCE DE CAISSE DÉPENSE"
        : "PIÈCE DE CAISSE APPROVISIONNEMENT";
      const dateFormatted = format(new Date(piece.date_piece), "dd/MM/yyyy");

      let bodyHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
          ${logoHtml}
          <h1 style="margin: 10px 0 5px; color: #1e3a5f; font-size: 18px;">${title}</h1>
          <hr style="border: 1px solid #1e3a5f; width: 60%; margin: 10px auto;" />
        </div>
        <div style="margin-bottom: 20px;">
      `;

      if (isDepense) {
        bodyHtml += `
          <p><strong>Destinataire :</strong> ${piece.destinataire || "-"}</p>
          <p><strong>La somme de :</strong> ${piece.somme.toLocaleString()} FCFA</p>
          <p><strong>Motif :</strong> ${piece.motif || "-"}</p>
          <p><strong>Fait à :</strong> ${piece.lieu}</p>
          <p><strong>Le :</strong> ${dateFormatted}</p>
        `;
      } else {
        bodyHtml += `
          <p><strong>Reçu de M/Mme :</strong> ${piece.recu_de || "-"}</p>
          <p><strong>La somme de :</strong> ${piece.somme.toLocaleString()} FCFA</p>
          <p><strong>Fait à :</strong> ${piece.lieu}</p>
          <p><strong>Le :</strong> ${dateFormatted}</p>
        `;
      }

      bodyHtml += `
        </div>
        <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px;">
          <h3 style="font-size: 14px; color: #1e3a5f;">Signatures</h3>
          <div style="display: flex; justify-content: space-around; margin-top: 20px;">
            <div style="text-align: center;">
              <div style="border-top: 1px solid #000; padding-top: 4px; width: 120px; margin: 0 auto;">
                <span style="font-size: 10px; color: #555;">Direction Générale</span>
              </div>
              ${piece.signature_dg ? '<span style="color: green; font-size: 12px;">✓ Signé</span>' : '<span style="color: #999; font-size: 12px;">Non signé</span>'}
            </div>
            <div style="text-align: center;">
              <div style="border-top: 1px solid #000; padding-top: 4px; width: 120px; margin: 0 auto;">
                <span style="font-size: 10px; color: #555;">Caisse</span>
              </div>
              ${piece.signature_caisse ? '<span style="color: green; font-size: 12px;">✓ Signé</span>' : '<span style="color: #999; font-size: 12px;">Non signé</span>'}
            </div>
            ${
              isDepense
                ? `
            <div style="text-align: center;">
              <div style="border-top: 1px solid #000; padding-top: 4px; width: 120px; margin: 0 auto;">
                <span style="font-size: 10px; color: #555;">Bénéficiaire</span>
              </div>
              ${piece.signature_beneficiaire ? '<span style="color: green; font-size: 12px;">✓ Signé</span>' : '<span style="color: #999; font-size: 12px;">Non signé</span>'}
            </div>
            `
                : ""
            }
          </div>
        </div>
        <div style="margin-top: 20px; text-align: right; font-size: 10px; color: #999;">
          Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm")}
        </div>
      `;

      printContent.innerHTML = bodyHtml;
      document.body.appendChild(printContent);
      const canvas = await html2canvas(printContent, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      document.body.removeChild(printContent);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`PieceCaisse_${piece.type}_${piece.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'export PDF.");
    } finally {
      setExportingId(null);
    }
  };

  const exportRecapPDF = async () => {
    if (recapData.rows.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }
    setExportingRecap(true);
    try {
      const printContent = document.createElement("div");
      printContent.style.position = "absolute";
      printContent.style.left = "-9999px";
      printContent.style.top = "0";
      printContent.style.width = "210mm";
      printContent.style.background = "white";
      printContent.style.padding = "20px";
      printContent.style.color = "#000";
      printContent.style.fontFamily = "Arial, sans-serif";
      printContent.style.fontSize = "11px";

      const logoUrl = "/logos/ExicimaaLogo.png";
      const logoHtml = `<img src="${logoUrl}" style="height:50px; object-fit:contain;" />`;

      let tableRows = "";
      recapData.rows.forEach((r) => {
        tableRows += `
          <tr>
            <td style="border:1px solid #000;padding:4px;">${format(new Date(r.date), "dd/MM/yyyy")}</td>
            <td style="border:1px solid #000;padding:4px;">${r.description}</td>
            <td style="border:1px solid #000;padding:4px;text-align:right;">${r.recette > 0 ? r.recette.toLocaleString() : "-"}</td>
            <td style="border:1px solid #000;padding:4px;text-align:right;">${r.depense > 0 ? r.depense.toLocaleString() : "-"}</td>
            <td style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">${r.solde.toLocaleString()}</td>
            <td style="border:1px solid #000;padding:4px;">${r.tier}</td>
          </tr>
        `;
      });

      const bodyHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
          ${logoHtml}
          <h1 style="margin: 10px 0 5px; color: #1e3a5f; font-size: 18px;">RÉCAPITULATIF DE CAISSE</h1>
          <hr style="border: 1px solid #1e3a5f; width: 60%; margin: 10px auto;" />
          <p style="font-size: 12px; color: #555;">Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm")}</p>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#1e3a5f; color:#fff;">
              <th style="border:1px solid #000;padding:5px;text-align:left;">Date</th>
              <th style="border:1px solid #000;padding:5px;text-align:left;">Description</th>
              <th style="border:1px solid #000;padding:5px;text-align:right;">Recettes</th>
              <th style="border:1px solid #000;padding:5px;text-align:right;">Dépenses</th>
              <th style="border:1px solid #000;padding:5px;text-align:right;">Solde</th>
              <th style="border:1px solid #000;padding:5px;text-align:left;">Tiers</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr style="background:#f0f4ff; font-weight:bold; border-top:2px solid #1e3a5f;">
              <td colspan="2" style="border:1px solid #000;padding:5px;text-align:right;color:#1e3a5f;">TOTAUX</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;color:#008000;">${recapData.totalRecettes.toLocaleString()}</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;color:#cc0000;">${recapData.totalDepenses.toLocaleString()}</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;font-weight:bold;color:#1e3a5f;">${recapData.soldeFinal.toLocaleString()}</td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:20px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#999; text-align:center;">
          Document généré par PAJES - Gestion d'entreprise
        </div>
      `;

      printContent.innerHTML = bodyHtml;
      document.body.appendChild(printContent);
      const canvas = await html2canvas(printContent, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      document.body.removeChild(printContent);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Recapitulatif_Caisse_${format(new Date(), "ddMMyyyy")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'export du récapitulatif.");
    } finally {
      setExportingRecap(false);
    }
  };

  const totalDepenses = recapData.totalDepenses;
  const totalRecettes = recapData.totalRecettes;
  const soldeGeneral = recapData.soldeFinal;
  const nbPieces = pieces.length;
  const nbDepenses = pieces.filter((p) => p.type === "DEPENSE").length;
  const nbAppros = pieces.filter((p) => p.type === "APPROVISIONNEMENT").length;

  return (
    <Container>
      <Header>
        <h1>
          <Wallet size={32} />
          CAISSE
        </h1>
      </Header>

      <StatsGrid>
        <StatCard color="#4facfe">
          <div className="stat-value">{nbPieces}</div>
          <div className="stat-label">Total pièces</div>
        </StatCard>
        <StatCard color="#f59e0b">
          <div className="stat-value">
            {totalDepenses.toLocaleString()} FCFA
          </div>
          <div className="stat-label">Total dépenses</div>
        </StatCard>
        <StatCard color="#8b5cf6">
          <div className="stat-value">
            {totalRecettes.toLocaleString()} FCFA
          </div>
          <div className="stat-label">Total approvisionnements</div>
        </StatCard>
        <StatCard color="#10b981">
          <div className="stat-value">{soldeGeneral.toLocaleString()} FCFA</div>
          <div className="stat-label">Solde général</div>
          <div className="stat-sub">
            Dépenses: {nbDepenses} | Appro.: {nbAppros}
          </div>
        </StatCard>
      </StatsGrid>

      <RecapWidget>
        <div className="widget-header">
          <h3>
            <FileText size={18} />
            Récapitulatif général
          </h3>
          {/* ✅ WRAPPED: Exporter PDF récapitulatif (view) */}
          <ProtectedAction module="caisse" action="view">
            <Button
              variant="secondary"
              onClick={exportRecapPDF}
              disabled={exportingRecap || recapData.rows.length === 0}
            >
              <Printer size={16} />
              {exportingRecap ? "..." : "Exporter PDF récapitulatif"}
            </Button>
          </ProtectedAction>
        </div>
        {recapData.rows.length === 0 ? (
          <EmptyState>
            <FileText size={48} />
            <p>Aucune pièce enregistrée.</p>
          </EmptyState>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <RecapTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Recettes</th>
                  <th>Dépenses</th>
                  <th>Solde</th>
                  <th>Tiers</th>
                </tr>
              </thead>
              <tbody>
                {recapData.rows.map((r, idx) => (
                  <tr key={idx}>
                    <td>{format(new Date(r.date), "dd/MM/yyyy")}</td>
                    <td>{r.description}</td>
                    <td>
                      {r.recette > 0 ? (
                        <span className="recette">
                          {r.recette.toLocaleString()}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {r.depense > 0 ? (
                        <span className="depense">
                          {r.depense.toLocaleString()}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="solde">{r.solde.toLocaleString()}</td>
                    <td>{r.tier}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={2} style={{ textAlign: "right" }}>
                    TOTAUX
                  </td>
                  <td style={{ textAlign: "right", color: "#86efac" }}>
                    {recapData.totalRecettes.toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right", color: "#fca5a5" }}>
                    {recapData.totalDepenses.toLocaleString()}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#4facfe",
                    }}
                  >
                    {recapData.soldeFinal.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </RecapTable>
          </div>
        )}
      </RecapWidget>

      <TypeSelector>
        <button
          className={type === "DEPENSE" ? "active" : ""}
          onClick={() => setType("DEPENSE")}
        >
          <TrendingDown size={18} />
          Dépense
        </button>
        <button
          className={type === "APPROVISIONNEMENT" ? "active" : ""}
          onClick={() => setType("APPROVISIONNEMENT")}
        >
          <TrendingUp size={18} />
          Approvisionnement
        </button>
      </TypeSelector>

      <FormContainer>
        <FormTitle>
          <Plus size={18} />
          {type === "DEPENSE"
            ? "Nouvelle pièce de caisse DÉPENSE"
            : "Nouvelle pièce de caisse APPROVISIONNEMENT"}
        </FormTitle>
        <form onSubmit={handleSubmit}>
          <Grid>
            {type === "DEPENSE" ? (
              <>
                <Field>
                  <label>Destinataire *</label>
                  <input
                    name="destinataire"
                    value={form.destinataire}
                    onChange={handleChange}
                    placeholder="Nom du destinataire"
                    required
                  />
                </Field>
                <Field>
                  <label>Motif</label>
                  <input
                    name="motif"
                    value={form.motif}
                    onChange={handleChange}
                    placeholder="Motif de la dépense"
                  />
                </Field>
              </>
            ) : (
              <Field>
                <label>Reçu de M/Mme *</label>
                <input
                  name="recu_de"
                  value={form.recu_de}
                  onChange={handleChange}
                  placeholder="Nom complet"
                  required
                />
              </Field>
            )}

            <Field>
              <label>La somme de (montant) *</label>
              <input
                name="somme"
                type="number"
                step="0.01"
                value={form.somme}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </Field>
            <Field>
              <label>Fait à (lieu) *</label>
              <input
                name="lieu"
                value={form.lieu}
                onChange={handleChange}
                placeholder="Douala, Yaoundé..."
                required
              />
            </Field>
            <Field>
              <label>Le (date) *</label>
              <input
                name="date_piece"
                type="date"
                value={form.date_piece}
                onChange={handleChange}
                required
              />
            </Field>
          </Grid>

          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                textTransform: "uppercase",
              }}
            >
              Signatures
            </label>
            <CheckboxGroup>
              <label>
                <input
                  type="checkbox"
                  name="signature_dg"
                  checked={form.signature_dg}
                  onChange={handleChange}
                />
                Direction Générale
              </label>
              <label>
                <input
                  type="checkbox"
                  name="signature_caisse"
                  checked={form.signature_caisse}
                  onChange={handleChange}
                />
                Caisse
              </label>
              {type === "DEPENSE" && (
                <label>
                  <input
                    type="checkbox"
                    name="signature_beneficiaire"
                    checked={form.signature_beneficiaire}
                    onChange={handleChange}
                  />
                  Bénéficiaire
                </label>
              )}
            </CheckboxGroup>
          </div>

          <FormActions>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setForm({
                  destinataire: "",
                  recu_de: "",
                  somme: "",
                  motif: "",
                  lieu: "",
                  date_piece: format(new Date(), "yyyy-MM-dd"),
                  signature_dg: false,
                  signature_caisse: false,
                  signature_beneficiaire: false,
                });
              }}
            >
              <X size={16} /> Réinitialiser
            </Button>
            {/* ✅ WRAPPED: Enregistrer (create) */}
            <ProtectedAction module="caisse" action="create">
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </ProtectedAction>
          </FormActions>
        </form>
      </FormContainer>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "32px",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ color: "#94a3b8", fontSize: "16px", fontWeight: "600" }}>
          📋 Historique des pièces
        </h3>
        <Button variant="secondary" onClick={loadData} disabled={loading}>
          {loading ? "Chargement..." : "Rafraîchir"}
        </Button>
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px" }}>
          Chargement...
        </div>
      ) : (
        <TableWrapper>
          {pieces.length === 0 ? (
            <EmptyState>
              <FileText size={48} />
              <p>Aucune pièce enregistrée.</p>
            </EmptyState>
          ) : (
            <StyledTable>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Destinataire / Reçu de</th>
                  <th>Montant</th>
                  <th>Lieu</th>
                  <th>Date</th>
                  <th>Signatures</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Badge type={p.type}>{p.type}</Badge>
                    </td>
                    <td>{p.destinataire || p.recu_de || "-"}</td>
                    <td>{p.somme.toLocaleString()} FCFA</td>
                    <td>{p.lieu}</td>
                    <td>{format(new Date(p.date_piece), "dd/MM/yyyy")}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        <SignatureBadge signed={p.signature_dg}>
                          DG
                        </SignatureBadge>
                        <SignatureBadge signed={p.signature_caisse}>
                          Caisse
                        </SignatureBadge>
                        {p.type === "DEPENSE" && (
                          <SignatureBadge signed={p.signature_beneficiaire}>
                            Bénéf.
                          </SignatureBadge>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "center",
                        }}
                      >
                        {/* ✅ WRAPPED: Export PDF (view) */}
                        <ProtectedAction module="caisse" action="view">
                          <Button
                            variant="secondary"
                            onClick={() => exportPDF(p)}
                            disabled={exportingId === p.id}
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                          >
                            <Download size={14} />
                            {exportingId === p.id ? "..." : "PDF"}
                          </Button>
                        </ProtectedAction>
                        {/* ✅ WRAPPED: Delete */}
                        <ProtectedAction module="caisse" action="delete">
                          <Button
                            variant="danger"
                            onClick={() => handleDelete(p.id)}
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                          >
                            <X size={14} />
                          </Button>
                        </ProtectedAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          )}
        </TableWrapper>
      )}
    </Container>
  );
};
