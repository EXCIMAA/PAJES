// src/hooks/usePermission.ts
import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  hasPermission,
  canAccessRecordSafe,
  type ActionId,
  type ModuleId,
} from "../lib/permissions";

/**
 * Extract role from profile, falling back to Supabase user_metadata.
 * This makes the hook work even if the profile row hasn't loaded yet.
 */
function roleFromAuth(
  profile: { role?: string | null } | null,
  user: unknown,
): string | undefined {
  const metadataRole =
    user &&
    typeof user === "object" &&
    "user_metadata" in user &&
    user.user_metadata &&
    typeof user.user_metadata === "object" &&
    "role" in user.user_metadata
      ? String((user.user_metadata as { role?: string }).role ?? "")
      : "";
  return profile?.role || metadataRole || undefined;
}

export function usePermission() {
  const { profile, user } = useAuth();
  const role = roleFromAuth(profile, user);
  const currentUserId =
    user && typeof user === "object" && "id" in user
      ? String((user as { id?: string }).id ?? "")
      : null;

  const can = useCallback(
    (module: ModuleId, action: ActionId) =>
      hasPermission({ role }, module, action),
    [role],
  );

  /**
   * Ownership check: use for row-level access (e.g. stagiaire only sees own records).
   */
  const canAccess = useCallback(
    (params: {
      module: ModuleId;
      action: ActionId;
      recordOwnerId?: string | null;
      assignedUserIds?: string[] | null;
    }) =>
      canAccessRecordSafe({
        role,
        currentUserId,
        ...params,
      }),
    [role, currentUserId],
  );

  return { can, canAccess, role, currentUserId };
}