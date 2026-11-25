// src/components/auth/RoleGuard.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useDemo } from "../../contexts/DemoContext";

interface RoleGuardProps {
  children: ReactNode;
}

export const RESTRICTED_ROLE = "user";

export function RoleGuard({ children }: RoleGuardProps) {
  const { user, loading, isDemo } = useAuth();
  const { isDemo: isDemoContext } = useDemo();

  const inDemo = isDemo || isDemoContext;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (inDemo) return <>{children}</>;
  if (!user) return <>{children}</>;

  // A restricted account has no module access until an administrator assigns
  // a real role. Backend authorization stays authoritative; this is UX only.
  if (user.role === RESTRICTED_ROLE) {
    return <Navigate to="/pending-approval" replace />;
  }

  const hasNoRole = !user.role || user.role === "";
  if (hasNoRole) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
