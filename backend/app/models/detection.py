import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Detection(Base):
    __tablename__ = "detections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    defect_count: Mapped[int] = mapped_column(Integer, default=0)
    is_defective: Mapped[bool] = mapped_column(Boolean, default=False)
    inference_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('pending','processing','completed','failed')", name="ck_detections_status"),
        Index("idx_detections_user", "user_id", "created_at"),
        Index("idx_detections_defective", "is_defective", postgresql_where="is_defective = TRUE"),
        Index("idx_detections_job", "job_id"),
    )

    user: Mapped["User"] = relationship("User", back_populates="detections")
    findings: Mapped[list["DefectFinding"]] = relationship("DefectFinding", back_populates="detection", cascade="all, delete-orphan")
