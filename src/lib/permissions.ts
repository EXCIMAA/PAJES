// src/lib/permissions.ts
// ============================================================
// MATRICE DES PERMISSIONS — SOURCE UNIQUE DE VÉRITÉ
// ============================================================

export type PermissionAction = "create" | "view" | "edit" | "delete";

export interface ModulePermissions {
  create: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export type RolePermissions = Record<string, ModulePermissions>;
export type PermissionMatrix = Record<string, RolePermissions>;

// ============================================================
// MODULES (16 + 8 collaborator sub-modules)
// ============================================================
export const MODULES = [
  "clients",
  "missions",
  "review_notes",
  "findings",
  "besoins_cabinet",
  "stock",
  "immobilisations",
  "caisse",
  "suivi_cac",
  "conges",
  "manuel",
  "notes_frais",
  "fournisseurs",
  "ressources_internes",
  "collaborateurs",
  "factures",
  // ✅ Granular collaborator sub-modules
  "collaborateur_profiles",
  "collaborateur_hr",
  "collaborateur_financial",
  "collaborateur_missions",
  "collaborateur_leave",
  "collaborateur_performance",
  "collaborateur_documents",
  "collaborateur_audit",
] as const;

export const ACTIONS = ["create", "view", "edit", "delete"] as const;

export const POSTES = [
  "super_admin",
  "assistant_administratif",
  "rh",
  "responsable_controle_interne",
  "responsable_admin_fin",
  "associe_gerant",
  "directeur_bureau",
  "manageur",
  "chef_mission",
  "superviseur",
  "senior_audit",
  "senior_expertise",
  "junior_audit",
  "junior_expertise",
  "stagiaires",
  "formateur_senior",
  "formateur_junior",
] as const;

export type ModuleId = (typeof MODULES)[number];
export type ActionId = (typeof ACTIONS)[number];
export type PosteId = (typeof POSTES)[number];

export const MODULE_LABELS: Record<ModuleId, string> = {
  clients: "Clients",
  missions: "Missions",
  review_notes: "Notes de revue",
  findings: "Constats",
  besoins_cabinet: "Besoins cabinet",
  stock: "Stock",
  immobilisations: "Immobilisations",
  caisse: "Caisse",
  suivi_cac: "Suivi CAC",
  conges: "Congés",
  manuel: "Manuel",
  notes_frais: "Notes de frais",
  fournisseurs: "Fournisseurs",
  ressources_internes: "Ressources internes",
  collaborateurs: "Collaborateurs",
  factures: "Factures",
  collaborateur_profiles: "Profils collaborateurs",
  collaborateur_hr: "Informations RH",
  collaborateur_financial: "Informations financières",
  collaborateur_missions: "Missions collaborateurs",
  collaborateur_leave: "Congés collaborateurs",
  collaborateur_performance: "Performance collaborateurs",
  collaborateur_documents: "Documents collaborateurs",
  collaborateur_audit: "Informations audit",
};

export const ACTION_LABELS: Record<ActionId, string> = {
  create: "Créer",
  view: "Voir",
  edit: "Modifier",
  delete: "Supprimer",
};

// ============================================================
// HELPERS
// ============================================================
const P = (c: boolean, v: boolean, e: boolean, d: boolean): ModulePermissions => ({
  create: c, view: v, edit: e, delete: d,
});
const NONE = P(false, false, false, false);
const FULL = P(true, true, true, true);

// ============================================================
// MATRICE
// ============================================================
export const PERMISSION_MATRIX: PermissionMatrix = {
  // ============ Assistant Administratif ============
  assistant_administratif: {
    clients:             FULL,
    missions:            NONE,
    review_notes:        NONE,
    findings:            FULL,
    besoins_cabinet:     P(true,  true,  false, false),
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              FULL,
    manuel:              P(false, true,  true,  false),
    notes_frais:         P(true,  false, false, false),
    fournisseurs:        P(false, true,  false, false),
    ressources_internes: P(true,  true,  true,  false),
    collaborateurs:      NONE,   // ⛔ MODIFIÉ : plus d'accès aux collaborateurs
    factures:            P(false, true,  true,  true),
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,   // ⛔ MODIFIÉ
    collaborateur_audit:        NONE,
  },

  // ============ RH ============
  rh: {
    clients:             NONE,
    missions:            NONE,
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              FULL,
    manuel:              P(true,  true,  false, false),
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      FULL,   // ✅ Seul rôle (avec super_admin) à avoir accès
    factures:            NONE,
    collaborateur_profiles:     FULL,
    collaborateur_hr:           FULL,
    collaborateur_financial:    P(false, true,  false, false),  // RH voit mais ne modifie pas le financier
    collaborateur_missions:     P(false, true,  false, false),
    collaborateur_leave:        FULL,
    collaborateur_performance:  FULL,
    collaborateur_documents:    FULL,
    collaborateur_audit:        NONE,
  },

  // ============ Responsable Contrôle Interne ============
  responsable_controle_interne: {
    clients:             P(false, true,  false, false),
    missions:            NONE,
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              P(true,  true,  false, false),
    suivi_cac:           P(true,  true,  false, false),
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         P(true,  true,  true,  false),
    fournisseurs:        NONE,
    ressources_internes: P(false, true,  false, false),
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,   // ⛔ MODIFIÉ
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Responsable Administratif et Financier ============
  responsable_admin_fin: {
    clients:             P(false, true,  false, false),
    missions:            NONE,
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              P(true,  true,  true,  false),
    suivi_cac:           P(true,  true,  false, false),
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        P(false, true,  false, false),
    ressources_internes: P(false, true,  false, false),
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            P(true,  true,  false, false),
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,   // ⛔ MODIFIÉ : le RAF n'a plus accès
    collaborateur_missions:     NONE,
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,
  },

  // ============ Associé Gérant ============
  associe_gerant: {
    clients:             FULL,
    missions:            P(true,  true,  false, true),
    review_notes:        FULL,
    findings:            P(false, true,  true,  true),
    besoins_cabinet:     P(true,  true,  true,  false),
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              P(true,  true,  false, false),
    suivi_cac:           P(true,  false, false, false),
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         P(true,  true,  false, false),
    fournisseurs:        P(false, true,  false, false),
    ressources_internes: P(false, true,  false, false),
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            FULL,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,   // ⛔ MODIFIÉ
    collaborateur_financial:    NONE,   // ⛔ MODIFIÉ
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,   // ⛔ MODIFIÉ
    collaborateur_performance:  NONE,   // ⛔ MODIFIÉ
    collaborateur_documents:    NONE,   // ⛔ MODIFIÉ
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Directeur du Bureau ============
  directeur_bureau: {
    clients:             NONE,
    missions:            FULL,
    review_notes:        P(true,  true,  false, false),
    findings:            P(true,  true,  false, false),
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              P(true,  true,  false, false),
    suivi_cac:           FULL,
    conges:              FULL,
    manuel:              NONE,
    notes_frais:         P(false, true,  false, false),
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            FULL,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,   // ⛔ MODIFIÉ
    collaborateur_financial:    NONE,   // ⛔ MODIFIÉ
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,   // ⛔ MODIFIÉ
    collaborateur_performance:  NONE,   // ⛔ MODIFIÉ
    collaborateur_documents:    NONE,   // ⛔ MODIFIÉ
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Manager ============
  manageur: {
    clients:             NONE,
    missions:            P(true,  true,  true,  false),
    review_notes:        P(true,  true,  true,  false),
    findings:            P(true,  true,  false, false),
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              FULL,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         P(true,  false, false, false),
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,   // ⛔ MODIFIÉ
    collaborateur_performance:  NONE,   // ⛔ MODIFIÉ
    collaborateur_documents:    NONE,   // ⛔ MODIFIÉ
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Chef de Mission ============
  chef_mission: {
    clients:             NONE,
    missions:            P(true,  true,  true,  false),
    review_notes:        P(true,  true,  false, false),
    findings:            P(true,  true,  false, false),
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              P(true,  true,  true,  false),
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ (avant : FULL)
    collaborateur_leave:        NONE,   // ⛔ MODIFIÉ
    collaborateur_performance:  NONE,   // ⛔ MODIFIÉ
    collaborateur_documents:    NONE,   // ⛔ MODIFIÉ
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Superviseur ============
  superviseur: {
    clients:             NONE,
    missions:            P(false, true,  true,  false),
    review_notes:        P(true,  true,  false, false),
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               P(true,  true,  true,  false),
    immobilisations:     NONE,
    caisse:              P(true,  true,  true,  false),
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         P(true,  false, false, false),
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,   // ⛔ MODIFIÉ
    collaborateur_performance:  NONE,   // ⛔ MODIFIÉ
    collaborateur_documents:    NONE,   // ⛔ MODIFIÉ
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Senior Audit ============
  senior_audit: {
    clients:             NONE,
    missions:            P(false, true,  false, false),
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,
    factures:            NONE,
    collaborateur_profiles:     NONE,
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Senior Expertise ============
  senior_expertise: {
    clients:             NONE,
    missions:            P(false, true,  false, false),
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Junior Audit ============
  junior_audit: {
    clients:             NONE,
    missions:            P(false, true,  false, false),
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Junior Expertise ============
  junior_expertise: {
    clients:             NONE,
    missions:            P(false, true,  false, false),
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,   // ⛔ MODIFIÉ
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,   // ⛔ MODIFIÉ
  },

  // ============ Stagiaires ============
  stagiaires: {
    clients:             NONE,
    missions:            P(false, true,  false, false),
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,
  },

  // ============ Formateur Senior ============
  formateur_senior: {
    clients:             NONE,
    missions:            P(false, true,  false, false),
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,
  },

  // ============ Formateur Junior ============
  formateur_junior: {
    clients:             NONE,
    missions:            P(false, true,  false, false),
    review_notes:        NONE,
    findings:            NONE,
    besoins_cabinet:     NONE,
    stock:               NONE,
    immobilisations:     NONE,
    caisse:              NONE,
    suivi_cac:           NONE,
    conges:              P(true,  false, false, false),
    manuel:              NONE,
    notes_frais:         NONE,
    fournisseurs:        NONE,
    ressources_internes: NONE,
    collaborateurs:      NONE,   // ⛔ MODIFIÉ
    factures:            NONE,
    collaborateur_profiles:     NONE,   // ⛔ MODIFIÉ
    collaborateur_hr:           NONE,
    collaborateur_financial:    NONE,
    collaborateur_missions:     NONE,
    collaborateur_leave:        NONE,
    collaborateur_performance:  NONE,
    collaborateur_documents:    NONE,
    collaborateur_audit:        NONE,
  },
};

// ============================================================
// SUPER ADMIN
// ============================================================
export const SUPER_ADMIN_ROLE = "super_admin";

export function emptyRolePermissions(): RolePermissions {
  return Object.fromEntries(
    MODULES.map((m) => [m, { create: false, view: false, edit: false, delete: false }]),
  ) as RolePermissions;
}

export function fullRolePermissions(): RolePermissions {
  return Object.fromEntries(
    MODULES.map((m) => [m, { create: true, view: true, edit: true, delete: true }]),
  ) as RolePermissions;
}

// ============================================================
// hasPermission
// ============================================================
export interface PermissionUser {
  role?: string | null;
}

let runtimePermissionMatrix: PermissionMatrix | null = null;

export function setRuntimePermissionMatrix(matrix: PermissionMatrix | null) {
  runtimePermissionMatrix = matrix;
}

export function getEffectivePermissionMatrix(): PermissionMatrix {
  return runtimePermissionMatrix ?? PERMISSION_MATRIX;
}

export function buildDisplayedPermissionsMap(
  dbRows: Array<{ role?: string; permissions?: unknown }> | null | undefined,
): PermissionMatrix {
  const map: PermissionMatrix = {};
  POSTES.forEach((p) => {
    map[p] = getPermissionsForRole(p);
  });
  (dbRows || []).forEach((row) => {
    if (!row?.role || row.role === SUPER_ADMIN_ROLE) return;
    if (row.permissions && typeof row.permissions === "object") {
      map[row.role] = row.permissions as RolePermissions;
    }
  });
  return map;
}

function isDemoMode(): boolean {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("pajes_demo_mode") === "true"
    );
  } catch {
    return false;
  }
}

function cellAllows(
  matrix: PermissionMatrix,
  role: string,
  module: string,
  action: string,
): boolean {
  if (role === SUPER_ADMIN_ROLE) return true;
  return matrix[role]?.[module]?.[action as PermissionAction] === true;
}

export function hasPermission(
  user: PermissionUser | null | undefined,
  module: ModuleId | string,
  action: ActionId | string,
): boolean {
  if (!user) return false;

  if (user.role === SUPER_ADMIN_ROLE) return true;

  if (isDemoMode()) return action === "view";

  if (user.role === "user") return false;
  if (!user.role || user.role === "") return false;

  return cellAllows(getEffectivePermissionMatrix(), user.role, module, action);
}

export interface PermissionConflict {
  role: string;
  module: ModuleId;
  action: ActionId;
  teamPage: boolean;
  engine: boolean;
}

export function validateEnforcementAgainstTeamPage(
  displayed: PermissionMatrix = getEffectivePermissionMatrix(),
): PermissionConflict[] {
  const engineMatrix = getEffectivePermissionMatrix();
  const conflicts: PermissionConflict[] = [];
  for (const role of POSTES) {
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        const teamPage =
          role === SUPER_ADMIN_ROLE
            ? true
            : displayed[role]?.[module]?.[action] === true;
        const engine = cellAllows(engineMatrix, role, module, action);
        if (teamPage !== engine) {
          conflicts.push({ role, module, action, teamPage, engine });
        }
      }
    }
  }
  return conflicts;
}

export function diffDisplayedAgainstExcelDefaults(
  displayed: PermissionMatrix,
): PermissionConflict[] {
  const diffs: PermissionConflict[] = [];
  for (const role of POSTES) {
    if (role === SUPER_ADMIN_ROLE) continue;
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        const excel = PERMISSION_MATRIX[role]?.[module]?.[action] === true;
        const teamPage = displayed[role]?.[module]?.[action] === true;
        if (excel !== teamPage) {
          diffs.push({
            role,
            module,
            action,
            teamPage,
            engine: excel,
          });
        }
      }
    }
  }
  return diffs;
}

export function getPermissionsForRole(role: string): RolePermissions {
  if (role === SUPER_ADMIN_ROLE) return fullRolePermissions();
  const perms = PERMISSION_MATRIX[role];
  return perms ? structuredClone(perms) : emptyRolePermissions();
}

export function hasAtLeastOnePermission(perms: RolePermissions | null | undefined): boolean {
  if (!perms) return false;
  return MODULES.some((m) => ACTIONS.some((a) => perms[m]?.[a] === true));
}

export function isRolePermissionsShape(value: unknown): value is RolePermissions {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return MODULES.every((m) => {
    const cell = record[m];
    if (!cell || typeof cell !== "object") return false;
    const actions = cell as Record<string, unknown>;
    return ACTIONS.every((a) => typeof actions[a] === "boolean");
  });
}

// ============================================================
// NAVIGATION MAPPING
// ============================================================
export const NAV_ITEM_MODULE: Record<string, ModuleId> = {
  "note-de-frais": "notes_frais",
  resources: "ressources_internes",
  stock: "stock",
  "fixed-assets": "immobilisations",
  manuel: "manuel",
  caisse: "caisse",
  "working-papers": "besoins_cabinet",
  fournisseurs: "fournisseurs",
  factures: "factures",
  "missions-cac": "missions",
  clients: "clients",
  engagements: "missions",
  "review-notes": "review_notes",
  findings: "findings",
  "cac-suivi": "suivi_cac",
  leave: "conges",
  collaborateurs: "collaborateurs",
};

export const QUICK_ACTION_PERMISSION: Record<
  string,
  { module: ModuleId; action: ActionId }
> = {
  "new-engagement": { module: "missions", action: "create" },
  "new-finding": { module: "findings", action: "create" },
  "stock-in": { module: "stock", action: "create" },
  "request-leave": { module: "conges", action: "create" },
  "upload-paper": { module: "besoins_cabinet", action: "create" },
  "new-expense": { module: "notes_frais", action: "create" },
  "new-collaborateur": { module: "collaborateurs", action: "create" },
  "new-invoice": { module: "factures", action: "create" },
};

export function writeMethodToAction(method: string): ActionId {
  if (method === "delete") return "delete";
  if (method === "update") return "edit";
  return "create";
}

export const TABLE_WRITE_MODULE: Record<string, ModuleId> = {
  clients: "clients",
  etablissements: "clients",
  client_documents: "clients",
  client_taxes: "clients",
  engagements: "missions",
  weekly_missions: "missions",
  missions: "missions",
  missions_cac: "missions",
  missions_cac_intervenants: "missions",
  grille_honoraires: "missions",
  tarifs_par_grade: "missions",
  review_notes: "review_notes",
  findings: "findings",
  working_papers: "besoins_cabinet",
  working_documents: "besoins_cabinet",
  stock_items: "stock",
  stock_movements: "stock",
  inventory_items: "stock",
  fixed_assets: "immobilisations",
  depreciation_schedules: "immobilisations",
  caisse: "caisse",
  audit_tasks: "suivi_cac",
  audit_mission_assignments: "suivi_cac",
  leave_requests: "conges",
  leave_balances: "conges",
  outils_manuel: "manuel",
  echeances: "manuel",
  controles_essentiels_status: "manuel",
  acceptation_mission: "manuel",
  questionnaire_ecoute_reponses: "manuel",
  bouclage_dossier_status: "manuel",
  periodic_task_statuses: "manuel",
  actions_cabinet: "manuel",
  repartition_parametres: "manuel",
  repartition_lignes: "manuel",
  intervenants: "manuel",
  time_entries: "manuel",
  doc_interne: "manuel",
  doc_technique: "manuel",
  archivage: "manuel",
  documents_client: "manuel",
  lettres_mission: "manuel",
  lettres_mission_parametres: "manuel",
  collaborateurs_cabinet: "manuel",
  competences_evaluations: "manuel",
  objectifs_cabinet: "manuel",
  expense_reports: "notes_frais",
  expense_lines: "notes_frais",
  fournisseurs: "fournisseurs",
  cabinet_resources: "ressources_internes",
  collaborateurs: "collaborateurs",
  invoices: "factures",
  invoice_lines: "factures",
  dossier_collaborateur: "collaborateur_documents",
  scores: "collaborateur_performance",
};

export const RPC_WRITE_PERMISSION: Record<
  string,
  { module: ModuleId; action: ActionId }
> = {
  calculer_mission_cac: { module: "missions", action: "edit" },
};

// ============================================================
// ✅ OWNERSHIP CHECK — used by usePermission().canAccess
// ============================================================
export function canAccessRecordSafe(params: {
  role: string | null | undefined;
  module: ModuleId;
  action: ActionId;
  recordOwnerId?: string | null;
  currentUserId?: string | null;
  assignedUserIds?: string[] | null;
}): boolean {
  const {
    role,
    module,
    action,
    recordOwnerId,
    currentUserId,
    assignedUserIds,
  } = params;

  if (!hasPermission({ role }, module, action)) return false;
  if (role === "super_admin") return true;

  if (role === "stagiaires" || role === "stagiaire") {
    if (recordOwnerId && currentUserId && recordOwnerId === currentUserId) {
      return true;
    }
    if (
      assignedUserIds &&
      currentUserId &&
      assignedUserIds.includes(currentUserId)
    ) {
      return true;
    }
    return false;
  }

  return true;
}

export interface AccessFilterParams {
  role: string | null | undefined;
  module: ModuleId;
  action?: ActionId;
  currentUserId: string | null | undefined;
  ownerColumn?: string;
  assignmentColumn?: string;
  assignmentIsArray?: boolean;
}

export function buildAccessFilter(
  params: AccessFilterParams,
): string | null {
  const {
    role,
    module,
    currentUserId,
    ownerColumn = "user_id",
    assignmentColumn,
    assignmentIsArray = false,
  } = params;

  if (!currentUserId) return null;
  if (role === "super_admin") return null;

  if (hasPermission({ role }, module, "view")) return null;

  const ownerClause = `${ownerColumn}.eq.${currentUserId}`;

  if (!assignmentColumn) return ownerClause;

  const assignClause = assignmentIsArray
    ? `${assignmentColumn}.cs.{${currentUserId}}`
    : `${assignmentColumn}.eq.${currentUserId}`;

  return `${ownerClause},${assignClause}`;
}