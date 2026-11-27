// src/pages/collaborateurs/CollaborateurFiche.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  Undo,
  Save,
  Upload,
  Trash2,
  UserCircle,
  IdCard,
  Briefcase,
  FolderOpen,
  Star,
  Lock,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  FileUp,
} from "lucide-react";
import { dbApi, fileApi } from "../../lib/apiClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification, useConfirm } from "../../contexts/NotificationContext";
import { DocumentLink } from "../../components/DocumentLink";
import { DocumentImage } from "../../components/DocumentImage";
import { ProtectedAction } from "../../components/auth/ProtectedAction";
import { canAccessRecordSafe } from "../../lib/permissions";
import { usePermission } from "../../hooks/usePermission";
import { PageHeader } from "../../components/ui/PageHeader";
import { cn } from "../../lib/utils";

// ==================== TYPES ====================
interface Collaborateur {
  id: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  sexe: "M" | "F";
  photo_url: string;
  fonction: string;
  pays: string;
  bureau: string;
  date_embauche: string;
  date_depart: string;
  // ✅ Champs d'archivage
  archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  archive_reason?: string | null;
}

interface Score {
  mois: string;
  score_mensuel: number;
  score_trimestriel: number;
  score_annuel: number;
}

interface DossierItem {
  item_key: string;
  checked: boolean;
  document_url?: string | null;
}

interface DossierCategory {
  id: string;
  title: string;
  icon: string;
  confidential?: boolean;
  veryConfidential?: boolean;
  items: { key: string; label: string }[];
}

// ==================== DOSSIER STRUCTURE ====================
const DOSSIER_STRUCTURE: DossierCategory[] = [
  {
    id: "identification",
    title: "Identification et entrée",
    icon: "fa-id-card",
    items: [
      { key: "cv_lm", label: "CV / lettre de motivation" },
      { key: "piece_identite", label: "Pièce d'identité" },
      { key: "diplomes_certificats", label: "Diplômes et certificats" },
      { key: "rib", label: "RIB" },
      { key: "cnps", label: "Déclaration CNPS" },
      { key: "contrat_initial", label: "Contrat de travail initial" },
      { key: "changements_contrat", label: "Changements au contrat" },
    ],
  },
  {
    id: "carriere",
    title: "Carrière et rémunération",
    icon: "fa-chart-line",
    items: [
      {
        key: "fiches_poste",
        label: "Fiches de poste (successives, du plus ancien au plus récent)",
      },
      {
        key: "arretes_nomination",
        label: "Arrêtés / décisions de nomination ou titularisation",
      },
      {
        key: "avenants_salaire",
        label: "Avenants de changement de coefficient / salaire",
      },
      {
        key: "evaluations_pro",
        label: "Évaluations / entretiens professionnels",
      },
      { key: "promotions", label: "Promotions / changements de fonction" },
    ],
  },
  {
    id: "formation",
    title: "Formation",
    icon: "fa-graduation-cap",
    items: [
      {
        key: "attestations_stages",
        label: "Attestations de stages / formations suivies",
      },
      { key: "diplomes_emploi", label: "Diplômes obtenus en cours d'emploi" },
      { key: "bilans_competences", label: "Bilans de compétences" },
    ],
  },
  {
    id: "discipline",
    title: "Discipline",
    icon: "fa-gavel",
    confidential: true,
    items: [
      { key: "avertissements", label: "Avertissements / blâmes" },
      {
        key: "decisions_disciplinaires",
        label: "Décisions disciplinaires (mise à pied, etc.)",
      },
    ],
  },
  {
    id: "medical",
    title: "Médical",
    icon: "fa-heartbeat",
    confidential: true,
    veryConfidential: true,
    items: [
      { key: "visites_medicales", label: "Visites médicales obligatoires" },
      {
        key: "accidents_travail",
        label: "Déclarations d'accident du travail / maladie professionnelle",
      },
      { key: "examens_complementaires", label: "Examens complémentaires" },
      { key: "suivi_sante", label: "Suivi santé (médecine du travail)" },
    ],
  },
  {
    id: "paie",
    title: "Paie",
    icon: "fa-money-bill-wave",
    items: [
      {
        key: "bulletins_paie",
        label: "Bulletins de paie mensuels (du premier au dernier)",
      },
      { key: "certificat_travail", label: "Certificat de travail (copie)" },
      { key: "solde_tout_compte", label: "Solde de tout compte (copie)" },
    ],
  },
];

