import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  Plus,
  X,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useAuth } from "../../contexts/AuthContext";
import { reportsApi, type ReportRow } from "../../api/reports";

// ============================================================
// TYPES
// ============================================================
type ModuleId = string;

type ModuleConfig = {
  label: string;
};

type ModuleState = {
  id: ModuleId;
  label: string;
  checked: boolean;
};

type CustomReportResult = {
  dateRange: { start: string; end: string };
  modules: ModuleId[];
  data: Record<ModuleId, ReportRow[]>;
  generatedAt: string;
  summary: string;
  notes: string;
  truncatedModules: string[];
};

// ============================================================
// CONFIGURATION
// ============================================================
const MODULE_CONFIG: Record<string, ModuleConfig> = {
  missions: { label: "Missions" },
  review_notes: { label: "Notes de revue" },
  findings: { label: "Constats" },
  stock_items: { label: "Stock" },
  fixed_assets: { label: "Immobilisations" },
  leave_requests: { label: "Congés" },
  clients: { label: "Clients" },
  cac: { label: "Suivi CAC" },
  collaborateurs: { label: "Collaborateurs" },
  factures: { label: "Factures" },
  notes_de_frais: { label: "Notes de frais" },
  etablissements: { label: "Établissements" },
  client_documents: { label: "Documents clients" },
  client_taxes: { label: "Taxes clients" },
  caisse: { label: "Caisse" },
  fournisseurs: { label: "Fournisseurs" },
};

