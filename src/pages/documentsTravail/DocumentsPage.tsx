// src/pages/documentsTravail/DocumentsPage.tsx
import { useState, useRef, useMemo } from "react";
import {
  Upload,
  Trash2,
  Search,
  FileText,
  FileSpreadsheet,
  File,
  List,
  Grid3x3,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { DocumentLink } from "../../components/DocumentLink";
import { cn, formatDate, formatNumber } from "../../lib/utils";
import { addNotification } from "../../lib/notifications";
import { useSupabaseQuery } from "../../hooks/useSupabaseData";
import { supabase } from "../../lib/supabase";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

interface WorkingDocument {
  id: string;
  title: string;
  description?: string;
  category:
    | "ADMINISTRATIVE"
    | "PERMANENT"
    | "ANNUAL"
    | "FISCAL"
    | "SOCIAL"
    | "AUDIT";
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by?: string;
  client_id?: string;
  created_at: string;
  updated_at?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ADMINISTRATIVE: "Administratif",
  PERMANENT: "Permanent",
  ANNUAL: "Annuel",
  FISCAL: "Fiscal",
  SOCIAL: "Social",
  AUDIT: "Audit",
};

const CATEGORY_COLORS: Record<string, string> = {
  ADMINISTRATIVE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PERMANENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ANNUAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FISCAL: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  SOCIAL: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  AUDIT: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

function getFileIcon(type: string) {
  const lowerType = type?.toLowerCase() || "";
  if (lowerType === "xlsx" || lowerType === "xls") return FileSpreadsheet;
  if (lowerType === "pdf") return FileText;
  return File;
}

const BUCKET_NAME = "working-documents";

export function DocumentsPage() {
  const { data: documents, refetch } = useSupabaseQuery<WorkingDocument>({
    table: "working_documents",
    orderBy: "created_at",
    orderAsc: false,
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showUpload, setShowUpload] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<WorkingDocument | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ADMINISTRATIVE" as WorkingDocument["category"],
    client_id: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = documents || [];
    if (categoryFilter !== "all") {
      result = result.filter((d) => d.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [documents, search, categoryFilter]);

  const handleUpload = async () => {
    if (!file) {
      alert("Veuillez sélectionner un fichier");
      return;
    }
    if (!form.title.trim()) {
      alert("Veuillez saisir un titre");
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
        title: form.title.trim(),
        description: form.description?.trim() || null,
        category: form.category,
        file_name: file.name,
        file_path: filePath,
        file_size: Math.round(file.size / 1024),
        file_type: fileExt || "unknown",
        client_id: form.client_id || null,
      };

      const { error: insertError } = await supabase
        .from("working_documents")
        .insert([payload]);
      if (insertError) throw insertError;

      await refetch();
      void addNotification({
        title: "Document téléversé",
        message: `Le document "${form.title}" a été ajouté.`,
        type: "document",
      });

      setShowUpload(false);
      setFile(null);
      setForm({
        title: "",
        description: "",
        category: "ADMINISTRATIVE",
        client_id: "",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Erreur upload :", err);
      alert("Erreur : " + (err.message || "Inconnue"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: WorkingDocument) => {
    if (!confirm(`Supprimer définitivement "${doc.title}" ?`)) return;
    try {
      if (doc.file_path) {
        const urlParts = doc.file_path.split("/");
        const filePath = urlParts
          .slice(urlParts.indexOf(BUCKET_NAME) + 1)
          .join("/");
        if (filePath) {
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
      }
      const { error } = await supabase
        .from("working_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;

      await refetch();
      void addNotification({
        title: "Document supprimé",
        message: `Le document "${doc.title}" a été supprimé.`,
        type: "document",
      });
    } catch (err: any) {
      console.error("Erreur suppression :", err);
      alert("Erreur : " + (err.message || "Inconnue"));
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Documents de travail et missions"
        description="Gérez les documents internes du cabinet"
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

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un document..."
            className="input-md pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              categoryFilter === "all"
                ? "bg-primary-600/15 text-primary-300"
                : "text-slate-400 hover:bg-slate-700/40",
            )}
          >
            Tous
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                categoryFilter === key
                  ? "bg-primary-600/15 text-primary-300"
                  : "text-slate-400 hover:bg-slate-700/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
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

      {/* Liste */}
      {viewMode === "list" ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {[
                    "Titre",
                    "Catégorie",
                    "Fichier",
                    "Taille",
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
                {filtered.map((doc) => {
                  const Icon = getFileIcon(doc.file_type);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedDoc(doc);
                        setShowDetail(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-100">
                            {doc.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="neutral"
                          className={cn(
                            "border",
                            CATEGORY_COLORS[doc.category],
                          )}
                        >
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {doc.file_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatNumber(doc.file_size)} Ko
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {doc.file_path && (
                            <DocumentLink
                              filePath={doc.file_path}
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
                                handleDelete(doc);
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
          {filtered.map((doc) => {
            const Icon = getFileIcon(doc.file_type);
            return (
              <div
                key={doc.id}
                className="card-hover p-4 cursor-pointer relative group"
                onClick={() => {
                  setSelectedDoc(doc);
                  setShowDetail(true);
                }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-600/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <h4 className="text-sm font-medium text-slate-100 mb-1 truncate">
                  {doc.title}
                </h4>
                <Badge
                  variant="neutral"
                  className={cn(
                    "border text-xs",
                    CATEGORY_COLORS[doc.category],
                  )}
                >
                  {CATEGORY_LABELS[doc.category] || doc.category}
                </Badge>
                {/* ✅ WRAPPED: Delete (delete) */}
                <ProtectedAction module="besoins_cabinet" action="delete">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc);
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

      {/* Modal détail */}
      {showDetail && selectedDoc && (
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
                {selectedDoc.title}
              </h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3">
              {selectedDoc.description && (
                <div>
                  <p className="text-xs text-slate-400">Description</p>
                  <p className="text-sm text-slate-200">
                    {selectedDoc.description}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Catégorie</p>
                <Badge
                  variant="neutral"
                  className={cn(
                    "border",
                    CATEGORY_COLORS[selectedDoc.category],
                  )}
                >
                  {CATEGORY_LABELS[selectedDoc.category]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400">Nom du fichier</p>
                <p className="text-sm text-slate-200">
                  {selectedDoc.file_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Taille</p>
                <p className="text-sm text-slate-200">
                  {formatNumber(selectedDoc.file_size)} Ko
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Téléversé le</p>
                <p className="text-sm text-slate-200">
                  {formatDate(selectedDoc.created_at)}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                {selectedDoc.file_path && (
                  <ProtectedAction module="besoins_cabinet" action="view">
                    <DocumentLink
                      filePath={selectedDoc.file_path}
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
                      handleDelete(selectedDoc);
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

      {/* Modal upload */}
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
                  Titre *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="input-md"
                  placeholder="Nom du document"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="input-md min-h-[60px]"
                  placeholder="Brève description"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Catégorie
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value as any }))
                  }
                  className="input-md w-full"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
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
                    disabled={uploading}
                    className="btn-primary btn-md flex-1"
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
