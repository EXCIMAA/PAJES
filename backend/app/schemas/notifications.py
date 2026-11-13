from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime
    metadata: dict[str, Any] | None = None


class NotificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    type: str = Field(default="alert", min_length=1, max_length=100)


class NotificationCountResponse(BaseModel):
    count: int
