// src/pages/manuel/GestionTemps.tsx
import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

// ==================== STYLES (inchangés) ====================
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
  td:first-child {
    color: #e2e8f0;
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

const Button = styled.button<{ $variant?: "primary" | "secondary" | "danger" }>`
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ $variant }) => {
    if ($variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    if ($variant === "secondary")
      return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
    if ($variant === "danger")
      return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
    return "background: #1e293b; color: #e2e8f0; &:hover { background: #334155; }";
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ExportButton = styled.button`
  padding: 8px 18px;
  background: #22c55e;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    background: #16a34a;
  }
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

const FilterRow = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: flex-end;
  margin: 16px 0;
  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    label {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    select,
    input {
      padding: 4px 8px;
      border: 1px solid #334155;
      border-radius: 4px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 13px;
      min-width: 150px;
      &:focus {
        outline: none;
        border-color: #4facfe;
      }
    }
  }
`;

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin: 12px 0;
  th,
  td {
    padding: 6px 10px;
    border: 1px solid #1e293b;
    text-align: left;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    background: #1e293b;
  }
  td {
    color: #e2e8f0;
  }
  .total-row {
    font-weight: bold;
    background: #0f172a;
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

const ImportButton = styled(Button)`
  background: #4facfe;
  color: #fff;
  &:hover {
    background: #3b8edb;
  }
`;

const FileName = styled.span`
  color: #94a3b8;
  font-size: 13px;
  flex: 1;
