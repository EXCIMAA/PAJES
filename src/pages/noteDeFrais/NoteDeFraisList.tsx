import React, { useEffect, useState } from "react";
import { dbApi } from "../../lib/apiClient";
import { addNotification } from "../../lib/notifications";
import { useNotification, useConfirm } from "../../contexts/NotificationContext";
import { format } from "date-fns";
import { Receipt, Send, Trash2, Edit } from "lucide-react";
import { cn } from "../../lib/utils";

interface ExpenseReport {
  id: string;
  reference: string;
  collaborateur_name: string;
  mission_id: string;
  client_id: string;
  status: string;
  total_ht: number;
  total_ttc: number;
  net_a_payer: number;
  created_at: string;
  date_debut: string;
  date_fin: string;
}

interface Props {
  onEdit: (id: string) => void;
  onRefresh: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  brouillon: "badge badge-neutral",
  soumis: "badge badge-warning",
  valide: "badge badge-success",
  rejete: "badge badge-error",
  rembourse: "badge badge-neutral",
};

export const NoteDeFraisList: React.FC<Props> = ({ onEdit, onRefresh }) => {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { notify } = useNotification();
  const confirm = useConfirm();

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await dbApi.list<ExpenseReport>("expense_reports", {
        orderBy: "created_at",
        orderAsc: false,
        limit: 500,
      });
      setReports(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSubmit = async (id: string) => {
    const confirmed = await confirm({
      title: "Soumettre cette note de frais ?",
      message: "Cette note de frais sera envoyée pour validation.",
      variant: "primary",
      confirmLabel: "Soumettre",
      cancelLabel: "Annuler",
    });
    if (!confirmed) return;
    try {
      await dbApi.update("expense_reports", id, { status: "soumis" });
      await loadReports();
      onRefresh();
      void addNotification({
        title: "Note de frais soumise",
        message: "Une note de frais a été soumise pour validation.",
        type: "expense",
      });
    } catch (err: any) {
      notify.error("Erreur : " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Supprimer cette note de frais ?",
      message: "Cette action est irréversible.",
      variant: "danger",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (!confirmed) return;
    try {
      await dbApi.remove("expense_reports", id);
      await loadReports();
      onRefresh();
      void addNotification({
        title: "Note de frais supprimée",
        message: "Une note de frais a été supprimée.",
        type: "expense",
      });
    } catch (err: any) {
      notify.error("Erreur : " + err.message);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-app-secondary">Chargement...</div>;
  }

  if (error) {
    return <div className="py-4 text-sm text-error-600 dark:text-error-400">Erreur : {error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="py-12 text-center">
        <Receipt className="mx-auto mb-3 h-10 w-10 text-app-tertiary opacity-50" />
        <p className="text-sm text-app-secondary">Aucune note de frais.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-app text-app-tertiary">
            <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Référence</th>
            <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Collaborateur</th>
            <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Période</th>
            <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Total HT</th>
            <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Net à payer</th>
            <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Statut</th>
            <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-b border-app">
              <td className="px-3 py-2.5 text-app-primary font-medium">{report.reference}</td>
              <td className="px-3 py-2.5 text-app-primary">{report.collaborateur_name}</td>
              <td className="px-3 py-2.5 text-app-secondary whitespace-nowrap">
                {report.date_debut && report.date_fin
                  ? `${format(new Date(report.date_debut), "dd/MM/yyyy")} - ${format(new Date(report.date_fin), "dd/MM/yyyy")}`
                  : "Non défini"}
              </td>
              <td className="px-3 py-2.5 text-app-primary whitespace-nowrap">{report.total_ht.toFixed(0)} FCFA</td>
              <td className="px-3 py-2.5 text-app-primary whitespace-nowrap">{report.net_a_payer.toFixed(0)} FCFA</td>
              <td className="px-3 py-2.5">
                <span className={cn(STATUS_BADGE[report.status] || "badge badge-neutral")}>
                  {report.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex gap-2">
                  <button onClick={() => onEdit(report.id)} className="btn-secondary btn-sm">
                    <Edit className="h-3.5 w-3.5" /> Éditer
                  </button>
                  {report.status === "brouillon" && (
                    <>
                      <button onClick={() => handleSubmit(report.id)} className="btn-primary btn-sm">
                        <Send className="h-3.5 w-3.5" /> Soumettre
                      </button>
                      <button onClick={() => handleDelete(report.id)} className="btn-danger btn-sm">
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
