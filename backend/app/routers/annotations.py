import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.annotation_correction import AnnotationCorrection
from app.models.defect_finding import DefectFinding
from app.models.detection import Detection
from app.models.user import User
from app.schemas.annotation import (
    AnnotationCorrectionCreate,
    AnnotationCorrectionResponse,
    AnnotationsResponse,
)
from app.schemas.detection import BboxSchema, DefectTypeMinimal, FindingResponse

router = APIRouter(prefix="/api")


def _finding_schema(f) -> FindingResponse:
    return FindingResponse(
        id=f.id,
        defect_type=DefectTypeMinimal.model_validate(f.defect_type),
        confidence=f.confidence,
        bbox=BboxSchema(x1=f.bbox_x1, y1=f.bbox_y1, x2=f.bbox_x2, y2=f.bbox_y2),
    )


async def _get_owned_detection(
    detection_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
    load_findings: bool = False,
) -> Detection:
    q = select(Detection).where(Detection.id == detection_id, Detection.user_id == current_user.id)
    if load_findings:
        q = q.options(selectinload(Detection.findings).selectinload(DefectFinding.defect_type))
    result = await db.execute(q)
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")
    return detection


@router.get("/detections/{detection_id}/annotations", response_model=AnnotationsResponse)
async def get_annotations(
    detection_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnnotationsResponse:
    detection = await _get_owned_detection(detection_id, current_user, db, load_findings=True)

    result = await db.execute(
        select(AnnotationCorrection).where(
            AnnotationCorrection.detection_id == detection_id,
            AnnotationCorrection.user_id == current_user.id,
        )
    )
    correction = result.scalar_one_or_none()

    return AnnotationsResponse(
        model_findings=[_finding_schema(f) for f in detection.findings],
        correction=AnnotationCorrectionResponse.model_validate(correction) if correction else None,
    )


@router.post(
    "/detections/{detection_id}/annotations",
    response_model=AnnotationCorrectionResponse,
    status_code=status.HTTP_200_OK,
)
async def upsert_annotations(
    detection_id: uuid.UUID,
    body: AnnotationCorrectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnnotationCorrectionResponse:
    await _get_owned_detection(detection_id, current_user, db)

    result = await db.execute(
        select(AnnotationCorrection).where(
            AnnotationCorrection.detection_id == detection_id,
            AnnotationCorrection.user_id == current_user.id,
        )
    )
    correction = result.scalar_one_or_none()

    findings_data = [f.model_dump() for f in body.findings]

    if correction:
        correction.findings = findings_data
    else:
        correction = AnnotationCorrection(
            detection_id=detection_id,
            user_id=current_user.id,
            findings=findings_data,
        )
        db.add(correction)

    await db.commit()
    await db.refresh(correction)

    return AnnotationCorrectionResponse.model_validate(correction)
