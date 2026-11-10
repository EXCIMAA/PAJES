"""API v1 router aggregation.

Each module adds its sub-router here. The health router is included
directly in main.py (mounted under /api/v1/health).
"""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.business_intelligence import router as business_intelligence_router
from app.api.v1.permissions import router as permissions_router
from app.api.v1.users import router as users_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(business_intelligence_router)
router.include_router(users_router)
router.include_router(permissions_router)
