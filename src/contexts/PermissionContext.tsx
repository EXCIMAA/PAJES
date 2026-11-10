import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import {
  buildDisplayedPermissionsMap,
  setRuntimePermissionMatrix,
  validateEnforcementAgainstTeamPage,
  type PermissionMatrix,
} from "../lib/permissions";

interface PermissionContextValue {
  matrix: PermissionMatrix;
  loading: boolean;
  reload: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue>({
  matrix: buildDisplayedPermissionsMap([]),
  loading: true,
  reload: async () => {},
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [matrix, setMatrix] = useState<PermissionMatrix>(() =>
    buildDisplayedPermissionsMap([]),
  );
  const [loading, setLoading] = useState(true);

  const apply = useCallback((next: PermissionMatrix) => {
    setRuntimePermissionMatrix(next);
    setMatrix(next);
    const conflicts = validateEnforcementAgainstTeamPage(next);
    if (conflicts.length > 0) {
      console.error(
        `[RBAC] ${conflicts.length} écart(s) TeamPage vs moteur :`,
        conflicts,
      );
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role, permissions");

    if (error) {
      console.error("[PermissionContext] load failed:", error.message);
      apply(buildDisplayedPermissionsMap([]));
      setLoading(false);
      return;
    }

    apply(buildDisplayedPermissionsMap(data || []));
    setLoading(false);
  }, [apply]);

  useEffect(() => {
    const defaults = buildDisplayedPermissionsMap([]);
    setRuntimePermissionMatrix(defaults);
    setMatrix(defaults);
    void reload();
    return () => setRuntimePermissionMatrix(null);
  }, [reload]);

  const value = useMemo(
    () => ({ matrix, loading, reload }),
    [matrix, loading, reload],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionMatrix() {
  return useContext(PermissionContext);
}
