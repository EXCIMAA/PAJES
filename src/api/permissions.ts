import { api } from "../lib/api";
import type { PermissionMatrix, RolePermissions } from "../lib/permissions";

interface CurrentRolePermissions {
  role: string | null;
  permissions: RolePermissions;
}

interface PermissionMatrixResponse {
  matrix: PermissionMatrix;
  roles: string[];
  modules: string[];
}

export const permissionsApi = {
  currentRole() {
    return api.get<CurrentRolePermissions>("/permissions/me");
  },
  matrix() {
    return api.get<PermissionMatrixResponse>("/permissions/matrix");
  },
};
