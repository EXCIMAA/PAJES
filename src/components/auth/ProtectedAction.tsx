// src/components/auth/ProtectedAction.tsx
import type { ReactNode } from "react";
import { usePermission } from "../../hooks/usePermission";
import type { ActionId, ModuleId } from "../../lib/permissions";

interface ProtectedActionProps {
  module: ModuleId;
  action: ActionId;
  children: ReactNode;
  /**
   * Optional: What to render if the user doesn't have permission.
   * By default, it will render the children but intercept clicks to show an alert.
   */
  fallback?: ReactNode;
  /**
   * "alert" (default) = Render children, show alert on click if not permitted
   * "hide" = Do not render the children at all if not permitted
   */
  mode?: "alert" | "hide";
}

// Bilingual labels for the alert messages
const MODULE_LABELS: Record<string, { fr: string; en: string }> = {
  clients: { fr: "Clients", en: "Clients" },
  missions: { fr: "Missions", en: "Missions" },
  review_notes: { fr: "Notes de revue", en: "Review Notes" },
  findings: { fr: "Constats", en: "Findings" },
  besoins_cabinet: { fr: "Besoins cabinet", en: "Cabinet Needs" },
  stock: { fr: "Stock", en: "Stock" },
  immobilisations: { fr: "Immobilisations", en: "Fixed Assets" },
  caisse: { fr: "Caisse", en: "Cash Register" },
  suivi_cac: { fr: "Suivi CAC", en: "CAC Follow-up" },
  conges: { fr: "Congés", en: "Leaves" },
  manuel: { fr: "Manuel", en: "Manual" },
  notes_frais: { fr: "Notes de frais", en: "Expense Reports" },
  fournisseurs: { fr: "Fournisseurs", en: "Suppliers" },
  ressources_internes: { fr: "Ressources internes", en: "Internal Resources" },
  collaborateurs: { fr: "Collaborateurs", en: "Collaborators" },
  factures: { fr: "Factures", en: "Invoices" },
};

const ACTION_LABELS: Record<ActionId, { fr: string; en: string }> = {
  create: { fr: "créer", en: "create" },
  view: { fr: "consulter", en: "view" },
  edit: { fr: "modifier", en: "edit" },
  delete: { fr: "supprimer", en: "delete" },
};

export function ProtectedAction({
  module,
  action,
  children,
  fallback = null,
  mode = "alert",
}: ProtectedActionProps) {
  const { can, role } = usePermission();
  const isAllowed = can(module, action);

  // If the user has permission, render the children normally.
  if (isAllowed) {
    return <>{children}</>;
  }

  // If mode is "hide", don't render the children at all.
  if (mode === "hide") {
    return <>{fallback}</>;
  }

  // mode === "alert" : Keep the button visible, but block the action.
  const isDemo =
    typeof window !== "undefined" &&
    localStorage.getItem("pajes_demo_mode") === "true";

  const hasNoRole =
    !role || role === "" || role === "null" || role === "undefined";

  const handleBlockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const moduleLabel = MODULE_LABELS[module]?.fr || module;
    const actionLabel = ACTION_LABELS[action]?.fr || action;

    // Message for Demo Mode
    if (isDemo) {
      alert(
        `🎭 Mode démo actif\n\n` +
          `Vous ne pouvez pas ${actionLabel} dans le module "${moduleLabel}".\n\n` +
          `Le mode démo est en lecture seule — les modifications ne sont pas sauvegardées.`,
      );
      return;
    }

    // Message for users without a valid role
    if (hasNoRole) {
      alert(
        `⛔ Accès refusé\n\n` +
          `Vous devez être associé à un rôle pour ${actionLabel} dans le module "${moduleLabel}".\n\n` +
          `Contactez votre administrateur PAJES.`,
      );
      return;
    }

    // Message for users with a role that lacks the specific permission
    alert(
      `⛔ Permission insuffisante\n\n` +
        `Votre rôle actuel ne vous permet pas de ${actionLabel} dans le module "${moduleLabel}".\n\n` +
        `Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.`,
    );
  };

  // Render children but block the click at the wrapper level.
  // The inner div has pointerEvents: "none" so the click is captured by the outer div,
  // which then shows the alert.
  return (
    <div
      onClickCapture={handleBlockedClick}
      style={{ display: "inline-block", cursor: "not-allowed" }}
      title={`Non autorisé — Vous n'avez pas la permission de ${ACTION_LABELS[action]?.fr}`}
    >
      <div
        style={{
          pointerEvents: "none",
          opacity: 0.6,
          filter: "grayscale(50%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
