// src/pages/manuel/GestionDocumentation.tsx
import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

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

const Description = styled.p`
  color: #94a3b8;
  font-size: 14px;
  margin: 12px 0 20px;
  line-height: 1.6;
  i {
    color: #4facfe;
    margin-right: 6px;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #1e293b;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-weight: 500;
  font-size: 14px;
  color: ${({ $active }) => ($active ? "#4facfe" : "#94a3b8")};
  cursor: pointer;
  border-bottom: 3px solid
    ${({ $active }) => ($active ? "#4facfe" : "transparent")};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    color: #e2e8f0;
    background: #1e293b;
  }
  i {
    font-size: 16px;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  margin: 16px 0;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid #1e293b;
    text-align: left;
    vertical-align: top;
    min-width: 80px;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
    white-space: nowrap;
  }
`;

const Input = styled.input`
  padding: 4px 6px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  width: 100%;
  min-width: 60px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const StyledSelect = styled.select`
  padding: 4px 6px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  width: 100%;
  min-width: 80px;
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const Button = styled.button<{
  $variant?: "primary" | "secondary" | "danger" | "success";
}>`
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ $variant }) => {
    if ($variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if ($variant === "secondary")
      return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
    if ($variant === "danger")
      return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
    if ($variant === "success")
      return "background: #22c55e; color: #fff; &:hover { background: #16a34a; }";
    return "background: #1e293b; color: #e2e8f0; &:hover { background: #334155; }";
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ImportArea = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin: 12px 0;
  padding: 12px 16px;
  background: #1e293b;
  border-radius: 8px;
  border: 2px dashed #334155;
`;

const FileInput = styled.input`
  display: none;
`;

const FileName = styled.span`
  color: #94a3b8;
  font-size: 13px;
  flex: 1;
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
`;

const ErrorContainer = styled.div`
  background: #7f1d1d;
  color: #fca5a5;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 12px 0;
  border-left: 4px solid #dc2626;
`;

// ==================== DONNÉES STATIQUES ====================
// Domaines pour la doc interne
const DOMAINES_INTERNE = [
  "Prise d'affaires",
  "Production",
  "EC",
  "CAC",
  "Juridique",
  "Social",
  "Gestion interne",
  "Autre",
];

const FORMATS = ["Papier", "Informatique"];

// Supports pour la doc technique
const SUPPORTS = ["CD", "Papier", "En ligne", "Revue"];

const THEMES_TECH = [
  "la profession",
  "CAC",
  "EC",
  "Social",
  "Juridique",
  "Autre",
];

// Types de destruction pour l'archivage
const TYPES_DESTRUCTION = ["Poubelle", "Broyage", "Suppression du fichier"];

const METIERS = ["EC", "CAC", "SOCIAL", "JURIDIQUE", "Gestion interne"];

// ==================== INTERFACES ====================
interface DocInterne {
  id: string;
  nom: string;
  version: string;
  domaine: string;
  format: string;
  auteur: string;
  lieu_classement: string;
}

interface DocTechnique {
  id: string;
  nom: string;
  support: string;
  mise_a_jour: string;
  lieu_classement: string;
  theme: string;
  site_adresse: string;
  site_mot_de_passe: string;
}

interface Archivage {
  id: string;
  nom: string;
  format: string;
  quand_archiver: string;
  duree: string;
  responsable: string;
  lieu_stockage: string;
  reference: string;
  type_destruction: string;
  metier: string;
}

