import uuid
from datetime import datetime

from pydantic import BaseModel


class BboxSchema(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class DefectTypeMinimal(BaseModel):
    id: int
    name: str
    severity: str

    model_config = {"from_attributes": True}


class FindingResponse(BaseModel):
    id: uuid.UUID
    defect_type: DefectTypeMinimal
    confidence: float
    bbox: BboxSchema


class DetectionSummary(BaseModel):
    id: uuid.UUID
    job_id: str | None
    image_path: str
    thumbnail_path: str | None
    status: str
    defect_count: int
    is_defective: bool
    inference_time_ms: int | None
    model_version: str | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DetectResponse(BaseModel):
    detection_id: uuid.UUID
    job_id: str | None
    status: str


class StatusResponse(BaseModel):
    status: str
    detection: DetectionSummary | None = None
    findings: list[FindingResponse] | None = None
