"""PAJES permission matrix — exact 1:1 translation of src/lib/permissions.ts.

This is the server-side source of truth for role-based module permissions.
The hardcoded defaults match the TypeScript PERMISSION_MATRIX. Runtime
overrides from the role_permissions table are merged on top by the
permission service.

Roles (17): super_admin, assistant_administratif, rh,
responsable_controle_interne, responsable_admin_fin, associe_gerant,
directeur_bureau, manageur, chef_mission, superviseur, senior_audit,
senior_expertise, junior_audit, junior_expertise, stagiaires,
formateur_senior, formateur_junior.

Modules (24): clients, missions, review_notes, findings, besoins_cabinet,
stock, immobilisations, caisse, suivi_cac, conges, manuel, notes_frais,
fournisseurs, ressources_internes, collaborateurs, factures,
collaborateur_profiles, collaborateur_hr, collaborateur_financial,
collaborateur_missions, collaborateur_leave, collaborateur_performance,
collaborateur_documents, collaborateur_audit.

Actions (4): create, view, edit, delete.
"""

from __future__ import annotations

from enum import Enum
from typing import TypedDict


class ActionId(str, Enum):
    CREATE = "create"
    VIEW = "view"
    EDIT = "edit"
    DELETE = "delete"


class ModuleId(str, Enum):
    CLIENTS = "clients"
    MISSIONS = "missions"
    REVIEW_NOTES = "review_notes"
    FINDINGS = "findings"
    BESOINS_CABINET = "besoins_cabinet"
    STOCK = "stock"
    IMMOBILISATIONS = "immobilisations"
    CAISSE = "caisse"
    SUIVI_CAC = "suivi_cac"
    CONGES = "conges"
    MANUEL = "manuel"
    NOTES_FRAIS = "notes_frais"
    FOURNISSEURS = "fournisseurs"
    RESSOURCES_INTERNES = "ressources_internes"
    COLLABORATEURS = "collaborateurs"
    FACTURES = "factures"
    COLLABORATEUR_PROFILES = "collaborateur_profiles"
    COLLABORATEUR_HR = "collaborateur_hr"
    COLLABORATEUR_FINANCIAL = "collaborateur_financial"
    COLLABORATEUR_MISSIONS = "collaborateur_missions"
    COLLABORATEUR_LEAVE = "collaborateur_leave"
    COLLABORATEUR_PERFORMANCE = "collaborateur_performance"
    COLLABORATEUR_DOCUMENTS = "collaborateur_documents"
    COLLABORATEUR_AUDIT = "collaborateur_audit"


class RoleId(str, Enum):
    SUPER_ADMIN = "super_admin"
    ASSISTANT_ADMINISTRATIF = "assistant_administratif"
    RH = "rh"
    RESPONSABLE_CONTROLE_INTERNE = "responsable_controle_interne"
    RESPONSABLE_ADMIN_FIN = "responsable_admin_fin"
    ASSOCIE_GERANT = "associe_gerant"
    DIRECTEUR_BUREAU = "directeur_bureau"
    MANAGEUR = "manageur"
    CHEF_MISSION = "chef_mission"
    SUPERVISEUR = "superviseur"
    SENIOR_AUDIT = "senior_audit"
    SENIOR_EXPERTISE = "senior_expertise"
    JUNIOR_AUDIT = "junior_audit"
    JUNIOR_EXPERTISE = "junior_expertise"
    STAGIAIRES = "stagiaires"
    FORMATEUR_SENIOR = "formateur_senior"
    FORMATEUR_JUNIOR = "formateur_junior"


ALL_MODULES = [m.value for m in ModuleId]
ALL_ACTIONS = [a.value for a in ActionId]
ALL_ROLES = [r.value for r in RoleId]

SUPER_ADMIN_ROLE = RoleId.SUPER_ADMIN.value


class ModulePermissions(TypedDict):
    create: bool
    view: bool
    edit: bool
    delete: bool


def P(c: bool, v: bool, e: bool, d: bool) -> ModulePermissions:
    return {"create": c, "view": v, "edit": e, "delete": d}


NONE: ModulePermissions = P(False, False, False, False)
FULL: ModulePermissions = P(True, True, True, True)

PermissionMatrix = dict[str, dict[str, ModulePermissions]]


def _none_all() -> dict[str, ModulePermissions]:
    return {m: P(False, False, False, False) for m in ALL_MODULES}


def _full_all() -> dict[str, ModulePermissions]:
    return {m: P(True, True, True, True) for m in ALL_MODULES}


