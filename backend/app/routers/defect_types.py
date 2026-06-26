from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.defect_type import DefectType

router = APIRouter(prefix="/api/defect-types", tags=["defect-types"])


@router.get("")
async def list_defect_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DefectType).order_by(DefectType.id))
    types = result.scalars().all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "severity": t.severity,
            "icon_name": t.icon_name,
            "example_image_url": t.example_image_path,
        }
        for t in types
    ]
