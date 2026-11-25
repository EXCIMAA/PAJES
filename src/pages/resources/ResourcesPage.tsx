// src/pages/resources/ResourcesPage.tsx
import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Trash2, FolderOpen } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { DocumentLink } from "../../components/DocumentLink";
import { addNotification } from "../../lib/notifications";
import { useNotification, useConfirm } from "../../contexts/NotificationContext";
import { dbApi, fileApi } from "../../lib/apiClient";
import { ProtectedAction } from "../../components/auth/ProtectedAction";

interface Resource {
  id: string;
  title: string;
  category: "regles" | "manuel";
  file_name: string;
  file_path: string;
  storage_path?: string;
  file_size: number;
  file_type: string;
  uploaded_by?: string;
  created_at: string;
}

const BUCKET_NAME = "cabinet-resources";

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<"regles" | "manuel">("regles");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { notify } = useNotification();
  const confirm = useConfirm();

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = await dbApi.list<Resource>("cabinet_resources", {
        orderBy: "created_at",
        orderAsc: false,
        limit: 500,
      });
      setResources(data);
    } catch (err: any) {
      console.error("Erreur chargement ressources :", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const regles = resources.filter((r) => r.category === "regles");
  const manuels = resources.filter((r) => r.category === "manuel");

  useEffect(() => {
    fetchResources();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      notify.error("Veuillez sélectionner un fichier");
      return;
    }
    if (!title.trim()) {
      notify.error("Veuillez saisir un titre");
      return;
    }

    setUploading(true);
    try {
      const uploadResult = await fileApi.upload(file, {
        bucket: BUCKET_NAME,
        folder: `resources/${category}`,
      });

      const payload = {
        title: title.trim(),
        category,
        file_name: file.name,
        file_path: uploadResult.storage_path,
        file_size: Math.round(file.size / 1024),
        file_type: file.name.split(".").pop() || "unknown",
      };

      await dbApi.create("cabinet_resources", payload);

      setResources([...resources, { id: uploadResult.id, ...payload, created_at: new Date().toISOString() }]);
      void addNotification({
        title: "Document ajouté",
        message: `Le document "${title}" a été téléversé.`,
        type: "document",
      });

      setFile(null);
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Erreur upload :", err);
      notify.error("Erreur : " + (err.message || "Inconnue"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    const confirmed = await confirm({
      title: "Supprimer définitivement ce document ?",
      message: `Le document "${resource.title}" sera définitivement retiré.`,
      variant: "danger",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (!confirmed) return;
    try {
      await fileApi.remove(resource.id);
      await dbApi.remove("cabinet_resources", resource.id);
      setResources(resources.filter((r) => r.id !== resource.id));
      void addNotification({
        title: "Document supprimé",
        message: `Le document "${resource.title}" a été supprimé.`,
        type: "document",
      });
    } catch (err: any) {
      console.error("Erreur suppression :", err);
      notify.error("Erreur : " + (err.message || "Inconnue"));
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Ressources internes"
        description="Gérez les règles internes et manuels du cabinet"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Règles */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              Règles internes du cabinet
            </h2>
            <Badge variant="neutral" className="ml-auto">
              {regles.length}
            </Badge>
          </div>

          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={category === "regles" ? title : ""}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du document"
                className="input-md flex-1"
                disabled={uploading}
              />
              <ProtectedAction module="ressources_internes" action="create">
                <button
                  onClick={() => {
                    setCategory("regles");
                    fileInputRef.current?.click();
                  }}
                  className="btn-primary btn-md"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                </button>
              </ProtectedAction>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setCategory("regles");
                  if (title.trim()) handleUpload();
                }
              }}
            />
            {file && category === "regles" && (
              <p className="text-xs text-slate-400">
                📄 {file.name} ({Math.round(file.size / 1024)} Ko) —{" "}
                <ProtectedAction module="ressources_internes" action="create">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="text-primary-400 hover:text-primary-300"
                  >
                    {uploading ? "Téléversement..." : "Téléverser"}
                  </button>
                </ProtectedAction>
              </p>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {regles.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Aucune règle interne enregistrée.
              </p>
            ) : (
              regles.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-200 truncate">
                      {doc.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.file_path && (
                      <DocumentLink
                        filePath={doc.storage_path || doc.file_path}
                        bucket={BUCKET_NAME}
                        label=""
                        className="p-1 rounded hover:bg-slate-700/50"
                      />
                    )}
                    <ProtectedAction
                      module="ressources_internes"
                      action="delete"
                    >
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </ProtectedAction>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manuel */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              Manuel du cabinet
            </h2>
            <Badge variant="neutral" className="ml-auto">
              {manuels.length}
            </Badge>
          </div>

          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={category === "manuel" ? title : ""}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du document"
                className="input-md flex-1"
                disabled={uploading}
              />
              <ProtectedAction module="ressources_internes" action="create">
                <button
                  onClick={() => {
                    setCategory("manuel");
                    fileInputRef.current?.click();
                  }}
                  className="btn-primary btn-md"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                </button>
              </ProtectedAction>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setCategory("manuel");
                  if (title.trim()) handleUpload();
                }
              }}
            />
            {file && category === "manuel" && (
              <p className="text-xs text-slate-400">
                📄 {file.name} ({Math.round(file.size / 1024)} Ko) —{" "}
                <ProtectedAction module="ressources_internes" action="create">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="text-primary-400 hover:text-primary-300"
                  >
                    {uploading ? "Téléversement..." : "Téléverser"}
                  </button>
                </ProtectedAction>
              </p>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {manuels.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Aucun manuel enregistré.
              </p>
            ) : (
              manuels.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-200 truncate">
                      {doc.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.file_path && (
                      <DocumentLink
                        filePath={doc.storage_path || doc.file_path}
                        bucket={BUCKET_NAME}
                        label=""
                        className="p-1 rounded hover:bg-slate-700/50"
                      />
                    )}
                    <ProtectedAction
                      module="ressources_internes"
                      action="delete"
                    >
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </ProtectedAction>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <span className="text-slate-400">Chargement…</span>
        </div>
      )}
    </div>
  );
}
