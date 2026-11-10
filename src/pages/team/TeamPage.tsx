// src/pages/team/TeamPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Mail, MoreHorizontal, Save, Lock, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { cn, getInitials } from "../../lib/utils";
import { addNotification } from "../../lib/notifications";
import { supabase } from "../../lib/supabase";
import { useSupabaseQuery } from "../../hooks/useSupabaseData";
import { USER_ROLE_LABELS } from "../../lib/constants";
import type { User } from "../../types";
import {
  MODULES,
  ACTIONS,
  POSTES,
  MODULE_LABELS,
  ACTION_LABELS,
  getPermissionsForRole,
  hasAtLeastOnePermission,
  type RolePermissions,
  type ActionId,
  type ModuleId,
} from "../../lib/permissions";

const SUPER_ADMIN_ROLE = "super_admin" as const;

type PermissionsMap = Record<string, RolePermissions>;

export function TeamPage() {
  const { t } = useTranslation();

  const { data: team } = useSupabaseQuery<User>({
    table: "profiles",
    orderBy: "full_name",
  });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const filteredTeam =
    roleFilter === "all" ? team : team.filter((u) => u.role === roleFilter);

  // ============================================================
  // Helper : construit la map de permissions depuis les données brutes
  // ============================================================
  const buildPermissionsMap = (data: any[]): PermissionsMap => {
    const map: PermissionsMap = {};
    // 1. Base : matrice du code (issu de l'Excel)
    POSTES.forEach((p) => {
      map[p] = getPermissionsForRole(p);
    });
    // 2. Override : données de la base (sauf super_admin)
    (data || []).forEach((row: any) => {
      if (row.role === SUPER_ADMIN_ROLE) return;
      if (row.permissions && typeof row.permissions === "object") {
        map[row.role] = row.permissions as RolePermissions;
      }
    });
    return map;
  };

  // ============================================================
  // CHARGEMENT DES PERMISSIONS + AUTO-SEED
  // ============================================================
  const fetchPermissions = async () => {
    setLoadingPerms(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("role_permissions")
      .select("role, permissions");

    if (fetchError) {
      setError("Erreur de chargement : " + fetchError.message);
      alert("Erreur de chargement des permissions : " + fetchError.message);
      setLoadingPerms(false);
      return;
    }

    // ⭐ AUTO-SEED : si la table est vide, on insère TOUTE la matrice
    if (!data || data.length === 0) {
      console.log("[TeamPage] role_permissions vide → auto-seed en cours...");

      const seedRows = POSTES.filter((p) => p !== SUPER_ADMIN_ROLE).map(
        (role) => ({
          role,
          permissions: getPermissionsForRole(role),
        }),
      );

      const { error: seedError } = await supabase
        .from("role_permissions")
        .upsert(seedRows, { onConflict: "role" });

      if (seedError) {
        console.error("[TeamPage] Auto-seed échoué :", seedError);
        setError("Erreur auto-seed : " + seedError.message);
      } else {
        console.log(
          `✅ [TeamPage] ${seedRows.length} postes auto-seedés en base.`,
        );
        setSeeded(true);
        setTimeout(() => setSeeded(false), 5000);
      }

      // Recharger après seed
      const { data: reloaded } = await supabase
        .from("role_permissions")
        .select("role, permissions");

      setPermissions(buildPermissionsMap(reloaded || []));
      setLoadingPerms(false);
      return;
    }

    // Cas normal : la table a déjà des données
    setPermissions(buildPermissionsMap(data));
    setLoadingPerms(false);
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // ============================================================
  // SAUVEGARDE (avec avertissement au lieu de blocage)
  // ============================================================
  const handleSavePermissions = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const emptyPostes: string[] = [];
      for (const poste of POSTES) {
        if (poste === SUPER_ADMIN_ROLE) continue;
        const perms = permissions[poste];
        if (!perms || !hasAtLeastOnePermission(perms)) {
          const label = USER_ROLE_LABELS[poste] || poste;
          emptyPostes.push(label);
        }
      }

      if (emptyPostes.length > 0) {
        const confirmed = window.confirm(
          `Les postes suivants n'ont AUCUNE permission :\n\n` +
            emptyPostes.map((l) => `• ${l}`).join("\n") +
            `\n\nVoulez-vous continuer la sauvegarde quand même ?`,
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
      }

      const updates = Object.entries(permissions)
        .filter(([role]) => role !== SUPER_ADMIN_ROLE)
        .filter(([, perms]) => hasAtLeastOnePermission(perms))
        .map(([role, perms]) => ({ role, permissions: perms }));

      for (const update of updates) {
        const { error: upsertError } = await supabase
          .from("role_permissions")
          .upsert(
            { role: update.role, permissions: update.permissions },
            { onConflict: "role" },
          );
        if (upsertError) throw upsertError;
      }

      setSaved(true);
      void addNotification({
        title: "Permissions mises à jour",
        message: `Les permissions de l'équipe ont été mises à jour (${updates.length} postes).`,
        type: "team",
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
      alert("Erreur de sauvegarde : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // RESET : restaure la matrice depuis le code
  // ============================================================
  const handleResetToDefaults = async () => {
    const confirmed = window.confirm(
      "Réinitialiser TOUTES les permissions aux valeurs par défaut (issues de l'Excel) ?\n\n" +
        "⚠️ Toutes les modifications manuelles seront perdues.",
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      const seedRows = POSTES.filter((p) => p !== SUPER_ADMIN_ROLE).map(
        (role) => ({
          role,
          permissions: getPermissionsForRole(role),
        }),
      );

      const { error: seedError } = await supabase
        .from("role_permissions")
        .upsert(seedRows, { onConflict: "role" });

      if (seedError) throw seedError;

      await fetchPermissions();
      setSaved(true);
      void addNotification({
        title: "Permissions réinitialisées",
        message:
          "Toutes les permissions ont été restaurées aux valeurs par défaut.",
        type: "team",
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
      alert("Erreur de réinitialisation : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // GESTION DES TOGGLES
  // ============================================================
  const togglePermission = (
    role: string,
    moduleId: ModuleId,
    action: ActionId,
  ) => {
    if (role === SUPER_ADMIN_ROLE) return;
    setPermissions((prev) => {
      const rolePerms = { ...(prev[role] || {}) } as RolePermissions;
      const current = rolePerms[moduleId] || {
        create: false,
        view: false,
        edit: false,
        delete: false,
      };
      rolePerms[moduleId] = { ...current, [action]: !current[action] };
      return { ...prev, [role]: rolePerms };
    });
  };

  const toggleAllForRole = (role: string, value: boolean) => {
    if (role === SUPER_ADMIN_ROLE) return;
    const newPerms = {} as RolePermissions;
    MODULES.forEach((m) => {
      newPerms[m] = { create: value, view: value, edit: value, delete: value };
    });
    setPermissions((prev) => ({ ...prev, [role]: newPerms }));
  };

  const toggleModuleForAll = (
    moduleId: ModuleId,
    action: ActionId,
    value: boolean,
  ) => {
    setPermissions((prev) => {
      const newMap = { ...prev };
      POSTES.forEach((p) => {
        if (p === SUPER_ADMIN_ROLE) return;
        const rolePerms = { ...(newMap[p] || {}) } as RolePermissions;
        const current = rolePerms[moduleId] || {
          create: false,
          view: false,
          edit: false,
          delete: false,
        };
        rolePerms[moduleId] = { ...current, [action]: value };
        newMap[p] = rolePerms;
      });
      return newMap;
    });
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="page-container">
      <PageHeader
        title={t("navigation.team")}
        description={t("team.manage")}
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleResetToDefaults}
              className="btn-secondary btn-md flex items-center gap-2"
              disabled={saving}
              title="Restaurer la matrice depuis l'Excel"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser
            </button>
            <button
              onClick={handleSavePermissions}
              className="btn-primary btn-md"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </div>
        }
      />

      {seeded && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-info-500/10 text-info-500 text-sm border border-info-500/25">
          ⚡ Base initialisée automatiquement avec la matrice par défaut.
        </div>
      )}
      {saved && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-success-500/10 text-success-500 text-sm border border-success-500/25">
          ✅ {t("team.saved")}
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-error-500/10 text-error-500 text-sm border border-error-500/25">
          ⚠️ {error}
        </div>
      )}

      {/* ---------- FILTRES ET LISTE DES UTILISATEURS ---------- */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRoleFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              roleFilter === "all"
                ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                : "text-slate-400 hover:bg-slate-700/40",
            )}
          >
            {t("common.all")}
          </button>
          {Object.entries(USER_ROLE_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setRoleFilter(k)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                roleFilter === k
                  ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                  : "text-slate-400 hover:bg-slate-700/40",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex bg-slate-800 rounded-lg border border-slate-700/50 p-0.5 ml-auto">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              view === "grid"
                ? "bg-primary-600 text-white"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {t("common.grid")}
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              view === "list"
                ? "bg-primary-600 text-white"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {t("common.list")}
          </button>
        </div>
      </div>

      {/* Affichage des utilisateurs */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeam.map((member) => (
            <div key={member.id} className="card-hover p-5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-600/20 flex items-center justify-center text-lg font-semibold text-primary-300">
                  {getInitials(member.full_name)}
                </div>
                <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700/50">
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <h3 className="text-sm font-medium text-slate-100">
                {member.full_name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {USER_ROLE_LABELS[member.role] ?? member.role}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="neutral">{member.department}</Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700/30">
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-300 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {member.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Nom", "Email", "Rôle", "Département", "Téléphone"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filteredTeam.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center text-xs font-semibold text-primary-300">
                          {getInitials(member.full_name)}
                        </div>
                        <span className="font-medium text-slate-100">
                          {member.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{member.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="primary">
                        {USER_ROLE_LABELS[member.role] ?? member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {member.department}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {member.phone ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          MATRICE DES PERMISSIONS
          ============================================================ */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Permissions par poste
          </h3>
          <span className="text-xs text-slate-400">
            (Cochez pour accorder l'accès)
          </span>
        </div>

        {loadingPerms ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs" style={{ minWidth: "2400px" }}>
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-900 z-20"
                      rowSpan={2}
                    >
                      Poste
                    </th>
                    {MODULES.map((m) => (
                      <th
                        key={m}
                        colSpan={4}
                        className="px-2 py-2 text-center text-[10px] font-medium text-slate-300 uppercase tracking-wider border-l border-slate-700/40"
                      >
                        {MODULE_LABELS[m]}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    {MODULES.map((m) =>
                      ACTIONS.map((a) => (
                        <th
                          key={`${m}-${a}`}
                          className="px-1 py-2 text-center text-[9px] font-medium text-slate-500 uppercase"
                        >
                          {ACTION_LABELS[a]}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {POSTES.map((poste) => {
                    const isSuperAdmin = poste === SUPER_ADMIN_ROLE;
                    const rolePerms =
                      permissions[poste] || ({} as RolePermissions);
                    const posteLabel = USER_ROLE_LABELS[poste] || poste;

                    return (
                      <tr
                        key={poste}
                        className={cn(
                          "hover:bg-slate-700/20 transition-colors",
                          isSuperAdmin && "bg-warning-500/5",
                        )}
                      >
                        <td className="px-4 py-3 sticky left-0 bg-slate-900 font-medium text-slate-100 z-10">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={isSuperAdmin ? "warning" : "primary"}
                              className="text-[10px] w-fit"
                            >
                              {posteLabel}
                            </Badge>
                            {!isSuperAdmin && (
                              <button
                                onClick={() =>
                                  toggleAllForRole(
                                    poste,
                                    !MODULES.every(
                                      (m) =>
                                        rolePerms[m]?.create &&
                                        rolePerms[m]?.view &&
                                        rolePerms[m]?.edit &&
                                        rolePerms[m]?.delete,
                                    ),
                                  )
                                }
                                className="text-[9px] text-slate-400 hover:text-slate-200 underline w-fit"
                              >
                                Tout / Rien
                              </button>
                            )}
                          </div>
                        </td>

                        {MODULES.map((m) => {
                          const mp = rolePerms[m] || {
                            create: false,
                            view: false,
                            edit: false,
                            delete: false,
                          };
                          return ACTIONS.map((a) => {
                            const checked = isSuperAdmin ? true : mp[a];
                            return (
                              <td
                                key={`${poste}-${m}-${a}`}
                                className="px-1 py-3 text-center border-l border-slate-800/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isSuperAdmin}
                                  onChange={() => togglePermission(poste, m, a)}
                                  className={cn(
                                    "w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer",
                                    isSuperAdmin
                                      ? "text-warning-500 cursor-not-allowed"
                                      : "text-primary-500 focus:ring-primary-500 focus:ring-offset-0",
                                  )}
                                />
                              </td>
                            );
                          });
                        })}
                      </tr>
                    );
                  })}

                  {/* Ligne "Tous les postes" */}
                  <tr className="border-t border-slate-700/50 bg-slate-800/30">
                    <td className="px-4 py-3 sticky left-0 bg-slate-800/30 font-medium text-slate-400 text-xs z-10">
                      Tous les postes
                    </td>
                    {MODULES.map((m) =>
                      ACTIONS.map((a) => {
                        const allChecked = POSTES.filter(
                          (p) => p !== SUPER_ADMIN_ROLE,
                        ).every((p) => permissions[p]?.[m]?.[a] === true);
                        return (
                          <td
                            key={`all-${m}-${a}`}
                            className="px-1 py-3 text-center border-l border-slate-800/40"
                          >
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={() =>
                                toggleModuleForAll(m, a, !allChecked)
                              }
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-warning-500 focus:ring-warning-500 focus:ring-offset-0 cursor-pointer"
                            />
                          </td>
                        );
                      }),
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
          <Lock className="w-3 h-3" />
          <span>
            Les modifications sont sauvegardées via le bouton en haut. Le{" "}
            <b>Super Admin</b> a automatiquement tous les droits (non
            modifiable). Le bouton <b>Réinitialiser</b> restaure la matrice
            Excel d'origine.
          </span>
        </div>
      </div>
    </div>
  );
}
