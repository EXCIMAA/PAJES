// src/App.tsx
import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleGuard } from "./components/auth/RoleGuard";
import { AuthPage } from "./pages/auth/AuthPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { PendingApprovalPage } from "./pages/PendingApprovalPage";
import { DemoProvider } from "./contexts/DemoContext";
import { WriteBlocker } from "./components/security/WriteBlocker";

// ========== FALLBACK ==========
function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      </div>
    </div>
  );
}

function ErrorFallback({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: "2rem",
        color: "red",
        background: "#1e1e2f",
        minHeight: "100vh",
      }}
    >
      <h2>{t("app.errorLoading")}</h2>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {error.message}
      </pre>
      <button onClick={() => window.location.reload()}>{t("app.retry")}</button>
    </div>
  );
}

const lazyWithError = (importFn: () => Promise<any>) => {
  return lazy(() =>
    importFn().catch((error) => {
      console.error("Error loading component:", error);
      return { default: () => <ErrorFallback error={error} /> };
    }),
  );
};

// ========== LAZY PAGES ==========
const DashboardPage = lazyWithError(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ClientsPage = lazyWithError(() => import("./pages/clients/ClientsPage"));
const EngagementsPage = lazyWithError(() =>
  import("./pages/engagements/EngagementsPage").then((m) => ({
    default: m.EngagementsPage,
  })),
);
const ReviewNotesPage = lazyWithError(() =>
  import("./pages/review-notes/ReviewNotesPage").then((m) => ({
    default: m.ReviewNotesPage,
  })),
);
const FindingsPage = lazyWithError(() =>
  import("./pages/FindingsPage").then((m) => ({ default: m.FindingsPage })),
);
const WorkingPapersPage = lazyWithError(() =>
  import("./pages/working-papers/WorkingPapersPage").then((m) => ({
    default: m.WorkingPapersPage,
  })),
);
const StockPage = lazyWithError(() =>
  import("./pages/stock/StockPage").then((m) => ({ default: m.StockPage })),
);
const FixedAssetsPage = lazyWithError(() =>
  import("./pages/fixed-assets/FixedAssetsPage").then((m) => ({
    default: m.FixedAssetsPage,
  })),
);
const SearchPage = lazyWithError(() => import("./pages/search/SearchPage"));
const LeavePage = lazyWithError(() =>
  import("./pages/leave/LeavePage").then((m) => ({ default: m.LeavePage })),
);
const TeamPage = lazyWithError(() =>
  import("./pages/team/TeamPage").then((m) => ({ default: m.TeamPage })),
);
const ReportsPage = lazyWithError(() => import("./pages/reports/ReportsPage"));
const BusinessIntelligencePage = lazyWithError(
  () => import("./pages/business-intelligence/BusinessIntelligencePage"),
);
const NotificationsPage = lazyWithError(() =>
  import("./pages/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const Manuel = lazyWithError(() => import("./pages/manuel/Manuel"));
const NoteDeFrais = lazyWithError(() => import("./pages/noteDeFrais/index"));

const CollaborateurFiche = lazyWithError(
  () => import("./pages/collaborateurs/CollaborateurFiche"),
);
const CollaborateurList = lazyWithError(() =>
  import("./pages/collaborateurs/CollaborateurList").then((m) => ({
    default: m.CollaborateurList,
  })),
);

const InvoicesPage = lazyWithError(
  () => import("./pages/facture/InvoicesPage"),
);
const InvoiceDetailPage = lazyWithError(
  () => import("./pages/facture/InvoiceDetailPage"),
);
const InvoiceFormPage = lazyWithError(
  () => import("./pages/facture/InvoiceFormPage"),
);

const CACFollowUpPage = lazyWithError(() =>
  import("./pages/cac/CACFollowUpPage").then((m) => ({
    default: m.default,
  })),
);
const ResourcesPage = lazyWithError(() =>
  import("./pages/resources/ResourcesPage").then((m) => ({
    default: m.ResourcesPage,
  })),
);
const FournisseursPage = lazyWithError(() =>
  import("./pages/fournisseur/FournisseursPage").then((m) => ({
    default: m.FournisseursPage,
  })),
);
const ProfilePage = lazyWithError(() =>
  import("./pages/profile/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);
const LegalCenterPage = lazyWithError(() =>
  import("./pages/legal/LegalCenterPage").then((m) => ({
    default: m.LegalCenterPage,
  })),
);

import { CaissePage } from "./pages/caisse/CaissePage";
import MissionCACListe from "./pages/missions/cac/MissionCACListe";
import MissionCACForm from "./pages/missions/cac/MissionCACForm";
import MissionCACDetail from "./pages/missions/cac/MissionCACDetail";

// ========== APP SHELL ==========
function AppShell() {
  return (
    <ProtectedRoute>
      <RoleGuard>
        <AppLayout>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </AppLayout>
      </RoleGuard>
    </ProtectedRoute>
  );
}

// ========== APP ==========
function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <WriteBlocker />
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/legal" element={<LegalCenterPage />} />
          <Route
            path="/signup"
            element={<Navigate to="/login?tab=signup" replace />}
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Pending approval */}
          <Route
            path="/pending-approval"
            element={
              <ProtectedRoute>
                <PendingApprovalPage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/engagements" element={<EngagementsPage />} />
            <Route path="/review-notes" element={<ReviewNotesPage />} />
            <Route path="/findings" element={<FindingsPage />} />
            <Route path="/working-papers" element={<WorkingPapersPage />} />
            <Route
              path="/upload"
              element={<Navigate to="/working-papers" replace />}
            />
            <Route
              path="/working-papers/request"
              element={<Navigate to="/working-papers" replace />}
            />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/fixed-assets" element={<FixedAssetsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/leave" element={<LeavePage />} />
            <Route
              path="/leave/request"
              element={<Navigate to="/leave" replace />}
            />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/business-intelligence"
              element={<BusinessIntelligencePage />}
            />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/manuel" element={<Manuel />} />
            <Route path="/note-de-frais" element={<NoteDeFrais />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/caisse" element={<CaissePage />} />
            <Route path="/collaborateurs" element={<CollaborateurList />} />
            <Route
              path="/collaborateurs/new"
              element={<CollaborateurFiche />}
            />
            <Route
              path="/collaborateurs/:id"
              element={<CollaborateurFiche />}
            />
            <Route path="/fournisseurs" element={<FournisseursPage />} />
            <Route path="/factures" element={<InvoicesPage />} />
            <Route path="/factures/new" element={<InvoiceFormPage />} />
            <Route path="/factures/:id" element={<InvoiceDetailPage />} />
            <Route path="/factures/:id/edit" element={<InvoiceFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/missions/cac" element={<MissionCACListe />} />
            <Route path="/missions/cac/nouveau" element={<MissionCACForm />} />
            <Route path="/missions/cac/:id" element={<MissionCACDetail />} />
            <Route path="/missions/cac/:id/edit" element={<MissionCACForm />} />
            <Route path="/cac-suivi" element={<CACFollowUpPage />} />

            {/* Catch-all: redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </DemoProvider>
    </BrowserRouter>
  );
}

export default App;
