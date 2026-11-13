import { notificationsApi } from "../api/notifications";

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  all: "Toutes",
  assignment: "Assignations",
  alert: "Alertes",
  leave: "Congés",
  document: "Documents",
  engagement: "Missions",
  client: "Clients",
  invoice: "Factures",
  stock: "Stocks",
  asset: "Immobilisations",
  team: "Équipe",
  report: "Rapports",
  review_note: "Notes de revue",
  working_paper: "Documents de travail",
  finding: "Constats",
  expense: "Notes de frais",
};

export type NotificationPayload = {
  title: string;
  message?: string | null; // rendu optionnel
  type?: string;
};

export async function addNotification({
  title,
  message,
  type = "alert",
}: NotificationPayload) {
  const finalMessage = message?.trim() || `Notification : ${title}`;
  try {
    await notificationsApi.create({
      title,
      message: finalMessage,
      type,
    });
  } catch (err) {
    console.error("Notification non enregistrée:", err);
  }
}