// ==================== COMPOSANT ====================
const GestionDocumentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "interne" | "technique" | "archivage"
  >("interne");

  // États pour chaque tableau
  const [docInterne, setDocInterne] = useState<DocInterne[]>([]);
  const [docTechnique, setDocTechnique] = useState<DocTechnique[]>([]);
  const [archivage, setArchivage] = useState<Archivage[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // États pour l'import
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nouvelle ligne pour chaque tableau
  const [newInterne, setNewInterne] = useState<Partial<DocInterne>>({});
  const [newTechnique, setNewTechnique] = useState<Partial<DocTechnique>>({});
  const [newArchivage, setNewArchivage] = useState<Partial<Archivage>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [interneRes, techniqueRes, archivageRes] = await Promise.all([
        supabase.from("doc_interne").select("*").order("nom"),
        supabase.from("doc_technique").select("*").order("nom"),
        supabase.from("archivage").select("*").order("nom"),
      ]);
      if (interneRes.error) throw interneRes.error;
      if (techniqueRes.error) throw techniqueRes.error;
      if (archivageRes.error) throw archivageRes.error;
      setDocInterne(interneRes.data || []);
      setDocTechnique(techniqueRes.data || []);
      setArchivage(archivageRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ===== DOCUMENTATION INTERNE =====
  const addInterne = async () => {
    if (!newInterne.nom) {
      alert("Veuillez renseigner le nom du document.");
      return;
    }
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("doc_interne")
        .insert([
          {
            nom: newInterne.nom || "",
            version: newInterne.version || "",
            domaine: newInterne.domaine || "",
            format: newInterne.format || "",
            auteur: newInterne.auteur || "",
            lieu_classement: newInterne.lieu_classement || "",
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setDocInterne([...docInterne, data]);
      setNewInterne({});
    } catch (err: any) {
      alert("Erreur ajout: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateInterne = async (
    id: string,
    field: keyof DocInterne,
    value: string,
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("doc_interne")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
      setDocInterne(
        docInterne.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
      );
    } catch (err: any) {
      alert("Erreur mise à jour: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteInterne = async (id: string) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      setSaving(true);
      await supabase.from("doc_interne").delete().eq("id", id);
      setDocInterne(docInterne.filter((d) => d.id !== id));
    } catch (err: any) {
      alert("Erreur suppression: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== DOCUMENTATION TECHNIQUE =====
  const addTechnique = async () => {
    if (!newTechnique.nom) {
      alert("Veuillez renseigner le nom du document.");
      return;
    }
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("doc_technique")
        .insert([
          {
            nom: newTechnique.nom || "",
            support: newTechnique.support || "",
            mise_a_jour: newTechnique.mise_a_jour || "",
            lieu_classement: newTechnique.lieu_classement || "",
            theme: newTechnique.theme || "",
            site_adresse: newTechnique.site_adresse || "",
            site_mot_de_passe: newTechnique.site_mot_de_passe || "",
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setDocTechnique([...docTechnique, data]);
      setNewTechnique({});
    } catch (err: any) {
      alert("Erreur ajout: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTechnique = async (
    id: string,
    field: keyof DocTechnique,
    value: string,
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("doc_technique")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
      setDocTechnique(
        docTechnique.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
      );
    } catch (err: any) {
      alert("Erreur mise à jour: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTechnique = async (id: string) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      setSaving(true);
      await supabase.from("doc_technique").delete().eq("id", id);
      setDocTechnique(docTechnique.filter((d) => d.id !== id));
    } catch (err: any) {
      alert("Erreur suppression: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== ARCHIVAGE =====
  const addArchivage = async () => {
    if (!newArchivage.nom) {
      alert("Veuillez renseigner le nom du document.");
      return;
    }
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("archivage")
        .insert([
          {
            nom: newArchivage.nom || "",
            format: newArchivage.format || "",
            quand_archiver: newArchivage.quand_archiver || "",
            duree: newArchivage.duree || "",
            responsable: newArchivage.responsable || "",
            lieu_stockage: newArchivage.lieu_stockage || "",
            reference: newArchivage.reference || "",
            type_destruction: newArchivage.type_destruction || "",
            metier: newArchivage.metier || "",
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setArchivage([...archivage, data]);
      setNewArchivage({});
    } catch (err: any) {
      alert("Erreur ajout: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateArchivage = async (
    id: string,
    field: keyof Archivage,
    value: string,
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("archivage")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
      setArchivage(
        archivage.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
      );
    } catch (err: any) {
      alert("Erreur mise à jour: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteArchivage = async (id: string) => {
    if (!window.confirm("Supprimer cette ligne ?")) return;
    try {
      setSaving(true);
      await supabase.from("archivage").delete().eq("id", id);
      setArchivage(archivage.filter((d) => d.id !== id));
    } catch (err: any) {
      alert("Erreur suppression: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== IMPORT EXCEL =====
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      alert("Veuillez sélectionner un fichier Excel (.xlsx ou .xls)");
      return;
    }
    setImportFile(file);
  };

  const handleImport = async (table: "interne" | "technique" | "archivage") => {
    if (!importFile) {
      alert("Veuillez sélectionner un fichier Excel.");
      return;
    }
    setSaving(true);
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (rows.length < 2) {
        alert("Le fichier est vide ou ne contient que des en-têtes.");
        return;
      }

      const header = rows[0] as string[];
      const colMap: Record<string, number> = {};
      header.forEach((col, idx) => {
        const normalized = col.toString().trim().toLowerCase();
        if (normalized.includes("nom")) colMap.nom = idx;
        else if (normalized.includes("version")) colMap.version = idx;
        else if (normalized.includes("domaine")) colMap.domaine = idx;
        else if (normalized.includes("format")) colMap.format = idx;
        else if (normalized.includes("auteur")) colMap.auteur = idx;
        else if (normalized.includes("lieu")) colMap.lieu = idx;
        else if (normalized.includes("support")) colMap.support = idx;
        else if (
          normalized.includes("mise à jour") ||
          normalized.includes("mise_a_jour")
        )
          colMap.mise_a_jour = idx;
        else if (normalized.includes("thème") || normalized.includes("theme"))
          colMap.theme = idx;
        else if (normalized.includes("adresse")) colMap.adresse = idx;
        else if (
          normalized.includes("mot de passe") ||
          normalized.includes("mot_de_passe")
        )
          colMap.mot_de_passe = idx;
        else if (normalized.includes("quand")) colMap.quand = idx;
        else if (normalized.includes("durée") || normalized.includes("duree"))
          colMap.duree = idx;
        else if (normalized.includes("responsable")) colMap.responsable = idx;
        else if (normalized.includes("stockage")) colMap.stockage = idx;
        else if (
          normalized.includes("référence") ||
          normalized.includes("reference")
        )
          colMap.reference = idx;
        else if (normalized.includes("destruction")) colMap.destruction = idx;
        else if (normalized.includes("métier") || normalized.includes("metier"))
          colMap.metier = idx;
      });

      const newEntries: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0) continue;
        const nom = row[colMap.nom]?.toString().trim() || "";
        if (!nom) continue;

        const entry: any = { nom };

        if (table === "interne") {
          entry.version = row[colMap.version]?.toString().trim() || "";
          entry.domaine = row[colMap.domaine]?.toString().trim() || "";
          entry.format = row[colMap.format]?.toString().trim() || "";
          entry.auteur = row[colMap.auteur]?.toString().trim() || "";
          entry.lieu_classement = row[colMap.lieu]?.toString().trim() || "";
          if (!DOMAINES_INTERNE.includes(entry.domaine)) entry.domaine = "";
          if (!FORMATS.includes(entry.format)) entry.format = "";
          newEntries.push(entry);
        } else if (table === "technique") {
          entry.support = row[colMap.support]?.toString().trim() || "";
          entry.mise_a_jour = row[colMap.mise_a_jour]?.toString().trim() || "";
          entry.lieu_classement = row[colMap.lieu]?.toString().trim() || "";
          entry.theme = row[colMap.theme]?.toString().trim() || "";
          entry.site_adresse = row[colMap.adresse]?.toString().trim() || "";
          entry.site_mot_de_passe =
            row[colMap.mot_de_passe]?.toString().trim() || "";
          if (!SUPPORTS.includes(entry.support)) entry.support = "";
          if (!THEMES_TECH.includes(entry.theme)) entry.theme = "";
          newEntries.push(entry);
        } else if (table === "archivage") {
          entry.format = row[colMap.format]?.toString().trim() || "";
          entry.quand_archiver = row[colMap.quand]?.toString().trim() || "";
          entry.duree = row[colMap.duree]?.toString().trim() || "";
          entry.responsable = row[colMap.responsable]?.toString().trim() || "";
          entry.lieu_stockage = row[colMap.stockage]?.toString().trim() || "";
          entry.reference = row[colMap.reference]?.toString().trim() || "";
          entry.type_destruction =
            row[colMap.destruction]?.toString().trim() || "";
          entry.metier = row[colMap.metier]?.toString().trim() || "";
          if (!FORMATS.includes(entry.format)) entry.format = "";
          if (!TYPES_DESTRUCTION.includes(entry.type_destruction))
            entry.type_destruction = "";
          if (!METIERS.includes(entry.metier)) entry.metier = "";
          newEntries.push(entry);
        }
      }

      if (newEntries.length === 0) {
        alert("Aucune ligne valide à importer.");
        return;
      }

      const tableMap = {
        interne: "doc_interne",
        technique: "doc_technique",
        archivage: "archivage",
      };

      const { data: inserted, error } = await supabase
        .from(tableMap[table])
        .insert(newEntries)
        .select();
      if (error) throw error;

      await loadData();
      alert(`${inserted.length} lignes importées avec succès.`);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de l'import : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== EXPORT EXCEL =====
  const exportExcel = (table: "interne" | "technique" | "archivage") => {
    let rows: any[] = [];
    let filename = "";
    let headers: string[] = [];

    if (table === "interne") {
      headers = [
        "Nom du document",
        "Version",
        "Domaine couvert",
        "Format",
        "Auteur",
        "Lieu de classement",
      ];
      rows.push(headers);
      docInterne.forEach((d) => {
        rows.push([
          d.nom,
          d.version,
          d.domaine,
          d.format,
          d.auteur,
          d.lieu_classement,
        ]);
      });
      filename = "Documentation_interne";
    } else if (table === "technique") {
      headers = [
        "Nom / Type",
        "Support",
        "Année/Mise à jour",
        "Lieu de classement",
        "Thème",
        "Adresse site",
        "Mots de passe",
      ];
      rows.push(headers);
      docTechnique.forEach((d) => {
        rows.push([
          d.nom,
          d.support,
          d.mise_a_jour,
          d.lieu_classement,
          d.theme,
          d.site_adresse,
          d.site_mot_de_passe,
        ]);
      });
      filename = "Documentation_technique";
    } else {
      headers = [
        "Nom",
        "Format",
        "Quand archiver ?",
        "Durée",
        "Responsable",
        "Lieu de stockage",
        "Référence",
        "Type de destruction",
        "Métier",
      ];
      rows.push(headers);
      archivage.forEach((d) => {
        rows.push([
          d.nom,
          d.format,
          d.quand_archiver,
          d.duree,
          d.responsable,
          d.lieu_stockage,
          d.reference,
          d.type_destruction,
          d.metier,
        ]);
      });
      filename = "Archivage";
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Données");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // ===== RENDU =====
  if (loading) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement...</p>
      </LoadingContainer>
    );
  }

  const renderSelect = (
    value: string,
    options: string[],
    onChange: (v: string) => void,
    placeholder?: string,
  ) => (
    <StyledSelect
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder || "--"}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </StyledSelect>
  );

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-folder-open"></i> Gestion de la documentation
        </HeaderTitle>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button $variant="success" onClick={() => exportExcel(activeTab)}>
            <i className="fas fa-file-excel"></i> Exporter
          </Button>
        </div>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Gérez la documentation interne du cabinet, la documentation technique
        (revues, abonnements) et le plan d'archivage des documents par métier.
      </Description>

      {error && (
        <ErrorContainer>
          <i className="fas fa-exclamation-circle"></i> {error}
        </ErrorContainer>
      )}

      <TabsContainer>
        <TabButton
          $active={activeTab === "interne"}
          onClick={() => setActiveTab("interne")}
        >
          <i className="fas fa-file-alt"></i> Documentation interne
        </TabButton>
        <TabButton
          $active={activeTab === "technique"}
          onClick={() => setActiveTab("technique")}
        >
          <i className="fas fa-book"></i> Documentation technique
        </TabButton>
        <TabButton
          $active={activeTab === "archivage"}
          onClick={() => setActiveTab("archivage")}
        >
          <i className="fas fa-archive"></i> Archivage
        </TabButton>
      </TabsContainer>

      {/* Onglet Documentation interne */}
      {activeTab === "interne" && (
        <div>
          <ImportArea>
            <Button
              $variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <i className="fas fa-upload"></i> Importer Excel
            </Button>
            <FileInput
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={saving}
            />
            {importFile && (
              <>
                <FileName>
                  <i className="fas fa-file-excel"></i> {importFile.name}
                </FileName>
                <Button
                  $variant="success"
                  onClick={() => handleImport("interne")}
                  disabled={saving}
                >
                  Démarrer l'import
                </Button>
                <Button
                  $variant="secondary"
                  onClick={() => {
                    setImportFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Annuler
                </Button>
              </>
            )}
          </ImportArea>

          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Nom du document</th>
                  <th>Version</th>
                  <th>Domaine couvert</th>
                  <th>Format</th>
                  <th>Auteur</th>
                  <th>Lieu de classement</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Ligne d'ajout */}
                <tr>
                  <td>
                    <Input
                      placeholder="Nom"
                      value={newInterne.nom || ""}
                      onChange={(e) =>
                        setNewInterne({ ...newInterne, nom: e.target.value })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Version"
                      value={newInterne.version || ""}
                      onChange={(e) =>
                        setNewInterne({
                          ...newInterne,
                          version: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    {renderSelect(
                      newInterne.domaine || "",
                      DOMAINES_INTERNE,
                      (v) => setNewInterne({ ...newInterne, domaine: v }),
                      "Domaine",
                    )}
                  </td>
                  <td>
                    {renderSelect(
                      newInterne.format || "",
                      FORMATS,
                      (v) => setNewInterne({ ...newInterne, format: v }),
                      "Format",
                    )}
                  </td>
                  <td>
                    <Input
                      placeholder="Auteur"
                      value={newInterne.auteur || ""}
                      onChange={(e) =>
                        setNewInterne({ ...newInterne, auteur: e.target.value })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Lieu"
                      value={newInterne.lieu_classement || ""}
                      onChange={(e) =>
                        setNewInterne({
                          ...newInterne,
                          lieu_classement: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Button
                      $variant="success"
                      onClick={addInterne}
                      disabled={saving}
                    >
                      <i className="fas fa-plus"></i>
                    </Button>
                  </td>
                </tr>
                {docInterne.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Input
                        value={d.nom}
                        onChange={(e) =>
                          updateInterne(d.id, "nom", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.version}
                        onChange={(e) =>
                          updateInterne(d.id, "version", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      {renderSelect(d.domaine, DOMAINES_INTERNE, (v) =>
                        updateInterne(d.id, "domaine", v),
                      )}
                    </td>
                    <td>
                      {renderSelect(d.format, FORMATS, (v) =>
                        updateInterne(d.id, "format", v),
                      )}
                    </td>
                    <td>
                      <Input
                        value={d.auteur}
                        onChange={(e) =>
                          updateInterne(d.id, "auteur", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.lieu_classement}
                        onChange={(e) =>
                          updateInterne(d.id, "lieu_classement", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Button
                        $variant="danger"
                        onClick={() => deleteInterne(d.id)}
                        disabled={saving}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>
        </div>
      )}

      {/* Onglet Documentation technique */}
      {activeTab === "technique" && (
        <div>
          <ImportArea>
            <Button
              $variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <i className="fas fa-upload"></i> Importer Excel
            </Button>
            <FileInput
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={saving}
            />
            {importFile && (
              <>
                <FileName>
                  <i className="fas fa-file-excel"></i> {importFile.name}
                </FileName>
                <Button
                  $variant="success"
                  onClick={() => handleImport("technique")}
                  disabled={saving}
                >
                  Démarrer l'import
                </Button>
                <Button
                  $variant="secondary"
                  onClick={() => {
                    setImportFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Annuler
                </Button>
              </>
            )}
          </ImportArea>

          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Nom / Type</th>
                  <th>Support</th>
                  <th>Année/Mise à jour</th>
                  <th>Lieu de classement</th>
                  <th>Thème</th>
                  <th>Adresse site</th>
                  <th>Mots de passe</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Input
                      placeholder="Nom"
                      value={newTechnique.nom || ""}
                      onChange={(e) =>
                        setNewTechnique({
                          ...newTechnique,
                          nom: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    {renderSelect(
                      newTechnique.support || "",
                      SUPPORTS,
                      (v) => setNewTechnique({ ...newTechnique, support: v }),
                      "Support",
                    )}
                  </td>
                  <td>
                    <Input
                      placeholder="Mise à jour"
                      value={newTechnique.mise_a_jour || ""}
                      onChange={(e) =>
                        setNewTechnique({
                          ...newTechnique,
                          mise_a_jour: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Lieu"
                      value={newTechnique.lieu_classement || ""}
                      onChange={(e) =>
                        setNewTechnique({
                          ...newTechnique,
                          lieu_classement: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    {renderSelect(
                      newTechnique.theme || "",
                      THEMES_TECH,
                      (v) => setNewTechnique({ ...newTechnique, theme: v }),
                      "Thème",
                    )}
                  </td>
                  <td>
                    <Input
                      placeholder="Adresse"
                      value={newTechnique.site_adresse || ""}
                      onChange={(e) =>
                        setNewTechnique({
                          ...newTechnique,
                          site_adresse: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Mot de passe"
                      value={newTechnique.site_mot_de_passe || ""}
                      onChange={(e) =>
                        setNewTechnique({
                          ...newTechnique,
                          site_mot_de_passe: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Button
                      $variant="success"
                      onClick={addTechnique}
                      disabled={saving}
                    >
                      <i className="fas fa-plus"></i>
                    </Button>
                  </td>
                </tr>
                {docTechnique.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Input
                        value={d.nom}
                        onChange={(e) =>
                          updateTechnique(d.id, "nom", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      {renderSelect(d.support, SUPPORTS, (v) =>
                        updateTechnique(d.id, "support", v),
                      )}
                    </td>
                    <td>
                      <Input
                        value={d.mise_a_jour}
                        onChange={(e) =>
                          updateTechnique(d.id, "mise_a_jour", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.lieu_classement}
                        onChange={(e) =>
                          updateTechnique(
                            d.id,
                            "lieu_classement",
                            e.target.value,
                          )
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      {renderSelect(d.theme, THEMES_TECH, (v) =>
                        updateTechnique(d.id, "theme", v),
                      )}
                    </td>
                    <td>
                      <Input
                        value={d.site_adresse}
                        onChange={(e) =>
                          updateTechnique(d.id, "site_adresse", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.site_mot_de_passe}
                        onChange={(e) =>
                          updateTechnique(
                            d.id,
                            "site_mot_de_passe",
                            e.target.value,
                          )
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Button
                        $variant="danger"
                        onClick={() => deleteTechnique(d.id)}
                        disabled={saving}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>
        </div>
      )}

      {/* Onglet Archivage */}
      {activeTab === "archivage" && (
        <div>
          <ImportArea>
            <Button
              $variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <i className="fas fa-upload"></i> Importer Excel
            </Button>
            <FileInput
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={saving}
            />
            {importFile && (
              <>
                <FileName>
                  <i className="fas fa-file-excel"></i> {importFile.name}
                </FileName>
                <Button
                  $variant="success"
                  onClick={() => handleImport("archivage")}
                  disabled={saving}
                >
                  Démarrer l'import
                </Button>
                <Button
                  $variant="secondary"
                  onClick={() => {
                    setImportFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Annuler
                </Button>
              </>
            )}
          </ImportArea>

          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Format</th>
                  <th>Métier</th>
                  <th>Quand archiver ?</th>
                  <th>Durée</th>
                  <th>Responsable</th>
                  <th>Lieu de stockage</th>
                  <th>Référence</th>
                  <th>Type de destruction</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Input
                      placeholder="Nom"
                      value={newArchivage.nom || ""}
                      onChange={(e) =>
                        setNewArchivage({
                          ...newArchivage,
                          nom: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    {renderSelect(
                      newArchivage.format || "",
                      FORMATS,
                      (v) => setNewArchivage({ ...newArchivage, format: v }),
                      "Format",
                    )}
                  </td>
                  <td>
                    {renderSelect(
                      newArchivage.metier || "",
                      METIERS,
                      (v) => setNewArchivage({ ...newArchivage, metier: v }),
                      "Métier",
                    )}
                  </td>
                  <td>
                    <Input
                      placeholder="Quand ?"
                      value={newArchivage.quand_archiver || ""}
                      onChange={(e) =>
                        setNewArchivage({
                          ...newArchivage,
                          quand_archiver: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Durée"
                      value={newArchivage.duree || ""}
                      onChange={(e) =>
                        setNewArchivage({
                          ...newArchivage,
                          duree: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Responsable"
                      value={newArchivage.responsable || ""}
                      onChange={(e) =>
                        setNewArchivage({
                          ...newArchivage,
                          responsable: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Lieu"
                      value={newArchivage.lieu_stockage || ""}
                      onChange={(e) =>
                        setNewArchivage({
                          ...newArchivage,
                          lieu_stockage: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Référence"
                      value={newArchivage.reference || ""}
                      onChange={(e) =>
                        setNewArchivage({
                          ...newArchivage,
                          reference: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </td>
                  <td>
                    {renderSelect(
                      newArchivage.type_destruction || "",
                      TYPES_DESTRUCTION,
                      (v) =>
                        setNewArchivage({
                          ...newArchivage,
                          type_destruction: v,
                        }),
                      "Destruction",
                    )}
                  </td>
                  <td>
                    <Button
                      $variant="success"
                      onClick={addArchivage}
                      disabled={saving}
                    >
                      <i className="fas fa-plus"></i>
                    </Button>
                  </td>
                </tr>
                {archivage.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Input
                        value={d.nom}
                        onChange={(e) =>
                          updateArchivage(d.id, "nom", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      {renderSelect(d.format, FORMATS, (v) =>
                        updateArchivage(d.id, "format", v),
                      )}
                    </td>
                    <td>
                      {renderSelect(d.metier, METIERS, (v) =>
                        updateArchivage(d.id, "metier", v),
                      )}
                    </td>
                    <td>
                      <Input
                        value={d.quand_archiver}
                        onChange={(e) =>
                          updateArchivage(
                            d.id,
                            "quand_archiver",
                            e.target.value,
                          )
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.duree}
                        onChange={(e) =>
                          updateArchivage(d.id, "duree", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.responsable}
                        onChange={(e) =>
                          updateArchivage(d.id, "responsable", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.lieu_stockage}
                        onChange={(e) =>
                          updateArchivage(d.id, "lieu_stockage", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <Input
                        value={d.reference}
                        onChange={(e) =>
                          updateArchivage(d.id, "reference", e.target.value)
                        }
                        disabled={saving}
                      />
                    </td>
                    <td>
                      {renderSelect(
                        d.type_destruction,
                        TYPES_DESTRUCTION,
                        (v) => updateArchivage(d.id, "type_destruction", v),
                      )}
                    </td>
                    <td>
                      <Button
                        $variant="danger"
                        onClick={() => deleteArchivage(d.id)}
                        disabled={saving}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>
        </div>
      )}
    </Container>
  );
};

export default GestionDocumentation;
