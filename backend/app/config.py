from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str

    JWT_SECRET_KEY: str
    JWT_ACCESS_EXPIRES_MINUTES: int = 15
    JWT_REFRESH_EXPIRES_DAYS: int = 7

    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    MODEL_PATH: str = "/app/ml/models/pcb_defect_v1.onnx"
    MODEL_VERSION: str = "pcb_defect_v1"
    CONFIDENCE_THRESHOLD: float = 0.5
    USE_MOCK_DETECTOR: bool = True

    DETECT_RATE_LIMIT: str = "10/minute"
    AUTH_RATE_LIMIT: str = "5/minute"

    class Config:
        env_file = ".env"


settings = Settings()
