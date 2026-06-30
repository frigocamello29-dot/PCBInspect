from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.ml.detector import MockPCBDefectDetector

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    from app import main as app_main
    app_main.detector = MockPCBDefectDetector(conf_threshold=0.5)

    mock_job = MagicMock()
    mock_job.job_id = "test-job-id"
    mock_arq = AsyncMock()
    mock_arq.enqueue_job = AsyncMock(return_value=mock_job)

    app.state.arq_pool = mock_arq

    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as ac:
        yield ac

    app.dependency_overrides.clear()
