import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { checkDatabaseConnection, isSupabaseConfigured } from '../lib/supabase';

interface DatabaseContextValue {
  connected: boolean;
  checking: boolean;
  error: string | null;
  recheck: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      setChecking(true);
      if (!isSupabaseConfigured) {
        if (!cancelled) {
          setConnected(false);
          setError('Variables Supabase manquantes dans .env');
          setChecking(false);
        }
        return;
      }

      const result = await checkDatabaseConnection();
      if (!cancelled) {
        setConnected(result.ok);
        setError(result.error ?? null);
        setChecking(false);
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [tick]);

  const value = useMemo(
    () => ({
      connected,
      checking,
      error,
      recheck: () => setTick((t) => t + 1),
    }),
    [connected, checking, error]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within DatabaseProvider');
  return context;
}