// ==================== COMPOSANT ====================
const CollaborateurFiche: React.FC = () => {
  const { user, profile } = useAuth();
  const { notify } = useNotification();
  const confirm = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, role } = usePermission();
  const isNew = id === "new" || !id;

  const canViewCollaborateurs = can("collaborateurs", "view");
  const canCreateCollaborateurs = can("collaborateurs", "create");

  const [collaborateur, setCollaborateur] = useState<Partial<Collaborateur>>(
    {},
  );
  const [scores, setScores] = useState<Score[]>([]);
  const [dossier, setDossier] = useState<Record<string, DossierItem>>({});
  const [accessDenied, setAccessDenied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {
      identification: true,
    },
  );

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ============ LOAD DATA ============
  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (isNew) return;

    try {
      setLoading(true);
      setAccessDenied(false);

      const canAccess = canAccessRecordSafe({
        role: profile?.role,
        module: "collaborateurs",
        action: "view",
        recordOwnerId: id,
        currentUserId: user.id,
      });

      if (!canAccess) {
        setAccessDenied(true);
        return;
      }

      const collab = await dbApi.get<Collaborateur>("collaborateurs", id!);
      setCollaborateur(collab);

      const s = await dbApi.list<Score>("scores", {
        filters: { collaborateur_id: id! },
        orderBy: "mois",
        orderAsc: false,
        limit: 1,
      });
      if (s && s.length > 0) setScores(s);

      const dossierData = await dbApi.list<DossierItem>(
        "dossier_collaborateur",
        {
          filters: { collaborateur_id: id! },
          limit: 500,
        },
      );

      const dossierMap: Record<string, DossierItem> = {};
      (dossierData || []).forEach((item: any) => {
        dossierMap[item.item_key] = {
          item_key: item.item_key,
          checked: item.checked,
          document_url: item.document_url,
        };
      });
      setDossier(dossierMap);
    } catch (err) {
      console.error(err);
      notify.error("Erreur chargement du collaborateur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, user, profile?.role]);

  // ============ BASIC HANDLERS ============
  const handleChange = (field: keyof Collaborateur, value: any) => {
    setCollaborateur({ ...collaborateur, [field]: value });
  };

  const handleUpload = async (field: "photo_url", file: File) => {
    try {
      const uploaded = await fileApi.upload(file, {
        bucket: "documents",
        folder: "collaborateurs",
      });

      handleChange(field, uploaded.storage_path);
    } catch (err: any) {
      console.error(err);
      notify.error(`Erreur upload : ${err.message || "Erreur inconnue"}`);
    }
  };

  // ============ DOSSIER HANDLERS ============
  const toggleDossierItem = async (itemKey: string) => {
    if (isNew) {
      notify.error(
        "Veuillez d'abord enregistrer le collaborateur avant de gérer son dossier.",
      );
      return;
    }

    const current = dossier[itemKey] || { item_key: itemKey, checked: false };
    const newChecked = !current.checked;

    setDossier({
      ...dossier,
      [itemKey]: { ...current, checked: newChecked },
    });

    try {
      await dbApi.upsert("dossier_collaborateur", {
        collaborateur_id: id,
        item_key: itemKey,
        checked: newChecked,
        document_url: current.document_url || null,
      });
    } catch (err: any) {
      console.error("Détails complets :", err);
      setDossier({ ...dossier, [itemKey]: current });
      notify.error(
        `Erreur dossier :\n${err.message || "Inconnu"}\n${err.details || ""}`,
      );
    }
  };

  const handleDossierUpload = async (itemKey: string, file: File) => {
    if (isNew) {
      notify.error("Veuillez d'abord enregistrer le collaborateur.");
      return;
    }

    try {
      const uploaded = await fileApi.upload(file, {
        bucket: "documents",
        folder: "dossiers",
      });

      await dbApi.upsert("dossier_collaborateur", {
        collaborateur_id: id,
        item_key: itemKey,
        checked: true,
        document_url: uploaded.storage_path,
      });

      setDossier({
        ...dossier,
        [itemKey]: {
          item_key: itemKey,
          checked: true,
          document_url: uploaded.storage_path,
        },
      });

      notify.success("Document uploadé avec succès !");
    } catch (err: any) {
      console.error("Détails de l'erreur :", err);
      notify.error(
        `Erreur d'upload : ${err.message || err.details || "Erreur inconnue"}`,
      );
    }
  };

  const handleDossierReplace = async (itemKey: string, file: File) => {
    if (isNew) {
      notify.error("Veuillez d'abord enregistrer le collaborateur.");
      return;
    }

    const replaced = await confirm({
      title: "Remplacer le document ?",
      message: "Remplacer le document existant par le nouveau ?",
      variant: "primary",
      confirmLabel: "Remplacer",
      cancelLabel: "Annuler",
    });
    if (!replaced) return;

    try {
      const uploaded = await fileApi.upload(file, {
        bucket: "documents",
        folder: "dossiers",
      });

      const oldPath = dossier[itemKey]?.document_url;
      if (oldPath) {
        try {
          // Aucun identifiant de fichier disponible pour l'ancien document
          // (seul le chemin de stockage est conservé) -> suppression ignorée.
          console.warn(
            "Impossible de supprimer l'ancien fichier: identifiant indisponible",
          );
        } catch (delErr) {
          console.warn("Impossible de supprimer l'ancien fichier:", delErr);
        }
      }

      await dbApi.upsert("dossier_collaborateur", {
        collaborateur_id: id,
        item_key: itemKey,
        checked: true,
        document_url: uploaded.storage_path,
      });

      setDossier({
        ...dossier,
        [itemKey]: {
          item_key: itemKey,
          checked: true,
          document_url: uploaded.storage_path,
        },
      });

      notify.success("Document remplacé avec succès !");
    } catch (err: any) {
      console.error("Détails de l'erreur :", err);
      notify.error(
        `Erreur de remplacement : ${err.message || err.details || "Erreur inconnue"}`,
      );
    }
  };

  const deleteDossierDocument = async (itemKey: string) => {
    const deleted = await confirm({
      title: "Supprimer ce document ?",
      message: "Cette action est irréversible.",
      variant: "danger",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (!deleted) return;
    try {
      await dbApi.upsert("dossier_collaborateur", {
        collaborateur_id: id,
        item_key: itemKey,
        checked: false,
        document_url: null,
      });

      setDossier({
        ...dossier,
        [itemKey]: { item_key: itemKey, checked: false, document_url: null },
      });
    } catch (err) {
      console.error(err);
      notify.error("Erreur suppression");
    }
  };

  // ============ ARCHIVER / RESTAURER ============
  const handleArchive = async () => {
    if (isNew) return;

    const reason = window.prompt(
      "Raison de l'archivage (optionnel) :\n\n" +
        "Ex: Démission, Fin de contrat, Retraite, Autre...",
      "",
    );

    if (reason === null) return;

    const archived = await confirm({
      title: "Archiver ce collaborateur ?",
      message: `Archiver "${collaborateur.prenom} ${collaborateur.nom}" ?\n\nLe collaborateur disparaîtra de la liste active, mais toutes ses données seront conservées.`,
      variant: "danger",
      confirmLabel: "Archiver",
      cancelLabel: "Annuler",
    });
    if (!archived) return;

    try {
      setSaving(true);

      await dbApi.update("collaborateurs", id!, {
        archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user?.id || null,
        archive_reason: reason || null,
      });

      notify.success("Collaborateur archivé avec succès.");
      navigate("/collaborateurs");
    } catch (err: any) {
      console.error(err);
      notify.error("Erreur lors de l'archivage : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (isNew) return;

    const restored = await confirm({
      title: "Restaurer ce collaborateur ?",
      message: `Restaurer "${collaborateur.prenom} ${collaborateur.nom}" ?\n\nLe collaborateur réapparaîtra dans la liste active.`,
      variant: "primary",
      confirmLabel: "Restaurer",
      cancelLabel: "Annuler",
    });
    if (!restored) return;

    try {
      setSaving(true);

      await dbApi.update("collaborateurs", id!, {
        archived: false,
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      });

      notify.success("Collaborateur restauré avec succès.");
      loadData();
    } catch (err: any) {
      console.error(err);
      notify.error("Erreur lors de la restauration : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============ SAVE COLLABORATEUR ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborateur.nom || !collaborateur.prenom) {
      notify.error("Veuillez renseigner au moins le nom et le prénom.");
      return;
    }
    if (!collaborateur.date_embauche) {
      notify.error("Veuillez renseigner la date d'embauche.");
      return;
    }

    try {
      setSaving(true);
      const dataToSave = { ...collaborateur } as unknown as Record<
        string,
        unknown
      >;

      if (isNew) {
        const data = await dbApi.create<Collaborateur>(
          "collaborateurs",
          dataToSave,
        );
        navigate(`/collaborateurs/${data.id}`);
      } else {
        await dbApi.update("collaborateurs", id!, dataToSave);
      }

      if (user && dataToSave.date_embauche) {
        await dbApi.update("profiles", user.id, {
          hire_date: dataToSave.date_embauche,
        });
      }

      notify.success("Collaborateur sauvegardé !");
      loadData();
    } catch (err) {
      console.error(err);
      notify.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // ============ PROGRESS CALC ============
  const totalItems = DOSSIER_STRUCTURE.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  );
  const checkedItems = Object.values(dossier).filter((d) => d.checked).length;
  const progressPercent =
    totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  if (loading) {
    return (
      <div className="text-center py-12 text-app-tertiary">
        <i className="fas fa-spinner fa-spin"></i> Chargement...
      </div>
    );
  }

  // ✅ ACCESS DENIED — Utilisateur non autorisé à VOIR les collaborateurs
  if (!canViewCollaborateurs && !isNew) {
    return (
      <div className="card p-16 text-center max-w-2xl mx-auto my-10">
        <Lock className="w-16 h-16 mx-auto mb-5 text-error" />
        <h2 className="text-xl font-bold text-app-primary mb-3">
          Accès refusé
        </h2>
        <p className="text-sm text-app-tertiary mb-2 leading-relaxed">
          Votre rôle actuel (
          <strong className="text-app-primary">"{role || "inconnu"}"</strong>)
          ne vous permet pas de consulter les informations des collaborateurs.
        </p>
        <p className="text-sm text-app-tertiary mb-2 leading-relaxed">
          Veuillez contacter votre administrateur si vous pensez qu'il s'agit
          d'une erreur.
        </p>
        <button
          onClick={() => navigate("/collaborateurs")}
          className="btn-primary btn-md mt-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  // ✅ ACCESS DENIED — Utilisateur non autorisé à CRÉER un collaborateur
  if (isNew && !canCreateCollaborateurs) {
    return (
      <div className="card p-16 text-center max-w-2xl mx-auto my-10">
        <UserPlus className="w-16 h-16 mx-auto mb-5 text-error" />
        <h2 className="text-xl font-bold text-app-primary mb-3">
          Vous ne pouvez pas créer de collaborateur
        </h2>
        <p className="text-sm text-app-tertiary mb-2 leading-relaxed">
          Votre rôle actuel (
          <strong className="text-app-primary">"{role || "inconnu"}"</strong>)
          ne vous permet pas de créer un collaborateur.
        </p>
        <p className="text-sm text-app-tertiary mb-2 leading-relaxed">
          Veuillez contacter votre administrateur si vous pensez qu'il s'agit
          d'une erreur.
        </p>
        <button
          onClick={() => navigate("/collaborateurs")}
          className="btn-primary btn-md mt-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  // ✅ ACCESS DENIED — Détecté par canAccessRecordSafe
  if (accessDenied) {
    return (
      <div className="card p-16 text-center max-w-2xl mx-auto my-10">
        <Lock className="w-16 h-16 mx-auto mb-5 text-error" />
        <h2 className="text-xl font-bold text-app-primary mb-3">
          Vous n'avez pas accès à ce profil
        </h2>
        <p className="text-sm text-app-tertiary mb-2 leading-relaxed">
          Votre rôle ne vous permet pas de consulter les informations de ce
          collaborateur.
        </p>
        <button
          onClick={() => navigate("/collaborateurs")}
          className="btn-primary btn-md mt-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={
          isNew
            ? "Nouveau collaborateur"
            : `${collaborateur.prenom || ""} ${collaborateur.nom || ""}`
        }
        description="Fiche détaillée du collaborateur"
        actions={
          <div className="flex gap-2 items-center">
            <button
              onClick={() => navigate("/collaborateurs")}
              className="btn-secondary btn-md"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            {/* ✅ Bouton Archiver / Restaurer */}
            {!isNew &&
              (collaborateur.archived ? (
                <ProtectedAction module="collaborateurs" action="edit">
                  <button
                    onClick={handleRestore}
                    disabled={saving}
                    title="Restaurer ce collaborateur"
                    className="btn-secondary btn-md"
                  >
                    <Undo className="w-4 h-4" /> {saving ? "..." : "Restaurer"}
                  </button>
                </ProtectedAction>
              ) : (
                <ProtectedAction module="collaborateurs" action="delete">
                  <button
                    onClick={handleArchive}
                    disabled={saving}
                    title="Archiver ce collaborateur (les données sont conservées)"
                    className="btn-danger btn-md"
                  >
                    <Archive className="w-4 h-4" /> {saving ? "..." : "Archiver"}
                  </button>
                </ProtectedAction>
              ))}

            <ProtectedAction
              module="collaborateurs"
              action={isNew ? "create" : "edit"}
            >
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary btn-md"
              >
                <Save className="w-4 h-4" /> {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </ProtectedAction>
          </div>
        }
      />

      {/* ✅ Bandeau si le collaborateur est archivé */}
      {!isNew && collaborateur.archived && (
        <div className="flex items-center gap-3 p-4 mb-5 rounded-lg border border-warning bg-warning/10 text-warning text-sm">
          <Archive className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-bold">Ce collaborateur est archivé</div>
            <div className="text-xs mt-1 text-warning/80">
              Archivé le{" "}
              {collaborateur.archived_at
                ? format(
                    new Date(collaborateur.archived_at),
                    "dd/MM/yyyy à HH:mm",
                  )
                : "—"}
              {collaborateur.archive_reason && (
                <> — Raison : {collaborateur.archive_reason}</>
              )}
            </div>
          </div>
          <ProtectedAction module="collaborateurs" action="edit">
            <button
              onClick={handleRestore}
              disabled={saving}
              className="btn-secondary btn-sm"
            >
              <Undo className="w-3.5 h-3.5" /> Restaurer
            </button>
          </ProtectedAction>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ===== PERSONNELLE ===== */}
        <div className="card p-5 mb-5">
          <h3 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <IdCard className="w-4 h-4" /> Informations personnelles
          </h3>

          <div className="flex items-center gap-5 flex-wrap mb-4">
            <div className="w-30 h-30 rounded-full overflow-hidden border-2 border-app bg-app-secondary flex items-center justify-center" style={{ width: 120, height: 120 }}>
              {collaborateur.photo_url ? (
                <DocumentImage
                  filePath={collaborateur.photo_url}
                  bucket="documents"
                  alt="Photo de profil"
                />
              ) : (
                <UserCircle className="w-10 h-10 text-app-tertiary" />
              )}
            </div>
            <div>
              <ProtectedAction module="collaborateur_profiles" action="edit">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="btn-primary btn-md"
                >
                  <Upload className="w-4 h-4" /> Importer une photo
                </button>
              </ProtectedAction>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0])
                    handleUpload("photo_url", e.target.files[0]);
                }}
              />
              {collaborateur.photo_url && (
                <ProtectedAction
                  module="collaborateur_profiles"
                  action="delete"
                >
                  <button
                    type="button"
                    onClick={() => handleChange("photo_url", "")}
                    className="btn-danger btn-md mt-2"
                  >
                    Supprimer
                  </button>
                </ProtectedAction>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Nom *
              </label>
              <input
                className="input-md"
                value={collaborateur.nom || ""}
                onChange={(e) => handleChange("nom", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Prénom *
              </label>
              <input
                className="input-md"
                value={collaborateur.prenom || ""}
                onChange={(e) => handleChange("prenom", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Date de naissance
              </label>
              <input
                type="date"
                className="input-md"
                value={collaborateur.date_naissance || ""}
                onChange={(e) => handleChange("date_naissance", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Lieu de naissance
              </label>
              <input
                className="input-md"
                value={collaborateur.lieu_naissance || ""}
                onChange={(e) => handleChange("lieu_naissance", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Sexe
              </label>
              <select
                className="input-md"
                value={collaborateur.sexe || ""}
                onChange={(e) => handleChange("sexe", e.target.value)}
              >
                <option value="">--</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>
        </div>

        {/* ===== PROFESSIONNELLE ===== */}
        <div className="card p-5 mb-5">
          <h3 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Informations professionnelles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Fonction / Poste
              </label>
              <input
                className="input-md"
                value={collaborateur.fonction || ""}
                onChange={(e) => handleChange("fonction", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Pays
              </label>
              <input
                className="input-md"
                value={collaborateur.pays || ""}
                onChange={(e) => handleChange("pays", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Bureau
              </label>
              <input
                className="input-md"
                value={collaborateur.bureau || ""}
                onChange={(e) => handleChange("bureau", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Date d'embauche *
              </label>
              <input
                type="date"
                className="input-md"
                value={collaborateur.date_embauche || ""}
                onChange={(e) => handleChange("date_embauche", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-app-tertiary uppercase tracking-wide">
                Date de départ
              </label>
              <input
                type="date"
                className="input-md"
                value={collaborateur.date_depart || ""}
                onChange={(e) => handleChange("date_depart", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ===== DOSSIER DU COLLABORATEUR ===== */}
        <div className="card p-5 mb-5">
          <h3 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Dossier du collaborateur
          </h3>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-app-tertiary mb-1">
              <span>Complétude du dossier</span>
              <span>
                {checkedItems} / {totalItems} ({Math.round(progressPercent)}%)
              </span>
            </div>
            <div className="h-1.5 bg-app-secondary rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {isNew && (
            <div className="p-3 rounded-md border border-warning bg-warning/10 text-warning text-sm mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" /> Enregistrez d'abord le collaborateur
              pour gérer son dossier.
            </div>
          )}

          {DOSSIER_STRUCTURE.map((cat) => {
            const catChecked = cat.items.filter(
              (i) => dossier[i.key]?.checked,
            ).length;
            const isOpen = openAccordions[cat.id];

            return (
              <div
                key={cat.id}
                className="bg-app-secondary border border-app rounded-lg mb-2 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenAccordions({ ...openAccordions, [cat.id]: !isOpen })
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-app-primary text-sm font-semibold text-left transition-colors hover:bg-app-tertiary",
                    isOpen && "bg-app-tertiary",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <i className={`fas ${cat.icon} text-primary w-4`}></i>
                    {cat.title}
                    {cat.veryConfidential && (
                      <span className="badge badge-error text-[10px] uppercase px-1.5 py-0.5 ml-2 font-bold tracking-wide">
                        Très confidentiel
                      </span>
                    )}
                    {!cat.veryConfidential && cat.confidential && (
                      <span className="badge badge-warning text-[10px] uppercase px-1.5 py-0.5 ml-2 font-bold tracking-wide">
                        Confidentiel
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-app-tertiary text-xs font-normal">
                    <span>
                      {catChecked} / {cat.items.length}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                <div
                  className={cn(
                    "px-4 pt-2 pb-4 border-t border-app",
                    !isOpen && "hidden",
                  )}
                >
                  {cat.items.map((item) => {
                    const itemState = dossier[item.key] || {
                      checked: false,
                      document_url: null,
                    };
                    const fileInputId = `file_${item.key}`;
                    const replaceInputId = `replace_${item.key}`;

                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-1 transition-colors hover:bg-app-tertiary",
                          itemState.checked && "bg-success/10 hover:bg-success/15",
                        )}
                      >
                        <ProtectedAction
                          module={
                            cat.confidential
                              ? "collaborateur_hr"
                              : "collaborateur_documents"
                          }
                          action="edit"
                        >
                          <input
                            type="checkbox"
                            checked={itemState.checked}
                            onChange={() => toggleDossierItem(item.key)}
                            className="w-4 h-4 cursor-pointer accent-success flex-shrink-0"
                          />
                        </ProtectedAction>
                        <span
                          className={cn(
                            "flex-1 text-sm text-app-primary",
                            itemState.checked && "text-success line-through",
                          )}
                        >
                          {item.label}
                        </span>
                        <div className="flex gap-1.5 items-center">
                          {itemState.document_url ? (
                            <>
                              {/* ✅ WRAPPED: Voir le document */}
                              <ProtectedAction
                                module={
                                  cat.confidential
                                    ? "collaborateur_hr"
                                    : "collaborateur_documents"
                                }
                                action="view"
                              >
                                <DocumentLink
                                  filePath={itemState.document_url}
                                  bucket="documents"
                                  label="Voir"
                                  className="text-primary text-xs flex items-center gap-1 hover:underline"
                                />
                              </ProtectedAction>
                              <input
                                type="file"
                                id={replaceInputId}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleDossierReplace(
                                      item.key,
                                      e.target.files[0],
                                    );
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <ProtectedAction
                                module={
                                  cat.confidential
                                    ? "collaborateur_hr"
                                    : "collaborateur_documents"
                                }
                                action="edit"
                              >
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  onClick={() =>
                                    document
                                      .getElementById(replaceInputId)
                                      ?.click()
                                  }
                                  title="Remplacer le document"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" /> Remplacer
                                </button>
                              </ProtectedAction>
                              <ProtectedAction
                                module={
                                  cat.confidential
                                    ? "collaborateur_hr"
                                    : "collaborateur_documents"
                                }
                                action="delete"
                              >
                                <button
                                  type="button"
                                  className="btn-danger btn-sm"
                                  onClick={() =>
                                    deleteDossierDocument(item.key)
                                  }
                                  title="Supprimer ce document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                                </button>
                              </ProtectedAction>
                            </>
                          ) : (
                            <>
                              <input
                                type="file"
                                id={fileInputId}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleDossierUpload(
                                      item.key,
                                      e.target.files[0],
                                    );
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <ProtectedAction
                                module={
                                  cat.confidential
                                    ? "collaborateur_hr"
                                    : "collaborateur_documents"
                                }
                                action="create"
                              >
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  onClick={() =>
                                    document
                                      .getElementById(fileInputId)
                                      ?.click()
                                  }
                                  disabled={isNew}
                                >
                                  <FileUp className="w-3.5 h-3.5" /> Joindre
                                </button>
                              </ProtectedAction>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== SCORES ===== */}
        <div className="card p-5 mb-5">
          <h3 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <Star className="w-4 h-4" /> Scores
          </h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
            {scores.length > 0 ? (
              <>
                <div className="bg-app-secondary p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-app-primary">
                    {scores[0].score_mensuel?.toFixed(1) || "-"}
                  </div>
                  <div className="text-[11px] text-app-tertiary uppercase mt-1">
                    Mensuel
                  </div>
                </div>
                <div className="bg-app-secondary p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-app-primary">
                    {scores[0].score_trimestriel?.toFixed(1) || "-"}
                  </div>
                  <div className="text-[11px] text-app-tertiary uppercase mt-1">
                    Trimestriel
                  </div>
                </div>
                <div className="bg-app-secondary p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-app-primary">
                    {scores[0].score_annuel?.toFixed(1) || "-"}
                  </div>
                  <div className="text-[11px] text-app-tertiary uppercase mt-1">
                    Annuel
                  </div>
                </div>
                <div
                  className="bg-app-secondary p-3 rounded-lg text-sm text-app-tertiary"
                  style={{ gridColumn: "1 / -1" }}
                >
                  Dernière mise à jour :{" "}
                  {scores[0].mois
                    ? format(new Date(scores[0].mois), "MMMM yyyy", {
                        locale: fr,
                      })
                    : "N/A"}
                </div>
              </>
            ) : (
              <div
                className="text-app-tertiary text-center py-3"
                style={{ gridColumn: "1 / -1" }}
              >
                Aucun score enregistré
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CollaborateurFiche;
