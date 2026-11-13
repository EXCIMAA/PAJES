import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { ApiError, api } from "../lib/api";

interface DatabaseContextValue {
  connected: boolean;
  checking: boolean;
  error: string | null;
  recheck: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useAuth();
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (isDemo) {
        setConnected(false);
        setError(null);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        await api.get<{ status: string; db: { ok: boolean; detail: string } }>(
          "/health/ready",
        );
        if (!cancelled) {
          setConnected(true);
          setError(null);
        }
      } catch (verificationError) {
        if (!cancelled) {
          setConnected(false);
          setError(
            verificationError instanceof ApiError &&
              verificationError.status === 503
              ? "La base PostgreSQL configurée est indisponible."
              : verificationError instanceof Error
                ? verificationError.message
                : "Impossible de vérifier l'état de l'API PAJES.",
          );
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [isDemo, tick]);

  const recheck = useCallback(() => {
    setTick((current) => current + 1);
  }, []);

  const value = useMemo(
    () => ({
      connected,
      checking,
      error,
      recheck,
    }),
    [connected, checking, error, recheck],
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error("useDatabase must be used within DatabaseProvider");
  return context;
}
