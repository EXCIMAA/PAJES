// src/pages/working-papers/WorkingPapersPage.tsx
import { useMemo, useState, useRef } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  List,
  Grid3x3,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { DocumentLink } from "../../components/DocumentLink";
import { cn, formatDate, formatNumber } from "../../lib/utils";
import { addNotification } from "../../lib/notifications";
import { useSupabaseQuery } from "../../hooks/useSupabaseData";
import { supabase } from "../../lib/supabase";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

interface WorkingPaper {
  id: string;
  name: string;
  category: string;
  reference: string;
  status: string;
  file_type: string;
  file_size: number;
  file_path: string;
  version: number;
  created_at: string;
  updated_at?: string;
}

const BUCKET_NAME = "working-papers";

const CATEGORIES = [
  {
    value: "ADMINISTRATIVE",
    label: "Administratif",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    value: "PERMANENT",
    label: "Permanent",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    value: "ANNUAL",
    label: "Annuel",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    value: "FISCAL",
    label: "Fiscal",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  {
    value: "SOCIAL",
    label: "Social",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  {
    value: "AUDIT",
    label: "Audit",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
] as const;

const CATEGORY_LABELS = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<string, string>,
);
const CATEGORY_COLORS = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.color }),
  {} as Record<string, string>,
);

function getFileIcon(type: string) {
  const lowerType = type?.toLowerCase() || "";
  if (lowerType === "xlsx" || lowerType === "xls") return FileSpreadsheet;
  if (lowerType === "pdf") return FileText;
  return File;
}

