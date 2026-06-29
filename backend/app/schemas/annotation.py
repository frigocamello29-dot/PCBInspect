import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.detection import FindingResponse


class CorrectionFindingInput(BaseModel):
    class_id: int
    bbox_x1: int
    bbox_y1: int
    bbox_x2: int
    bbox_y2: int


class AnnotationCorrectionCreate(BaseModel):
    findings: list[CorrectionFindingInput]


class AnnotationCorrectionResponse(BaseModel):
    id: uuid.UUID
    detection_id: uuid.UUID
    user_id: uuid.UUID
    findings: list[dict[str, Any]]
    created_at: datetime

    model_config = {"from_attributes": True}


class AnnotationsResponse(BaseModel):
    model_findings: list[FindingResponse]
    correction: AnnotationCorrectionResponse | None
