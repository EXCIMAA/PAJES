from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import (
    PermissionService,
    get_current_profile,
)
from app.permissions.matrix import SUPER_ADMIN_ROLE
from app.schemas.reports import (
    CustomReportRequest,
    CustomReportResponse,
    ReportModule,
    ReportRowsResponse,
)
from app.services.report_service import REPORT_MODULES, STANDARD_REPORTS, ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


def _require_view(profile: Profile, db: Session, module: str) -> None:
    if profile.role != SUPER_ADMIN_ROLE and not PermissionService(db).has(
        profile.role, module, "view"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission insuffisante pour ce rapport.",
        )


@router.get("/catalog", response_model=list[ReportModule])
def get_report_catalog(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    service = ReportService(db)
    available = service.catalog()
    if profile.role == SUPER_ADMIN_ROLE:
        return available
    permissions = PermissionService(db)
    return [
        item
        for item in available
        if permissions.has(
            profile.role, REPORT_MODULES[item["id"]]["permission"], "view"
        )
    ]


@router.get("/standard/{report_type}", response_model=ReportRowsResponse)
def get_standard_report(
    report_type: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=1000)] = 500,
):
    config = STANDARD_REPORTS.get(report_type)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    _require_view(profile, db, config["permission"])
    return ReportService(db).standard(report_type, limit)


@router.post("/custom", response_model=CustomReportResponse)
def generate_custom_report(
    body: CustomReportRequest,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    permissions = PermissionService(db) if profile.role != SUPER_ADMIN_ROLE else None
    for module_id in body.modules:
        config = REPORT_MODULES.get(module_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown report module '{module_id}'.",
            )
        if permissions and not permissions.has(
            profile.role, config["permission"], "view"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission insuffisante pour un ou plusieurs modules du rapport.",
            )
    return ReportService(db).custom(
        body.modules,
        body.start_date,
        body.end_date,
        body.ignore_dates,
        body.limit,
    )
