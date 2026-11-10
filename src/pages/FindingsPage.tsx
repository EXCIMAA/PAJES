// src/pages/FindingsPage.tsx
import { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { DataTable } from "../components/ui/DataTable";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { mapFindingRow } from "../lib/db-mappers";
import { RISK_LABELS } from "../lib/constants";
import { cn, formatDate } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { addNotification } from "../lib/notifications";
import type { Finding, ColumnDef } from "../types";
import { ProtectedAction } from "../components/auth/ProtectedAction";
import { buildAccessFilter } from "../lib/permissions";
import { useAuth } from "../contexts/AuthContext";

type FindingExtended = Finding & {
  concerned_person?: string | null;
  [key: string]: unknown;
};

export function FindingsPage() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<FindingExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingFinding, setEditingFinding] = useState<FindingExtended | null>(
    null,
  );
  const [form, setForm] = useState({
    finding: "",
    risk_level: "medium",
    status: "open",
    recommendation: "",
    responsible_person: "",
    concerned_person: "",
    target_date: "",
  });

  // ─────────────────────────────────────────────
  // FETCH with row-level filter
  // ─────────────────────────────────────────────
  const refetch = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const accessFilter = buildAccessFilter({
        role: profile?.role,
        module: "findings",
        currentUserId: user.id,
        ownerColumn: "created_by",
        assignmentColumn: "responsible_person",
      });

      let q = supabase
        .from("findings")
        .select("*")
        .order("created_at", { ascending: false });

      if (accessFilter) q = q.or(accessFilter);

      const { data: rawData, error: fetchError } = await q;
      if (fetchError) throw fetchError;

      setData((rawData || []).map(mapFindingRow) as FindingExtended[]);
      setError(null);
    } catch (err: any) {
      console.error("Erreur chargement constats:", err);
      setError(err.message || "Erreur de chargement");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [user, profile?.role]);

  // ─────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────
  const filtered =
    filter === "all"
      ? data
      : data.filter((f) => f.status === filter || f.risk_level === filter);

  const riskSummary = useMemo(
    () => ({
      critical: data.filter((f) => f.risk_level === "critical").length,
      high: data.filter((f) => f.risk_level === "high").length,
      medium: data.filter((f) => f.risk_level === "medium").length,
      low: data.filter((f) => f.risk_level === "low").length,
    }),
    [data],
  );

  // ─────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    try {
      if (!form.finding.trim()) {
        alert("Veuillez saisir un constat");
        return;
      }

      const payload = {
        finding: form.finding,
        risk_level: form.risk_level,
        status: form.status,
        recommendation: form.recommendation || null,
        responsible_person: form.responsible_person || null,
        concerned_person: form.concerned_person || null,
        target_date: form.target_date || null,
        engagement_id: null,
        management_response: null,
        created_by: user?.id || null,
      };

      let result;
      if (editingFinding) {
        result = await supabase
          .from("findings")
          .update(payload)
          .eq("id", editingFinding.id);
      } else {
        result = await supabase.from("findings").insert([payload]);
      }

      if (result.error) throw result.error;

      if (editingFinding) {
        void addNotification({
          title: "Constat mis à jour",
          message: `Le constat a été mis à jour.`,
          type: "finding",
        });
      } else {
        void addNotification({
          title: "Nouveau constat",
          message: `Un nouveau constat a été créé.`,
          type: "finding",
        });
      }

      await refetch();
      setShowModal(false);
      setEditingFinding(null);
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde :", err);
      alert("Erreur : " + (err.message || "Inconnue"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce constat ?")) return;
    try {
      const { error } = await supabase.from("findings").delete().eq("id", id);
      if (error) throw error;
      void addNotification({
        title: "Constat supprimé",
        message: "Un constat a été supprimé.",
        type: "finding",
      });
      await refetch();
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  const openEdit = (finding: FindingExtended) => {
    setEditingFinding(finding);
    setForm({
      finding: finding.finding,
      risk_level: finding.risk_level,
      status: finding.status,
      recommendation: finding.recommendation || "",
      responsible_person: finding.responsible_person || "",
      concerned_person: finding.concerned_person || "",
      target_date: finding.target_date || "",
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingFinding(null);
    setForm({
      finding: "",
      risk_level: "medium",
      status: "open",
      recommendation: "",
      responsible_person: "",
      concerned_person: "",
      target_date: "",
    });
    setShowModal(true);
  };

  // ─────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────
  const columns: ColumnDef<FindingExtended>[] = [
    {
      key: "finding",
      label: "Constat",
      sortable: true,
      render: (value) => (
        <span className="font-medium text-slate-100 max-w-xs truncate block">
          {String(value)}
        </span>
      ),
    },
    {
      key: "risk_level",
      label: "Niveau de risque",
      sortable: true,
      render: (value) => {
        const v = String(value);
        return (
          <Badge
            variant={
              v === "critical"
                ? "error"
                : v === "high"
                  ? "warning"
                  : v === "medium"
                    ? "info"
                    : "neutral"
            }
          >
            {RISK_LABELS[v] ?? v}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Statut",
      sortable: true,
      render: (value) => {
        const v = String(value);
        return (
          <Badge
            variant={
              v === "open"
                ? "error"
                : v === "in_progress"
                  ? "warning"
                  : v === "resolved"
                    ? "success"
                    : "neutral"
            }
          >
            {v === "open"
              ? "Ouvert"
              : v === "in_progress"
                ? "En cours"
                : "Résolu"}
          </Badge>
        );
      },
    },
    {
      key: "recommendation",
      label: "Recommandation",
      sortable: false,
      render: (value) => (
        <span className="text-slate-400 text-xs truncate max-w-xs block">
          {String(value ?? "-")}
        </span>
      ),
    },
    { key: "responsible_person", label: "Responsable", sortable: true },
    {
      key: "concerned_person",
      label: "Personne concernée",
      sortable: true,
      render: (value) => (
        <span className="text-slate-300">{String(value ?? "-")}</span>
      ),
    },
    {
      key: "target_date",
      label: "Date cible",
      sortable: true,
      render: (value) => (
        <span className="text-slate-400">
          {value ? formatDate(String(value)) : "-"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (_value, row) => (
        <div className="flex gap-1">
          <ProtectedAction module="findings" action="edit">
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
            >
              <Edit className="w-4 h-4" />
            </button>
          </ProtectedAction>
          <ProtectedAction module="findings" action="delete">
            <button
              onClick={() => handleDelete(row.id)}
              className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-error-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </ProtectedAction>
        </div>
      ),
    },
  ];

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="page-container">
      <PageHeader
        title="Constats"
        description="Gérez les constats d'audit et les recommandations"
        actions={
          <ProtectedAction module="findings" action="create">
            <button onClick={openCreate} className="btn-primary btn-md">
              <Plus className="w-4 h-4" />
              Signaler un constat
            </button>
          </ProtectedAction>
        }
      />

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-error-500/10 text-error-500 text-sm border border-error-500/25">
          Erreur de chargement : {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Critique",
            value: riskSummary.critical,
            color: "text-error-500",
          },
          {
            label: "Élevé",
            value: riskSummary.high,
            color: "text-warning-500",
          },
          { label: "Moyen", value: riskSummary.medium, color: "text-info-500" },
          { label: "Faible", value: riskSummary.low, color: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-lg font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {["all", "open", "in_progress", "resolved", "critical", "high"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap",
                filter === f
                  ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                  : "text-slate-400 hover:bg-slate-700/40",
              )}
            >
              {f === "all"
                ? "Tous"
                : f === "open"
                  ? "Ouverts"
                  : f === "in_progress"
                    ? "En cours"
                    : f === "resolved"
                      ? "Résolus"
                      : (RISK_LABELS[f] ?? f)}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun constat"
          description="Les constats d'audit apparaîtront ici."
        />
      ) : (
        <DataTable data={filtered} columns={columns} />
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card p-6 w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              {editingFinding ? "Modifier le constat" : "Nouveau constat"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Constat
                </label>
                <textarea
                  value={form.finding}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, finding: e.target.value }))
                  }
                  className="input-md min-h-[80px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Niveau de risque
                </label>
                <select
                  value={form.risk_level}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, risk_level: e.target.value }))
                  }
                  className="input-md"
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyen</option>
                  <option value="high">Élevé</option>
                  <option value="critical">Critique</option>
                </select>
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
                  <option value="open">Ouvert</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolu</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Recommandation
                </label>
                <input
                  type="text"
                  value={form.recommendation}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, recommendation: e.target.value }))
                  }
                  className="input-md"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Responsable
                </label>
                <input
                  type="text"
                  value={form.responsible_person}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      responsible_person: e.target.value,
                    }))
                  }
                  className="input-md"
                  placeholder="Nom du responsable"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Personne concernée
                </label>
                <input
                  type="text"
                  value={form.concerned_person}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, concerned_person: e.target.value }))
                  }
                  className="input-md"
                  placeholder="Nom de la personne concernée"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Date cible
                </label>
                <input
                  type="date"
                  value={form.target_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, target_date: e.target.value }))
                  }
                  className="input-md"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <ProtectedAction
                  module="findings"
                  action={editingFinding ? "edit" : "create"}
                >
                  <button onClick={handleSave} className="btn-primary btn-md">
                    {editingFinding ? "Mettre à jour" : "Créer"}
                  </button>
                </ProtectedAction>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary btn-md"
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
