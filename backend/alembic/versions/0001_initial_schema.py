"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), server_default="operator"),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "defect_types",
        sa.Column("id", sa.SmallInteger, primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.String(10), nullable=False),
        sa.Column("icon_name", sa.String(50), nullable=True),
        sa.Column("example_image_path", sa.String(255), nullable=True),
        sa.CheckConstraint("severity IN ('low','medium','high','critical')", name="ck_defect_types_severity"),
    )

    op.create_table(
        "detections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.String(100), unique=True, nullable=True),
        sa.Column("image_path", sa.String(500), nullable=False),
        sa.Column("thumbnail_path", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("defect_count", sa.Integer, server_default="0"),
        sa.Column("is_defective", sa.Boolean, server_default=sa.false()),
        sa.Column("inference_time_ms", sa.Integer, nullable=True),
        sa.Column("model_version", sa.String(20), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('pending','processing','completed','failed')", name="ck_detections_status"),
    )
    op.create_index("idx_detections_user", "detections", ["user_id", "created_at"])
    op.create_index(
        "idx_detections_defective",
        "detections",
        ["is_defective"],
        postgresql_where=sa.text("is_defective = TRUE"),
    )
    op.create_index("idx_detections_job", "detections", ["job_id"])

    op.create_table(
        "defect_findings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("detection_id", UUID(as_uuid=True), sa.ForeignKey("detections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("defect_type_id", sa.SmallInteger, sa.ForeignKey("defect_types.id"), nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("bbox_x1", sa.Integer, nullable=False),
        sa.Column("bbox_y1", sa.Integer, nullable=False),
        sa.Column("bbox_x2", sa.Integer, nullable=False),
        sa.Column("bbox_y2", sa.Integer, nullable=False),
    )
    op.create_index("idx_findings_detection", "defect_findings", ["detection_id"])
    op.create_index("idx_findings_defect_type", "defect_findings", ["defect_type_id"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), unique=True, nullable=False),
        sa.Column("family_id", UUID(as_uuid=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean, server_default=sa.false()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_refresh_tokens_user", "refresh_tokens", ["user_id"])
    op.create_index("idx_refresh_tokens_family", "refresh_tokens", ["family_id"])


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("defect_findings")
    op.drop_index("idx_detections_job", table_name="detections")
    op.drop_index("idx_detections_defective", table_name="detections")
    op.drop_index("idx_detections_user", table_name="detections")
    op.drop_table("detections")
    op.drop_table("defect_types")
    op.drop_table("users")
