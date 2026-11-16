// src/hooks/useWriteGuard.ts
import { notify } from "../contexts/NotificationContext";

export function useWriteGuard() {
  const check = (): boolean => {
    try {
      const isDemo = localStorage.getItem("pajes_demo_mode") === "true";
      const role = localStorage.getItem("pajes_user_role");

      if (isDemo) {
        notify.warning("Mode démo : les modifications ne sont pas sauvegardées.", {
          title: "Mode démo",
        });
        return false;
      }

      if (!role || role === "" || role === "null") {
        notify.warning(
          "Votre compte est en attente de validation. Vous ne pouvez pas encore modifier les données.",
          { title: "Compte en attente", duration: 6000 },
        );
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  return { check };
}