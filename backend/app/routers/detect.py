import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.limiter import limiter
from app.models.user import User
from app.schemas.detection import (
    BboxSchema,
    DefectTypeMinimal,
    DetectResponse,
    DetectionSummary,
    FindingResponse,
    StatusResponse,
)
from app.services import detection_service, image_service

router = APIRouter(prefix="/api")


def _get_arq(request: Request):
    return request.app.state.arq_pool


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


@router.post("/detect", response_model=DetectResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit(settings.DETECT_RATE_LIMIT)
async def submit_detection(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    arq_pool=Depends(_get_arq),
) -> DetectResponse:
    data = await file.read()

    try:
        image_path, thumbnail_path = image_service.validate_and_save(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    detection = await detection_service.create_detection(
        db, current_user.id, image_path, thumbnail_path
    )

    job = await arq_pool.enqueue_job("run_detection", str(detection.id))
    job_id = job.job_id if job else None
    if job_id:
        await detection_service.set_job_id(db, detection, job_id)

    return DetectResponse(detection_id=detection.id, job_id=job_id, status="pending")


@router.get("/detect/status/{detection_id}", response_model=StatusResponse)
async def get_detection_status(
    detection_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StatusResponse:
    detection = await detection_service.get_detection_with_findings(db, detection_id)

    if detection is None or detection.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    if detection.status in ("pending", "processing"):
        return StatusResponse(status=detection.status)

    findings = [_finding_schema(f) for f in detection.findings]
    return StatusResponse(
        status=detection.status,
        detection=DetectionSummary.model_validate(detection),
        findings=findings,
    )
