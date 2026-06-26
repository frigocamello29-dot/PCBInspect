from contextlib import asynccontextmanager
from urllib.parse import urlparse

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.limiter import limiter
from app.ml.detector import MockPCBDefectDetector, PCBDefectDetector
from app.routers import annotate as annotate_router
from app.routers import auth as auth_router
from app.routers import defect_types as defect_types_router
from app.routers import detect as detect_router
from app.routers import detections as detections_router
from seeds.defect_types import seed as seed_defect_types

detector = None


def _redis_from_url(url: str) -> RedisSettings:
    p = urlparse(url)
    return RedisSettings(
        host=p.hostname or "localhost",
        port=p.port or 6379,
        database=int(p.path.lstrip("/") or 0),
        password=p.password,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector
    if settings.USE_MOCK_DETECTOR:
        detector = MockPCBDefectDetector(conf_threshold=settings.CONFIDENCE_THRESHOLD)
    else:
        detector = PCBDefectDetector(
            model_path=settings.MODEL_PATH,
            conf_threshold=settings.CONFIDENCE_THRESHOLD,
        )

    await seed_defect_types()
    app.state.arq_pool = await create_pool(_redis_from_url(settings.REDIS_URL))

    yield

    await app.state.arq_pool.close()


app = FastAPI(title="PCB Defect Detector", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_detector():
    return detector


app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth_router.router)
app.include_router(defect_types_router.router)
app.include_router(detect_router.router)
app.include_router(detections_router.router)
app.include_router(annotate_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "mock_detector": settings.USE_MOCK_DETECTOR}