PERMISSION_MATRIX: PermissionMatrix = {
    "assistant_administratif": {
        "clients": FULL,
        "missions": NONE,
        "review_notes": NONE,
        "findings": FULL,
        "besoins_cabinet": P(True, True, False, False),
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": FULL,
        "manuel": P(False, True, True, False),
        "notes_frais": P(True, False, False, False),
        "fournisseurs": P(False, True, False, False),
        "ressources_internes": P(True, True, True, False),
        "collaborateurs": NONE,
        "factures": P(False, True, True, True),
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "rh": {
        "clients": NONE,
        "missions": NONE,
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": FULL,
        "manuel": P(True, True, False, False),
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": FULL,
        "factures": NONE,
        "collaborateur_profiles": FULL,
        "collaborateur_hr": FULL,
        "collaborateur_financial": P(False, True, False, False),
        "collaborateur_missions": P(False, True, False, False),
        "collaborateur_leave": FULL,
        "collaborateur_performance": FULL,
        "collaborateur_documents": FULL,
        "collaborateur_audit": NONE,
    },
    "responsable_controle_interne": {
        "clients": P(False, True, False, False),
        "missions": NONE,
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": P(True, True, False, False),
        "suivi_cac": P(True, True, False, False),
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": P(True, True, True, False),
        "fournisseurs": NONE,
        "ressources_internes": P(False, True, False, False),
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "responsable_admin_fin": {
        "clients": P(False, True, False, False),
        "missions": NONE,
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": P(True, True, True, False),
        "suivi_cac": P(True, True, False, False),
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": P(False, True, False, False),
        "ressources_internes": P(False, True, False, False),
        "collaborateurs": NONE,
        "factures": P(True, True, False, False),
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "associe_gerant": {
        "clients": FULL,
        "missions": P(True, True, False, True),
        "review_notes": FULL,
        "findings": P(False, True, True, True),
        "besoins_cabinet": P(True, True, True, False),
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": P(True, True, False, False),
        "suivi_cac": P(True, False, False, False),
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": P(True, True, False, False),
        "fournisseurs": P(False, True, False, False),
        "ressources_internes": P(False, True, False, False),
        "collaborateurs": NONE,
        "factures": FULL,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "directeur_bureau": {
        "clients": NONE,
        "missions": FULL,
        "review_notes": P(True, True, False, False),
        "findings": P(True, True, False, False),
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": P(True, True, False, False),
        "suivi_cac": FULL,
        "conges": FULL,
        "manuel": NONE,
        "notes_frais": P(False, True, False, False),
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": FULL,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "manageur": {
        "clients": NONE,
        "missions": P(True, True, True, False),
        "review_notes": P(True, True, True, False),
        "findings": P(True, True, False, False),
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": FULL,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": P(True, False, False, False),
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "chef_mission": {
        "clients": NONE,
        "missions": P(True, True, True, False),
        "review_notes": P(True, True, False, False),
        "findings": P(True, True, False, False),
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": P(True, True, True, False),
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "superviseur": {
        "clients": NONE,
        "missions": P(False, True, True, False),
        "review_notes": P(True, True, False, False),
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": P(True, True, True, False),
        "immobilisations": NONE,
        "caisse": P(True, True, True, False),
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": P(True, False, False, False),
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "senior_audit": {
        "clients": NONE,
        "missions": P(False, True, False, False),
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "senior_expertise": {
        "clients": NONE,
        "missions": P(False, True, False, False),
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "junior_audit": {
        "clients": NONE,
        "missions": P(False, True, False, False),
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "junior_expertise": {
        "clients": NONE,
        "missions": P(False, True, False, False),
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "stagiaires": {
        "clients": NONE,
        "missions": P(False, True, False, False),
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "formateur_senior": {
        "clients": NONE,
        "missions": P(False, True, False, False),
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
    "formateur_junior": {
        "clients": NONE,
        "missions": P(False, True, False, False),
        "review_notes": NONE,
        "findings": NONE,
        "besoins_cabinet": NONE,
        "stock": NONE,
        "immobilisations": NONE,
        "caisse": NONE,
        "suivi_cac": NONE,
        "conges": P(True, False, False, False),
        "manuel": NONE,
        "notes_frais": NONE,
        "fournisseurs": NONE,
        "ressources_internes": NONE,
        "collaborateurs": NONE,
        "factures": NONE,
        "collaborateur_profiles": NONE,
        "collaborateur_hr": NONE,
        "collaborateur_financial": NONE,
        "collaborateur_missions": NONE,
        "collaborateur_leave": NONE,
        "collaborateur_performance": NONE,
        "collaborateur_documents": NONE,
        "collaborateur_audit": NONE,
    },
}


def get_default_permissions_for_role(role: str) -> dict[str, ModulePermissions]:
    if role == SUPER_ADMIN_ROLE:
        return _full_all()
    perms = PERMISSION_MATRIX.get(role)
    return {m: dict(perms[m]) for m in ALL_MODULES} if perms else _none_all()


def has_permission(
    matrix: PermissionMatrix,
    role: str | None,
    module: str,
    action: str,
) -> bool:
    if not role:
        return False
    if role == SUPER_ADMIN_ROLE:
        return True
    return matrix.get(role, {}).get(module, {}).get(action, False) is True


def empty_role_permissions() -> dict[str, ModulePermissions]:
    return _none_all()


def full_role_permissions() -> dict[str, ModulePermissions]:
    return _full_all()


def build_effective_matrix(
    db_rows: list[dict[str, object]] | None,
) -> PermissionMatrix:
    """Merge DB role_permissions overrides over hardcoded defaults."""
    result: PermissionMatrix = {}
    for role in ALL_ROLES:
        result[role] = get_default_permissions_for_role(role)
    if db_rows:
        for row in db_rows:
            role = row.get("role")
            if not role or role == SUPER_ADMIN_ROLE:
                continue
            perms = row.get("permissions")
            if isinstance(perms, dict):
                result[str(role)] = perms  # type: ignore[assignment]
    return result
