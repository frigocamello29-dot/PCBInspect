import os
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.defect_finding import DefectFinding
from app.models.detection import Detection
from app.schemas.detection import BboxSchema, DefectTypeMinimal, DetectionSummary, FindingResponse
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/api")


class DetectionDetail(BaseModel):
    detection: DetectionSummary
    findings: list[FindingResponse]

    model_config = {"from_attributes": True}


class DetectionListResponse(BaseModel):
    items: list[DetectionSummary]
    total: int
    pages: int
    page: int


def _finding_schema(finding) -> FindingResponse:
    return FindingResponse(
        id=finding.id,
        defect_type=DefectTypeMinimal.model_validate(finding.defect_type),
        confidence=finding.confidence,
        bbox=BboxSchema(
            x1=finding.bbox_x1,
            y1=finding.bbox_y1,
            x2=finding.bbox_x2,
            y2=finding.bbox_y2,
        ),
    )


@router.get("/detections", response_model=DetectionListResponse)
async def list_detections(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    defective_only: bool = Query(False),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DetectionListResponse:
    query = select(Detection).where(Detection.user_id == current_user.id)

    if defective_only:
        query = query.where(Detection.is_defective.is_(True))
    if from_date:
        query = query.where(func.date(Detection.created_at) >= from_date)
    if to_date:
        query = query.where(func.date(Detection.created_at) <= to_date)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(Detection.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    detections = result.scalars().all()

    pages = max(1, (total + limit - 1) // limit)

    return DetectionListResponse(
        items=[DetectionSummary.model_validate(d) for d in detections],
        total=total,
        pages=pages,
        page=page,
    )


@router.get("/detections/{detection_id}", response_model=DetectionDetail)
async def get_detection(
    detection_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DetectionDetail:
    result = await db.execute(
        select(Detection)
        .where(Detection.id == detection_id, Detection.user_id == current_user.id)
        .options(selectinload(Detection.findings).selectinload(DefectFinding.defect_type))
    )
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    return DetectionDetail(
        detection=DetectionSummary.model_validate(detection),
        findings=[_finding_schema(f) for f in detection.findings],
    )


@router.delete("/detections/{detection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_detection(
    detection_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Detection).where(Detection.id == detection_id, Detection.user_id == current_user.id)
    )
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    for path in [detection.image_path, detection.thumbnail_path]:
        if path and os.path.exists(path):
            os.remove(path)

    await db.delete(detection)
    await db.commit()
