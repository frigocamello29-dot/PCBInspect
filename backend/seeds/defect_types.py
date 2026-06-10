"""Seed the defect_types reference table with the 6 standard PCB defect classes."""
import asyncio

from sqlalchemy import text

from app.database import AsyncSessionLocal

DEFECT_TYPES = [
    {
        "id": 1,
        "name": "Missing Hole",
        "description": "Hole not drilled or fully blocked",
        "severity": "high",
        "icon_name": "circle-off",
    },
    {
        "id": 2,
        "name": "Mouse Bite",
        "description": "Small notch on conductor edge",
        "severity": "medium",
        "icon_name": "scissors",
    },
    {
        "id": 3,
        "name": "Open Circuit",
        "description": "Break in copper trace",
        "severity": "critical",
        "icon_name": "zap-off",
    },
    {
        "id": 4,
        "name": "Short",
        "description": "Unintended connection between traces",
        "severity": "critical",
        "icon_name": "zap",
    },
    {
        "id": 5,
        "name": "Spur",
        "description": "Protruding copper from trace edge",
        "severity": "low",
        "icon_name": "git-branch",
    },
    {
        "id": 6,
        "name": "Spurious Copper",
        "description": "Extra copper not part of design",
        "severity": "medium",
        "icon_name": "layers",
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for row in DEFECT_TYPES:
            await session.execute(
                text(
                    """
                    INSERT INTO defect_types (id, name, description, severity, icon_name)
                    VALUES (:id, :name, :description, :severity, :icon_name)
                    ON CONFLICT (id) DO NOTHING
                    """
                ),
                row,
            )
        await session.commit()
    print(f"Seeded {len(DEFECT_TYPES)} defect types.")


if __name__ == "__main__":
    asyncio.run(seed())
