import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { dbApi } from "../../lib/apiClient";
import { addNotification } from "../../lib/notifications";
import { useNotification, useConfirm } from "../../contexts/NotificationContext";
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
  RefreshCw,
  Coins,
} from "lucide-react";
import { ProtectedAction } from "../../components/auth/ProtectedAction";
import { PageHeader } from "../../components/ui/PageHeader";
import { cn } from "../../lib/utils";

export const CaissePage: React.FC = () => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const confirm = useConfirm();
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
      const data = await dbApi.list<any>("caisse", {
        orderBy: "date_piece",
        orderAsc: true,
        limit: 500,
      });
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
      notify.error(t("errors.generic"));
      return;
    }
    if (!form.lieu) {
      notify.error(t("errors.generic"));
      return;
    }
    if (!form.date_piece) {
      notify.error(t("errors.generic"));
      return;
    }
    if (type === "DEPENSE" && !form.destinataire) {
      notify.error(t("errors.generic"));
      return;
    }
    if (type === "APPROVISIONNEMENT" && !form.recu_de) {
      notify.error(t("errors.generic"));
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

      await dbApi.create("caisse", payload);

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
      notify.error(t("errors.savingError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t("confirms.deletePiece"),
      message: "Cette action est irréversible.",
      variant: "danger",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (!confirmed) return;
    try {
      await dbApi.remove("caisse", id);
      await loadData();
      void addNotification({
        title: "Pièce supprimée",
        message: "La pièce a été supprimée.",
        type: "caisse",
      });
    } catch (err: any) {
      notify.error(t("errors.deletingError"));
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
      notify.error("Erreur lors de l'export PDF.");
    } finally {
      setExportingId(null);
    }
  };

  const exportRecapPDF = async () => {
    if (recapData.rows.length === 0) {
      notify.error("Aucune donnée à exporter.");
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
      notify.error("Erreur lors de l'export du récapitulatif.");
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

  const stats = [
    { label: "Total pièces", value: String(nbPieces), accent: "text-primary-600 dark:text-primary-400", border: "border-l-primary-500" },
    { label: "Total dépenses", value: `${totalDepenses.toLocaleString()} FCFA`, accent: "text-warning-600 dark:text-warning-500", border: "border-l-warning-500" },
    { label: "Total approvisionnements", value: `${totalRecettes.toLocaleString()} FCFA`, accent: "text-success-600 dark:text-success-500", border: "border-l-success-500" },
    { label: "Solde général", value: `${soldeGeneral.toLocaleString()} FCFA`, accent: "text-cyan-600 dark:text-cyan-400", border: "border-l-cyan-500", sub: `Dépenses: ${nbDepenses} | Appro.: ${nbAppros}` },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Caisse"
        description="Gestion des espèces : dépenses, approvisionnements et récapitulatif de la caisse du cabinet."
        actions={
          <button onClick={loadData} disabled={loading} className="btn-secondary btn-md">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "Chargement..." : "Rafraîchir"}
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={cn("card p-5 border-l-4", s.border)}>
            <p className="text-2xl font-bold text-app-primary">{s.value}</p>
            <p className="mt-1 text-2xs font-semibold uppercase tracking-wide text-app-tertiary">{s.label}</p>
            {s.sub && <p className="mt-1 text-xs text-app-secondary">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Récapitulatif */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-app-primary">
            <FileText className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            Récapitulatif général
          </h3>
          <ProtectedAction module="caisse" action="view">
            <button
              onClick={exportRecapPDF}
              disabled={exportingRecap || recapData.rows.length === 0}
              className="btn-secondary btn-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              {exportingRecap ? "..." : "Exporter PDF récapitulatif"}
            </button>
          </ProtectedAction>
        </div>
        {recapData.rows.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-app-tertiary opacity-50" />
            <p className="text-sm text-app-secondary">Aucune pièce enregistrée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-app">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-app-tertiary text-app-secondary">
                  <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Date</th>
                  <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Description</th>
                  <th className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-wide">Recettes</th>
                  <th className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-wide">Dépenses</th>
                  <th className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-wide">Solde</th>
                  <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Tiers</th>
                </tr>
              </thead>
              <tbody>
                {recapData.rows.map((r, idx) => (
                  <tr key={idx} className="border-t border-app">
                    <td className="px-3 py-2 text-app-primary whitespace-nowrap">{format(new Date(r.date), "dd/MM/yyyy")}</td>
                    <td className="px-3 py-2 text-app-primary">{r.description}</td>
                    <td className="px-3 py-2 text-right">
                      {r.recette > 0 ? (
                        <span className="text-success-600 dark:text-success-400 font-medium">{r.recette.toLocaleString()}</span>
                      ) : (
                        <span className="text-app-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.depense > 0 ? (
                        <span className="text-error-600 dark:text-error-400 font-medium">{r.depense.toLocaleString()}</span>
                      ) : (
                        <span className="text-app-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-primary-600 dark:text-primary-400">{r.solde.toLocaleString()}</td>
                    <td className="px-3 py-2 text-app-secondary">{r.tier}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-primary-500 bg-app-tertiary font-semibold">
                  <td colSpan={2} className="px-3 py-3 text-right text-primary-600 dark:text-primary-400">TOTAUX</td>
                  <td className="px-3 py-3 text-right text-success-600 dark:text-success-400">{recapData.totalRecettes.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right text-error-600 dark:text-error-400">{recapData.totalDepenses.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-bold text-primary-600 dark:text-primary-400">{recapData.soldeFinal.toLocaleString()}</td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Type selector */}
      <div className="flex gap-3 mb-5">
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200",
            type === "DEPENSE"
              ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
              : "bg-app-tertiary text-app-secondary hover:bg-app-elevated hover:text-app-primary",
          )}
          onClick={() => setType("DEPENSE")}
        >
          <TrendingDown className="h-4 w-4" />
          Dépense
        </button>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200",
            type === "APPROVISIONNEMENT"
              ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
              : "bg-app-tertiary text-app-secondary hover:bg-app-elevated hover:text-app-primary",
          )}
          onClick={() => setType("APPROVISIONNEMENT")}
        >
          <TrendingUp className="h-4 w-4" />
          Approvisionnement
        </button>
      </div>

      {/* Form */}
      <div className="card p-6 mb-8">
        <h3 className="flex items-center gap-2 mb-5 text-sm font-semibold text-primary-600 dark:text-primary-400">
          <Plus className="h-4 w-4" />
          {type === "DEPENSE"
            ? "Nouvelle pièce de caisse DÉPENSE"
            : "Nouvelle pièce de caisse APPROVISIONNEMENT"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {type === "DEPENSE" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Destinataire *</label>
                  <input
                    name="destinataire"
                    value={form.destinataire}
                    onChange={handleChange}
                    placeholder="Nom du destinataire"
                    className="input-md"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Motif</label>
                  <input
                    name="motif"
                    value={form.motif}
                    onChange={handleChange}
                    placeholder="Motif de la dépense"
                    className="input-md"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Reçu de M/Mme *</label>
                <input
                  name="recu_de"
                  value={form.recu_de}
                  onChange={handleChange}
                  placeholder="Nom complet"
                  className="input-md"
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">La somme de (montant) *</label>
              <input
                name="somme"
                type="number"
                step="0.01"
                value={form.somme}
                onChange={handleChange}
                placeholder="0"
                className="input-md"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Fait à (lieu) *</label>
              <input
                name="lieu"
                value={form.lieu}
                onChange={handleChange}
                placeholder="Douala, Yaoundé..."
                className="input-md"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Le (date) *</label>
              <input
                name="date_piece"
                type="date"
                value={form.date_piece}
                onChange={handleChange}
                className="input-md"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Signatures</label>
            <div className="mt-2 flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-app-secondary cursor-pointer">
                <input
                  type="checkbox"
                  name="signature_dg"
                  checked={form.signature_dg}
                  onChange={handleChange}
                  className="h-[18px] w-[18px] accent-primary-500 cursor-pointer"
                />
                Direction Générale
              </label>
              <label className="flex items-center gap-2 text-sm text-app-secondary cursor-pointer">
                <input
                  type="checkbox"
                  name="signature_caisse"
                  checked={form.signature_caisse}
                  onChange={handleChange}
                  className="h-[18px] w-[18px] accent-primary-500 cursor-pointer"
                />
                Caisse
              </label>
              {type === "DEPENSE" && (
                <label className="flex items-center gap-2 text-sm text-app-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    name="signature_beneficiaire"
                    checked={form.signature_beneficiaire}
                    onChange={handleChange}
                    className="h-[18px] w-[18px] accent-primary-500 cursor-pointer"
                  />
                  Bénéficiaire
                </label>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-app pt-4">
            <button
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
              className="btn-secondary btn-md"
            >
              <X className="h-4 w-4" /> Réinitialiser
            </button>
            <ProtectedAction module="caisse" action="create">
              <button type="submit" disabled={submitting} className="btn-primary btn-md">
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </ProtectedAction>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-app-secondary">
          <Coins className="h-4 w-4" />
          Historique des pièces
        </h3>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-sm text-app-secondary">Chargement...</div>
      ) : pieces.length === 0 ? (
        <div className="card py-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-app-tertiary opacity-50" />
          <p className="text-sm text-app-secondary">Aucune pièce enregistrée.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-app text-app-tertiary">
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Type</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Destinataire / Reçu de</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Montant</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Lieu</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Date</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Signatures</th>
                <th className="px-3 py-2.5 text-center text-2xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((p) => (
                <tr key={p.id} className="border-b border-app">
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "badge",
                        p.type === "DEPENSE"
                          ? "bg-error-500/15 text-error-600 dark:text-error-400 ring-1 ring-error-500/25"
                          : "bg-success-500/15 text-success-600 dark:text-success-400 ring-1 ring-success-500/25",
                      )}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-app-primary">{p.destinataire || p.recu_de || "-"}</td>
                  <td className="px-3 py-2.5 text-app-primary whitespace-nowrap">{p.somme.toLocaleString()} FCFA</td>
                  <td className="px-3 py-2.5 text-app-secondary">{p.lieu}</td>
                  <td className="px-3 py-2.5 text-app-secondary whitespace-nowrap">{format(new Date(p.date_piece), "dd/MM/yyyy")}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-2xs font-semibold",
                          p.signature_dg
                            ? "bg-success-500/15 text-success-600 dark:text-success-400"
                            : "bg-app-tertiary text-app-tertiary",
                        )}
                      >
                        DG
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-2xs font-semibold",
                          p.signature_caisse
                            ? "bg-success-500/15 text-success-600 dark:text-success-400"
                            : "bg-app-tertiary text-app-tertiary",
                        )}
                      >
                        Caisse
                      </span>
                      {p.type === "DEPENSE" && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-2xs font-semibold",
                            p.signature_beneficiaire
                              ? "bg-success-500/15 text-success-600 dark:text-success-400"
                              : "bg-app-tertiary text-app-tertiary",
                          )}
                        >
                          Bénéf.
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center gap-2">
                      <ProtectedAction module="caisse" action="view">
                        <button
                          onClick={() => exportPDF(p)}
                          disabled={exportingId === p.id}
                          className="btn-secondary btn-sm"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {exportingId === p.id ? "..." : "PDF"}
                        </button>
                      </ProtectedAction>
                      <ProtectedAction module="caisse" action="delete">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="btn-danger btn-sm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </ProtectedAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
