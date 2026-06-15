import time
import uuid
from urllib.parse import urlparse

import numpy as np
from arq.connections import RedisSettings
from PIL import Image
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.ml.detector import MockPCBDefectDetector, PCBDefectDetector
from app.models.detection import Detection
from app.services.detection_service import update_completed, update_failed


def _redis_from_url(url: str) -> RedisSettings:
    p = urlparse(url)
    return RedisSettings(
        host=p.hostname or "localhost",
        port=p.port or 6379,
        database=int(p.path.lstrip("/") or 0),
        password=p.password,
    )


async def run_detection(ctx: dict, detection_id: str) -> None:
    detector = ctx["detector"]

    async with AsyncSessionLocal() as db:
        row = await db.execute(
            select(Detection).where(Detection.id == uuid.UUID(detection_id))
        )
        detection = row.scalar_one_or_none()
        if detection is None:
            return

        detection.status = "processing"
        await db.commit()

        try:
            img = Image.open(detection.image_path).convert("RGB")
            arr = np.array(img)

            t0 = time.monotonic()
            results = detector.predict(arr)
            elapsed_ms = int((time.monotonic() - t0) * 1000)

            findings_data = [
                {"class_id": r.class_id, "confidence": r.confidence, "bbox": r.bbox}
                for r in results
            ]
            await update_completed(
                db, detection, findings_data, elapsed_ms, settings.MODEL_VERSION
            )

        except Exception as exc:
            await update_failed(db, detection, str(exc))


async def startup(ctx: dict) -> None:
    if settings.USE_MOCK_DETECTOR:
        ctx["detector"] = MockPCBDefectDetector(
            conf_threshold=settings.CONFIDENCE_THRESHOLD
        )
    else:
        ctx["detector"] = PCBDefectDetector(
            model_path=settings.MODEL_PATH,
            conf_threshold=settings.CONFIDENCE_THRESHOLD,
        )


class WorkerSettings:
    functions = [run_detection]
    on_startup = startup
    redis_settings = _redis_from_url(settings.REDIS_URL)
