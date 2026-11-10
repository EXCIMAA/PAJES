// src/pages/review-notes/ReviewNotesPage.tsx
import { useState, useEffect } from "react";
import {
  Plus,
  Eye,
  Search,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Edit,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { cn, formatDate } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { addNotification } from "../../lib/notifications";
import { useSupabaseQuery } from "../../hooks/useSupabaseData";
import { SEVERITY_LABELS } from "../../lib/constants";
import type { ReviewNote } from "../../types";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

const STATUS_OPTIONS = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
} as const;

const SEVERITY_OPTIONS = {
  minor: "Mineur",
  significant: "Significatif",
  critical: "Critique",
} as const;

export function ReviewNotesPage() {
  const { data: notes, refetch } = useSupabaseQuery<ReviewNote>({
    table: "review_notes",
    orderBy: "created_at",
    orderAsc: false,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDetail, setShowDetail] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ReviewNote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<ReviewNote | null>(null);
  const [form, setForm] = useState({
    reference: "",
    category: "",
    description: "",
    severity: "minor" as string,
    status: "open" as string,
    assigned_to_name: "",
    due_date: "",
    comments: "",
  });

  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>(
    [],
  );
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ full_name: "" });

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (!error) setProfiles(data || []);
    };
    fetchProfiles();
  }, []);

  const filtered = notes.filter((n) => {
    const matchSearch =
      n.reference.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || n.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const summary = {
    open: notes.filter((n) => n.status === "open").length,
    inProgress: notes.filter((n) => n.status === "in_progress").length,
    resolved: notes.filter((n) => n.status === "resolved").length,
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      reference: form.reference || `RN-${Date.now()}`,
      engagement_id: null,
      assigned_to_id: null,
    };
    if (editingNote) {
      await supabase
        .from("review_notes")
        .update(payload)
        .eq("id", editingNote.id);
      void addNotification({
        title: "Note de revue mise à jour",
        message: `La note ${editingNote.reference} a été mise à jour.`,
        type: "review_note",
      });
    } else {
      await supabase.from("review_notes").insert([payload]);
      void addNotification({
        title: "Nouvelle note de revue",
        message: "Une note de revue a été créée.",
        type: "review_note",
      });
    }
    refetch();
    setShowModal(false);
    setEditingNote(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette note ?")) return;
    await supabase.from("review_notes").delete().eq("id", id);
    void addNotification({
      title: "Note de revue supprimée",
      message: "Une note de revue a été supprimée.",
      type: "review_note",
    });
    refetch();
  };

  const openEdit = (note: ReviewNote) => {
    setEditingNote(note);
    setForm({
      reference: note.reference || "",
      category: note.category || "",
      description: note.description || "",
      severity: note.severity || "minor",
      status: note.status || "open",
      assigned_to_name: note.assigned_to_name || "",
      due_date: note.due_date || "",
      comments: note.comments || "",
    });
    setShowModal(true);
  };

  const handleAddUser = async () => {
    if (!newUserForm.full_name.trim()) return alert("Veuillez saisir un nom");
    const { data, error } = await supabase
      .from("profiles")
      .insert([{ full_name: newUserForm.full_name.trim() }])
      .select()
      .single();
    if (error) {
      alert("Erreur lors de l'ajout");
      return;
    }
    setProfiles((prev) => [...prev, data]);
    setForm((p) => ({ ...p, assigned_to_name: data.full_name }));
    setShowAddUser(false);
    setNewUserForm({ full_name: "" });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Notes de revue"
        description="Suivez et gérez les anomalies d'audit"
        actions={
          // ✅ WRAPPED: Nouvelle note
          <ProtectedAction module="review_notes" action="create">
            <button
              onClick={() => {
                setEditingNote(null);
                setForm({
                  reference: "",
                  category: "",
                  description: "",
                  severity: "minor",
                  status: "open",
                  assigned_to_name: "",
                  due_date: "",
                  comments: "",
                });
                setShowModal(true);
              }}
              className="btn-primary btn-md"
            >
              <Plus className="w-4 h-4" />
              Nouvelle note
            </button>
          </ProtectedAction>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Ouvertes",
            value: summary.open,
            icon: AlertTriangle,
            color: "text-error-500",
          },
          {
            label: "En cours",
            value: summary.inProgress,
            icon: Clock,
            color: "text-warning-500",
          },
          {
            label: "Résolues",
            value: summary.resolved,
            icon: CheckCircle2,
            color: "text-success-500",
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <s.icon className={cn("w-5 h-5", s.color)} />
            <div>
              <p className="text-lg font-semibold text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="input-md pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "open", "in_progress", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition-colors",
                statusFilter === s
                  ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                  : "text-slate-400 hover:bg-slate-700/40",
              )}
            >
              {s === "all"
                ? "Tous"
                : STATUS_OPTIONS[s as keyof typeof STATUS_OPTIONS] || s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {[
                  "Référence",
                  "Description",
                  "Sévérité",
                  "Statut",
                  "Assignée à",
                  "Échéance",
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
              {filtered.map((note) => (
                <tr
                  key={note.id}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-100 font-mono text-xs">
                    {note.reference}
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                    {note.description}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        note.severity === "critical"
                          ? "error"
                          : note.severity === "significant"
                            ? "warning"
                            : "info"
                      }
                    >
                      {SEVERITY_LABELS[
                        note.severity as keyof typeof SEVERITY_LABELS
                      ] ?? note.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        note.status === "open"
                          ? "error"
                          : note.status === "in_progress"
                            ? "warning"
                            : "success"
                      }
                    >
                      {STATUS_OPTIONS[
                        note.status as keyof typeof STATUS_OPTIONS
                      ] ?? note.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {note.assigned_to_name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {note.due_date ? formatDate(note.due_date) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {/* ✅ WRAPPED: View */}
                      <ProtectedAction module="review_notes" action="view">
                        <button
                          onClick={() => {
                            setSelectedNote(note);
                            setShowDetail(true);
                          }}
                          className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </ProtectedAction>
                      {/* ✅ WRAPPED: Edit */}
                      <ProtectedAction module="review_notes" action="edit">
                        <button
                          onClick={() => openEdit(note)}
                          className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-primary-400"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </ProtectedAction>
                      {/* ✅ WRAPPED: Delete */}
                      <ProtectedAction module="review_notes" action="delete">
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-error-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </ProtectedAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && selectedNote && (
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
                {selectedNote.reference}
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
                <p className="text-xs text-slate-400">Sévérité</p>
                <Badge
                  variant={
                    selectedNote.severity === "critical"
                      ? "error"
                      : selectedNote.severity === "significant"
                        ? "warning"
                        : "info"
                  }
                >
                  {SEVERITY_LABELS[
                    selectedNote.severity as keyof typeof SEVERITY_LABELS
                  ] || selectedNote.severity}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400">Description</p>
                <p className="text-sm text-slate-200">
                  {selectedNote.description}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Chronologie</p>
                <p className="text-sm text-slate-300">
                  Ouverte le : {formatDate(selectedNote.created_at)}
                </p>
              </div>
              {selectedNote.comments && (
                <div>
                  <p className="text-xs text-slate-400">Commentaires</p>
                  <p className="text-sm text-slate-200">
                    {selectedNote.comments}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card p-6 w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              {editingNote ? "Modifier la note" : "Nouvelle note"}
            </h2>
            <div className="space-y-3">
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
                  placeholder="RN-XXX"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className="input-md"
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
                  className="input-md min-h-[80px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Sévérité
                </label>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, severity: e.target.value }))
                  }
                  className="input-md w-full"
                >
                  {Object.entries(SEVERITY_OPTIONS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
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
                  className="input-md w-full"
                >
                  {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Assignée à
                </label>
                <div className="flex gap-2">
                  <select
                    value={
                      profiles.find(
                        (p) => p.full_name === form.assigned_to_name,
                      )?.id || ""
                    }
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const profile = profiles.find((p) => p.id === selectedId);
                      setForm((p) => ({
                        ...p,
                        assigned_to_name: profile ? profile.full_name : "",
                      }));
                    }}
                    className="input-md flex-1"
                  >
                    <option value="">Non assigné</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                  {/* ✅ WRAPPED: Ajouter un utilisateur (collaborateurs:create) */}
                  <ProtectedAction module="collaborateurs" action="create">
                    <button
                      type="button"
                      onClick={() => setShowAddUser(true)}
                      className="btn-secondary btn-md px-2"
                      title="Ajouter un utilisateur"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </ProtectedAction>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Échéance
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, due_date: e.target.value }))
                  }
                  className="input-md"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Commentaires
                </label>
                <textarea
                  value={form.comments}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, comments: e.target.value }))
                  }
                  className="input-md min-h-[60px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {/* ✅ WRAPPED: Save (create or edit) */}
                <ProtectedAction
                  module="review_notes"
                  action={editingNote ? "edit" : "create"}
                >
                  <button onClick={handleSave} className="btn-primary btn-md">
                    {editingNote ? "Mettre à jour" : "Créer"}
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

      {showAddUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAddUser(false)}
        >
          <div
            className="card p-6 w-full max-w-sm animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              Ajouter un utilisateur
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={newUserForm.full_name}
                  onChange={(e) =>
                    setNewUserForm((p) => ({
                      ...p,
                      full_name: e.target.value,
                    }))
                  }
                  className="input-md"
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddUser} className="btn-primary btn-md">
                  Ajouter
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
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
