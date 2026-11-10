// src/pages/cac/CACFollowUpPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCountry } from "../../contexts/CountryContext";
import MissionTypeSelector from "./MissionTypeSelector";
import {
  Plus,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Users,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

// ----- Types -----
type Task = {
  id: string;
  task_code: string;
  task_name: string;
  category: string;
  display_order: number;
  is_header: boolean;
};

type TeamMember = {
  full_name: string;
};

type ClientInfo = {
  id: string;
  name: string;
  client_code: string;
};

type CellData = {
  assignment_id: string;
  production: string;
  supervision: string;
  status: string;
  progress_percentage: number;
};

const PIE_COLORS = ["#10b981", "#f59e0b", "#94a3b8", "#1e293b"];

// ----- Composant principal -----
export default function CACFollowUpPage() {
  const { user } = useAuth();
  const { selectedCountry } = useCountry();

  const [missionTypeId, setMissionTypeId] = useState<number>(1);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedClients, setSelectedClients] = useState<ClientInfo[]>([]);
  const [allClients, setAllClients] = useState<ClientInfo[]>([]);
  const [cellData, setCellData] = useState<Record<string, CellData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [showCharts, setShowCharts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cellKey = (taskId: string, clientId: string) =>
    `${taskId}__${clientId}`;

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!selectedCountry?.code) {
      setLoading(false);
      setError("Pays non sélectionné.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: taskData, error: taskError } = await supabase
        .from("audit_tasks")
        .select("*")
        .eq("mission_type_id", missionTypeId)
        .eq("is_active", true)
        .order("display_order");

      if (taskError) {
        console.error("❌ Erreur chargement tâches :", taskError);
        setError("Erreur chargement tâches : " + taskError.message);
        setLoading(false);
        return;
      }
      setTasks((taskData || []) as Task[]);

      const { data: members, error: membersError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("active", true)
        .order("full_name");

      if (membersError) {
        console.error("❌ Erreur chargement membres :", membersError);
      }
      setTeamMembers((members || []) as TeamMember[]);

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, client_code")
        .eq("country", "CMR")
        .order("client_code");

      if (clientError) {
        console.error("❌ Erreur chargement clients :", clientError);
        setError("Erreur chargement clients : " + clientError.message);
        setLoading(false);
        return;
      }

      console.log("✅ Clients chargés :", clientData?.length);
      setAllClients((clientData || []) as ClientInfo[]);

      const storageKey = `cac_clients_CMR_${missionTypeId}`;
      const savedIds: string[] = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );

      const clientIds =
        savedIds.length > 0
          ? savedIds
          : (clientData || []).slice(0, 5).map((c) => c.id);

      const activeClients = (clientData || []).filter((c) =>
        clientIds.includes(c.id),
      );
      setSelectedClients(activeClients);

      if (clientIds.length > 0 && (taskData || []).length > 0) {
        const { data: assignData, error: assignError } = await supabase
          .from("audit_mission_assignments")
          .select(
            "id, task_id, client_id, production_responsible, supervision_responsible, status, progress_percentage",
          )
          .eq("mission_type_id", missionTypeId)
          .in("client_id", clientIds);

        if (assignError) {
          console.error("❌ Erreur chargement assignations :", assignError);
          setError("Erreur chargement assignations : " + assignError.message);
          setLoading(false);
          return;
        }

        const map: Record<string, CellData> = {};
        for (const a of assignData || []) {
          const key = cellKey(a.task_id, a.client_id);
          map[key] = {
            assignment_id: a.id,
            production: (a.production_responsible || [])[0] || "",
            supervision: (a.supervision_responsible || [])[0] || "",
            status: a.status || "not_started",
            progress_percentage: a.progress_percentage || 0,
          };
        }

        const existingKeys = new Set(Object.keys(map));
        const missing: { client_id: string; task_id: string }[] = [];
        for (const cId of clientIds) {
          for (const t of (taskData || []) as Task[]) {
            if (!t.is_header) {
              const k = cellKey(t.id, cId);
              if (!existingKeys.has(k)) {
                missing.push({ client_id: cId, task_id: t.id });
              }
            }
          }
        }

        if (missing.length > 0) {
          const inserts = missing.map((m) => ({
            client_id: m.client_id,
            mission_type_id: missionTypeId,
            task_id: m.task_id,
            production_responsible: [],
            supervision_responsible: [],
            status: "not_started",
            progress_percentage: 0,
            comments: "",
          }));
          const { data: newAssign, error: insertError } = await supabase
            .from("audit_mission_assignments")
            .insert(inserts)
            .select(
              "id, task_id, client_id, production_responsible, supervision_responsible, status, progress_percentage",
            );

          if (insertError) {
            console.error("❌ Erreur insertion assignations :", insertError);
            setError("Erreur insertion assignations : " + insertError.message);
            setLoading(false);
            return;
          }

          for (const a of newAssign || []) {
            const key = cellKey(a.task_id, a.client_id);
            map[key] = {
              assignment_id: a.id,
              production: (a.production_responsible || [])[0] || "",
              supervision: (a.supervision_responsible || [])[0] || "",
              status: a.status || "not_started",
              progress_percentage: a.progress_percentage || 0,
            };
          }
        }

        setCellData(map);
      }

      setDirty(false);
    } catch (err) {
      console.error("❌ Erreur générale de chargement:", err);
      setError("Impossible de charger les données. Veuillez rafraîchir.");
    } finally {
      setLoading(false);
    }
  }, [missionTypeId, selectedCountry, user]);

  useEffect(() => {
    load();
  }, [load]);

  function addClient(client: ClientInfo) {
    setSelectedClients((prev) => {
      const next = [...prev, client];
      const storageKey = `cac_clients_CMR_${missionTypeId}`;
      localStorage.setItem(storageKey, JSON.stringify(next.map((c) => c.id)));
      return next;
    });
    setShowAddModal(false);
    setAddSearch("");
    setTimeout(() => load(), 100);
  }

  function removeClient(clientId: string) {
    setSelectedClients((prev) => {
      const next = prev.filter((c) => c.id !== clientId);
      const storageKey = `cac_clients_CMR_${missionTypeId}`;
      localStorage.setItem(storageKey, JSON.stringify(next.map((c) => c.id)));
      return next;
    });
  }

  function updateCell(key: string, field: keyof CellData, value: any) {
    setCellData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setDirty(true);
    setError(null);
  }

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const updates = Object.entries(cellData);
      if (updates.length === 0) {
        setSaving(false);
        return;
      }

      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async ([, cell]) => {
            const { error } = await supabase
              .from("audit_mission_assignments")
              .update({
                production_responsible: cell.production
                  ? [cell.production]
                  : [],
                supervision_responsible: cell.supervision
                  ? [cell.supervision]
                  : [],
                status: cell.status,
                progress_percentage: cell.progress_percentage,
                last_updated_by: user?.id || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", cell.assignment_id);
            if (error) throw error;
          }),
        );
      }

      setDirty(false);
    } catch (err) {
      console.error("❌ Erreur lors de la sauvegarde :", err);
      setError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  const categories: string[] = [];
  const tasksByCategory: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (!tasksByCategory[t.category]) {
      tasksByCategory[t.category] = [];
      categories.push(t.category);
    }
    tasksByCategory[t.category].push(t);
  }

  const clientProgress = selectedClients.map((c) => {
    let applicable = 0;
    let done = 0;
    for (const t of tasks) {
      if (t.is_header) continue;
      const key = cellKey(t.id, c.id);
      const cell = cellData[key];
      if (!cell) continue;
      if (cell.status !== "n_a") {
        applicable++;
        if (cell.status === "completed") done += 100;
        else if (cell.status === "in_progress")
          done += cell.progress_percentage || 0;
      }
    }
    return { ...c, pct: applicable > 0 ? Math.round(done / applicable) : 0 };
  });

  const totalCompleted = Object.values(cellData).filter(
    (c) => c.status === "completed",
  ).length;
  const totalInProgress = Object.values(cellData).filter(
    (c) => c.status === "in_progress",
  ).length;
  const totalNotStarted = Object.values(cellData).filter(
    (c) => c.status === "not_started",
  ).length;
  const totalNA = Object.values(cellData).filter(
    (c) => c.status === "n_a",
  ).length;

  const pieData = [
    { name: "Achevé", value: totalCompleted },
    { name: "En cours", value: totalInProgress },
    { name: "Non commencé", value: totalNotStarted },
    { name: "N/A", value: totalNA },
  ].filter((d) => d.value > 0);

  const barData = [...clientProgress]
    .sort((a, b) => b.pct - a.pct)
    .map((c) => ({
      name: c.name.length > 12 ? c.name.slice(0, 12) + "..." : c.name,
      progress: c.pct,
    }));

  const avgProgress =
    clientProgress.length > 0
      ? Math.round(
          clientProgress.reduce((s, c) => s + c.pct, 0) / clientProgress.length,
        )
      : 0;
  const completedClients = clientProgress.filter((c) => c.pct === 100).length;
  const overdueClients = clientProgress.filter((c) => c.pct < 50).length;

  function getCellBg(status: string): string {
    if (status === "completed") return "bg-green-100";
    if (status === "in_progress") return "bg-yellow-100";
    if (status === "n_a") return "bg-slate-800";
    return "bg-slate-50";
  }

  function getCellText(status: string): string {
    if (status === "n_a") return "text-white";
    if (status === "completed") return "text-green-800";
    if (status === "in_progress") return "text-yellow-800";
    return "text-slate-400";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* En‑tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Suivi des missions CAC
          </h1>
          <p className="text-slate-300 text-sm mt-0.5">
            {selectedCountry?.flag || "🏳️"} {selectedCountry?.name || "Pays"} ·
            TABLEAU DE SUIVI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MissionTypeSelector
            selected={missionTypeId}
            onChange={(id: number) => {
              setMissionTypeId(id);
            }}
          />
          {/* ✅ WRAPPED: Ajouter client */}
          <ProtectedAction module="suivi_cac" action="create">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2a4f7f] transition-all shadow-sm"
            >
              <Plus size={16} />
              Ajouter client
            </button>
          </ProtectedAction>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md border border-red-300 text-sm">
          <AlertCircle className="inline-block w-4 h-4 mr-1" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Clients suivis",
            value: selectedClients.length,
            icon: Users,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Progression moy.",
            value: `${avgProgress}%`,
            icon: TrendingUp,
            color: "bg-teal-50 text-teal-600",
          },
          {
            label: "Missions achevées",
            value: completedClients,
            icon: Check,
            color: "bg-green-50 text-green-600",
          },
          {
            label: "En retard",
            value: overdueClients,
            icon: AlertCircle,
            color: "bg-red-50 text-red-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}
            >
              <Icon size={20} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          {showCharts ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Graphiques
        </button>
        {/* ✅ WRAPPED: Enregistrer */}
        <ProtectedAction module="suivi_cac" action="edit">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2a4f7f] disabled:opacity-50 transition-all"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Enregistrer
          </button>
        </ProtectedAction>
      </div>

      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">
              Progression par client
            </h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar
                    dataKey="progress"
                    fill="#1e3a5f"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">
                Aucune donnée
              </p>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">
              Répartition des statuts
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Tooltip formatter={(value) => `${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">
                Aucune donnée
              </p>
            )}
          </div>
        </div>
      )}

      <datalist id="teamMembersList">
        <option value="">--</option>
        {teamMembers.map((m) => (
          <option key={m.full_name} value={m.full_name}>
            {m.full_name}
          </option>
        ))}
      </datalist>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="text-left px-3 py-3 font-semibold uppercase tracking-wider sticky left-0 bg-[#1e3a5f] z-10 min-w-[200px]">
                Tâches
              </th>
              {selectedClients.map((c) => (
                <th
                  key={c.id}
                  className="text-center px-2 py-3 font-semibold min-w-[140px] relative"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono opacity-60">
                      {c.client_code}
                    </span>
                    <span className="text-xs truncate max-w-[120px]">
                      {c.name}
                    </span>
                  </div>
                  {/* ✅ WRAPPED: Remove client (delete) */}
                  <ProtectedAction module="suivi_cac" action="delete">
                    <button
                      onClick={() => removeClient(c.id)}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Retirer ce client"
                    >
                      <X size={8} />
                    </button>
                  </ProtectedAction>
                </th>
              ))}
            </tr>
            <tr className="bg-[#2a4f7f] text-white/80">
              <th className="text-left px-3 py-2 font-medium sticky left-0 bg-[#2a4f7f] z-10"></th>
              {selectedClients.map((c) => (
                <th key={c.id} className="px-1 py-0">
                  <div className="flex border-b border-white/10">
                    <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">
                      P
                    </div>
                    <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider">
                      S
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => {
              const catTasks = tasksByCategory[cat] || [];
              const headerTask = catTasks.find((t) => t.is_header);
              const subTasks = catTasks.filter((t) => !t.is_header);
              const isCollapsed = collapsedCategories[cat] || false;

              return (
                <React.Fragment key={cat}>
                  {headerTask && (
                    <tr
                      className="bg-[#1e3a5f]/8 cursor-pointer hover:bg-[#1e3a5f]/12 transition-colors"
                      onClick={() => toggleCategory(cat)}
                    >
                      <td
                        className="px-3 py-2.5 font-bold text-slate-800 text-xs uppercase tracking-wider sticky left-0 bg-inherit z-10"
                        colSpan={1 + selectedClients.length}
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                          {cat}
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isCollapsed &&
                    (headerTask ? subTasks : catTasks).map((task) => (
                      <tr
                        key={task.id}
                        className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-1.5 text-slate-700 sticky left-0 bg-white z-10">
                          <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                            {task.task_code}
                          </span>
                          {task.task_name}
                        </td>
                        {selectedClients.map((c) => {
                          const key = cellKey(task.id, c.id);
                          const cell = cellData[key];
                          if (!cell)
                            return (
                              <td key={c.id} className="px-1 py-1">
                                <div className="flex">
                                  <div className="flex-1 p-1">
                                    <div className="h-6 bg-slate-50 rounded" />
                                  </div>
                                  <div className="flex-1 p-1">
                                    <div className="h-6 bg-slate-50 rounded" />
                                  </div>
                                </div>
                              </td>
                            );

                          const bgP = getCellBg(cell.status);
                          const bgS = getCellBg(cell.status);
                          const txtP = getCellText(cell.status);
                          const txtS = getCellText(cell.status);

                          return (
                            <td key={c.id} className="px-1 py-1">
                              {/* ✅ WRAPPED: Cell editing (edit) */}
                              <ProtectedAction module="suivi_cac" action="edit">
                                <div className="flex gap-0.5">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      list="teamMembersList"
                                      value={cell.production}
                                      onChange={(e) =>
                                        updateCell(
                                          key,
                                          "production",
                                          e.target.value,
                                        )
                                      }
                                      className={`w-full text-[10px] rounded px-1 py-1.5 border-0 ${bgP} ${txtP} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                                      placeholder="--"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      list="teamMembersList"
                                      value={cell.supervision}
                                      onChange={(e) =>
                                        updateCell(
                                          key,
                                          "supervision",
                                          e.target.value,
                                        )
                                      }
                                      className={`w-full text-[10px] rounded px-1 py-1.5 border-0 ${bgS} ${txtS} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                                      placeholder="--"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-0.5 mt-0.5">
                                  <div className="flex-1">
                                    <select
                                      value={cell.status}
                                      onChange={(e) => {
                                        const s = e.target.value;
                                        updateCell(key, "status", s);
                                        if (s === "completed")
                                          updateCell(
                                            key,
                                            "progress_percentage",
                                            100,
                                          );
                                        else if (s === "not_started")
                                          updateCell(
                                            key,
                                            "progress_percentage",
                                            0,
                                          );
                                      }}
                                      className={`w-full text-[9px] rounded px-0.5 py-0.5 border-0 ${bgP} ${txtP} cursor-pointer focus:outline-none`}
                                    >
                                      <option value="not_started">--</option>
                                      <option value="in_progress">Cours</option>
                                      <option value="completed">OK</option>
                                      <option value="n_a">N/A</option>
                                    </select>
                                  </div>
                                  {cell.status === "in_progress" && (
                                    <div className="flex-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={cell.progress_percentage || 0}
                                        onChange={(e) =>
                                          updateCell(
                                            key,
                                            "progress_percentage",
                                            parseInt(e.target.value) || 0,
                                          )
                                        }
                                        className="w-full text-[9px] text-center rounded px-0.5 py-0.5 border border-yellow-300 bg-yellow-50 text-yellow-800 focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                              </ProtectedAction>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}

            <tr className="bg-[#1e3a5f]/5 border-t-2 border-[#1e3a5f]/20">
              <td className="px-3 py-3 font-bold text-slate-800 text-xs uppercase tracking-wider sticky left-0 bg-inherit z-10">
                Progression
              </td>
              {clientProgress.map((c) => (
                <td key={c.id} className="px-2 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`text-sm font-bold ${
                        c.pct === 100
                          ? "text-green-700"
                          : c.pct >= 50
                            ? "text-blue-700"
                            : "text-amber-700"
                      }`}
                    >
                      {c.pct}%
                    </span>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.pct === 100
                            ? "bg-green-500"
                            : c.pct >= 50
                              ? "bg-blue-500"
                              : "bg-amber-500"
                        }`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                Ajouter un client au tableau
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <input
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Rechercher un client..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {allClients
                  .filter((c) => !selectedClients.find((sc) => sc.id === c.id))
                  .filter(
                    (c) =>
                      c.name.toLowerCase().includes(addSearch.toLowerCase()) ||
                      c.client_code
                        .toLowerCase()
                        .includes(addSearch.toLowerCase()),
                  )
                  .map((c) => (
                    // ✅ WRAPPED: Add client to grid (edit)
                    <ProtectedAction
                      key={c.id}
                      module="suivi_cac"
                      action="edit"
                    >
                      <button
                        onClick={() => addClient(c)}
                        className="w-full flex items-center justify-between px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <div>
                          <p className="font-medium text-slate-700 text-sm">
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            {c.client_code}
                          </p>
                        </div>
                        <Plus
                          size={16}
                          className="text-blue-500 flex-shrink-0"
                        />
                      </button>
                    </ProtectedAction>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
