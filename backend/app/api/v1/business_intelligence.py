"""Read-only PAJES analytics and configuration-aware Power BI Embedded API."""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime
from typing import Annotated

import msal
import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import PermissionService, get_current_profile
from app.permissions.matrix import SUPER_ADMIN_ROLE
from app.services.bi_service import BusinessIntelligenceService

logger = logging.getLogger("pajes.business_intelligence")
router = APIRouter(prefix="/business-intelligence", tags=["business-intelligence"])

BI_MODULES = {
    "dashboard": (
        "factures",
        "clients",
        "missions",
        "review_notes",
        "findings",
        "stock",
        "immobilisations",
        "notes_frais",
    ),
    "overview": (
        "factures",
        "clients",
        "missions",
        "stock",
        "caisse",
        "immobilisations",
        "notes_frais",
        "collaborateur_performance",
    ),
    "financial": ("factures", "notes_frais"),
    "clients": ("clients",),
    "engagements": ("missions",),
    "employees": ("collaborateurs", "collaborateur_performance"),
    "cash": ("caisse",),
    "stock": ("stock",),
    "expenses": ("notes_frais",),
    "powerbi": ("factures", "clients", "missions", "stock", "caisse", "notes_frais"),
}
POWERBI_ROLES = {
    "super_admin",
    "associe_gerant",
    "directeur_bureau",
    "manageur",
    "responsable_admin_fin",
}
POWERBI_API = "https://api.powerbi.com/v1.0/myorg"
POWERBI_SCOPE = ["https://analysis.windows.net/powerbi/api/.default"]


class EmbedTokenResponse(BaseModel):
    report_id: str
    embed_url: str
    embed_token: str
    token_type: str = "Embed"
    expiration: datetime | None = None


def _require_bi_access(
    profile: Profile,
    db: Session,
    section: str,
) -> None:
    if profile.role == SUPER_ADMIN_ROLE:
        return
    permissions = PermissionService(db)
    if not any(permissions.has(profile.role, module, "view") for module in BI_MODULES[section]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission insuffisante pour les données Business Intelligence.",
        )


def _require_powerbi_access(profile: Profile, db: Session) -> None:
    if profile.role not in POWERBI_ROLES or not PermissionService(db).has(
        profile.role, "factures", "view"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Power BI access is restricted to authorized management users.",
        )


def _date_range(
    start_date: date | None,
    end_date: date | None,
) -> tuple[date | None, date | None]:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="start_date must be on or before end_date",
        )
    return start_date, end_date


def _client_credentials_token() -> str:
    app = msal.ConfidentialClientApplication(
        settings.powerbi_client_id,
        authority=f"https://login.microsoftonline.com/{settings.powerbi_tenant_id}",
        client_credential=settings.powerbi_client_secret,
    )
    result = app.acquire_token_for_client(scopes=POWERBI_SCOPE)
    access_token = result.get("access_token")
    if not access_token:
        logger.error("Power BI service-principal authentication failed: %s", result.get("error"))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Power BI authentication failed; check the Entra application "
                "and tenant configuration."
            ),
        )
    return access_token


def _powerbi_request(method: str, url: str, token: str, **kwargs):
    try:
        response = requests.request(
            method,
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
            **kwargs,
        )
    except requests.RequestException as exc:
        logger.warning("Power BI request failed (%s): %s", method, type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Power BI service is unavailable.",
        ) from exc
    if not response.ok:
        logger.warning("Power BI returned HTTP %s for %s", response.status_code, method)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Power BI rejected the request; check workspace access and capacity configuration."
            ),
        )
    return response.json()


def _get_report(report_id: str, token: str) -> dict:
    return _powerbi_request(
        "GET",
        f"{POWERBI_API}/groups/{settings.powerbi_workspace_id}/reports/{report_id}",
        token,
    )


@router.get("/overview")
def get_overview(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
):
    _require_bi_access(profile, db, "overview")
    start_date, end_date = _date_range(start_date, end_date)
    permissions = PermissionService(db)
    allowed = {
        module for module in BI_MODULES["overview"] if permissions.has(profile.role, module, "view")
    }
    return BusinessIntelligenceService(db).overview(start_date, end_date, allowed)


@router.get("/dashboard")
def get_dashboard(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "dashboard")
    permissions = PermissionService(db)
    allowed = {
        module
        for module in BI_MODULES["dashboard"]
        if permissions.has(profile.role, module, "view")
    }
    return BusinessIntelligenceService(db).dashboard(str(profile.id), allowed)


