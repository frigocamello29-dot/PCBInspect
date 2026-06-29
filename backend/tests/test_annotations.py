import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.annotation_correction import AnnotationCorrection
from app.models.defect_finding import DefectFinding
from app.models.defect_type import DefectType
from app.models.detection import Detection

REG_PAYLOAD = {"email": "ann@example.com", "password": "Secret123!", "full_name": "Ann User"}

SAMPLE_FINDINGS = [
    {"class_id": 1, "bbox_x1": 10, "bbox_y1": 20, "bbox_x2": 50, "bbox_y2": 60},
    {"class_id": 3, "bbox_x1": 100, "bbox_y1": 200, "bbox_x2": 150, "bbox_y2": 250},
]


async def _register_and_login(client: AsyncClient, payload: dict = REG_PAYLOAD) -> dict:
    await client.post("/api/auth/register", json=payload)
    return (await client.get("/api/auth/me")).json()


async def _create_detection(db: AsyncSession, user_id: uuid.UUID) -> Detection:
    d = Detection(user_id=user_id, image_path="dummy.jpg", status="completed")
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


# ---------------------------------------------------------------------------
# GET /api/detections/{id}/annotations
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_annotations_requires_auth(client: AsyncClient):
    r = await client.get(f"/api/detections/{uuid.uuid4()}/annotations")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_annotations_not_found(client: AsyncClient):
    await _register_and_login(client)
    r = await client.get(f"/api/detections/{uuid.uuid4()}/annotations")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_annotations_wrong_user(client: AsyncClient, db_session: AsyncSession):
    await _register_and_login(client)
    other_detection = await _create_detection(db_session, uuid.uuid4())
    r = await client.get(f"/api/detections/{other_detection.id}/annotations")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_annotations_empty(client: AsyncClient, db_session: AsyncSession):
    me = await _register_and_login(client)
    detection = await _create_detection(db_session, uuid.UUID(me["id"]))

    r = await client.get(f"/api/detections/{detection.id}/annotations")
    assert r.status_code == 200
    body = r.json()
    assert body["model_findings"] == []
    assert body["correction"] is None


@pytest.mark.asyncio
async def test_get_annotations_with_correction(client: AsyncClient, db_session: AsyncSession):
    me = await _register_and_login(client)
    detection = await _create_detection(db_session, uuid.UUID(me["id"]))

    await client.post(
        f"/api/detections/{detection.id}/annotations",
        json={"findings": SAMPLE_FINDINGS},
    )

    r = await client.get(f"/api/detections/{detection.id}/annotations")
    assert r.status_code == 200
    body = r.json()
    assert body["correction"] is not None
    assert len(body["correction"]["findings"]) == 2
    assert body["correction"]["findings"][0]["class_id"] == 1


@pytest.mark.asyncio
async def test_get_annotations_with_model_findings(client: AsyncClient, db_session: AsyncSession):
    me = await _register_and_login(client)
    detection = await _create_detection(db_session, uuid.UUID(me["id"]))

    defect_type = DefectType(
        id=3,
        name="Open Circuit",
        description="Break in copper trace",
        severity="high",
        icon_name="circuit",
    )
    db_session.add(defect_type)
    await db_session.flush()

    finding = DefectFinding(
        detection_id=detection.id,
        defect_type_id=3,
        confidence=0.91,
        bbox_x1=10,
        bbox_y1=20,
        bbox_x2=50,
        bbox_y2=60,
    )
    db_session.add(finding)
    await db_session.commit()

    r = await client.get(f"/api/detections/{detection.id}/annotations")
    assert r.status_code == 200
    body = r.json()
    assert len(body["model_findings"]) == 1
    assert body["model_findings"][0]["defect_type"]["id"] == 3
    assert abs(body["model_findings"][0]["confidence"] - 0.91) < 0.01
    assert body["model_findings"][0]["bbox"] == {"x1": 10, "y1": 20, "x2": 50, "y2": 60}


# ---------------------------------------------------------------------------
# POST /api/detections/{id}/annotations
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_annotations_requires_auth(client: AsyncClient):
    r = await client.post(
        f"/api/detections/{uuid.uuid4()}/annotations",
        json={"findings": SAMPLE_FINDINGS},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_post_annotations_not_found(client: AsyncClient):
    await _register_and_login(client)
    r = await client.post(
        f"/api/detections/{uuid.uuid4()}/annotations",
        json={"findings": SAMPLE_FINDINGS},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_post_annotations_wrong_user(client: AsyncClient, db_session: AsyncSession):
    await _register_and_login(client)
    other_detection = await _create_detection(db_session, uuid.uuid4())
    r = await client.post(
        f"/api/detections/{other_detection.id}/annotations",
        json={"findings": SAMPLE_FINDINGS},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_post_annotations_creates(client: AsyncClient, db_session: AsyncSession):
    me = await _register_and_login(client)
    detection = await _create_detection(db_session, uuid.UUID(me["id"]))

    r = await client.post(
        f"/api/detections/{detection.id}/annotations",
        json={"findings": SAMPLE_FINDINGS},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["detection_id"] == str(detection.id)
    assert body["user_id"] == me["id"]
    assert len(body["findings"]) == 2
    assert body["findings"][0]["class_id"] == 1
    assert body["findings"][1]["class_id"] == 3
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_post_annotations_updates(client: AsyncClient, db_session: AsyncSession):
    me = await _register_and_login(client)
    detection = await _create_detection(db_session, uuid.UUID(me["id"]))

    await client.post(
        f"/api/detections/{detection.id}/annotations",
        json={"findings": SAMPLE_FINDINGS},
    )

    updated = [{"class_id": 6, "bbox_x1": 5, "bbox_y1": 5, "bbox_x2": 30, "bbox_y2": 30}]
    r = await client.post(
        f"/api/detections/{detection.id}/annotations",
        json={"findings": updated},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["findings"]) == 1
    assert body["findings"][0]["class_id"] == 6

    # Exactly one correction row in DB
    result = await db_session.execute(
        select(AnnotationCorrection).where(AnnotationCorrection.detection_id == detection.id)
    )
    assert len(result.scalars().all()) == 1


@pytest.mark.asyncio
async def test_post_annotations_empty_findings(client: AsyncClient, db_session: AsyncSession):
    me = await _register_and_login(client)
    detection = await _create_detection(db_session, uuid.UUID(me["id"]))

    r = await client.post(
        f"/api/detections/{detection.id}/annotations",
        json={"findings": []},
    )
    assert r.status_code == 200
    assert r.json()["findings"] == []


@pytest.mark.asyncio
async def test_post_annotations_invalid_payload(client: AsyncClient, db_session: AsyncSession):
    me = await _register_and_login(client)
    detection = await _create_detection(db_session, uuid.UUID(me["id"]))

    r = await client.post(
        f"/api/detections/{detection.id}/annotations",
        json={"findings": [{"class_id": "not-an-int"}]},
    )
    assert r.status_code == 422
