// src/components/auth/PermissionGate.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import type { ActionId, ModuleId } from "../../lib/permissions";

interface PermissionGateProps {
  module: ModuleId;
  action?: ActionId;
  children: ReactNode;
}

/**
 * Protects an entire page. Redirects to "/" if unauthorized.
 * Handles loading state to avoid false redirects during auth bootstrap.
 *
 * Usage in App.tsx:
 *   <Route path="/clients" element={
 *     <PermissionGate module="clients">
 *       <ClientsPage />
 *     </PermissionGate>
 *   } />
 */
export function PermissionGate({
  module,
  action = "view",
  children,
}: PermissionGateProps) {
  const { loading } = useAuth();
  const { can } = usePermission();

  // ⏳ Pendant le chargement du profil, on attend
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // 🚫 Pas de permission → redirection
  if (!can(module, action)) {
    return <Navigate to="/" replace />;
  }

  // ✅ Autorisé
  return <>{children}</>;
}
