import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.defect_finding import DefectFinding
from app.models.detection import Detection
from app.models.user import User
from app.schemas.detection import BboxSchema, DefectTypeMinimal, DetectionSummary, FindingResponse
from app.services import image_service

router = APIRouter(prefix="/api")


class AnnotationInput(BaseModel):
    class_id: int
    confidence: float
    bbox: BboxSchema


class AnnotateRequest(BaseModel):
    image_path: str
    annotations: list[AnnotationInput]


class UploadImageResponse(BaseModel):
    image_path: str
    thumbnail_path: str


class AnnotateResponse(BaseModel):
    detection: DetectionSummary
    findings: list[FindingResponse]


def _validate_image_path(image_path: str) -> Path:
    orig_dir = Path(settings.UPLOAD_DIR, "originals").resolve()
    img = Path(image_path).resolve()
    if not str(img).startswith(str(orig_dir)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image path")
    if not img.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return img


@router.post("/annotate/upload", response_model=UploadImageResponse)
async def upload_image_for_annotation(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> UploadImageResponse:
    data = await file.read()
    try:
        image_path, thumbnail_path = image_service.validate_and_save(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return UploadImageResponse(image_path=image_path, thumbnail_path=thumbnail_path)


@router.post("/annotate", response_model=AnnotateResponse, status_code=status.HTTP_201_CREATED)
async def save_annotations(
    body: AnnotateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnnotateResponse:
    _validate_image_path(body.image_path)

    thumb_dir = Path(settings.UPLOAD_DIR, "thumbnails")
    img_name = Path(body.image_path).name
    thumb_path = str(thumb_dir / img_name)
    if not os.path.exists(thumb_path):
        thumb_path = None

    detection = Detection(
        user_id=current_user.id,
        image_path=body.image_path,
        thumbnail_path=thumb_path,
        status="completed",
        defect_count=len(body.annotations),
        is_defective=bool(body.annotations),
        model_version="manual",
    )
    db.add(detection)
    await db.flush()

    for ann in body.annotations:
        db.add(DefectFinding(
            detection_id=detection.id,
            defect_type_id=ann.class_id,
            confidence=ann.confidence,
            bbox_x1=ann.bbox.x1,
            bbox_y1=ann.bbox.y1,
            bbox_x2=ann.bbox.x2,
            bbox_y2=ann.bbox.y2,
        ))

    await db.commit()
    await db.refresh(detection)

    result = await db.execute(
        select(DefectFinding)
        .where(DefectFinding.detection_id == detection.id)
        .options(selectinload(DefectFinding.defect_type))
    )
    db_findings = result.scalars().all()

    return AnnotateResponse(
        detection=DetectionSummary.model_validate(detection),
        findings=[
            FindingResponse(
                id=f.id,
                defect_type=DefectTypeMinimal.model_validate(f.defect_type),
                confidence=f.confidence,
                bbox=BboxSchema(x1=f.bbox_x1, y1=f.bbox_y1, x2=f.bbox_x2, y2=f.bbox_y2),
            )
            for f in db_findings
        ],
    )
