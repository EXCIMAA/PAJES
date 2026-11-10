// src/hooks/useWriteGuard.ts
export function useWriteGuard() {
  const check = (): boolean => {
    try {
      const isDemo = localStorage.getItem("pajes_demo_mode") === "true";
      const role = localStorage.getItem("pajes_user_role");

      if (isDemo) {
        alert("⚠️ Mode démo : les modifications ne sont pas sauvegardées.");
        return false;
      }

      if (!role || role === "" || role === "null") {
        alert(
          "⚠️ Votre compte est en attente de validation. Vous ne pouvez pas encore modifier les données.",
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