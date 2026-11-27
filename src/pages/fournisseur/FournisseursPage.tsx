import React, { useEffect, useState } from "react";
import { addNotification } from "../../lib/notifications";
import { suppliersApi, type Supplier } from "../../api/suppliers";
import { useNotification, useConfirm } from "../../contexts/NotificationContext";
import { format, differenceInDays } from "date-fns";
import {
  Truck,
  Plus,
  X,
  Edit,
  Trash2,
  CheckCircle,
  BarChart3,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ProtectedAction } from "../../components/auth/ProtectedAction";
import { PageHeader } from "../../components/ui/PageHeader";
import { cn } from "../../lib/utils";

export const FournisseursPage: React.FC = () => {
  const [fournisseurs, setFournisseurs] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    alert_date: "",
    recurring_day: "",
    is_recurring: false,
    message: "",
    total_depenses: "",
  });

  const { notify } = useNotification();
  const confirm = useConfirm();

  const loadFournisseurs = async () => {
    try {
      setLoading(true);
      const data = await suppliersApi.list();
      setFournisseurs(data);
      setError(null);
      await checkAlerts(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const checkAlerts = async (items: Supplier[]) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    for (const f of items) {
      if (f.is_done) continue;

      let shouldAlert = false;
      let targetDate: Date | null = null;
      let diff = 0;

      if (f.is_recurring && f.recurring_day) {
        const daysInMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
        ).getDate();
        const effectiveDay = Math.min(f.recurring_day, daysInMonth);
        const alertDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          effectiveDay,
        );
        diff = differenceInDays(alertDate, today);
        targetDate = alertDate;

        if (diff <= 0 && f.last_alert_date !== todayStr) {
          shouldAlert = true;
        }
      } else if (f.alert_date) {
        const alertDate = new Date(f.alert_date);
        diff = differenceInDays(alertDate, today);
        targetDate = alertDate;

        if (diff <= 0 && f.last_alert_date !== todayStr) {
          shouldAlert = true;
        }
      }

      if (shouldAlert && targetDate) {
        const diffDisplay = diff <= 0 ? "dépassée" : `dans ${diff} jour(s)`;
        void addNotification({
          title: `Alerte fournisseur : ${f.name}`,
          message:
            f.message ||
            `Échéance ${diffDisplay} (${format(targetDate, "dd/MM/yyyy")})`,
          type: "warning",
        });

        await suppliersApi.patch(f.id, { last_alert_date: todayStr });
      }
    }
  };

  useEffect(() => {
    loadFournisseurs();
    const interval = setInterval(() => void loadFournisseurs(), 60000);
    return () => clearInterval(interval);
  }, []);

  const totalFournisseurs = fournisseurs.length;
  const alertesActives = fournisseurs.filter((f) => !f.is_done).length;
  const totalDepenses = fournisseurs.reduce(
    (acc, f) => acc + Number(f.total_depenses || 0),
    0,
  );
  const moyenneDepenses =
    totalFournisseurs > 0 ? totalDepenses / totalFournisseurs : 0;

  const chartData = fournisseurs
    .filter((f) => Number(f.total_depenses || 0) > 0)
    .map((f) => ({
      name: f.name.length > 15 ? f.name.slice(0, 15) + "..." : f.name,
      dépenses: Number(f.total_depenses || 0),
    }));

  const handleOpenModal = (fournisseur?: Supplier) => {
    if (fournisseur) {
      setEditingId(fournisseur.id);
      setForm({
        name: fournisseur.name || "",
        alert_date: fournisseur.alert_date
          ? format(new Date(fournisseur.alert_date), "yyyy-MM-dd")
          : "",
        recurring_day: fournisseur.recurring_day?.toString() || "",
        is_recurring: fournisseur.is_recurring || false,
        message: fournisseur.message || "",
        total_depenses: String(fournisseur.total_depenses || ""),
      });
    } else {
      setEditingId(null);
      setForm({
        name: "",
        alert_date: "",
        recurring_day: "",
        is_recurring: false,
        message: "",
        total_depenses: "",
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type, checked } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      notify.error("Veuillez saisir le nom du fournisseur.");
      return;
    }

    if (form.is_recurring) {
      if (
        !form.recurring_day ||
        parseInt(form.recurring_day) < 1 ||
        parseInt(form.recurring_day) > 31
      ) {
        notify.error("Veuillez saisir un jour du mois valide (1-31).");
        return;
      }
    } else {
      if (!form.alert_date) {
        notify.error("Veuillez saisir une date d'alerte.");
        return;
      }
    }

    try {
      const payload = {
        name: form.name,
        message: form.message || "",
        total_depenses: form.total_depenses.trim() || "0",
        is_recurring: form.is_recurring,
        recurring_day: form.is_recurring ? parseInt(form.recurring_day) : null,
        alert_date: !form.is_recurring ? form.alert_date : null,
      };

      if (editingId) {
        await suppliersApi.update(editingId, payload);
        void addNotification({
          title: "Fournisseur modifié",
          message: `${form.name} a été mis à jour.`,
          type: "success",
        });
      } else {
        await suppliersApi.create(payload);
        void addNotification({
          title: "Fournisseur ajouté",
          message: `${form.name} a été ajouté.`,
          type: "success",
        });
      }
      handleCloseModal();
      await loadFournisseurs();
    } catch (err) {
      notify.error(
        "Erreur : " + (err instanceof Error ? err.message : "Erreur inconnue"),
      );
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Supprimer ce fournisseur ?",
      message: "Cette action est irréversible.",
      variant: "danger",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (!confirmed) return;
    try {
      await suppliersApi.delete(id);
      await loadFournisseurs();
      void addNotification({
        title: "Fournisseur supprimé",
        message: "Le fournisseur a été supprimé.",
        type: "warning",
      });
    } catch (err) {
      notify.error(
        "Erreur : " + (err instanceof Error ? err.message : "Erreur inconnue"),
      );
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      await suppliersApi.patch(id, { is_done: true, last_alert_date: null });
      await loadFournisseurs();
      void addNotification({
        title: "Alerte terminée",
        message: "L'alerte a été marquée comme terminée.",
        type: "success",
      });
    } catch (err) {
      notify.error(
        "Erreur : " + (err instanceof Error ? err.message : "Erreur inconnue"),
      );
    }
  };

  const stats = [
    { label: "Total fournisseurs", value: String(totalFournisseurs), border: "border-l-primary-500" },
    { label: "Alertes actives", value: String(alertesActives), border: "border-l-warning-500" },
    { label: "Total des dépenses", value: `${totalDepenses.toLocaleString()} FCFA`, border: "border-l-success-500" },
    { label: "Moyenne par fournisseur", value: `${moyenneDepenses.toLocaleString()} FCFA`, border: "border-l-cyan-500" },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Fournisseurs"
        description="Gérez vos fournisseurs, suivez les dépenses et recevez des alertes d'échéance."
        actions={
          <ProtectedAction module="fournisseurs" action="create">
            <button onClick={() => handleOpenModal()} className="btn-primary btn-md">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </ProtectedAction>
        }
      />

      {error && (
        <div className="card mb-6 flex items-center justify-between border border-error-500/30 p-4">
          <span className="text-sm text-error-600 dark:text-error-400">Erreur de chargement : {error}</span>
          <button onClick={() => void loadFournisseurs()} className="btn-secondary btn-sm">
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={cn("card p-5 border-l-4", s.border)}>
            <p className="text-2xl font-bold text-app-primary">{s.value}</p>
            <p className="mt-1 text-2xs font-semibold uppercase tracking-wide text-app-tertiary">{s.label}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
            <BarChart3 className="h-4 w-4" />
            Dépenses par fournisseur
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-app" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fill: "var(--color-text-tertiary)" }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
                width={100}
              />
              <Tooltip
                formatter={(value) => `${Number(value).toLocaleString()} FCFA`}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                }}
              />
              <Bar dataKey="dépenses" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={index % 2 === 0 ? "#1d4ed8" : "#06b6d4"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-x-auto p-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-app-secondary">Chargement...</div>
        ) : fournisseurs.length === 0 ? (
          <div className="py-12 text-center">
            <Truck className="mx-auto mb-3 h-10 w-10 text-app-tertiary opacity-50" />
            <p className="text-sm text-app-secondary">Aucun fournisseur enregistré.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-app text-app-tertiary">
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Nom</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Date d'alerte</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Message</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Total dépenses</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Statut</th>
                <th className="px-3 py-2.5 text-center text-2xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fournisseurs.map((f) => {
                const isActive = !f.is_done;
                const today = new Date();
                let alertDisplay = "";
                let isUrgent = false;

                if (f.is_recurring && f.recurring_day) {
                  const daysInMonth = new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    0,
                  ).getDate();
                  const effectiveDay = Math.min(f.recurring_day, daysInMonth);
                  const alertDate = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    effectiveDay,
                  );
                  const diff = differenceInDays(alertDate, today);
                  isUrgent = diff <= 0 && isActive;
                  alertDisplay = `Jour ${f.recurring_day} (mensuel)`;
                } else if (f.alert_date) {
                  const alertDate = new Date(f.alert_date);
                  const diff = differenceInDays(alertDate, today);
                  isUrgent = diff <= 0 && isActive;
                  alertDisplay = format(alertDate, "dd/MM/yyyy");
                }

                return (
                  <tr key={f.id} className={cn("border-b border-app", isUrgent && "bg-error-500/10")}>
                    <td className="px-3 py-2.5 text-app-primary">
                      {f.name}
                      {f.is_recurring && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary-500/15 px-2 py-0.5 text-2xs font-semibold text-primary-600 dark:text-primary-400">
                          <RefreshCw className="h-2.5 w-2.5" /> Récurrent
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-app-secondary">{alertDisplay}</td>
                    <td className="px-3 py-2.5 text-app-secondary">{f.message || "-"}</td>
                    <td className="px-3 py-2.5 text-app-primary whitespace-nowrap">{Number(f.total_depenses || 0).toLocaleString()} FCFA</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "badge",
                          isActive
                            ? isUrgent
                              ? "bg-error-500/15 text-error-600 dark:text-error-400 ring-1 ring-error-500/25"
                              : "bg-warning-500/15 text-warning-600 dark:text-warning-400 ring-1 ring-warning-500/25"
                            : "bg-success-500/15 text-success-600 dark:text-success-400 ring-1 ring-success-500/25",
                        )}
                      >
                        {isActive ? (isUrgent ? "En alerte" : "Actif") : "Terminé"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap justify-center gap-2">
                        {isActive && (
                          <ProtectedAction module="fournisseurs" action="edit">
                            <button onClick={() => handleMarkDone(f.id)} className="btn-sm bg-success-600 text-white hover:bg-success-500">
                              <CheckCircle className="h-3.5 w-3.5" /> Terminé
                            </button>
                          </ProtectedAction>
                        )}
                        <ProtectedAction module="fournisseurs" action="edit">
                          <button onClick={() => handleOpenModal(f)} className="btn-secondary btn-sm">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="fournisseurs" action="delete">
                          <button onClick={() => handleDelete(f.id)} className="btn-danger btn-sm">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </ProtectedAction>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content max-w-[500px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-app-primary">
                {editingId ? "Modifier le fournisseur" : "Ajouter un fournisseur"}
              </h2>
              <button onClick={handleCloseModal} className="btn-ghost btn-sm">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3 flex flex-col gap-1.5">
                <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Nom *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Nom du fournisseur" className="input-md" required />
              </div>

              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm text-app-secondary cursor-pointer">
                  <input type="checkbox" name="is_recurring" checked={form.is_recurring} onChange={handleChange} className="h-[18px] w-[18px] accent-primary-500" />
                  <Calendar className="h-4 w-4" />
                  Alerte récurrente chaque mois
                </label>
              </div>

              {form.is_recurring ? (
                <div className="mb-3 flex flex-col gap-1.5">
                  <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Jour du mois (1-31) *</label>
                  <input name="recurring_day" type="number" min="1" max="31" value={form.recurring_day} onChange={handleChange} placeholder="Ex: 10" className="input-md" required />
                  <small className="text-xs text-app-tertiary">L'alerte se déclenchera chaque mois à cette date et continuera jusqu'à résolution.</small>
                </div>
              ) : (
                <div className="mb-3 flex flex-col gap-1.5">
                  <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Date d'alerte *</label>
                  <input name="alert_date" type="date" value={form.alert_date} onChange={handleChange} className="input-md" required />
                </div>
              )}

              <div className="mb-3 flex flex-col gap-1.5">
                <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Message</label>
                <textarea name="message" value={form.message} onChange={handleChange} placeholder="Message d'alerte" className="input-md min-h-[60px] resize-vertical" />
              </div>

              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-2xs font-semibold uppercase tracking-wide text-app-tertiary">Total des dépenses (FCFA)</label>
                <input name="total_depenses" type="number" step="0.01" value={form.total_depenses} onChange={handleChange} placeholder="0" className="input-md" />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="btn-secondary btn-md">Annuler</button>
                <ProtectedAction module="fournisseurs" action={editingId ? "edit" : "create"}>
                  <button type="submit" className="btn-primary btn-md">
                    {editingId ? "Mettre à jour" : "Ajouter"}
                  </button>
                </ProtectedAction>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