@router.get("/analytics/financial")
def get_financial_analytics(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
):
    _require_bi_access(profile, db, "financial")
    start_date, end_date = _date_range(start_date, end_date)
    permissions = PermissionService(db)
    allowed = {
        module
        for module in BI_MODULES["financial"]
        if permissions.has(profile.role, module, "view")
    }
    return BusinessIntelligenceService(db).financial(start_date, end_date, allowed)


@router.get("/analytics/clients")
def get_client_analytics(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
):
    _require_bi_access(profile, db, "clients")
    start_date, end_date = _date_range(start_date, end_date)
    if not PermissionService(db).has(profile.role, "factures", "view"):
        return {
            "available": False,
            "items": [],
            "reason": "Invoice-view permission is required for client revenue analytics.",
        }
    return BusinessIntelligenceService(db).clients(start_date, end_date)


@router.get("/analytics/engagements")
def get_engagement_analytics(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "engagements")
    return BusinessIntelligenceService(db).engagements()


@router.get("/analytics/employees")
def get_employee_analytics(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "employees")
    return BusinessIntelligenceService(db).employees()


@router.get("/analytics/cash-flow")
def get_cash_flow_analytics(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
):
    _require_bi_access(profile, db, "cash")
    start_date, end_date = _date_range(start_date, end_date)
    return BusinessIntelligenceService(db).cash_flow(start_date, end_date)


@router.get("/analytics/stock")
def get_stock_analytics(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "stock")
    return BusinessIntelligenceService(db).stock()


@router.get("/analytics/expenses")
def get_expense_analytics(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
):
    _require_bi_access(profile, db, "expenses")
    start_date, end_date = _date_range(start_date, end_date)
    return BusinessIntelligenceService(db).expenses(start_date, end_date)


@router.get("/data-status")
def get_data_status(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "overview")
    return {
        "checked_at": datetime.now(UTC),
        "refresh_mode": "live_on_request",
        "sources": BusinessIntelligenceService(db).source_status(),
        "powerbi_configured": settings.powerbi_configured,
        "powerbi_dataset_refresh": "separate_scheduled_refresh_required",
    }


@router.get("/reports")
def list_powerbi_reports(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "powerbi")
    if not settings.powerbi_configured:
        return {"configured": False, "reports": []}
    _require_powerbi_access(profile, db)
    return {
        "configured": True,
        "reports": [
            {
                "id": report_id,
                "workspace_id": settings.powerbi_workspace_id,
            }
            for report_id in settings.powerbi_report_id_list
        ],
    }


def _validate_report_access(report_id: str, profile: Profile) -> None:
    if not settings.powerbi_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Power BI Embedded is not configured.",
        )
    if report_id not in settings.powerbi_report_id_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    if profile.role not in POWERBI_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Power BI access is restricted to management roles.",
        )


@router.get("/reports/{report_id}")
def get_powerbi_report(
    report_id: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "powerbi")
    _require_powerbi_access(profile, db)
    _validate_report_access(report_id, profile)
    report = _get_report(report_id, _client_credentials_token())
    logger.info("Power BI report metadata accessed user_id=%s report_id=%s", profile.id, report_id)
    return {
        "id": report["id"],
        "name": report["name"],
        "embed_url": report["embedUrl"],
        "dataset_id": report.get("datasetId"),
    }


@router.post("/reports/{report_id}/embed-token", response_model=EmbedTokenResponse)
def create_powerbi_embed_token(
    report_id: str,
    request: Request,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_bi_access(profile, db, "powerbi")
    _require_powerbi_access(profile, db)
    _validate_report_access(report_id, profile)
    access_token = _client_credentials_token()
    report = _get_report(report_id, access_token)
    dataset_id = settings.powerbi_dataset_id or report.get("datasetId")
    body: dict = {"accessLevel": "View"}
    if settings.powerbi_rls_role:
        if not dataset_id:
            raise HTTPException(
                status_code=503,
                detail="A dataset ID is required for configured Power BI row-level security.",
            )
        body["identities"] = [
            {
                "username": profile.email,
                "roles": [settings.powerbi_rls_role],
                "datasets": [dataset_id],
            }
        ]
    result = _powerbi_request(
        "POST",
        f"{POWERBI_API}/groups/{settings.powerbi_workspace_id}/reports/{report_id}/GenerateToken",
        access_token,
        json=body,
    )
    logger.info(
        "Power BI embed token generated user_id=%s report_id=%s client_ip=%s",
        profile.id,
        report_id,
        request.client.host if request.client else "unknown",
    )
    return EmbedTokenResponse(
        report_id=report_id,
        embed_url=report["embedUrl"],
        embed_token=result["token"],
        expiration=result.get("expiration"),
    )
