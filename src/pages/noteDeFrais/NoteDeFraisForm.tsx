import React, { useEffect, useState, useRef } from "react";
import { dbApi } from "../../lib/apiClient";
import { addNotification } from "../../lib/notifications";
import { useNotification } from "../../contexts/NotificationContext";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Trash2, Plus, FileText } from "lucide-react";
import { cn } from "../../lib/utils";

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

const DESIGNATION_MAP: Record<string, number> = {
  Restauration: 5000,
  "Taxi ville": 5000,
  "Train A/R": 30000,
  "Bus A/R": 20000,
  Logement: 25000,
};
const DESIGNATIONS = Object.keys(DESIGNATION_MAP);

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
  const { notify } = useNotification();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingMissions(true);
        const [missionsData, clientsData] = await Promise.all([
          dbApi.list("weekly_missions", {
            orderBy: "subject",
            limit: 500,
          }),
          dbApi.list("clients", { orderBy: "name", limit: 500 }),
        ]);
        setMissions(missionsData || []);
        setClients(clientsData || []);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des données.");
      } finally {
        setLoadingMissions(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (reportId) {
      const fetchReport = async () => {
        try {
          setLoading(true);
          const report = await dbApi.get<ExpenseReport>(
            "expense_reports",
            reportId,
          );
          const reportLines = await dbApi.list<ExpenseLine>("expense_lines", {
            filters: { expense_report_id: reportId },
            limit: 500,
          });
          setHeader(report);
          if (reportLines) {
            setLines(reportLines);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header.collaborateur_name) {
      notify.error("Veuillez renseigner le nom du collaborateur.");
      return;
    }
    if (lines.length === 0 || lines.some((l) => !l.designation)) {
      notify.error(
        "Veuillez remplir toutes les lignes de frais (désignation obligatoire).",
      );
      return;
    }

    try {
      setLoading(true);

      let reference = header.reference;
      if (!reference) {
        const initials = header.collaborateur_initials || "XX";
        const today = new Date();
        const dateStr = format(today, "ddMMyy");
        reference = `NDF_${dateStr}_${initials}`;
      }

      const dateDebut = header.date_debut || null;
      const dateFin = header.date_fin || null;
      const moisDate = header.mois ? header.mois + "-01" : null;

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
        await dbApi.update("expense_reports", reportId, headerData);
        const existingLines = await dbApi.list<ExpenseLine>("expense_lines", {
          filters: { expense_report_id: reportId },
          limit: 500,
        });
        for (const line of existingLines || []) {
          if (line.id) {
            await dbApi.remove("expense_lines", line.id);
          }
        }
      } else {
        const data = await dbApi.create<{ id: string }>(
          "expense_reports",
          headerData,
        );
        savedReportId = data.id;
      }

      if (savedReportId) {
        for (const l of lines) {
          await dbApi.create("expense_lines", {
            expense_report_id: savedReportId,
            date: l.date || null,
            designation: l.designation,
            quantite: l.quantite,
            devise: l.devise,
            montant_ht: l.montant_ht,
            tva: l.tva || 0,
          });
        }
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
      notify.error("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

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
      notify.error("Erreur lors de la génération du PDF.");
    }
  };

  const getMissionName = () => {
    const found = missions.find((m) => m.id === header.mission_id);
    return found ? found.subject : "Non définie";
  };

  if (loading) return <div className="py-8 text-center text-sm text-app-secondary">Chargement...</div>;
  if (error) return <div className="py-4 text-sm text-error-600 dark:text-error-400">Erreur : {error}</div>;

  const totals = [
    { label: "Total HT", value: total_ht },
    { label: "Montant TVA", value: total_tva },
    { label: "Montant TTC", value: total_ttc },
    { label: "Total NDF", value: total_ttc },
    { label: "Net à payer", value: net_a_payer },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-5 card p-6">
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <img src="/logos/ExicimaaLogo" alt="Logo" style={{ height: "60px", objectFit: "contain" }} />
            <div style={{ textAlign: "right" }}>
              <h2 style={{ margin: 0, color: "#1e3a5f" }}>NOTE DE FRAIS</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>Réf: {header.reference || "N/A"}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "16px", fontSize: "13px" }}>
            <div><strong>Collaborateur :</strong> {header.collaborateur_name}</div>
            <div><strong>Initiales :</strong> {header.collaborateur_initials}</div>
            <div><strong>Tél :</strong> {header.collaborateur_phone}</div>
            <div><strong>Adresse :</strong> {header.collaborateur_address}</div>
            <div><strong>Période :</strong> {header.date_debut} - {header.date_fin}</div>
            <div><strong>Mission :</strong> {getMissionName()}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "10px" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                {["Date", "Désignation", "Qté", "Devise", "Montant HT", "TVA", "Net HT"].map((h) => (
                  <th key={h} style={{ border: "1px solid #000", padding: "5px", textAlign: h === "Qté" || h === "Devise" ? "center" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>{l.date}</td>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>{l.designation}</td>
                  <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>{l.quantite}</td>
                  <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>{l.devise}</td>
                  <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{l.montant_ht.toFixed(0)}</td>
                  <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{l.tva.toFixed(0)}</td>
                  <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{(l.quantite * l.montant_ht).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "15px", display: "flex", justifyContent: "flex-end", gap: "30px", fontSize: "13px" }}>
            <div><strong>Total HT :</strong> {total_ht.toFixed(0)} FCFA</div>
            <div><strong>TVA ({header.taux_tva || 0}%) :</strong> {total_tva.toFixed(0)} FCFA</div>
            <div><strong>TTC :</strong> {total_ttc.toFixed(0)} FCFA</div>
            <div><strong>Avance :</strong> {header.avance || 0} FCFA</div>
            <div><strong>Net à payer :</strong> {net_a_payer.toFixed(0)} FCFA</div>
          </div>
          <div style={{ marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
            <div><strong>Modalité de règlement :</strong> {header.modalite_reglement}</div>
            <div><strong>Signature du collaborateur :</strong> {header.signature ? "Signé" : "Non signé"} <span style={{ marginLeft: "10px", fontStyle: "italic" }}>{header.collaborateur_name}</span></div>
            <div><em>Fait à {header.collaborateur_address || "..."}, le {new Date().toLocaleDateString()}</em></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Collaborateur</label>
            <input value={header.collaborateur_name || ""} onChange={(e) => handleHeaderChange("collaborateur_name", e.target.value)} placeholder="Nom complet" className="input-md" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Initiales</label>
            <input value={header.collaborateur_initials || ""} onChange={(e) => handleHeaderChange("collaborateur_initials", e.target.value)} placeholder="MJ" maxLength={10} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Téléphone</label>
            <input value={header.collaborateur_phone || ""} onChange={(e) => handleHeaderChange("collaborateur_phone", e.target.value)} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Adresse</label>
            <input value={header.collaborateur_address || ""} onChange={(e) => handleHeaderChange("collaborateur_address", e.target.value)} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Date début</label>
            <input type="date" value={header.date_debut || ""} onChange={(e) => handleHeaderChange("date_debut", e.target.value)} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Date fin</label>
            <input type="date" value={header.date_fin || ""} onChange={(e) => handleHeaderChange("date_fin", e.target.value)} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Mois</label>
            <input type="month" value={header.mois || ""} onChange={(e) => handleHeaderChange("mois", e.target.value)} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Mission</label>
            <select value={header.mission_id || ""} onChange={(e) => handleHeaderChange("mission_id", e.target.value)} disabled={loadingMissions} className="input-md">
              <option value="">-- Sélectionner --</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>{m.subject}</option>
              ))}
            </select>
            {loadingMissions && <span className="text-xs text-app-tertiary">Chargement des missions...</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Client</label>
            <select value={header.client_id || ""} onChange={(e) => handleHeaderChange("client_id", e.target.value)} className="input-md">
              <option value="">-- Sélectionner --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Taux TVA (%)</label>
            <input type="number" step="0.01" value={header.taux_tva || 0} onChange={(e) => handleHeaderChange("taux_tva", parseFloat(e.target.value) || 0)} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Avance</label>
            <input type="number" value={header.avance || 0} onChange={(e) => handleHeaderChange("avance", parseFloat(e.target.value) || 0)} className="input-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Modalité de règlement</label>
            <select value={header.modalite_reglement || "Chèque"} onChange={(e) => handleHeaderChange("modalite_reglement", e.target.value)} className="input-md">
              <option value="Chèque">Chèque</option>
              <option value="Virement">Virement</option>
              <option value="Espèce">Espèce</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Statut</label>
            <select value={header.status || "brouillon"} onChange={(e) => handleHeaderChange("status", e.target.value)} className="input-md">
              <option value="brouillon">Brouillon</option>
              <option value="soumis">Soumis</option>
              <option value="valide">Validé</option>
              <option value="rejete">Rejeté</option>
              <option value="rembourse">Remboursé</option>
            </select>
          </div>
        </div>

        <h4 className="mt-2 text-sm font-semibold text-app-secondary">Lignes de frais</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-tertiary text-app-tertiary">
                <th className="px-2 py-1.5 text-left text-2xs font-semibold uppercase" style={{ width: "120px" }}>Date</th>
                <th className="px-2 py-1.5 text-left text-2xs font-semibold uppercase">Désignation</th>
                <th className="px-2 py-1.5 text-left text-2xs font-semibold uppercase" style={{ width: "70px" }}>Qté</th>
                <th className="px-2 py-1.5 text-left text-2xs font-semibold uppercase" style={{ width: "80px" }}>Devise</th>
                <th className="px-2 py-1.5 text-left text-2xs font-semibold uppercase" style={{ width: "100px" }}>Montant HT</th>
                <th className="px-2 py-1.5 text-left text-2xs font-semibold uppercase" style={{ width: "80px" }}>TVA</th>
                <th className="px-2 py-1.5 text-left text-2xs font-semibold uppercase" style={{ width: "100px" }}>Net HT</th>
                <th className="px-2 py-1.5" style={{ width: "50px" }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="border-b border-app">
                  <td className="px-2 py-1.5">
                    <input type="date" value={line.date || ""} onChange={(e) => updateLine(idx, "date", e.target.value)} className="w-full bg-transparent border-none text-app-primary px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={line.designation} onChange={(e) => updateLine(idx, "designation", e.target.value)} className="w-full bg-transparent border-none text-app-primary px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500">
                      <option value="">-- Sélectionner --</option>
                      {DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="autre">Autre...</option>
                    </select>
                    {line.designation === "autre" && (
                      <input type="text" placeholder="Saisir une autre désignation" value="" onChange={(e) => updateLine(idx, "designation", e.target.value)} className="mt-0.5 w-full bg-transparent border-none text-app-primary px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="1" min="1" value={line.quantite} onChange={(e) => updateLine(idx, "quantite", parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-none text-app-primary px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={line.devise} onChange={(e) => updateLine(idx, "devise", e.target.value)} className="w-[70px] bg-transparent border-none text-app-primary px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="1" min="0" value={line.montant_ht} onChange={(e) => updateLine(idx, "montant_ht", parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-none text-app-primary px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.01" value={line.tva || 0} onChange={(e) => updateLine(idx, "tva", parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-none text-app-primary px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </td>
                  <td className="px-2 py-1.5 text-app-primary text-right">{(line.quantite * line.montant_ht).toFixed(0)}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removeLine(idx)} className="btn-danger btn-sm">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addLine} className="btn-secondary btn-sm self-start">
          <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
        </button>

        <div className="flex flex-wrap justify-end gap-8 border-t-2 border-app pt-3 mt-2">
          {totals.map((t) => (
            <div key={t.label} className="flex flex-col items-end">
              <span className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">{t.label}</span>
              <span className="text-lg font-bold text-app-primary">{t.value.toFixed(0)} FCFA</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 text-sm text-app-secondary cursor-pointer">
            <input type="checkbox" checked={header.signature || false} onChange={(e) => handleHeaderChange("signature", e.target.checked)} className="h-[18px] w-[18px] accent-primary-500" />
            Signature du collaborateur
          </label>
          <input type="text" placeholder="Nom du signataire" value={header.collaborateur_name || ""} onChange={(e) => handleHeaderChange("collaborateur_name", e.target.value)} className="input-md flex-1" />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary btn-md">Annuler</button>
          <button type="button" onClick={exportPDF} className="btn-secondary btn-md">
            <FileText className="h-4 w-4" /> Exporter PDF
          </button>
          <button type="submit" disabled={loading} className="btn-primary btn-md">
            {loading ? "Enregistrement..." : reportId ? "Mettre à jour" : "Créer la note"}
          </button>
        </div>
      </div>
    </form>
  );
};
