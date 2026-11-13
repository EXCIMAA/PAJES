from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import MetaData, Table, Uuid, delete, insert, select, update
from sqlalchemy.orm import Session

from app.core import utcnow
from app.models.auth import Profile

logger = logging.getLogger("pajes.notifications")


class NotificationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.bind = db.get_bind()
        try:
            self.table = Table(
                "notifications",
                MetaData(),
                schema="public" if self.bind.dialect.name == "postgresql" else None,
                autoload_with=self.bind,
            )
        except Exception as exc:
            logger.error("Notification table reflection failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Notifications are unavailable in the configured database.",
            ) from exc

        required = {"id", "user_id", "title", "message", "type", "read", "created_at"}
        if not required.issubset(self.table.c.keys()):
            logger.error("Notification table is missing required columns")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Notifications are unavailable in the configured database.",
            )

    def _user_id(self, profile: Profile) -> Any:
        if isinstance(self.table.c.user_id.type, Uuid):
            try:
                return uuid.UUID(profile.id)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authenticated user identifier is invalid.",
                ) from exc
        return profile.id

    def _record(self, row: Any) -> dict[str, Any]:
        record = dict(row._mapping)
        record["id"] = str(record["id"])
        record["user_id"] = str(record["user_id"])
        if "metadata" in record and record["metadata"] is None:
            record["metadata"] = None
        return record

    def list_for_user(self, profile: Profile) -> list[dict[str, Any]]:
        user_id = self._user_id(profile)
        statement = (
            select(self.table)
            .where(self.table.c.user_id == user_id)
            .order_by(self.table.c.created_at.desc())
        )
        return [self._record(row) for row in self.db.execute(statement).all()]

    def unread_count(self, profile: Profile) -> int:
        from sqlalchemy import func

        statement = (
            select(func.count())
            .select_from(self.table)
            .where(self.table.c.user_id == self._user_id(profile))
            .where(self.table.c.read.is_(False))
        )
        return int(self.db.scalar(statement) or 0)

    def create_for_user(
        self,
        profile: Profile,
        *,
        title: str,
        message: str,
        notification_type: str,
    ) -> dict[str, Any]:
        now = utcnow()
        values: dict[str, Any] = {
            "user_id": self._user_id(profile),
            "title": title,
            "message": message,
            "type": notification_type,
            "read": False,
            "created_at": now,
        }
        if "id" in self.table.c and self.table.c.id.primary_key and (
            isinstance(self.table.c.id.type, Uuid)
            or getattr(self.table.c.id.type, "length", None) == 36
        ):
            values["id"] = (
                uuid.uuid4()
                if isinstance(self.table.c.id.type, Uuid)
                else str(uuid.uuid4())
            )
        if "updated_at" in self.table.c:
            values["updated_at"] = now
        if "metadata" in self.table.c:
            values["metadata"] = None
        try:
            row = self.db.execute(
                insert(self.table).values(**values).returning(self.table)
            ).one()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Notification creation failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Notification could not be created.",
            ) from exc
        return self._record(row)

    def mark_read(self, profile: Profile, notification_id: str) -> dict[str, Any]:
        return self._update(profile, notification_id, {"read": True})

    def mark_all_read(self, profile: Profile) -> int:
        statement = (
            update(self.table)
            .where(self.table.c.user_id == self._user_id(profile))
            .where(self.table.c.read.is_(False))
            .values(read=True)
        )
        if "updated_at" in self.table.c:
            statement = statement.values(updated_at=utcnow())
        try:
            result = self.db.execute(statement)
            self.db.commit()
            return int(result.rowcount or 0)
        except Exception as exc:
            self.db.rollback()
            logger.error("Mark-all-read failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Notifications could not be updated.",
            ) from exc

    def _update(
        self,
        profile: Profile,
        notification_id: str,
        values: dict[str, Any],
    ) -> dict[str, Any]:
        row_id = self._identity(notification_id)
        statement = (
            update(self.table)
            .where(self.table.c.id == row_id)
            .where(self.table.c.user_id == self._user_id(profile))
            .values(**values)
            .returning(self.table)
        )
        if "updated_at" in self.table.c:
            statement = statement.values(updated_at=utcnow())
        try:
            row = self.db.execute(statement).first()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Notification update failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Notification could not be updated.",
            ) from exc
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )
        return self._record(row)

    def delete_for_user(self, profile: Profile, notification_id: str) -> None:
        statement = (
            delete(self.table)
            .where(self.table.c.id == self._identity(notification_id))
            .where(self.table.c.user_id == self._user_id(profile))
        )
        try:
            result = self.db.execute(statement)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Notification deletion failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Notification could not be deleted.",
            ) from exc
        if not result.rowcount:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )

    def _identity(self, value: str) -> Any:
        if isinstance(self.table.c.id.type, Uuid):
            try:
                return uuid.UUID(value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Invalid notification identifier.",
                ) from exc
        return value
