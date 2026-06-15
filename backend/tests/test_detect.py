import io
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.detection import Detection
from app.services import image_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

REG_PAYLOAD = {"email": "det@example.com", "password": "Secret123!", "full_name": "Det User"}


def _make_jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color=(0, 128, 0)).save(buf, format="JPEG")
    return buf.getvalue()


def _make_png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (60, 60), color=(0, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


async def _register_and_login(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json=REG_PAYLOAD)


# ---------------------------------------------------------------------------
# image_service unit tests
# ---------------------------------------------------------------------------

def test_image_service_accepts_jpeg(tmp_path):
    with patch.object(image_service, "_MAX_BYTES", 10 * 1024 * 1024), \
         patch("app.services.image_service.settings") as mock_settings:
        mock_settings.UPLOAD_DIR = str(tmp_path)
        mock_settings.MAX_UPLOAD_SIZE_MB = 10
        data = _make_jpeg()
        orig, thumb = image_service.validate_and_save(data)
        assert Path(orig).exists()
        assert Path(thumb).exists()
        assert orig.endswith(".jpg")


def test_image_service_accepts_png(tmp_path):
    with patch("app.services.image_service.settings") as mock_settings:
        mock_settings.UPLOAD_DIR = str(tmp_path)
        mock_settings.MAX_UPLOAD_SIZE_MB = 10
        data = _make_png()
        orig, thumb = image_service.validate_and_save(data)
        assert orig.endswith(".png")


def test_image_service_rejects_bad_mime():
    with pytest.raises(ValueError, match="Unsupported file type"):
        image_service.validate_and_save(b"not an image at all")


def test_image_service_rejects_oversized(tmp_path):
    with patch("app.services.image_service._MAX_BYTES", 10):
        with pytest.raises(ValueError, match="too large"):
            image_service.validate_and_save(_make_jpeg())


# ---------------------------------------------------------------------------
# detect task unit tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_task_run_detection_completed(db_session: AsyncSession):
    from app.ml.detector import DetectionResult, MockPCBDefectDetector
    from app.tasks.detect_task import run_detection

    detection = Detection(
        user_id=uuid.uuid4(),
        image_path="__dummy__",
        status="pending",
    )
    db_session.add(detection)
    await db_session.commit()
    await db_session.refresh(detection)

    fake_img = np.zeros((100, 100, 3), dtype=np.uint8)
    fixed_result = [
        DetectionResult(
            class_id=3,
            class_name="Open Circuit",
            confidence=0.9,
            bbox={"x1": 10, "y1": 10, "x2": 50, "y2": 50},
        )
    ]

    mock_detector = MagicMock()
    mock_detector.predict.return_value = fixed_result

    with patch("app.tasks.detect_task.AsyncSessionLocal") as mock_sl, \
         patch("app.tasks.detect_task.Image") as mock_img, \
         patch("app.tasks.detect_task.np") as mock_np:

        mock_sl.return_value.__aenter__ = AsyncMock(return_value=db_session)
        mock_sl.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_np.array.return_value = fake_img
        pil_img = MagicMock()
        pil_img.convert.return_value = pil_img
        mock_img.open.return_value = pil_img

        ctx = {"detector": mock_detector}
        await run_detection(ctx, str(detection.id))

    await db_session.refresh(detection)
    assert detection.status == "completed"
    assert detection.defect_count == 1
    assert detection.is_defective is True


@pytest.mark.asyncio
async def test_task_run_detection_failed(db_session: AsyncSession):
    from app.tasks.detect_task import run_detection

    detection = Detection(
        user_id=uuid.uuid4(),
        image_path="__nonexistent__.jpg",
        status="pending",
    )
    db_session.add(detection)
    await db_session.commit()
    await db_session.refresh(detection)

    mock_detector = MagicMock()
    mock_detector.predict.side_effect = RuntimeError("model exploded")

    with patch("app.tasks.detect_task.AsyncSessionLocal") as mock_sl:
        mock_sl.return_value.__aenter__ = AsyncMock(return_value=db_session)
        mock_sl.return_value.__aexit__ = AsyncMock(return_value=False)

        ctx = {"detector": mock_detector}
        await run_detection(ctx, str(detection.id))

    await db_session.refresh(detection)
    assert detection.status == "failed"
    assert detection.error_message is not None


# ---------------------------------------------------------------------------
# POST /api/detect
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_detect_requires_auth(client: AsyncClient):
    r = await client.post("/api/detect", files={"file": ("x.jpg", _make_jpeg(), "image/jpeg")})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_detect_submit_success(client: AsyncClient, tmp_path):
    await _register_and_login(client)

    with patch("app.services.image_service.settings") as ms:
        ms.UPLOAD_DIR = str(tmp_path)
        ms.MAX_UPLOAD_SIZE_MB = 10
        r = await client.post(
            "/api/detect",
            files={"file": ("board.jpg", _make_jpeg(), "image/jpeg")},
        )

    assert r.status_code == 202
    body = r.json()
    assert "detection_id" in body
    assert body["status"] == "pending"
    assert body["job_id"] == "test-job-id"


@pytest.mark.asyncio
async def test_detect_rejects_bad_mime(client: AsyncClient, tmp_path):
    await _register_and_login(client)

    with patch("app.services.image_service.settings") as ms:
        ms.UPLOAD_DIR = str(tmp_path)
        ms.MAX_UPLOAD_SIZE_MB = 10
        r = await client.post(
            "/api/detect",
            files={"file": ("board.txt", b"not an image", "text/plain")},
        )

    assert r.status_code == 422
    assert "Unsupported" in r.json()["detail"]


# ---------------------------------------------------------------------------
# GET /api/detect/status/:id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_status_requires_auth(client: AsyncClient):
    r = await client.get(f"/api/detect/status/{uuid.uuid4()}")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_status_not_found(client: AsyncClient):
    await _register_and_login(client)
    r = await client.get(f"/api/detect/status/{uuid.uuid4()}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_status_pending(client: AsyncClient, db_session: AsyncSession, tmp_path):
    await _register_and_login(client)
    me = (await client.get("/api/auth/me")).json()

    detection = Detection(
        user_id=uuid.UUID(me["id"]),
        image_path="dummy.jpg",
        status="pending",
    )
    db_session.add(detection)
    await db_session.commit()
    await db_session.refresh(detection)

    r = await client.get(f"/api/detect/status/{detection.id}")
    assert r.status_code == 200
    assert r.json()["status"] == "pending"
    assert r.json()["detection"] is None


@pytest.mark.asyncio
async def test_status_other_user_returns_404(client: AsyncClient, db_session: AsyncSession):
    await _register_and_login(client)

    detection = Detection(
        user_id=uuid.uuid4(),
        image_path="dummy.jpg",
        status="completed",
    )
    db_session.add(detection)
    await db_session.commit()
    await db_session.refresh(detection)

    r = await client.get(f"/api/detect/status/{detection.id}")
    assert r.status_code == 404
