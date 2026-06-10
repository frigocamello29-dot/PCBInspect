import uuid

from sqlalchemy import Float, ForeignKey, Index, Integer, SmallInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DefectFinding(Base):
    __tablename__ = "defect_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    detection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("detections.id", ondelete="CASCADE"), nullable=False)
    defect_type_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("defect_types.id"), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x1: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_y1: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_x2: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_y2: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        Index("idx_findings_detection", "detection_id"),
        Index("idx_findings_defect_type", "defect_type_id"),
    )

    detection: Mapped["Detection"] = relationship("Detection", back_populates="findings")
    defect_type: Mapped["DefectType"] = relationship("DefectType", back_populates="findings")
