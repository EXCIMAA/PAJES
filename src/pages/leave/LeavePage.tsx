// src/pages/leave/LeavePage.tsx
import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Check,
  X as XIcon,
  Clock,
  UserCheck,
  UserX,
  Calculator,
  Calendar,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { DocumentLink } from "../../components/DocumentLink";
import { cn, formatDate } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { addNotification } from "../../lib/notifications";
import { LEAVE_TYPE_LABELS } from "../../lib/constants";
import { useAuth } from "../../contexts/AuthContext";
import type { LeaveRequest } from "../../types";
import { ProtectedAction } from "../../components/auth/ProtectedAction";
import { buildAccessFilter } from "../../lib/permissions"; // ✅ IMPORT CRUCIAL

const BUCKET_NAME = "leave_documents";

function countWeekdaysExcludingSunday(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() !== 0) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function monthsBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  let months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months += d2.getMonth() - d1.getMonth();
  if (d2.getDate() < d1.getDate()) months--;
  return Math.max(0, months);
}

export function LeavePage() {
  const { user, profile } = useAuth();

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    leave_type: "annual",
    reason: "",
    start_date: "",
    end_date: "",
    duration: 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [, setUpdating] = useState(false);

  const [balance, setBalance] = useState<{
    total_earned: number;
    taken: number;
    remaining: number;
    year: number;
  } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showAddDaysModal, setShowAddDaysModal] = useState(false);
  const [extraDays, setExtraDays] = useState(0);
  const [addingDays, setAddingDays] = useState(false);
  const [hireDate, setHireDate] = useState<string | null>(null);

  const [showHireDateModal, setShowHireDateModal] = useState(false);
  const [newHireDate, setNewHireDate] = useState("");

  const fetchBalance = async () => {
    if (!user) return;
    setLoadingBalance(true);
    try {
      const year = new Date().getFullYear();
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("hire_date")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      if (!profileData?.hire_date) {
        setBalance(null);
        setHireDate(null);
        setLoadingBalance(false);
        return;
      }
      setHireDate(profileData.hire_date);
      const hire = new Date(profileData.hire_date);
      const now = new Date();
      const monthsWorked = monthsBetween(hire, now);
      const totalEarned = monthsWorked * 2;

      const { data: takenLeaves, error: takenError } = await supabase
        .from("leave_requests")
        .select("duration")
        .eq("employee_id", user.id)
        .eq("status", "approved")
        .gte("start_date", `${year}-01-01`)
        .lte("end_date", `${year}-12-31`);
      if (takenError) throw takenError;
      const taken = takenLeaves?.reduce((sum, l) => sum + l.duration, 0) || 0;

      const { data: balData, error: balError } = await supabase
        .from("leave_balances")
        .select("extra_days")
        .eq("employee_id", user.id)
        .eq("year", year)
        .maybeSingle();
      if (balError) throw balError;
      const extraDaysFromDb = balData?.extra_days || 0;

      const totalWithExtra = totalEarned + extraDaysFromDb;
      const remaining = totalWithExtra - taken;

      const newBalance = {
        employee_id: user.id,
        year: year,
        total_days_earned: totalWithExtra,
        days_taken: taken,
        days_remaining: remaining,
        extra_days: extraDaysFromDb,
        updated_at: new Date().toISOString(),
      };
      const { error: upsertError } = await supabase
        .from("leave_balances")
        .upsert(newBalance, { onConflict: "employee_id, year" });
      if (upsertError) throw upsertError;

      setBalance({
        total_earned: totalWithExtra,
        taken: taken,
        remaining: remaining,
        year: year,
      });
    } catch (err) {
      console.error("Erreur chargement solde:", err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const updateHireDate = async () => {
    if (!user) return;
    if (!newHireDate) {
      alert("Veuillez sélectionner une date.");
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ hire_date: newHireDate })
        .eq("id", user.id);
      if (error) throw error;
      await fetchBalance();
      setShowHireDateModal(false);
      setNewHireDate("");
      void addNotification({
        title: "Date d'embauche mise à jour",
        message: "Votre date d'embauche a été enregistrée.",
        type: "profile",
      });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  // ✅ FILTRE ROW-LEVEL APPLIQUÉ ICI
  const fetchLeaves = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const accessFilter = buildAccessFilter({
        role: profile?.role,
        module: "conges",
        currentUserId: user.id,
        ownerColumn: "employee_id", // ← filtre sur la bonne colonne
      });

      let q = supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      // ✅ APPLICATION DU FILTRE
      if (accessFilter) {
        q = q.or(accessFilter);
      }

      const { data: leavesData, error: leavesError } = await q;
      if (leavesError) throw leavesError;

      if (!leavesData || leavesData.length === 0) {
        setLeaves([]);
        setError(null);
        setLoading(false);
        return;
      }

      const employeeIds = [
        ...new Set(leavesData.map((l) => l.employee_id).filter(Boolean)),
      ];
      let profilesMap: Record<string, string> = {};
      if (employeeIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", employeeIds);
        if (profilesError) throw profilesError;
        profilesMap = profilesData.reduce(
          (acc, p) => ({ ...acc, [p.id]: p.full_name }),
          {},
        );
      }

      const mapped = leavesData.map((item: any) => ({
        ...item,
        employee_name: profilesMap[item.employee_id] || "Utilisateur inconnu",
      }));
      setLeaves(mapped);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setForm((prev) => ({ ...prev, employee_id: user.id }));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLeaves();
      fetchBalance();
    }
  }, [user, profile?.role]); // ✅ re-fetch quand le rôle change

  const filtered = leaves.filter(
    (l) => statusFilter === "all" || l.status === statusFilter,
  );

  const summary = {
    total: leaves.length,
    approved: leaves.filter((l) => l.status === "approved").length,
    pending: leaves.filter((l) => l.status === "submitted").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
  };

  const handleSubmit = async () => {
    if (!form.employee_id) {
      alert("Vous devez être connecté pour demander un congé");
      return;
    }
    if (!form.reason.trim()) {
      alert("Veuillez saisir un motif");
      return;
    }
    if (!form.start_date || !form.end_date) {
      alert("Veuillez sélectionner les dates de début et de fin");
      return;
    }
    if (new Date(form.start_date) > new Date(form.end_date)) {
      alert("La date de début doit être antérieure ou égale à la date de fin");
      return;
    }

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const duration = countWeekdaysExcludingSunday(start, end);

    if (balance && duration > balance.remaining) {
      alert(`Solde insuffisant. Vous disposez de ${balance.remaining} jours.`);
      return;
    }

    setSubmitting(true);
    setUploading(!!file);

    try {
      let supportingDocumentPath: string | null = null;

      if (file) {
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `leave_documents/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        supportingDocumentPath = filePath;
      }

      const payload = {
        employee_id: form.employee_id,
        leave_type: form.leave_type,
        reason: form.reason.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        duration: duration,
        status: "submitted",
        supporting_document: supportingDocumentPath,
      };

      const { error } = await supabase.from("leave_requests").insert([payload]);
      if (error) throw error;

      await fetchLeaves();
      await fetchBalance();
      setShowRequest(false);
      setForm((prev) => ({
        ...prev,
        leave_type: "annual",
        reason: "",
        start_date: "",
        end_date: "",
        duration: 1,
      }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      void addNotification({
        title: "Demande de congé soumise",
        message: "Votre demande de congé a été soumise avec succès.",
        type: "leave",
      });
    } catch (err: any) {
      alert("Erreur lors de la soumission : " + err.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approuver cette demande ?")) return;
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
      await fetchBalance();
      await fetchLeaves();
      void addNotification({
        title: "Demande de congé approuvée",
        message: "Une demande de congé a été approuvée.",
        type: "leave",
      });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Rejeter cette demande ?")) return;
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      await fetchLeaves();
      void addNotification({
        title: "Demande de congé rejetée",
        message: "Une demande de congé a été rejetée.",
        type: "leave",
      });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleEdit = (leave: LeaveRequest) => {
    setEditingId(leave.id);
    setForm({
      employee_id: leave.employee_id,
      leave_type: leave.leave_type,
      reason: leave.reason,
      start_date: leave.start_date,
      end_date: leave.end_date,
      duration: leave.duration,
    });
    setEditingFile(null);
    setShowRequest(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!form.employee_id) {
      alert("Vous devez être connecté pour modifier une demande");
      return;
    }
    if (!form.reason.trim()) {
      alert("Veuillez saisir un motif");
      return;
    }
    if (!form.start_date || !form.end_date) {
      alert("Veuillez sélectionner les dates de début et de fin");
      return;
    }
    if (new Date(form.start_date) > new Date(form.end_date)) {
      alert("La date de début doit être antérieure ou égale à la date de fin");
      return;
    }

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const duration = countWeekdaysExcludingSunday(start, end);

    setSubmitting(true);
    setUpdating(true);
    setUploading(!!editingFile);

    try {
      let supportingDocumentPath: string | null = null;

      if (editingFile) {
        const fileName = `${Date.now()}_${editingFile.name}`;
        const filePath = `leave_documents/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, editingFile);
        if (uploadError) throw uploadError;
        supportingDocumentPath = filePath;
      }

      const payload = {
        leave_type: form.leave_type,
        reason: form.reason.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        duration: duration,
        ...(supportingDocumentPath && {
          supporting_document: supportingDocumentPath,
        }),
      };

      const { error } = await supabase
        .from("leave_requests")
        .update(payload)
        .eq("id", editingId);
      if (error) throw error;

      await fetchLeaves();
      await fetchBalance();
      setShowRequest(false);
      setEditingId(null);
      setEditingFile(null);
      setForm((prev) => ({
        ...prev,
        leave_type: "annual",
        reason: "",
        start_date: "",
        end_date: "",
        duration: 1,
      }));
      void addNotification({
        title: "Demande de congé mise à jour",
        message: "Votre demande de congé a été modifiée avec succès.",
        type: "leave",
      });
    } catch (err: any) {
      alert("Erreur lors de la mise à jour : " + err.message);
    } finally {
      setSubmitting(false);
      setUpdating(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, status: string) => {
    if (status !== "submitted") {
      alert("Seules les demandes en attente peuvent être supprimées.");
      return;
    }
    if (!confirm("Supprimer définitivement cette demande de congé ?")) return;
    try {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchLeaves();
      void addNotification({
        title: "Demande de congé supprimée",
        message: "Une demande de congé a été supprimée.",
        type: "leave",
      });
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  const handleAddExtraDays = async () => {
    if (!user) return;
    if (extraDays <= 0) {
      alert("Veuillez saisir un nombre positif.");
      return;
    }
    setAddingDays(true);
    try {
      const year = new Date().getFullYear();
      const { data: balData, error: balError } = await supabase
        .from("leave_balances")
        .select("extra_days")
        .eq("employee_id", user.id)
        .eq("year", year)
        .maybeSingle();
      if (balError) throw balError;
      const currentExtra = balData?.extra_days || 0;
      const newExtra = currentExtra + extraDays;
      const { error: upsertError } = await supabase
        .from("leave_balances")
        .upsert(
          {
            employee_id: user.id,
            year: year,
            extra_days: newExtra,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "employee_id, year" },
        );
      if (upsertError) throw upsertError;
      await fetchBalance();
      setShowAddDaysModal(false);
      setExtraDays(0);
      void addNotification({
        title: "Jours de congé ajoutés",
        message: `${extraDays} jours ont été ajoutés à votre solde.`,
        type: "leave",
      });
    } catch (err: any) {
      alert("Erreur lors de l'ajout : " + err.message);
    } finally {
      setAddingDays(false);
    }
  };

  const renderBalance = () => {
    if (loadingBalance) return "...";
    if (!hireDate) {
      return (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Date d'embauche non renseignée</span>
          <button
            onClick={() => setShowHireDateModal(true)}
            className="text-primary-400 hover:underline text-xs ml-2"
          >
            Ajouter ma date d'embauche
          </button>
        </div>
      );
    }
    return balance?.remaining ?? 0;
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Congés"
        description="Gérez vos demandes de congé et suivez votre solde"
        actions={
          <ProtectedAction module="conges" action="create">
            <button
              onClick={() => {
                setEditingId(null);
                setForm({
                  employee_id: user?.id || "",
                  leave_type: "annual",
                  reason: "",
                  start_date: "",
                  end_date: "",
                  duration: 1,
                });
                setFile(null);
                setEditingFile(null);
                setShowRequest(true);
              }}
              className="btn-primary btn-md"
            >
              <Plus className="w-4 h-4" />
              Demander un congé
            </button>
          </ProtectedAction>
        }
      />

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-error-500/10 text-error-500 text-sm border border-error-500/25">
          Erreur de chargement : {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 bg-gradient-to-br from-primary-900/20 to-primary-700/10 border-primary-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20 text-primary-300">
              <Calculator size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Solde de congés (CNP)</p>
              <p className="text-2xl font-bold text-primary-300">
                {renderBalance()}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-emerald-900/20 to-emerald-700/10 border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Acquis cette année</p>
              <p className="text-2xl font-bold text-emerald-300">
                {loadingBalance ? "..." : (balance?.total_earned ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-amber-900/20 to-amber-700/10 border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Déjà pris</p>
              <p className="text-2xl font-bold text-amber-300">
                {loadingBalance ? "..." : (balance?.taken ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-blue-900/20 to-blue-700/10 border-blue-500/30 flex items-center justify-center">
          <ProtectedAction module="conges" action="edit">
            <button
              onClick={() => setShowAddDaysModal(true)}
              className="text-sm text-blue-300 hover:text-blue-200 flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              Ajouter des jours
            </button>
          </ProtectedAction>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total demandes",
            value: summary.total,
            icon: Clock,
            color: "text-primary-400",
          },
          {
            label: "Approuvées",
            value: summary.approved,
            icon: UserCheck,
            color: "text-success-500",
          },
          {
            label: "En attente",
            value: summary.pending,
            icon: Clock,
            color: "text-warning-500",
          },
          {
            label: "Rejetées",
            value: summary.rejected,
            icon: UserX,
            color: "text-error-500",
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

      <div className="flex gap-2 mb-6">
        {["all", "submitted", "approved", "rejected"].map((s) => (
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
              ? "Toutes"
              : s === "submitted"
                ? "En attente"
                : s === "approved"
                  ? "Approuvées"
                  : "Rejetées"}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {[
                  "Employé",
                  "Type de congé",
                  "Durée",
                  "Début",
                  "Fin",
                  "Statut",
                  "Document",
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
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Aucune demande
                  </td>
                </tr>
              ) : (
                filtered.map((leave) => {
                  const isOwner = user && leave.employee_id === user.id;
                  const isPending = leave.status === "submitted";
                  const canModify = isOwner && isPending;

                  return (
                    <tr
                      key={leave.id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {leave.employee_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {LEAVE_TYPE_LABELS[leave.leave_type] ??
                          leave.leave_type}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-300">
                        {leave.duration} jours
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatDate(leave.start_date)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatDate(leave.end_date)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            leave.status === "approved"
                              ? "success"
                              : leave.status === "submitted"
                                ? "warning"
                                : leave.status === "rejected"
                                  ? "error"
                                  : "neutral"
                          }
                        >
                          {leave.status === "approved"
                            ? "Approuvé"
                            : leave.status === "submitted"
                              ? "En attente"
                              : leave.status === "rejected"
                                ? "Rejeté"
                                : "Autre"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {leave.supporting_document ? (
                          <DocumentLink
                            filePath={leave.supporting_document}
                            bucket={BUCKET_NAME}
                            label="Télécharger"
                          />
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isPending && canModify && (
                            <>
                              <ProtectedAction module="conges" action="edit">
                                <button
                                  onClick={() => handleEdit(leave)}
                                  className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-primary-400"
                                  aria-label="Modifier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                              <ProtectedAction module="conges" action="delete">
                                <button
                                  onClick={() =>
                                    handleDelete(leave.id, leave.status)
                                  }
                                  className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-error-400"
                                  aria-label="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                            </>
                          )}
                          {isPending && !isOwner && (
                            <>
                              <ProtectedAction module="conges" action="edit">
                                <button
                                  onClick={() => handleApprove(leave.id)}
                                  className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-success-400"
                                  aria-label="Approuver"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                              <ProtectedAction module="conges" action="edit">
                                <button
                                  onClick={() => handleReject(leave.id)}
                                  className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-error-400"
                                  aria-label="Rejeter"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                            </>
                          )}
                          {!isPending && (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DEMANDE DE CONGÉ */}
      {showRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => !submitting && !uploading && setShowRequest(false)}
        >
          <div
            className="card p-6 w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              {editingId ? "Modifier la demande" : "Demander un congé"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Employé
                </label>
                <input
                  type="text"
                  value={
                    user?.full_name || user?.email || "Utilisateur connecté"
                  }
                  className="input-md w-full bg-slate-800/50 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">
                  Connecté en tant que {user?.email}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Type de congé
                </label>
                <select
                  value={form.leave_type}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, leave_type: e.target.value }))
                  }
                  className="input-md w-full"
                >
                  {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Motif
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, reason: e.target.value }))
                  }
                  className="input-md min-h-[80px] w-full"
                  placeholder="Raison de la demande"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, start_date: e.target.value }));
                      if (form.end_date && e.target.value) {
                        const start = new Date(e.target.value);
                        const end = new Date(form.end_date);
                        if (start <= end) {
                          const dur = countWeekdaysExcludingSunday(start, end);
                          setForm((p) => ({ ...p, duration: dur }));
                        }
                      }
                    }}
                    className="input-md w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, end_date: e.target.value }));
                      if (form.start_date && e.target.value) {
                        const start = new Date(form.start_date);
                        const end = new Date(e.target.value);
                        if (start <= end) {
                          const dur = countWeekdaysExcludingSunday(start, end);
                          setForm((p) => ({ ...p, duration: dur }));
                        }
                      }
                    }}
                    className="input-md w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Durée (jours ouvrés, sans dimanches)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      duration: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="input-md w-full"
                  disabled={!!form.start_date && !!form.end_date}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {form.start_date && form.end_date
                    ? `Calculé automatiquement : ${form.duration} jour(s) (dimanches exclus)`
                    : "Renseignez les dates pour le calcul automatique"}
                </p>
                {balance && (
                  <p className="text-xs text-amber-400 mt-1">
                    Solde disponible : {balance.remaining} jours
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Justificatif (optionnel)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      if (editingId) setEditingFile(e.target.files[0]);
                      else setFile(e.target.files[0]);
                    }
                  }}
                  className="input-md w-full"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                {file && !editingId && (
                  <p className="text-xs text-slate-400 mt-1">
                    📄 {file.name} ({Math.round(file.size / 1024)} Ko)
                  </p>
                )}
                {editingFile && editingId && (
                  <p className="text-xs text-slate-400 mt-1">
                    📄 Nouveau fichier : {editingFile.name} (
                    {Math.round(editingFile.size / 1024)} Ko)
                  </p>
                )}
                {editingId && !editingFile && (
                  <p className="text-xs text-slate-400 mt-1">
                    Laisser vide pour conserver le fichier actuel.
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <ProtectedAction
                  module="conges"
                  action={editingId ? "edit" : "create"}
                >
                  <button
                    onClick={editingId ? handleUpdate : handleSubmit}
                    className="btn-primary btn-md flex-1"
                    disabled={submitting || uploading}
                  >
                    {uploading
                      ? "Téléversement..."
                      : submitting
                        ? "Soumission..."
                        : editingId
                          ? "Mettre à jour"
                          : "Soumettre"}
                  </button>
                </ProtectedAction>
                <button
                  onClick={() => {
                    setShowRequest(false);
                    setEditingId(null);
                    setEditingFile(null);
                  }}
                  className="btn-secondary btn-md"
                  disabled={submitting || uploading}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT DE JOURS */}
      {showAddDaysModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => !addingDays && setShowAddDaysModal(false)}
        >
          <div
            className="card p-6 w-full max-w-sm animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              Ajouter des jours de congé
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Cette action ajoutera des jours à votre solde de congés (CNP).
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Nombre de jours à ajouter
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={extraDays}
                  onChange={(e) =>
                    setExtraDays(parseFloat(e.target.value) || 0)
                  }
                  className="input-md w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddExtraDays}
                  disabled={addingDays}
                  className="btn-primary btn-md flex-1"
                >
                  {addingDays ? "Ajout..." : "Ajouter"}
                </button>
                <button
                  onClick={() => setShowAddDaysModal(false)}
                  className="btn-secondary btn-md"
                  disabled={addingDays}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DATE D'EMBAUCHE */}
      {showHireDateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowHireDateModal(false)}
        >
          <div
            className="card p-6 w-full max-w-sm animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              Date d'embauche
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Indiquez votre date d'entrée dans l'entreprise pour que le solde
              de congés soit calculé automatiquement.
            </p>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Date de début de contrat
              </label>
              <input
                type="date"
                value={newHireDate}
                onChange={(e) => setNewHireDate(e.target.value)}
                className="input-md w-full"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <ProtectedAction module="conges" action="edit">
                <button
                  onClick={updateHireDate}
                  className="btn-primary btn-md flex-1"
                >
                  Enregistrer
                </button>
              </ProtectedAction>
              <button
                onClick={() => setShowHireDateModal(false)}
                className="btn-secondary btn-md"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
