import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 👈 ajout
import "./lib/i18n";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import { CountryProvider } from "./contexts/CountryContext";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { supabase } from "./lib/supabase";
import "./index.css";

(window as any).supabase = supabase;

const queryClient = new QueryClient(); // 👈 création du client

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("L'élément #root est introuvable");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {" "}
      {/* 👈 wrapper */}
      <ThemeProvider>
        <AuthProvider>
          <PermissionProvider>
            <DatabaseProvider>
              <CountryProvider>
                <App />
              </CountryProvider>
            </DatabaseProvider>
          </PermissionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
