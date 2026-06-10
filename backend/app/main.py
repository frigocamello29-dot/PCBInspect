from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ml.detector import MockPCBDefectDetector, PCBDefectDetector

detector = None


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
    yield


app = FastAPI(title="PCB Defect Detector", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_detector():
    return detector


@app.get("/api/health")
async def health():
    return {"status": "ok", "mock_detector": settings.USE_MOCK_DETECTOR}
