import {
  ACTION_LABELS,
  MODULE_LABELS,
  hasPermission,
  type ActionId,
  type ModuleId,
} from "./permissions";
import { notify } from "../contexts/NotificationContext";

function currentRole(): string | undefined {
  try {
    const role = localStorage.getItem("pajes_user_role");
    if (!role || role === "null" || role === "undefined") return undefined;
    return role;
  } catch {
    return undefined;
  }
}

export function currentPermissionUser(): { role?: string | null } {
  return { role: currentRole() ?? null };
}

export function assertPermission(module: ModuleId, action: ActionId): boolean {
  const user = currentPermissionUser();
  if (hasPermission(user, module, action)) return true;

  const moduleLabel = MODULE_LABELS[module] || module;
  const actionLabel = ACTION_LABELS[action] || action;
  notify.warning(
    `Votre rôle actuel ne vous permet pas de ${actionLabel.toLowerCase()} dans le module « ${moduleLabel} ».`,
    { title: "⛔ Permission insuffisante", duration: 6000 },
  );
  return false;
}
