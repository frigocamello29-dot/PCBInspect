import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.defect_finding import DefectFinding
from app.models.detection import Detection


async def create_detection(
    db: AsyncSession,
    user_id: uuid.UUID,
    image_path: str,
    thumbnail_path: str | None,
) -> Detection:
    detection = Detection(
        user_id=user_id,
        image_path=image_path,
        thumbnail_path=thumbnail_path,
        status="pending",
    )
    db.add(detection)
    await db.commit()
    await db.refresh(detection)
    return detection


async def set_job_id(db: AsyncSession, detection: Detection, job_id: str) -> None:
    detection.job_id = job_id
    await db.commit()


async def get_detection_with_findings(
    db: AsyncSession, detection_id: uuid.UUID
) -> Detection | None:
    result = await db.execute(
        select(Detection)
        .where(Detection.id == detection_id)
        .options(
            selectinload(Detection.findings).selectinload(DefectFinding.defect_type)
        )
    )
    return result.scalar_one_or_none()


async def update_completed(
    db: AsyncSession,
    detection: Detection,
    findings_data: list[dict],
    inference_time_ms: int,
    model_version: str,
) -> None:
    for f in findings_data:
        db.add(
            DefectFinding(
                detection_id=detection.id,
                defect_type_id=f["class_id"],
                confidence=f["confidence"],
                bbox_x1=f["bbox"]["x1"],
                bbox_y1=f["bbox"]["y1"],
                bbox_x2=f["bbox"]["x2"],
                bbox_y2=f["bbox"]["y2"],
            )
        )
    detection.status = "completed"
    detection.defect_count = len(findings_data)
    detection.is_defective = bool(findings_data)
    detection.inference_time_ms = inference_time_ms
    detection.model_version = model_version
    await db.commit()


async def update_failed(db: AsyncSession, detection: Detection, error: str) -> None:
    detection.status = "failed"
    detection.error_message = error
    await db.commit()
