// src/components/auth/ProtectedRoute.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useDemo } from "../../contexts/DemoContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { isDemo } = useDemo();

  // ⭐ MODE DÉMO : accès autorisé sans authentification
  if (isDemo) {
    return <>{children}</>;
  }

  // Pendant le chargement de l'auth, afficher un spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Pas connecté → redirection vers login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