`;

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// ==================== INTERFACES ====================
interface Intervenant {
  id: string;
  nom: string;
  niveau: string;
  taux: number;
}

interface Client {
  id: string;
  name: string; // colonne 'name' en base
  code: string;
}

interface Mission {
  id: string;
  nom: string;
  code: string;
  tasks: string[];
}

interface TimeEntry {
  id: string;
  intervenant_id: string;
  date: string;
  client_code: string;
  duree: number;
  mission_id: string;
  task: string;
  detail: string;
  facturable: "F" | "NF";
  ca_facturable: number;
}

interface MonthData {
  duree: number;
  facturable: number;
  nonFacturable: number;
  ca: number;
}

interface SummaryItem {
  label: string;
  months: Record<number, MonthData>;
  total: MonthData;
}

// ==================== COMPOSANT ====================
const GestionTemps: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "parametres" | "saisie" | "synthese"
  >("saisie");

  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Partial<TimeEntry>>({});

  const [filterClient, setFilterClient] = useState<string>("");
  const [filterIntervenant, setFilterIntervenant] = useState<string>("");
  const [filterMission, setFilterMission] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [intervRes, clientRes, missRes, entriesRes] = await Promise.all([
        supabase.from("intervenants").select("*").order("nom"),
        supabase.from("clients").select("*").order("name"),
        supabase.from("missions").select("*").order("nom"),
        supabase
          .from("time_entries")
          .select("*")
          .order("date", { ascending: false }),
      ]);
      if (intervRes.error) throw intervRes.error;
      if (clientRes.error) throw clientRes.error;
      if (missRes.error) throw missRes.error;
      if (entriesRes.error) throw entriesRes.error;
      setIntervenants(intervRes.data || []);
      setClients(clientRes.data || []);
      setMissions(missRes.data || []);
      setTimeEntries(entriesRes.data || []);
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

  // ===== PARAMÈTRES =====
  const addIntervenant = async (nom: string, niveau: string, taux: number) => {
    if (!nom || !niveau || taux <= 0) return;
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("intervenants")
        .insert([{ nom, niveau, taux }])
        .select()
        .single();
      if (error) throw error;
      setIntervenants([...intervenants, data]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteIntervenant = async (id: string) => {
    if (!window.confirm("Supprimer cet intervenant ?")) return;
    try {
      setSaving(true);
      await supabase.from("intervenants").delete().eq("id", id);
      setIntervenants(intervenants.filter((i) => i.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addClient = async (name: string, code: string) => {
    if (!name || !code) return;
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("clients")
        .insert([{ name, code }])
        .select()
        .single();
      if (error) throw error;
      setClients([...clients, data]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!window.confirm("Supprimer ce client ?")) return;
    try {
      setSaving(true);
      await supabase.from("clients").delete().eq("id", id);
      setClients(clients.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addMission = async (nom: string, code: string, tasks: string[]) => {
    if (!nom || !code) return;
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("missions")
        .insert([{ nom, code, tasks }])
        .select()
        .single();
      if (error) throw error;
      setMissions([...missions, data]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMission = async (id: string) => {
    if (!window.confirm("Supprimer cette mission ?")) return;
    try {
      setSaving(true);
      await supabase.from("missions").delete().eq("id", id);
      setMissions(missions.filter((m) => m.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== SAISIE =====
  const handleEntryChange = (field: keyof TimeEntry, value: any) => {
    setNewEntry((prev) => ({ ...prev, [field]: value }));
  };

  const calculateCA = (entry: Partial<TimeEntry>): number => {
    if (entry.facturable === "NF") return 0;
    const intervenant = intervenants.find((i) => i.id === entry.intervenant_id);
    if (!intervenant) return 0;
    return (entry.duree || 0) * intervenant.taux;
  };

  const addTimeEntry = async () => {
    if (
      !newEntry.intervenant_id ||
      !newEntry.date ||
      !newEntry.client_code ||
      !newEntry.duree ||
      !newEntry.mission_id
    ) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    const ca = calculateCA(newEntry);
    const entryToInsert = {
      ...newEntry,
      ca_facturable: ca,
      facturable: newEntry.facturable || "F",
    };
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("time_entries")
        .insert([entryToInsert])
        .select()
        .single();
      if (error) throw error;
      setTimeEntries([data, ...timeEntries]);
      setNewEntry({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTimeEntry = async (id: string) => {
    if (!window.confirm("Supprimer cette ligne ?")) return;
    try {
      setSaving(true);
      await supabase.from("time_entries").delete().eq("id", id);
      setTimeEntries(timeEntries.filter((e) => e.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== IMPORT =====
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

  const handleImport = async () => {
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
        const normalized = col.trim().toLowerCase();
        if (normalized.includes("intervenant")) colMap.intervenant = idx;
        else if (normalized.includes("date")) colMap.date = idx;
        else if (normalized.includes("client")) colMap.client = idx;
        else if (normalized.includes("durée") || normalized.includes("duree"))
          colMap.duree = idx;
        else if (normalized.includes("mission")) colMap.mission = idx;
        else if (normalized.includes("tâche") || normalized.includes("tache"))
          colMap.task = idx;
        else if (normalized.includes("détail") || normalized.includes("detail"))
          colMap.detail = idx;
        else if (
          normalized.includes("f/nf") ||
          normalized.includes("facturable")
        )
          colMap.facturable = idx;
      });

      const required = ["intervenant", "date", "client", "duree"];
      const missing = required.filter((r) => !(r in colMap));
      if (missing.length > 0) {
        alert(`Colonnes obligatoires manquantes : ${missing.join(", ")}`);
        return;
      }

      // Mappings
      const intervenantsMap: Record<string, string> = {};
      intervenants.forEach((i) => (intervenantsMap[i.nom] = i.id));
      const clientsMap: Record<string, string> = {};
      clients.forEach((c) => (clientsMap[c.name] = c.code));
      const missionsMap: Record<string, string> = {};
      missions.forEach((m) => (missionsMap[m.nom] = m.id));

      const newEntries: any[] = [];
      let hasError = false;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0) continue;
        const intervenantName =
          row[colMap.intervenant]?.toString().trim() || "";
        const dateStr = row[colMap.date]?.toString().trim() || "";
        const clientName = row[colMap.client]?.toString().trim() || "";
        const duree = parseFloat(row[colMap.duree]?.toString().trim()) || 0;
        const missionName = row[colMap.mission]?.toString().trim() || "";
        const task = row[colMap.task]?.toString().trim() || "";
        const detail = row[colMap.detail]?.toString().trim() || "";
        const facturable =
          row[colMap.facturable]?.toString().trim().toUpperCase() || "F";

        if (!intervenantName || !dateStr || !clientName || duree <= 0) continue;

        const intervenantId = intervenantsMap[intervenantName];
        const clientCode = clientsMap[clientName];
        const missionId = missionsMap[missionName];
        if (!intervenantId) {
          alert(`Intervenant "${intervenantName}" inconnu`);
          hasError = true;
          break;
        }
        if (!clientCode) {
          alert(`Client "${clientName}" inconnu`);
          hasError = true;
          break;
        }
        if (!missionId) {
          alert(`Mission "${missionName}" inconnue`);
          hasError = true;
          break;
        }

        let dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
          const serial = parseFloat(dateStr);
          if (!isNaN(serial)) {
            dateObj = new Date((serial - 25569) * 86400 * 1000);
          }
        }
        const dateISO = dateObj.toISOString().split("T")[0];
        if (!dateISO) continue;

        const facturableFlag = facturable === "NF" ? "NF" : "F";

        newEntries.push({
          intervenant_id: intervenantId,
          date: dateISO,
          client_code: clientCode,
          duree: duree,
          mission_id: missionId,
          task: task,
          detail: detail,
          facturable: facturableFlag,
          ca_facturable: 0, // sera recalculé après insertion (trigger ou à la main)
        });
      }

      if (hasError || newEntries.length === 0) {
        if (!hasError) alert("Aucune ligne valide à importer.");
        return;
      }

      const { data: inserted, error } = await supabase
        .from("time_entries")
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

  // ===== SYNTHÈSE =====
  const getIntervenantName = (id: string) => {
    const i = intervenants.find((iv) => iv.id === id);
    return i ? i.nom : "";
  };

  const getMissionName = (id: string) => {
    const m = missions.find((mi) => mi.id === id);
    return m ? m.nom : "";
  };

  const filteredEntries = timeEntries.filter((e) => {
    if (filterClient && e.client_code !== filterClient) return false;
    if (filterIntervenant && e.intervenant_id !== filterIntervenant)
      return false;
    if (filterMission && e.mission_id !== filterMission) return false;
    return true;
  });

  const buildMonthlySummary = (
    entries: TimeEntry[],
    groupBy: "client" | "intervenant" | "client_intervenant",
  ): SummaryItem[] => {
    const map: Record<string, SummaryItem> = {};

    entries.forEach((e) => {
      const month = new Date(e.date).getMonth() + 1;
      const key =
        groupBy === "client"
          ? e.client_code
          : groupBy === "intervenant"
            ? e.intervenant_id
            : `${e.client_code}_${e.intervenant_id}`;
      if (!map[key]) {
        map[key] = {
          label:
            groupBy === "client"
              ? e.client_code
              : groupBy === "intervenant"
                ? getIntervenantName(e.intervenant_id)
                : `${e.client_code} - ${getIntervenantName(e.intervenant_id)}`,
          months: {},
          total: { duree: 0, facturable: 0, nonFacturable: 0, ca: 0 },
        };
      }
      if (!map[key].months[month]) {
        map[key].months[month] = {
          duree: 0,
          facturable: 0,
          nonFacturable: 0,
          ca: 0,
        };
      }
      const m = map[key].months[month];
      m.duree += e.duree;
      if (e.facturable === "F") {
        m.facturable += e.duree;
        m.ca += e.ca_facturable || 0;
      } else {
        m.nonFacturable += e.duree;
      }
      map[key].total.duree += e.duree;
      map[key].total.facturable += e.facturable === "F" ? e.duree : 0;
      map[key].total.nonFacturable += e.facturable === "NF" ? e.duree : 0;
      map[key].total.ca += e.ca_facturable || 0;
    });

    return Object.values(map);
  };

  const getMissionSummary = (entries: TimeEntry[]) => {
    const missionMap: Record<string, { ca: number }> = {};
    entries.forEach((e) => {
      const missionName = getMissionName(e.mission_id) || "Non défini";
      if (!missionMap[missionName]) missionMap[missionName] = { ca: 0 };
      missionMap[missionName].ca += e.ca_facturable || 0;
    });
    return Object.entries(missionMap).map(([mission, { ca }]) => ({
      mission,
      ca,
    }));
  };

  // ===== EXPORT =====
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const rows: any[] = [
      ["Gestion des temps - Saisie"],
      [],
      [
        "Intervenant",
        "Date",
        "Client",
        "Durée (h)",
        "Mission",
        "Tâche",
        "Détail",
        "F/NF",
        "CA facturable",
      ],
    ];
    timeEntries.forEach((e) => {
      rows.push([
        getIntervenantName(e.intervenant_id),
        new Date(e.date).toLocaleDateString("fr-FR"),
        e.client_code,
        e.duree,
        getMissionName(e.mission_id),
        e.task,
        e.detail,
        e.facturable,
        e.ca_facturable ? `${e.ca_facturable} FCFA` : "0 FCFA",
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Saisie");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Gestion_temps.xlsx";
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

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-clock"></i> Gestion des temps
        </HeaderTitle>
        <ExportButton onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> Exporter Excel
        </ExportButton>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Saisissez les temps d'intervention des collaborateurs. Le CA facturable
        est calculé automatiquement en fonction du taux horaire de
        l'intervenant.
      </Description>

      {error && (
        <ErrorContainer>
          <i className="fas fa-exclamation-circle"></i> {error}
        </ErrorContainer>
      )}

      <TabsContainer>
        <TabButton
          $active={activeTab === "parametres"}
          onClick={() => setActiveTab("parametres")}
        >
          <i className="fas fa-cogs"></i> Paramètres
        </TabButton>
        <TabButton
          $active={activeTab === "saisie"}
          onClick={() => setActiveTab("saisie")}
        >
          <i className="fas fa-pen"></i> Saisie des temps
        </TabButton>
        <TabButton
          $active={activeTab === "synthese"}
          onClick={() => setActiveTab("synthese")}
        >
          <i className="fas fa-chart-bar"></i> Synthèse
        </TabButton>
      </TabsContainer>

      {activeTab === "parametres" && (
        <div>
          <h3 style={{ color: "#4facfe", marginBottom: "12px" }}>
            <i className="fas fa-user-cog"></i> Intervenants
          </h3>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <Input
              placeholder="Nom"
              id="intervNom"
              style={{ width: "150px" }}
            />
            <Input
              placeholder="Niveau"
              id="intervNiveau"
              style={{ width: "100px" }}
            />
            <Input
              placeholder="Taux horaire (FCFA)"
              id="intervTaux"
              style={{ width: "150px" }}
              type="number"
            />
            <Button
              $variant="primary"
              disabled={saving}
              onClick={() => {
                const nom = (
                  document.getElementById("intervNom") as HTMLInputElement
                ).value;
                const niveau = (
                  document.getElementById("intervNiveau") as HTMLInputElement
                ).value;
                const taux = parseFloat(
                  (document.getElementById("intervTaux") as HTMLInputElement)
                    .value,
                );
                addIntervenant(nom, niveau, taux);
              }}
            >
              Ajouter
            </Button>
          </div>
          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Niveau</th>
                  <th>Taux (FCFA)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {intervenants.map((i) => (
                  <tr key={i.id}>
                    <td>{i.nom}</td>
                    <td>{i.niveau}</td>
                    <td>{i.taux}</td>
                    <td>
                      <Button
                        $variant="danger"
                        disabled={saving}
                        onClick={() => deleteIntervenant(i.id)}
                      >
                        Suppr.
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>

          <h3 style={{ color: "#4facfe", margin: "24px 0 12px" }}>
            <i className="fas fa-users"></i> Clients
          </h3>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <Input
              placeholder="Nom du client"
              id="clientNom"
              style={{ width: "200px" }}
            />
            <Input
              placeholder="Code client"
              id="clientCode"
              style={{ width: "100px" }}
            />
            <Button
              $variant="primary"
              disabled={saving}
              onClick={() => {
                const name = (
                  document.getElementById("clientNom") as HTMLInputElement
                ).value;
                const code = (
                  document.getElementById("clientCode") as HTMLInputElement
                ).value;
                addClient(name, code);
              }}
            >
              Ajouter
            </Button>
          </div>
          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.code}</td>
                    <td>
                      <Button
                        $variant="danger"
                        disabled={saving}
                        onClick={() => deleteClient(c.id)}
                      >
                        Suppr.
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>

          <h3 style={{ color: "#4facfe", margin: "24px 0 12px" }}>
            <i className="fas fa-tasks"></i> Missions
          </h3>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <Input
              placeholder="Nom de la mission"
              id="missionNom"
              style={{ width: "200px" }}
            />
            <Input
              placeholder="Code mission"
              id="missionCode"
              style={{ width: "100px" }}
            />
            <Input
              placeholder="Tâches (séparées par ;)"
              id="missionTasks"
              style={{ width: "250px" }}
            />
            <Button
              $variant="primary"
              disabled={saving}
              onClick={() => {
                const nom = (
                  document.getElementById("missionNom") as HTMLInputElement
                ).value;
                const code = (
                  document.getElementById("missionCode") as HTMLInputElement
                ).value;
                const tasksStr = (
                  document.getElementById("missionTasks") as HTMLInputElement
                ).value;
                const tasks = tasksStr
                  .split(";")
                  .map((t) => t.trim())
                  .filter((t) => t);
                addMission(nom, code, tasks);
              }}
            >
              Ajouter
            </Button>
          </div>
          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Tâches</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nom}</td>
                    <td>{m.code}</td>
                    <td>{m.tasks.join(", ")}</td>
                    <td>
                      <Button
                        $variant="danger"
                        disabled={saving}
                        onClick={() => deleteMission(m.id)}
                      >
                        Suppr.
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>
        </div>
      )}

      {activeTab === "saisie" && (
        <div>
          <ImportArea>
            <ImportButton
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <i className="fas fa-upload"></i> Importer Excel
            </ImportButton>
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
                  $variant="primary"
                  onClick={handleImport}
                  disabled={saving}
                >
                  <i className="fas fa-play"></i> Démarrer l'import
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

          <div
            style={{
              marginBottom: "16px",
              background: "#1e293b",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            <h4 style={{ color: "#94a3b8", marginBottom: "8px" }}>
              Nouvelle ligne
            </h4>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <StyledSelect
                value={newEntry.intervenant_id || ""}
                onChange={(e) =>
                  handleEntryChange("intervenant_id", e.target.value)
                }
                disabled={saving}
              >
                <option value="">Intervenant</option>
                {intervenants.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nom}
                  </option>
                ))}
              </StyledSelect>
              <Input
                type="date"
                value={newEntry.date || ""}
                onChange={(e) => handleEntryChange("date", e.target.value)}
                disabled={saving}
                style={{ width: "130px" }}
              />
              <StyledSelect
                value={newEntry.client_code || ""}
                onChange={(e) =>
                  handleEntryChange("client_code", e.target.value)
                }
                disabled={saving}
              >
                <option value="">Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </StyledSelect>
              <Input
                type="number"
                step="0.25"
                min="0"
                placeholder="Durée (h)"
                value={newEntry.duree || ""}
                onChange={(e) =>
                  handleEntryChange("duree", parseFloat(e.target.value) || 0)
                }
                disabled={saving}
                style={{ width: "100px" }}
              />
              <StyledSelect
                value={newEntry.mission_id || ""}
                onChange={(e) =>
                  handleEntryChange("mission_id", e.target.value)
                }
                disabled={saving}
              >
                <option value="">Mission</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </StyledSelect>
              <StyledSelect
                value={newEntry.task || ""}
                onChange={(e) => handleEntryChange("task", e.target.value)}
                disabled={saving || !newEntry.mission_id}
              >
                <option value="">Tâche</option>
                {newEntry.mission_id &&
                  missions
                    .find((m) => m.id === newEntry.mission_id)
                    ?.tasks.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
              </StyledSelect>
              <Input
                placeholder="Détail"
                value={newEntry.detail || ""}
                onChange={(e) => handleEntryChange("detail", e.target.value)}
                disabled={saving}
                style={{ width: "150px" }}
              />
              <StyledSelect
                value={newEntry.facturable || "F"}
                onChange={(e) =>
                  handleEntryChange("facturable", e.target.value as "F" | "NF")
                }
                disabled={saving}
              >
                <option value="F">Facturable</option>
                <option value="NF">Non facturable</option>
              </StyledSelect>
              <Button
                $variant="primary"
                disabled={saving}
                onClick={addTimeEntry}
              >
                <i className="fas fa-plus"></i> Ajouter
              </Button>
            </div>
            {newEntry.intervenant_id && newEntry.duree && (
              <div
                style={{ marginTop: "8px", color: "#4facfe", fontSize: "13px" }}
              >
                CA facturable estimé : {calculateCA(newEntry)} FCFA
              </div>
            )}
          </div>

          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Intervenant</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Durée</th>
                  <th>Mission</th>
                  <th>Tâche</th>
                  <th>Détail</th>
                  <th>F/NF</th>
                  <th>CA facturable</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{getIntervenantName(e.intervenant_id)}</td>
                    <td>{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                    <td>{e.client_code}</td>
                    <td>{e.duree}</td>
                    <td>{getMissionName(e.mission_id)}</td>
                    <td>{e.task}</td>
                    <td>{e.detail}</td>
                    <td>{e.facturable}</td>
                    <td>
                      {e.ca_facturable ? `${e.ca_facturable} FCFA` : "0 FCFA"}
                    </td>
                    <td>
                      <Button
                        $variant="danger"
                        disabled={saving}
                        onClick={() => deleteTimeEntry(e.id)}
                      >
                        Suppr.
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>
        </div>
      )}

      {activeTab === "synthese" && (
        <div>
          <FilterRow>
            <div>
              <label>Client</label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              >
                <option value="">Tous</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Intervenant</label>
              <select
                value={filterIntervenant}
                onChange={(e) => setFilterIntervenant(e.target.value)}
              >
                <option value="">Tous</option>
                {intervenants.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Mission</label>
              <select
                value={filterMission}
                onChange={(e) => setFilterMission(e.target.value)}
              >
                <option value="">Toutes</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button
                $variant="primary"
                onClick={() => {
                  setFilterClient("");
                  setFilterIntervenant("");
                  setFilterMission("");
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </FilterRow>

          <h4 style={{ color: "#94a3b8", marginTop: "20px" }}>
            Synthèse par client
          </h4>
          {(() => {
            const data = buildMonthlySummary(filteredEntries, "client");
            if (data.length === 0) return <p>Aucune donnée.</p>;
            return (
              <TableWrapper>
                <SummaryTable>
                  <thead>
                    <tr>
                      <th>Client</th>
                      {MONTHS.map((m, idx) => (
                        <th
                          key={idx}
                          colSpan={4}
                          style={{ textAlign: "center" }}
                        >
                          {m}
                        </th>
                      ))}
                      <th colSpan={4} style={{ textAlign: "center" }}>
                        Total
                      </th>
                    </tr>
                    <tr>
                      <th></th>
                      {MONTHS.map((_, idx) => (
                        <React.Fragment key={idx}>
                          <th style={{ fontSize: "9px" }}>Tps</th>
                          <th style={{ fontSize: "9px" }}>Fact.</th>
                          <th style={{ fontSize: "9px" }}>NF</th>
                          <th style={{ fontSize: "9px" }}>CA</th>
                        </React.Fragment>
                      ))}
                      <th style={{ fontSize: "9px" }}>Tps</th>
                      <th style={{ fontSize: "9px" }}>Fact.</th>
                      <th style={{ fontSize: "9px" }}>NF</th>
                      <th style={{ fontSize: "9px" }}>CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.label}>
                        <td>
                          <strong>{row.label}</strong>
                        </td>
                        {MONTHS.map((_, idx) => {
                          const m = row.months[idx + 1] || {
                            duree: 0,
                            facturable: 0,
                            nonFacturable: 0,
                            ca: 0,
                          };
                          return (
                            <React.Fragment key={idx}>
                              <td>{m.duree.toFixed(1)}</td>
                              <td>{m.facturable.toFixed(1)}</td>
                              <td>{m.nonFacturable.toFixed(1)}</td>
                              <td>{m.ca ? `${m.ca} FCFA` : "-"}</td>
                            </React.Fragment>
                          );
                        })}
                        <td>{row.total.duree.toFixed(1)}</td>
                        <td>{row.total.facturable.toFixed(1)}</td>
                        <td>{row.total.nonFacturable.toFixed(1)}</td>
                        <td>{row.total.ca ? `${row.total.ca} FCFA` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </SummaryTable>
              </TableWrapper>
            );
          })()}

          <h4 style={{ color: "#94a3b8", marginTop: "30px" }}>
            Synthèse par intervenant
          </h4>
          {(() => {
            const data = buildMonthlySummary(filteredEntries, "intervenant");
            if (data.length === 0) return <p>Aucune donnée.</p>;
            return (
              <TableWrapper>
                <SummaryTable>
                  <thead>
                    <tr>
                      <th>Intervenant</th>
                      {MONTHS.map((m, idx) => (
                        <th
                          key={idx}
                          colSpan={4}
                          style={{ textAlign: "center" }}
                        >
                          {m}
                        </th>
                      ))}
                      <th colSpan={4} style={{ textAlign: "center" }}>
                        Total
                      </th>
                    </tr>
                    <tr>
                      <th></th>
                      {MONTHS.map((_, idx) => (
                        <React.Fragment key={idx}>
                          <th style={{ fontSize: "9px" }}>Tps</th>
                          <th style={{ fontSize: "9px" }}>Fact.</th>
                          <th style={{ fontSize: "9px" }}>NF</th>
                          <th style={{ fontSize: "9px" }}>CA</th>
                        </React.Fragment>
                      ))}
                      <th style={{ fontSize: "9px" }}>Tps</th>
                      <th style={{ fontSize: "9px" }}>Fact.</th>
                      <th style={{ fontSize: "9px" }}>NF</th>
                      <th style={{ fontSize: "9px" }}>CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.label}>
                        <td>
                          <strong>{row.label}</strong>
                        </td>
                        {MONTHS.map((_, idx) => {
                          const m = row.months[idx + 1] || {
                            duree: 0,
                            facturable: 0,
                            nonFacturable: 0,
                            ca: 0,
                          };
                          return (
                            <React.Fragment key={idx}>
                              <td>{m.duree.toFixed(1)}</td>
                              <td>{m.facturable.toFixed(1)}</td>
                              <td>{m.nonFacturable.toFixed(1)}</td>
                              <td>{m.ca ? `${m.ca} FCFA` : "-"}</td>
                            </React.Fragment>
                          );
                        })}
                        <td>{row.total.duree.toFixed(1)}</td>
                        <td>{row.total.facturable.toFixed(1)}</td>
                        <td>{row.total.nonFacturable.toFixed(1)}</td>
                        <td>{row.total.ca ? `${row.total.ca} FCFA` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </SummaryTable>
              </TableWrapper>
            );
          })()}

          <h4 style={{ color: "#94a3b8", marginTop: "30px" }}>
            Synthèse par type de mission
          </h4>
          {(() => {
            const data = getMissionSummary(filteredEntries);
            if (data.length === 0) return <p>Aucune donnée.</p>;
            return (
              <TableWrapper>
                <SummaryTable>
                  <thead>
                    <tr>
                      <th>Mission</th>
                      <th>CA facturable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr key={item.mission}>
                        <td>{item.mission}</td>
                        <td>{item.ca ? `${item.ca} FCFA` : "0 FCFA"}</td>
                      </tr>
                    ))}
                  </tbody>
                </SummaryTable>
              </TableWrapper>
            );
          })()}
        </div>
      )}
    </Container>
  );
};

export default GestionTemps;
