// src/pages/Fournisseurs/FournisseursPage.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import { addNotification } from "../../lib/notifications";
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
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

// ========== STYLES ==========
const Container = styled.div`
  padding: 24px;
  color: #e2e8f0;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    gap: 12px;
    svg {
      color: #4facfe;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
`;

const StatCard = styled.div<{ color?: string }>`
  background: #1e293b;
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid ${({ color }) => color || "#4facfe"};
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 4px;
  }
  .stat-label {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .stat-sub {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }
`;

const ChartContainer = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 28px;
  border: 1px solid #334155;
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    h3 {
      color: #94a3b8;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4facfe;
    }
  }
`;

const Button = styled.button<{
  variant?: "primary" | "secondary" | "danger" | "success";
}>`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${({ variant }) => {
    switch (variant) {
      case "primary":
        return "background: #1e3a5f; color: #fff; &:hover { background: #2a4f7f; }";
      case "secondary":
        return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
      case "danger":
        return "background: #dc2626; color: #fff; &:hover { background: #b91c1c; }";
      case "success":
        return "background: #10b981; color: #fff; &:hover { background: #059669; }";
      default:
        return "background: #1e293b; color: #e2e8f0; &:hover { background: #334155; }";
    }
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  background: #1e293b;
  border-radius: 12px;
  padding: 16px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #2d3748;
    text-align: left;
    vertical-align: middle;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
    background: #0f172a;
  }
  td {
    color: #e2e8f0;
  }
`;

const StatusBadge = styled.span<{ active: boolean }>`
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  ${({ active }) =>
    active
      ? "background: #7f1d1d; color: #fca5a5;"
      : "background: #14532d; color: #86efac;"}
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const Modal = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  border: 1px solid #334155;
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    h2 {
      color: #e2e8f0;
      font-size: 18px;
    }
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  input,
  textarea {
    padding: 8px 12px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: #0f172a;
    color: #e2e8f0;
    font-size: 13px;
    &:focus {
      outline: none;
      border-color: #4facfe;
    }
  }
  textarea {
    resize: vertical;
    min-height: 60px;
  }
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 10px;
    label {
      font-size: 13px;
      color: #e2e8f0;
      text-transform: none;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #4facfe;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  svg {
    margin-bottom: 12px;
    opacity: 0.5;
  }
  p {
    font-size: 14px;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const RecurringBadge = styled.span`
  display: inline-block;
  background: #1e3a5f;
  color: #4facfe;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 6px;
`;

// ========== COMPOSANT PRINCIPAL ==========
export const FournisseursPage: React.FC = () => {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Charger les données
  const loadFournisseurs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("fournisseurs")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setFournisseurs(data || []);
      // Vérifier les alertes
      await checkAlerts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ========== ALERTE PERSISTANTE (chaque jour jusqu'à résolution) ==========
  const checkAlerts = async (items: any[]) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    for (const f of items) {
      // Ignorer si déjà marqué terminé
      if (f.is_done) continue;

      let shouldAlert = false;
      let targetDate = null;
      let diff = 0;

      if (f.is_recurring && f.recurring_day) {
        // Alerte récurrente mensuelle
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

        // On notifie si aujourd'hui est le jour J ou après (diff <= 0)
        // ET qu'on n'a pas déjà notifié aujourd'hui
        if (diff <= 0 && f.last_alert_date !== todayStr) {
          shouldAlert = true;
        }
      } else if (f.alert_date) {
        // Alerte ponctuelle
        const alertDate = new Date(f.alert_date);
        diff = differenceInDays(alertDate, today);
        targetDate = alertDate;

        // On notifie si aujourd'hui est le jour J ou après (diff <= 0)
        if (diff <= 0 && f.last_alert_date !== todayStr) {
          shouldAlert = true;
        }
      }

      if (shouldAlert && targetDate) {
        const diffDisplay = diff <= 0 ? "dépassée" : `dans ${diff} jour(s)`;
        // 🔔 Envoyer la notification système (toast)
        // ✅ FIX: removed `duration` — not part of NotificationPayload
        void addNotification({
          title: `⚠️ Alerte fournisseur : ${f.name}`,
          message:
            f.message ||
            `Échéance ${diffDisplay} (${format(targetDate, "dd/MM/yyyy")})`,
          type: "warning",
        });

        // Mettre à jour last_alert_date pour éviter les doublons du même jour
        await supabase
          .from("fournisseurs")
          .update({ last_alert_date: todayStr })
          .eq("id", f.id);
      }
    }
  };

  useEffect(() => {
    loadFournisseurs();
    // Vérifier les alertes toutes les 60 secondes (optionnel)
    const interval = setInterval(() => {
      loadFournisseurs();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Statistiques
  const totalFournisseurs = fournisseurs.length;
  const alertesActives = fournisseurs.filter((f) => !f.is_done).length;
  const totalDepenses = fournisseurs.reduce(
    (acc, f) => acc + (f.total_depenses || 0),
    0,
  );
  const moyenneDepenses =
    totalFournisseurs > 0 ? totalDepenses / totalFournisseurs : 0;

  // Données pour le graphique
  const chartData = fournisseurs
    .filter((f) => f.total_depenses > 0)
    .map((f) => ({
      name: f.name.length > 15 ? f.name.slice(0, 15) + "..." : f.name,
      dépenses: f.total_depenses || 0,
    }));

  const handleOpenModal = (fournisseur?: any) => {
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
        total_depenses: fournisseur.total_depenses?.toString() || "",
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
      alert("Veuillez saisir le nom du fournisseur.");
      return;
    }

    if (form.is_recurring) {
      if (
        !form.recurring_day ||
        parseInt(form.recurring_day) < 1 ||
        parseInt(form.recurring_day) > 31
      ) {
        alert("Veuillez saisir un jour du mois valide (1-31).");
        return;
      }
    } else {
      if (!form.alert_date) {
        alert("Veuillez saisir une date d'alerte.");
        return;
      }
    }

    try {
      const payload = {
        name: form.name,
        message: form.message || "",
        total_depenses: parseFloat(form.total_depenses) || 0,
        is_recurring: form.is_recurring,
        recurring_day: form.is_recurring ? parseInt(form.recurring_day) : null,
        alert_date: !form.is_recurring ? form.alert_date : null,
        last_alert_date: null, // on réinitialise pour permettre la nouvelle alerte
      };

      if (editingId) {
        const { error } = await supabase
          .from("fournisseurs")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        void addNotification({
          title: "Fournisseur modifié",
          message: `${form.name} a été mis à jour.`,
          type: "success",
        });
      } else {
        const { error } = await supabase.from("fournisseurs").insert([payload]);
        if (error) throw error;
        void addNotification({
          title: "Fournisseur ajouté",
          message: `${form.name} a été ajouté.`,
          type: "success",
        });
      }
      handleCloseModal();
      await loadFournisseurs();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce fournisseur ?")) return;
    try {
      const { error } = await supabase
        .from("fournisseurs")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadFournisseurs();
      void addNotification({
        title: "Fournisseur supprimé",
        message: "Le fournisseur a été supprimé.",
        type: "warning",
      });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fournisseurs")
        .update({ is_done: true, last_alert_date: null })
        .eq("id", id);
      if (error) throw error;
      await loadFournisseurs();
      void addNotification({
        title: "Alerte terminée",
        message: "L'alerte a été marquée comme terminée.",
        type: "success",
      });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  return (
    <Container>
      <Header>
        <h1>
          <Truck size={32} />
          FOURNISSEURS
        </h1>
        {/* ✅ WRAPPED: Ajouter button */}
        <ProtectedAction module="fournisseurs" action="create">
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <Plus size={16} /> Ajouter
          </Button>
        </ProtectedAction>
      </Header>

      {/* Dashboard */}
      <StatsGrid>
        <StatCard color="#4facfe">
          <div className="stat-value">{totalFournisseurs}</div>
          <div className="stat-label">Total fournisseurs</div>
        </StatCard>
        <StatCard color="#f59e0b">
          <div className="stat-value">{alertesActives}</div>
          <div className="stat-label">Alertes actives</div>
        </StatCard>
        <StatCard color="#10b981">
          <div className="stat-value">
            {totalDepenses.toLocaleString()} FCFA
          </div>
          <div className="stat-label">Total des dépenses</div>
        </StatCard>
        <StatCard color="#8b5cf6">
          <div className="stat-value">
            {moyenneDepenses.toLocaleString()} FCFA
          </div>
          <div className="stat-label">Moyenne par fournisseur</div>
        </StatCard>
      </StatsGrid>

      {/* Graphique */}
      {chartData.length > 0 && (
        <ChartContainer>
          <div className="chart-header">
            <h3>
              <BarChart3 size={18} />
              Dépenses par fournisseur
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fill: "#94a3b8" }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                width={100}
              />
              <Tooltip
                formatter={(value) => `${Number(value).toLocaleString()} FCFA`}
              />
              <Bar dataKey="dépenses" fill="#4facfe" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index % 2 === 0 ? "#1e3a5f" : "#4facfe"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* Tableau */}
      <TableWrapper>
        {loading ? (
          <div
            style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}
          >
            Chargement...
          </div>
        ) : fournisseurs.length === 0 ? (
          <EmptyState>
            <Truck size={48} />
            <p>Aucun fournisseur enregistré.</p>
          </EmptyState>
        ) : (
          <StyledTable>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Date d'alerte</th>
                <th>Message</th>
                <th>Total dépenses</th>
                <th>Statut</th>
                <th style={{ textAlign: "center" }}>Actions</th>
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
                  isUrgent = diff <= 0 && isActive; // si date passée ou aujourd'hui
                  alertDisplay = `Jour ${f.recurring_day} (mensuel)`;
                } else if (f.alert_date) {
                  const alertDate = new Date(f.alert_date);
                  const diff = differenceInDays(alertDate, today);
                  isUrgent = diff <= 0 && isActive;
                  alertDisplay = format(alertDate, "dd/MM/yyyy");
                }

                return (
                  <tr
                    key={f.id}
                    style={{
                      background: isUrgent
                        ? "rgba(220,38,38,0.15)"
                        : "transparent",
                    }}
                  >
                    <td>
                      {f.name}
                      {f.is_recurring && (
                        <RecurringBadge>
                          <RefreshCw size={10} /> Récurrent
                        </RecurringBadge>
                      )}
                    </td>
                    <td>{alertDisplay}</td>
                    <td>{f.message || "-"}</td>
                    <td>{f.total_depenses?.toLocaleString() || 0} FCFA</td>
                    <td>
                      <StatusBadge active={isActive}>
                        {isActive
                          ? isUrgent
                            ? "⚠️ En alerte"
                            : "Actif"
                          : "✅ Terminé"}
                      </StatusBadge>
                    </td>
                    <td>
                      <ActionGroup>
                        {isActive && (
                          // ✅ WRAPPED: Mark Done button (edit action)
                          <ProtectedAction module="fournisseurs" action="edit">
                            <Button
                              variant="success"
                              onClick={() => handleMarkDone(f.id)}
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                            >
                              <CheckCircle size={14} /> Terminé
                            </Button>
                          </ProtectedAction>
                        )}
                        {/* ✅ WRAPPED: Edit button */}
                        <ProtectedAction module="fournisseurs" action="edit">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenModal(f)}
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                          >
                            <Edit size={14} />
                          </Button>
                        </ProtectedAction>
                        {/* ✅ WRAPPED: Delete button */}
                        <ProtectedAction module="fournisseurs" action="delete">
                          <Button
                            variant="danger"
                            onClick={() => handleDelete(f.id)}
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </ProtectedAction>
                      </ActionGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </StyledTable>
        )}
      </TableWrapper>

      {/* Modal Ajout / Édition */}
      {modalOpen && (
        <ModalOverlay onClick={handleCloseModal}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingId
                  ? "Modifier le fournisseur"
                  : "Ajouter un fournisseur"}
              </h2>
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                style={{ padding: "4px" }}
              >
                <X size={18} />
              </Button>
            </div>
            <form onSubmit={handleSubmit}>
              <Field>
                <label>Nom *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nom du fournisseur"
                  required
                />
              </Field>

              <Field>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_recurring"
                      checked={form.is_recurring}
                      onChange={handleChange}
                    />
                    <Calendar size={16} />
                    Alerte récurrente chaque mois
                  </label>
                </div>
              </Field>

              {form.is_recurring ? (
                <Field>
                  <label>Jour du mois (1-31) *</label>
                  <input
                    name="recurring_day"
                    type="number"
                    min="1"
                    max="31"
                    value={form.recurring_day}
                    onChange={handleChange}
                    placeholder="Ex: 10"
                    required
                  />
                  <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                    L'alerte se déclenchera chaque mois à cette date et
                    continuera jusqu'à résolution.
                  </small>
                </Field>
              ) : (
                <Field>
                  <label>Date d'alerte *</label>
                  <input
                    name="alert_date"
                    type="date"
                    value={form.alert_date}
                    onChange={handleChange}
                    required
                  />
                </Field>
              )}

              <Field>
                <label>Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Message d'alerte"
                />
              </Field>

              <Field>
                <label>Total des dépenses (FCFA)</label>
                <input
                  name="total_depenses"
                  type="number"
                  step="0.01"
                  value={form.total_depenses}
                  onChange={handleChange}
                  placeholder="0"
                />
              </Field>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                  marginTop: "16px",
                }}
              >
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleCloseModal}
                >
                  Annuler
                </Button>
                {/* ✅ WRAPPED: Submit button (create or edit) */}
                <ProtectedAction
                  module="fournisseurs"
                  action={editingId ? "edit" : "create"}
                >
                  <Button variant="primary" type="submit">
                    {editingId ? "Mettre à jour" : "Ajouter"}
                  </Button>
                </ProtectedAction>
              </div>
            </form>
          </Modal>
        </ModalOverlay>
      )}
    </Container>
  );
};
