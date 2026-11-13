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
import { permissionsApi } from "../api/permissions";
import {
  buildDisplayedPermissionsMap,
  emptyRolePermissions,
  setRuntimePermissionMatrix,
  validateEnforcementAgainstTeamPage,
  type PermissionMatrix,
} from "../lib/permissions";

interface PermissionContextValue {
  matrix: PermissionMatrix;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue>({
  matrix: buildDisplayedPermissionsMap([]),
  loading: true,
  error: null,
  reload: async () => {},
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isDemo } = useAuth();
  const [matrix, setMatrix] = useState<PermissionMatrix>(() =>
    buildDisplayedPermissionsMap([]),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (authLoading) return;
    setLoading(true);
    setError(null);

    if (isDemo || !user) {
      apply(buildDisplayedPermissionsMap([]));
      setLoading(false);
      return;
    }

    try {
      if (user.role === "super_admin") {
        const response = await permissionsApi.matrix();
        const rows = Object.entries(response.matrix).map(([role, permissions]) => ({
          role,
          permissions,
        }));
        apply(buildDisplayedPermissionsMap(rows));
      } else {
        const response = await permissionsApi.currentRole();
        apply(
          buildDisplayedPermissionsMap(
            response.role
              ? [{ role: response.role, permissions: response.permissions }]
              : [],
          ),
        );
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les permissions.";
      console.error("[PermissionContext] Échec du chargement des permissions.", loadError);
      setError(message);
      const denied = buildDisplayedPermissionsMap(
        user.role
          ? [{ role: user.role, permissions: emptyRolePermissions() }]
          : [],
      );
      apply(denied);
    } finally {
      setLoading(false);
    }
  }, [apply, authLoading, isDemo, user]);

  useEffect(() => {
    if (!authLoading) void reload();
  }, [authLoading, reload]);

  useEffect(() => () => setRuntimePermissionMatrix(null), []);

  const value = useMemo(
    () => ({ matrix, loading, error, reload }),
    [matrix, loading, error, reload],
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
