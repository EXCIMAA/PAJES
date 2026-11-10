// src/pages/collaborateurs/CollaborateurFiche.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { DocumentLink } from "../../components/DocumentLink";
import { DocumentImage } from "../../components/DocumentImage";
import { ProtectedAction } from "../../components/auth/ProtectedAction";
import { canAccessRecordSafe } from "../../lib/permissions";
import { usePermission } from "../../hooks/usePermission";

// ==================== HELPER: SANITIZE FILENAME ====================
const sanitizeFilename = (name: string) => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_");
};

// ==================== STYLES ====================
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
  gap: 12px;
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

const Section = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #334155;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #4facfe;
  margin-bottom: 16px;
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
  }
  input,
  select,
  textarea {
    padding: 8px 12px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: #0f172a;
    color: #e2e8f0;
    font-size: 14px;
    &:focus {
      outline: none;
      border-color: #4facfe;
    }
    &::placeholder {
      color: #64748b;
    }
  }
  textarea {
    min-height: 60px;
    resize: vertical;
  }
`;

const PhotoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const PhotoPreview = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #334155;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .placeholder {
    font-size: 40px;
    color: #475569;
  }
`;

const UploadButton = styled.button`
  padding: 8px 16px;
  background: #4facfe;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  &:hover {
    background: #3b8edb;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const Button = styled.button<{
  variant?: "primary" | "secondary" | "danger" | "success";
}>`
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${({ variant }) => {
    if (variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if (variant === "secondary")
      return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
    if (variant === "danger")
      return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
    if (variant === "success")
      return "background: #22c55e; color: #fff; &:hover { background: #16a34a; }";
    return "background: #1e293b; color: #e2e8f0; &:hover { background: #334155; }";
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ScoreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  .score-item {
    background: #0f172a;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    .value {
      font-size: 24px;
      font-weight: 700;
      color: #e2e8f0;
    }
    .label {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      margin-top: 4px;
    }
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
`;

const AccessDeniedContainer = styled.div`
  background: #0f172a;
  border-radius: 16px;
  padding: 60px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #1e293b;
  color: #e2e8f0;
  text-align: center;
  max-width: 600px;
  margin: 40px auto;
`;

const AccessDeniedIcon = styled.div`
  font-size: 64px;
  color: #fca5a5;
  margin-bottom: 20px;
`;

const AccessDeniedTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 12px;
`;

const AccessDeniedText = styled.p`
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 8px;
  line-height: 1.6;
  strong {
    color: #e2e8f0;
  }
`;

const ArchiveBanner = styled.div`
  padding: 14px 18px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid #fbbf24;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fbbf24;
  font-size: 14px;

  .icon {
    font-size: 20px;
  }

  .content {
    flex: 1;
  }

  .title {
    font-weight: 700;
  }

  .sub {
    font-size: 12px;
    color: #fcd34d;
    margin-top: 4px;
  }
`;

// ==================== DOSSIER STYLES ====================
const Accordion = styled.div`
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
`;

const AccordionHeader = styled.button<{
  $open: boolean;
  $confidential?: boolean;
}>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${({ $open }) => ($open ? "#1e293b" : "transparent")};
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  transition: background 0.15s;
  &:hover {
    background: #1e293b;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 10px;
    i {
      color: #4facfe;
      width: 16px;
    }
  }
  .badge {
    font-size: 10px;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 8px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .badge.conf {
    background: #fef3c7;
    color: #92400e;
  }
  .badge.vconf {
    background: #fee2e2;
    color: #991b1b;
  }
  .right {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 400;
  }
`;

const AccordionContent = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? "block" : "none")};
  padding: 8px 16px 16px;
  border-top: 1px solid #334155;
`;

const CheckItem = styled.div<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: ${({ $checked }) =>
    $checked ? "rgba(34,197,94,0.08)" : "transparent"};
  transition: background 0.15s;
  &:hover {
    background: ${({ $checked }) =>
      $checked ? "rgba(34,197,94,0.12)" : "#1e293b"};
  }
  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #22c55e;
    flex-shrink: 0;
  }
  .label {
    flex: 1;
    font-size: 13px;
    color: ${({ $checked }) => ($checked ? "#22c55e" : "#e2e8f0")};
    text-decoration: ${({ $checked }) => ($checked ? "line-through" : "none")};
  }
  .actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .link-icon {
    color: #4facfe;
    text-decoration: none;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    &:hover {
      text-decoration: underline;
    }
  }
  .upload-btn {
    padding: 4px 8px;
    background: #334155;
    color: #e2e8f0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    &:hover {
      background: #475569;
    }
  }
  .replace-btn {
    padding: 4px 8px;
    background: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    &:hover {
      background: #2563eb;
    }
  }
  .delete-btn-text {
    padding: 4px 8px;
    background: #dc2626;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    transition:
      background 0.2s,
      transform 0.1s;
    &:hover {
      background: #b91c1c;
      transform: scale(1.05);
    }
    &:active {
      transform: scale(0.98);
    }
  }
  .del-btn {
    padding: 4px 6px;
    background: transparent;
    color: #dc2626;
    border: none;
    cursor: pointer;
    font-size: 12px;
    &:hover {
      color: #b91c1c;
    }
  }
`;

const ProgressBar = styled.div`
  height: 6px;
  background: #1e293b;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #4facfe, #22c55e);
    transition: width 0.3s;
  }
`;

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

      const { data: collab, error } = await supabase
        .from("collaborateurs")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setCollaborateur(collab);

      const { data: s } = await supabase
        .from("scores")
        .select("*")
        .eq("collaborateur_id", id)
        .order("mois", { ascending: false })
        .limit(1);
      if (s && s.length > 0) setScores(s);

      const { data: dossierData } = await supabase
        .from("dossier_collaborateur")
        .select("item_key, checked, document_url")
        .eq("collaborateur_id", id);

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
      alert("Erreur chargement du collaborateur");
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
      const fileExt = file.name.split(".").pop();
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      const cleanName = sanitizeFilename(baseName);
      const fileName = `${Date.now()}_${field}_${cleanName}.${fileExt}`;
      const filePath = `collaborateurs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      handleChange(field, filePath);
    } catch (err: any) {
      console.error(err);
      alert(`Erreur upload : ${err.message || "Erreur inconnue"}`);
    }
  };

  // ============ DOSSIER HANDLERS ============
  const toggleDossierItem = async (itemKey: string) => {
    if (isNew) {
      alert(
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
      const { error } = await supabase.from("dossier_collaborateur").upsert(
        {
          collaborateur_id: id,
          item_key: itemKey,
          checked: newChecked,
          document_url: current.document_url || null,
        },
        { onConflict: "collaborateur_id,item_key" },
      );
      if (error) throw error;
    } catch (err: any) {
      console.error("Détails complets :", err);
      setDossier({ ...dossier, [itemKey]: current });
      alert(
        `Erreur dossier :\n${err.message || "Inconnu"}\n${err.details || ""}`,
      );
    }
  };

  const handleDossierUpload = async (itemKey: string, file: File) => {
    if (isNew) {
      alert("Veuillez d'abord enregistrer le collaborateur.");
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      const cleanName = sanitizeFilename(baseName);
      const fileName = `${id}_${itemKey}_${Date.now()}_${cleanName}.${fileExt}`;
      const filePath = `dossiers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("dossier_collaborateur")
        .upsert(
          {
            collaborateur_id: id,
            item_key: itemKey,
            checked: true,
            document_url: filePath,
          },
          { onConflict: "collaborateur_id,item_key" },
        );

      if (dbError) throw dbError;

      setDossier({
        ...dossier,
        [itemKey]: {
          item_key: itemKey,
          checked: true,
          document_url: filePath,
        },
      });

      alert("Document uploadé avec succès !");
    } catch (err: any) {
      console.error("Détails de l'erreur :", err);
      alert(
        `Erreur d'upload : ${err.message || err.details || "Erreur inconnue"}`,
      );
    }
  };

  const handleDossierReplace = async (itemKey: string, file: File) => {
    if (isNew) {
      alert("Veuillez d'abord enregistrer le collaborateur.");
      return;
    }

    if (!window.confirm("Remplacer le document existant par le nouveau ?")) {
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      const cleanName = sanitizeFilename(baseName);
      const fileName = `${id}_${itemKey}_${Date.now()}_${cleanName}.${fileExt}`;
      const filePath = `dossiers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const oldPath = dossier[itemKey]?.document_url;
      if (oldPath) {
        try {
          const cleanOldPath = oldPath.includes("/object/")
            ? oldPath.split("/object/").pop()!.split("/").slice(1).join("/")
            : oldPath;
          await supabase.storage.from("documents").remove([cleanOldPath]);
        } catch (delErr) {
          console.warn("Impossible de supprimer l'ancien fichier:", delErr);
        }
      }

      const { error: dbError } = await supabase
        .from("dossier_collaborateur")
        .upsert(
          {
            collaborateur_id: id,
            item_key: itemKey,
            checked: true,
            document_url: filePath,
          },
          { onConflict: "collaborateur_id,item_key" },
        );
      if (dbError) throw dbError;

      setDossier({
        ...dossier,
        [itemKey]: {
          item_key: itemKey,
          checked: true,
          document_url: filePath,
        },
      });

      alert("Document remplacé avec succès !");
    } catch (err: any) {
      console.error("Détails de l'erreur :", err);
      alert(
        `Erreur de remplacement : ${err.message || err.details || "Erreur inconnue"}`,
      );
    }
  };

  const deleteDossierDocument = async (itemKey: string) => {
    if (
      !window.confirm("Supprimer ce document ? Cette action est irréversible.")
    )
      return;
    try {
      await supabase.from("dossier_collaborateur").upsert(
        {
          collaborateur_id: id,
          item_key: itemKey,
          checked: false,
          document_url: null,
        },
        { onConflict: "collaborateur_id,item_key" },
      );

      setDossier({
        ...dossier,
        [itemKey]: { item_key: itemKey, checked: false, document_url: null },
      });
    } catch (err) {
      console.error(err);
      alert("Erreur suppression");
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

    if (
      !window.confirm(
        `Archiver "${collaborateur.prenom} ${collaborateur.nom}" ?\n\n` +
          `Le collaborateur disparaîtra de la liste active, ` +
          `mais toutes ses données seront conservées.`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("collaborateurs")
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user?.id || null,
          archive_reason: reason || null,
        })
        .eq("id", id);

      if (error) throw error;

      alert("Collaborateur archivé avec succès.");
      navigate("/collaborateurs");
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de l'archivage : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (isNew) return;

    if (
      !window.confirm(
        `Restaurer "${collaborateur.prenom} ${collaborateur.nom}" ?\n\n` +
          `Le collaborateur réapparaîtra dans la liste active.`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("collaborateurs")
        .update({
          archived: false,
          archived_at: null,
          archived_by: null,
          archive_reason: null,
        })
        .eq("id", id);

      if (error) throw error;

      alert("Collaborateur restauré avec succès.");
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la restauration : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============ SAVE COLLABORATEUR ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborateur.nom || !collaborateur.prenom) {
      alert("Veuillez renseigner au moins le nom et le prénom.");
      return;
    }
    if (!collaborateur.date_embauche) {
      alert("Veuillez renseigner la date d'embauche.");
      return;
    }

    try {
      setSaving(true);
      const dataToSave = { ...collaborateur };

      if (isNew) {
        const { data, error } = await supabase
          .from("collaborateurs")
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        navigate(`/collaborateurs/${data.id}`);
      } else {
        const { error } = await supabase
          .from("collaborateurs")
          .update(dataToSave)
          .eq("id", id);
        if (error) throw error;
      }

      if (user && dataToSave.date_embauche) {
        await supabase
          .from("profiles")
          .update({ hire_date: dataToSave.date_embauche })
          .eq("id", user.id);
      }

      alert("Collaborateur sauvegardé !");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde");
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
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin"></i> Chargement...
      </LoadingContainer>
    );
  }

  // ✅ ACCESS DENIED — Utilisateur non autorisé à VOIR les collaborateurs
  if (!canViewCollaborateurs && !isNew) {
    return (
      <AccessDeniedContainer>
        <AccessDeniedIcon>
          <i className="fas fa-user-lock"></i>
        </AccessDeniedIcon>
        <AccessDeniedTitle>Accès refusé</AccessDeniedTitle>
        <AccessDeniedText>
          Votre rôle actuel (<strong>"{role || "inconnu"}"</strong>) ne vous
          permet pas de consulter les informations des collaborateurs.
        </AccessDeniedText>
        <AccessDeniedText>
          Veuillez contacter votre administrateur si vous pensez qu'il s'agit
          d'une erreur.
        </AccessDeniedText>
        <Button
          variant="primary"
          onClick={() => navigate("/collaborateurs")}
          style={{ marginTop: 24, padding: "10px 24px", fontSize: 14 }}
        >
          <i className="fas fa-arrow-left"></i> Retour
        </Button>
      </AccessDeniedContainer>
    );
  }

  // ✅ ACCESS DENIED — Utilisateur non autorisé à CRÉER un collaborateur
  if (isNew && !canCreateCollaborateurs) {
    return (
      <AccessDeniedContainer>
        <AccessDeniedIcon>
          <i className="fas fa-user-plus"></i>
        </AccessDeniedIcon>
        <AccessDeniedTitle>
          Vous ne pouvez pas créer de collaborateur
        </AccessDeniedTitle>
        <AccessDeniedText>
          Votre rôle actuel (<strong>"{role || "inconnu"}"</strong>) ne vous
          permet pas de créer un collaborateur.
        </AccessDeniedText>
        <AccessDeniedText>
          Veuillez contacter votre administrateur si vous pensez qu'il s'agit
          d'une erreur.
        </AccessDeniedText>
        <Button
          variant="primary"
          onClick={() => navigate("/collaborateurs")}
          style={{ marginTop: 24, padding: "10px 24px", fontSize: 14 }}
        >
          <i className="fas fa-arrow-left"></i> Retour
        </Button>
      </AccessDeniedContainer>
    );
  }

  // ✅ ACCESS DENIED — Détecté par canAccessRecordSafe
  if (accessDenied) {
    return (
      <AccessDeniedContainer>
        <AccessDeniedIcon>
          <i className="fas fa-user-lock"></i>
        </AccessDeniedIcon>
        <AccessDeniedTitle>Vous n'avez pas accès à ce profil</AccessDeniedTitle>
        <AccessDeniedText>
          Votre rôle ne vous permet pas de consulter les informations de ce
          collaborateur.
        </AccessDeniedText>
        <Button
          variant="primary"
          onClick={() => navigate("/collaborateurs")}
          style={{ marginTop: 24, padding: "10px 24px", fontSize: 14 }}
        >
          <i className="fas fa-arrow-left"></i> Retour
        </Button>
      </AccessDeniedContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-user"></i>
          {isNew
            ? "Nouveau collaborateur"
            : `${collaborateur.prenom || ""} ${collaborateur.nom || ""}`}
        </HeaderTitle>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Button
            variant="secondary"
            onClick={() => navigate("/collaborateurs")}
          >
            <i className="fas fa-arrow-left"></i> Retour
          </Button>

          {/* ✅ Bouton Archiver / Restaurer */}
          {!isNew &&
            (collaborateur.archived ? (
              <ProtectedAction module="collaborateurs" action="edit">
                <Button
                  variant="success"
                  onClick={handleRestore}
                  disabled={saving}
                  title="Restaurer ce collaborateur"
                >
                  <i className="fas fa-undo"></i> {saving ? "..." : "Restaurer"}
                </Button>
              </ProtectedAction>
            ) : (
              <ProtectedAction module="collaborateurs" action="delete">
                <Button
                  variant="danger"
                  onClick={handleArchive}
                  disabled={saving}
                  title="Archiver ce collaborateur (les données sont conservées)"
                >
                  <i className="fas fa-archive"></i>{" "}
                  {saving ? "..." : "Archiver"}
                </Button>
              </ProtectedAction>
            ))}

          <ProtectedAction
            module="collaborateurs"
            action={isNew ? "create" : "edit"}
          >
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </ProtectedAction>
        </div>
      </Header>

      {/* ✅ Bandeau si le collaborateur est archivé */}
      {!isNew && collaborateur.archived && (
        <ArchiveBanner>
          <i className="fas fa-archive icon"></i>
          <div className="content">
            <div className="title">Ce collaborateur est archivé</div>
            <div className="sub">
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
            <Button
              variant="success"
              onClick={handleRestore}
              disabled={saving}
              style={{ fontSize: "12px" }}
            >
              <i className="fas fa-undo"></i> Restaurer
            </Button>
          </ProtectedAction>
        </ArchiveBanner>
      )}

      <form onSubmit={handleSubmit}>
        {/* ===== PERSONNELLE ===== */}
        <Section>
          <SectionTitle>
            <i className="fas fa-id-card"></i> Informations personnelles
          </SectionTitle>

          <PhotoSection>
            <PhotoPreview>
              {collaborateur.photo_url ? (
                <DocumentImage
                  filePath={collaborateur.photo_url}
                  bucket="documents"
                  alt="Photo de profil"
                />
              ) : (
                <span className="placeholder">
                  <i className="fas fa-user-circle"></i>
                </span>
              )}
            </PhotoPreview>
            <div>
              <ProtectedAction module="collaborateur_profiles" action="edit">
                <UploadButton
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <i className="fas fa-upload"></i> Importer une photo
                </UploadButton>
              </ProtectedAction>
              <FileInput
                ref={photoInputRef}
                type="file"
                accept="image/*"
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
                  <Button
                    variant="danger"
                    type="button"
                    onClick={() => handleChange("photo_url", "")}
                  >
                    Supprimer
                  </Button>
                </ProtectedAction>
              )}
            </div>
          </PhotoSection>

          <Grid>
            <Field>
              <label>Nom *</label>
              <input
                value={collaborateur.nom || ""}
                onChange={(e) => handleChange("nom", e.target.value)}
              />
            </Field>
            <Field>
              <label>Prénom *</label>
              <input
                value={collaborateur.prenom || ""}
                onChange={(e) => handleChange("prenom", e.target.value)}
              />
            </Field>
            <Field>
              <label>Date de naissance</label>
              <input
                type="date"
                value={collaborateur.date_naissance || ""}
                onChange={(e) => handleChange("date_naissance", e.target.value)}
              />
            </Field>
            <Field>
              <label>Lieu de naissance</label>
              <input
                value={collaborateur.lieu_naissance || ""}
                onChange={(e) => handleChange("lieu_naissance", e.target.value)}
              />
            </Field>
            <Field>
              <label>Sexe</label>
              <select
                value={collaborateur.sexe || ""}
                onChange={(e) => handleChange("sexe", e.target.value)}
              >
                <option value="">--</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </Field>
          </Grid>
        </Section>

        {/* ===== PROFESSIONNELLE ===== */}
        <Section>
          <SectionTitle>
            <i className="fas fa-briefcase"></i> Informations professionnelles
          </SectionTitle>
          <Grid>
            <Field>
              <label>Fonction / Poste</label>
              <input
                value={collaborateur.fonction || ""}
                onChange={(e) => handleChange("fonction", e.target.value)}
              />
            </Field>
            <Field>
              <label>Pays</label>
              <input
                value={collaborateur.pays || ""}
                onChange={(e) => handleChange("pays", e.target.value)}
              />
            </Field>
            <Field>
              <label>Bureau</label>
              <input
                value={collaborateur.bureau || ""}
                onChange={(e) => handleChange("bureau", e.target.value)}
              />
            </Field>
            <Field>
              <label>Date d'embauche *</label>
              <input
                type="date"
                value={collaborateur.date_embauche || ""}
                onChange={(e) => handleChange("date_embauche", e.target.value)}
                required
              />
            </Field>
            <Field>
              <label>Date de départ</label>
              <input
                type="date"
                value={collaborateur.date_depart || ""}
                onChange={(e) => handleChange("date_depart", e.target.value)}
              />
            </Field>
          </Grid>
        </Section>

        {/* ===== DOSSIER DU COLLABORATEUR ===== */}
        <Section>
          <SectionTitle>
            <i className="fas fa-folder-open"></i> Dossier du collaborateur
          </SectionTitle>

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "4px",
              }}
            >
              <span>Complétude du dossier</span>
              <span>
                {checkedItems} / {totalItems} ({Math.round(progressPercent)}%)
              </span>
            </div>
            <ProgressBar>
              <div className="fill" style={{ width: `${progressPercent}%` }} />
            </ProgressBar>
          </div>

          {isNew && (
            <div
              style={{
                padding: "12px",
                background: "rgba(251,191,36,0.1)",
                border: "1px solid #fbbf24",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#fbbf24",
                marginBottom: "12px",
              }}
            >
              <i className="fas fa-info-circle"></i> Enregistrez d'abord le
              collaborateur pour gérer son dossier.
            </div>
          )}

          {DOSSIER_STRUCTURE.map((cat) => {
            const catChecked = cat.items.filter(
              (i) => dossier[i.key]?.checked,
            ).length;
            const isOpen = openAccordions[cat.id];

            return (
              <Accordion key={cat.id}>
                <AccordionHeader
                  $open={!!isOpen}
                  $confidential={cat.confidential}
                  type="button"
                  onClick={() =>
                    setOpenAccordions({ ...openAccordions, [cat.id]: !isOpen })
                  }
                >
                  <div className="left">
                    <i className={`fas ${cat.icon}`}></i>
                    {cat.title}
                    {cat.veryConfidential && (
                      <span className="badge vconf">Très confidentiel</span>
                    )}
                    {!cat.veryConfidential && cat.confidential && (
                      <span className="badge conf">Confidentiel</span>
                    )}
                  </div>
                  <div className="right">
                    <span>
                      {catChecked} / {cat.items.length}
                    </span>
                    <i
                      className={`fas fa-chevron-${isOpen ? "up" : "down"}`}
                    ></i>
                  </div>
                </AccordionHeader>

                <AccordionContent $open={!!isOpen}>
                  {cat.items.map((item) => {
                    const itemState = dossier[item.key] || {
                      checked: false,
                      document_url: null,
                    };
                    const fileInputId = `file_${item.key}`;
                    const replaceInputId = `replace_${item.key}`;

                    return (
                      <CheckItem key={item.key} $checked={itemState.checked}>
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
                          />
                        </ProtectedAction>
                        <span className="label">{item.label}</span>
                        <div className="actions">
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
                                  className="link-icon"
                                />
                              </ProtectedAction>
                              <input
                                type="file"
                                id={replaceInputId}
                                style={{ display: "none" }}
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
                                  className="replace-btn"
                                  onClick={() =>
                                    document
                                      .getElementById(replaceInputId)
                                      ?.click()
                                  }
                                  title="Remplacer le document"
                                >
                                  <i className="fas fa-sync-alt"></i> Remplacer
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
                                  className="delete-btn-text"
                                  onClick={() =>
                                    deleteDossierDocument(item.key)
                                  }
                                  title="Supprimer ce document"
                                >
                                  <i className="fas fa-trash"></i> Supprimer
                                </button>
                              </ProtectedAction>
                            </>
                          ) : (
                            <>
                              <input
                                type="file"
                                id={fileInputId}
                                style={{ display: "none" }}
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
                                  className="upload-btn"
                                  onClick={() =>
                                    document
                                      .getElementById(fileInputId)
                                      ?.click()
                                  }
                                  disabled={isNew}
                                >
                                  <i className="fas fa-upload"></i> Joindre
                                </button>
                              </ProtectedAction>
                            </>
                          )}
                        </div>
                      </CheckItem>
                    );
                  })}
                </AccordionContent>
              </Accordion>
            );
          })}
        </Section>

        {/* ===== SCORES ===== */}
        <Section>
          <SectionTitle>
            <i className="fas fa-star"></i> Scores
          </SectionTitle>
          <ScoreGrid>
            {scores.length > 0 ? (
              <>
                <div className="score-item">
                  <div className="value">
                    {scores[0].score_mensuel?.toFixed(1) || "-"}
                  </div>
                  <div className="label">Mensuel</div>
                </div>
                <div className="score-item">
                  <div className="value">
                    {scores[0].score_trimestriel?.toFixed(1) || "-"}
                  </div>
                  <div className="label">Trimestriel</div>
                </div>
                <div className="score-item">
                  <div className="value">
                    {scores[0].score_annuel?.toFixed(1) || "-"}
                  </div>
                  <div className="label">Annuel</div>
                </div>
                <div
                  className="score-item"
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "13px",
                    color: "#94a3b8",
                  }}
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
                style={{
                  color: "#94a3b8",
                  textAlign: "center",
                  padding: "12px",
                  gridColumn: "1 / -1",
                }}
              >
                Aucun score enregistré
              </div>
            )}
          </ScoreGrid>
        </Section>
      </form>
    </Container>
  );
};

export default CollaborateurFiche;