// ============================================================
// HELPERS
// ============================================================
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR");
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("fr-FR");
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function ReportsPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const isSuperAdmin = profile?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<"audit" | "hr" | "custom">(
    "audit",
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportRow[]>([]);
  const [reportError, setReportError] = useState("");

  // États pour le rapport personnalisé
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customResult, setCustomResult] = useState<CustomReportResult | null>(
    null,
  );
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [customNotes, setCustomNotes] = useState("");
  const [ignoreDates, setIgnoreDates] = useState(false);

  const [modules, setModules] = useState<ModuleState[]>([]);

  const allChecked = useMemo(() => modules.every((m) => m.checked), [modules]);

  // Load Standard Tabs
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load only explicitly supported report modules visible to this user.
  useEffect(() => {
    loadReportModules();
  }, [profile?.role]);

  async function loadReportModules() {
    try {
      const availableModules = await reportsApi.getCatalog();
      setModules(
        availableModules.map(({ id, label }) => ({
          id,
          label: MODULE_CONFIG[id]?.label ?? label,
          checked: isSuperAdmin,
        })),
      );
      setReportError("");
    } catch (error) {
      setModules([]);
      setReportError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les modules de rapport.",
      );
    }
  }

  async function loadData() {
    setLoading(true);
    setReportError("");
    try {
      if (activeTab === "audit" || activeTab === "hr") {
        const report = await reportsApi.getStandard(activeTab);
        setData(report.items);
        if (report.truncated) {
          setReportError("Le rapport est limité aux 500 premiers enregistrements.");
        }
      } else {
        setData([]);
      }
    } catch (error) {
      setData([]);
      setReportError(
        error instanceof Error
          ? error.message
          : "Erreur lors du chargement du rapport.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------- EXPORT STANDARD (CSV) ----------
  const handleExport = () => {
    if (data.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }
    const headers = Object.keys(data[0]);
    const rows = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => row[h] ?? "").join(",")),
    ];
    const csv = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ---------- GÉNÉRATION DU RAPPORT PERSONNALISÉ ----------
  const handleGenerateCustomReport = async () => {
    const selectedModules = modules.filter((m) => m.checked).map((m) => m.id);
    if (selectedModules.length === 0) {
      alert("Veuillez sélectionner au moins un module.");
      return;
    }

    setGenerating(true);
    setReportError("");
    try {
      const report = await reportsApi.generateCustom({
        modules: selectedModules,
        start_date: customStartDate,
        end_date: customEndDate,
        ignore_dates: ignoreDates,
      });
      const results = report.data;

      // Build summary
      const summaryLines = [
        `Rapport personnalisé généré le ${formatDateTime(new Date().toISOString())}.`,
        isSuperAdmin
          ? "👑 Rôle : Super Admin (accès total)"
          : `👤 Rôle : ${profile?.role || "utilisateur"}`,
        ignoreDates
          ? "📅 Période : TOUTES LES DATES"
          : `📅 Période du ${formatDate(customStartDate)} au ${formatDate(customEndDate)}.`,
        "📊 Récapitulatif :",
      ];
      for (const [id, data] of Object.entries(results)) {
        const count = data.length;
        const label = MODULE_CONFIG[id]?.label || id;
        summaryLines.push(`  - ${count} ${label}${count > 1 ? "s" : ""}`);
      }
      if (report.truncated.length) {
        summaryLines.push(
          `⚠️ Résultats limités à 500 enregistrements pour : ${report.truncated.join(", ")}.`,
        );
      }
      if (customNotes.trim()) {
        summaryLines.push("📝 Notes supplémentaires :");
        summaryLines.push(customNotes.trim());
      }
      const summary = summaryLines.join("\n");

      setCustomResult({
        dateRange: { start: customStartDate, end: customEndDate },
        modules: selectedModules,
        data: results,
        generatedAt: new Date().toISOString(),
        summary,
        notes: customNotes,
        truncatedModules: report.truncated,
      });
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la génération du rapport.",
      );
    } finally {
      setGenerating(false);
    }
  };

  // ---------- EXPORT EXCEL (multi-feuilles) ----------
  const exportCustomReport = async () => {
    if (!customResult) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const {
        data,
        notes,
        dateRange,
        generatedAt,
        modules: selectedModules,
      } = customResult;

      // ----- Feuille "Résumé" -----
      const summarySheet = workbook.addWorksheet("Résumé");
      summarySheet.mergeCells("A1:D1");
      const titleCell = summarySheet.getCell("A1");
      titleCell.value = `RAPPORT PERSONNALISÉ - ${formatDateTime(generatedAt)}`;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: "center" };

      summarySheet.mergeCells("A2:D2");
      const periodCell = summarySheet.getCell("A2");
      periodCell.value = ignoreDates
        ? "Période : TOUTES LES DATES"
        : `Période du ${formatDate(dateRange.start)} au ${formatDate(dateRange.end)}`;
      periodCell.alignment = { horizontal: "center" };

      summarySheet.addRow([]);
      if (isSuperAdmin) {
        const roleRow = summarySheet.addRow([
          "Rôle : Super Admin (accès total à toutes les données)",
        ]);
        roleRow.font = { italic: true, color: { argb: "7C3AED" } };
      }
      summarySheet.addRow([]);

      const recapRow = summarySheet.addRow(["Module", "Enregistrements"]);
      recapRow.font = { bold: true };
      recapRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1F4E78" },
      };
      recapRow.getCell(1).font = { color: { argb: "FFFFFF" } };
      recapRow.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1F4E78" },
      };
      recapRow.getCell(2).font = { color: { argb: "FFFFFF" } };

      let totalRecords = 0;
      for (const moduleId of selectedModules) {
        const moduleData = data[moduleId] || [];
        const count = moduleData.length;
        totalRecords += count;
        const label = MODULE_CONFIG[moduleId]?.label || moduleId;
        summarySheet.addRow([label, count]);
      }
      summarySheet.addRow([]);
      const totalRow = summarySheet.addRow(["TOTAL", totalRecords]);
      totalRow.font = { bold: true };
      totalRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D3D3D3" },
      };
      totalRow.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D3D3D3" },
      };

      if (notes.trim()) {
        summarySheet.addRow([]);
        summarySheet.addRow(["Notes :"]);
        const notesRow = summarySheet.addRow([notes.trim()]);
        notesRow.getCell(1).alignment = { wrapText: true };
        summarySheet.getColumn(1).width = 80;
      }

      // ----- Une feuille par module -----
      for (const moduleId of selectedModules) {
        const moduleData = data[moduleId] || [];
        if (moduleData.length === 0) continue;

        const label = MODULE_CONFIG[moduleId]?.label || moduleId;
        const sheet = workbook.addWorksheet(label, {
          properties: { tabColor: { argb: "1F4E78" } },
        });

        const firstItem = moduleData[0];
        const keys = Object.keys(firstItem);
        const columns = keys.map((key) => ({
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          key: key,
          width: Math.max(15, key.length + 5),
        }));
        sheet.columns = columns;

        sheet.addRow([`${label} - ${moduleData.length} enregistrements`]);
        const titleRow = sheet.getRow(1);
        titleRow.font = { bold: true, size: 14 };
        sheet.mergeCells(`A1:${String.fromCharCode(64 + columns.length)}1`);

        const headerRow = sheet.addRow(columns.map((c) => c.header));
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "1F4E78" },
          };
          cell.alignment = { horizontal: "center" };
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        });

        for (const item of moduleData) {
          const rowData: Record<string, unknown> = {};
          keys.forEach((key) => {
            rowData[key] = item[key] ?? "";
          });
          const dataRow = sheet.addRow(rowData);
          dataRow.eachCell((cell) => {
            cell.alignment = { horizontal: "left", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            };
          });
        }

        sheet.columns.forEach((column) => {
          let maxLength = 10;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const length = cell.value ? cell.value.toString().length : 10;
            if (length > maxLength) maxLength = length;
          });
          column.width = Math.min(maxLength + 3, 50);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `Rapport_Personnalise_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'exportation.");
    }
  };

  // ---------- GESTION DES MODULES ----------
  const toggleModule = (id: ModuleId) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)),
    );
  };

  const toggleAll = () => {
    setModules((prev) => prev.map((m) => ({ ...m, checked: !allChecked })));
  };

  // ---------- MODAL ----------
  const CustomReportModal = () => {
    if (!showCustomModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("reports.customReportTitle")}
            </h2>
            <button
              onClick={() => {
                setShowCustomModal(false);
                setCustomResult(null);
                setCustomNotes("");
                setIgnoreDates(false);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* ✅ Role banner for super_admin */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                <span className="text-lg">👑</span>
                <span>
                  Vous êtes connecté en tant que <strong>Super Admin</strong> —
                  vous verrez <strong>toutes les données</strong> du système.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  disabled={ignoreDates}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  disabled={ignoreDates}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ignoreDates"
                checked={ignoreDates}
                onChange={(e) => setIgnoreDates(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="ignoreDates"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Ignorer les dates (toutes les données)
              </label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("reports.modules")} ({modules.length})
                </label>
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  {allChecked ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <CheckSquare className="h-4 w-4" />
                  )}
                  {allChecked ? "Désélectionner tout" : "Tout sélectionner"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {modules.length === 0 ? (
                  <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
                    Aucun module de rapport disponible pour votre compte.
                  </p>
                ) : (
                  modules.map((module) => (
                    <label
                      key={module.id}
                      className="flex items-center gap-2 text-sm cursor-pointer text-gray-700 dark:text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={module.checked}
                        onChange={() => toggleModule(module.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {module.label}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("reports.comments")}
              </label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Ajoutez des explications sur le contexte de ce rapport..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomResult(null);
                  setCustomNotes("");
                  setIgnoreDates(false);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t("reports.cancel")}
              </button>
              <button
                onClick={handleGenerateCustomReport}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    {t("reports.generateReport")}
                  </>
                )}
              </button>
            </div>

            {reportError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {reportError}
              </p>
            )}

            {customResult && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("reports.generatedReport")}
                  </h3>
                  <button
                    onClick={exportCustomReport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t("reports.exportXlsx")}
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-4 text-sm whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
                  {customResult.summary}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    {ignoreDates
                      ? "📅 Période : TOUTES LES DATES"
                      : `📅 Période : ${formatDate(customResult.dateRange.start)} → ${formatDate(customResult.dateRange.end)}`}
                  </p>
                  <p>📦 Modules : {customResult.modules.join(", ")}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    ⏱️ Généré le {formatDateTime(customResult.generatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("reports.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("reports.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t("reports.exportCsv")}
          </button>
          <button
            onClick={() => setShowCustomModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("reports.customReport")}
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        {(["audit", "hr", "custom"] as const).map((tab) => {
          const labels = {
            audit: t("reports.audit"),
            hr: t("reports.hr"),
            custom: t("reports.custom"),
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm transition ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        {reportError && (
          <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
            {reportError}
          </p>
        )}
        {data.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-8">
            {t("reports.noData")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {Object.keys(data[0]).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400"
                    >
                      {key.replace(/_/g, " ").toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.map((item, idx) => (
                  <tr key={idx}>
                    {Object.values(item).map((val, i) => (
                      <td
                        key={i}
                        className="px-4 py-3 text-gray-800 dark:text-gray-200"
                      >
                        {val !== null && val !== undefined ? String(val) : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomReportModal />
    </div>
  );
}