export function WorkingPapersPage() {
  const { data: papers, refetch } = useSupabaseQuery<WorkingPaper>({
    table: "working_papers",
    orderBy: "created_at",
    orderAsc: false,
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<WorkingPaper | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "ADMINISTRATIVE" as string,
    reference: "",
    status: "draft" as string,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = papers || [];
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    return result;
  }, [papers, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach((c) => (counts[c.value] = 0));
    (papers || []).forEach((p) => {
      if (p.category && counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [papers]);

  const handleUpload = async () => {
    if (!file) {
      alert("Veuillez sélectionner un fichier");
      return;
    }
    if (!form.name.trim()) {
      alert("Veuillez saisir un nom");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const payload = {
        name: form.name.trim(),
        category: form.category,
        reference: form.reference || `DOC-${Date.now()}`,
        status: form.status,
        file_type: fileExt || "unknown",
        file_size: Math.round(file.size / 1024),
        file_path: filePath,
        version: 1,
      };

      const { error: insertError } = await supabase
        .from("working_papers")
        .insert([payload]);
      if (insertError) throw insertError;

      await refetch();
      void addNotification({
        title: "Document téléversé",
        message: `Le document "${form.name}" a été ajouté.`,
        type: "working_paper",
      });
      setShowUpload(false);
      setFile(null);
      setForm({
        name: "",
        category: "ADMINISTRATIVE",
        reference: "",
        status: "draft",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Erreur upload :", err);
      alert("Erreur : " + (err.message || "Inconnue"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (paper: WorkingPaper) => {
    if (!confirm(`Supprimer définitivement "${paper.name}" ?`)) return;
    try {
      if (paper.file_path) {
        const urlParts = paper.file_path.split("/");
        const filePath = urlParts
          .slice(urlParts.indexOf(BUCKET_NAME) + 1)
          .join("/");
        if (filePath) {
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
      }
      const { error } = await supabase
        .from("working_papers")
        .delete()
        .eq("id", paper.id);
      if (error) throw error;
      await refetch();
      void addNotification({
        title: "Document supprimé",
        message: `Le document "${paper.name}" a été supprimé.`,
        type: "working_paper",
      });
    } catch (err: any) {
      console.error("Erreur suppression :", err);
      alert("Erreur : " + (err.message || "Inconnue"));
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Documents de travail"
        description="Classés par catégorie : Administratif, Permanent, Annuel, Fiscal, Social, Audit"
        actions={
          // ✅ WRAPPED: Téléverser (create)
          <ProtectedAction module="besoins_cabinet" action="create">
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary btn-md"
            >
              <Upload className="w-4 h-4" />
              Téléverser
            </button>
          </ProtectedAction>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate-400 font-medium mr-2">
          Catégories :
        </span>
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm transition-colors",
            !selectedCategory
              ? "bg-primary-600/15 text-primary-300"
              : "text-slate-400 hover:bg-slate-700/40",
          )}
        >
          Tous ({papers?.length || 0})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5",
              selectedCategory === cat.value
                ? "bg-primary-600/15 text-primary-300"
                : "text-slate-400 hover:bg-slate-700/40",
            )}
          >
            <span
              className={cn("w-2 h-2 rounded-full", cat.color.split(" ")[0])}
            />
            {cat.label} ({categoryCounts[cat.value] || 0})
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">
            {filtered.length} document(s)
          </span>
          <div className="flex bg-slate-800 rounded-lg border border-slate-700/50 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md",
                viewMode === "list"
                  ? "bg-primary-600 text-white"
                  : "text-slate-400",
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md",
                viewMode === "grid"
                  ? "bg-primary-600 text-white"
                  : "text-slate-400",
              )}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {[
                    "Nom",
                    "Catégorie",
                    "Référence",
                    "Type",
                    "Version",
                    "Statut",
                    "Téléversé le",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map((paper) => {
                  const Icon = getFileIcon(paper.file_type);
                  const categoryLabel =
                    CATEGORY_LABELS[
                      paper.category as keyof typeof CATEGORY_LABELS
                    ] || paper.category;
                  const categoryColor =
                    CATEGORY_COLORS[
                      paper.category as keyof typeof CATEGORY_COLORS
                    ] || "";
                  return (
                    <tr
                      key={paper.id}
                      className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedPaper(paper);
                        setShowDetail(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-100">
                            {paper.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="neutral"
                          className={cn("border", categoryColor)}
                        >
                          {categoryLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {paper.reference}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {paper.file_type}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        v{paper.version}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            paper.status === "final" ? "primary" : "neutral"
                          }
                        >
                          {paper.status === "final" ? "Final" : "Brouillon"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(paper.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {paper.file_path && (
                            <DocumentLink
                              filePath={paper.file_path}
                              bucket={BUCKET_NAME}
                              label=""
                              className="p-1.5 rounded hover:bg-slate-700/50"
                            />
                          )}
                          {/* ✅ WRAPPED: Delete (delete) */}
                          <ProtectedAction
                            module="besoins_cabinet"
                            action="delete"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(paper);
                              }}
                              className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-red-400"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </ProtectedAction>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((paper) => {
            const Icon = getFileIcon(paper.file_type);
            const categoryLabel =
              CATEGORY_LABELS[paper.category as keyof typeof CATEGORY_LABELS] ||
              paper.category;
            const categoryColor =
              CATEGORY_COLORS[paper.category as keyof typeof CATEGORY_COLORS] ||
              "";
            return (
              <div
                key={paper.id}
                className="card-hover p-4 cursor-pointer relative group"
                onClick={() => {
                  setSelectedPaper(paper);
                  setShowDetail(true);
                }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-600/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <h4 className="text-sm font-medium text-slate-100 mb-1 truncate">
                  {paper.name}
                </h4>
                <Badge
                  variant="neutral"
                  className={cn("border text-xs", categoryColor)}
                >
                  {categoryLabel}
                </Badge>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={paper.status === "final" ? "primary" : "neutral"}
                    className="text-xs"
                  >
                    {paper.status === "final" ? "Final" : "Brouillon"}
                  </Badge>
                  <span className="text-2xs text-slate-500">
                    v{paper.version}
                  </span>
                </div>
                {/* ✅ WRAPPED: Delete (delete) */}
                <ProtectedAction module="besoins_cabinet" action="delete">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(paper);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-slate-700/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </ProtectedAction>
              </div>
            );
          })}
        </div>
      )}

      {showDetail && selectedPaper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="card p-6 w-full max-w-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-50">
                {selectedPaper.name}
              </h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Catégorie</p>
                <Badge
                  variant="neutral"
                  className={cn(
                    "border",
                    CATEGORY_COLORS[
                      selectedPaper.category as keyof typeof CATEGORY_COLORS
                    ] || "",
                  )}
                >
                  {CATEGORY_LABELS[
                    selectedPaper.category as keyof typeof CATEGORY_LABELS
                  ] || selectedPaper.category}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400">Référence</p>
                <p className="text-sm text-slate-200 font-mono">
                  {selectedPaper.reference}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Type de fichier</p>
                <p className="text-sm text-slate-200">
                  {selectedPaper.file_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Taille</p>
                <p className="text-sm text-slate-200">
                  {formatNumber(selectedPaper.file_size)} Ko
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Version</p>
                <p className="text-sm text-slate-200">
                  v{selectedPaper.version}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Statut</p>
                <Badge
                  variant={
                    selectedPaper.status === "final" ? "primary" : "neutral"
                  }
                >
                  {selectedPaper.status === "final" ? "Final" : "Brouillon"}
                </Badge>
              </div>
              <div className="flex gap-2 mt-4">
                {selectedPaper.file_path && (
                  <ProtectedAction module="besoins_cabinet" action="view">
                    <DocumentLink
                      filePath={selectedPaper.file_path}
                      bucket={BUCKET_NAME}
                      label="Télécharger"
                      className="btn-primary btn-sm"
                    />
                  </ProtectedAction>
                )}
                {/* ✅ WRAPPED: Supprimer (delete) */}
                <ProtectedAction module="besoins_cabinet" action="delete">
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      handleDelete(selectedPaper);
                    }}
                    className="btn-danger btn-sm gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </ProtectedAction>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="card p-6 w-full max-w-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              Téléverser un document
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Nom *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="input-md"
                  placeholder="Nom du document"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Catégorie
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className="input-md w-full"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Référence
                </label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, reference: e.target.value }))
                  }
                  className="input-md"
                  placeholder="Laisser vide pour génération automatique"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Statut
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                  className="input-md"
                >
                  <option value="draft">Brouillon</option>
                  <option value="final">Final</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Fichier *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="input-md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
                {file && (
                  <p className="text-xs text-slate-400 mt-1">
                    {file.name} ({Math.round(file.size / 1024)} Ko)
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                {/* ✅ WRAPPED: Téléverser (create) */}
                <ProtectedAction module="besoins_cabinet" action="create">
                  <button
                    onClick={handleUpload}
                    className="btn-primary btn-md flex-1"
                    disabled={uploading}
                  >
                    {uploading ? "Téléversement..." : "Téléverser"}
                  </button>
                </ProtectedAction>
                <button
                  onClick={() => setShowUpload(false)}
                  className="btn-secondary btn-md flex-1"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}