// src/hooks/useSupabaseData.ts
import { useCallback, useEffect, useState } from "react";
import { dbApi } from "../lib/apiClient";
import { useDemo } from "../contexts/DemoContext";
import { useAuth } from "../contexts/AuthContext";
import { DEMO_DATA } from "../lib/demoData";

interface UseSupabaseQueryOptions {
  table: string;
  select?: string;
  orderBy?: string;
  orderAsc?: boolean;
  filters?: Record<string, any>;
}

export function useSupabaseQuery<T>({
  table,
  select = "*",
  orderBy,
  orderAsc = true,
  filters = {},
}: UseSupabaseQueryOptions) {
  const { isDemo: isDemoContext } = useDemo();
  const { isDemo: isDemoAuth } = useAuth();
  const isDemo = isDemoContext || isDemoAuth;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // ⭐ Trigger for refetch

  const fetchData = useCallback(async () => {
    // DEMO MODE: return mock data
    if (isDemo) {
      const mockData = DEMO_DATA[table] || [];
      setData(mockData as T[]);
      setLoading(false);
      setError(null);
      return;
    }

    // NORMAL MODE
    setLoading(true);
    setError(null);
    try {
      void select;
      const stringFilters = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [key, String(value)]),
      );

      const result = await dbApi.list<T>(table, {
        orderBy,
        orderAsc,
        filters: stringFilters,
        limit: 500,
      });

      setData((result || []) as T[]);
    } catch (err: any) {
      console.error(`[useSupabaseQuery] Erreur sur ${table}:`, err);
      setError(err.message || "Erreur de chargement");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, select, orderBy, orderAsc, isDemo, JSON.stringify(filters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData, tick]);

  // ⭐ Manual refetch
  const refetch = useCallback(async () => {
    setTick((t) => t + 1);
  }, []);

  return { data, loading, error, refetch };
}