from sqlalchemy import CheckConstraint, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DefectType(Base):
    __tablename__ = "defect_types"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    icon_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    example_image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        CheckConstraint("severity IN ('low','medium','high','critical')", name="ck_defect_types_severity"),
    )

    findings: Mapped[list["DefectFinding"]] = relationship("DefectFinding", back_populates="defect_type")
