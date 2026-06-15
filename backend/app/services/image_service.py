import io
import uuid
from pathlib import Path

from PIL import Image

from app.config import settings

_SIGNATURES: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
]
_MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
_THUMB_WIDTH = 300


def _detect_ext(data: bytes) -> str | None:
    for magic, ext in _SIGNATURES:
        if data[: len(magic)] == magic:
            return ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


def validate_and_save(data: bytes) -> tuple[str, str]:
    """Validate MIME via magic bytes and size, save original + thumbnail.

    Returns (image_path, thumbnail_path). Raises ValueError on bad input.
    """
    if len(data) > _MAX_BYTES:
        raise ValueError(
            f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    ext = _detect_ext(data)
    if ext is None:
        raise ValueError("Unsupported file type. Use JPG, PNG, or WEBP.")

    name = uuid.uuid4().hex
    orig_dir = Path(settings.UPLOAD_DIR, "originals")
    thumb_dir = Path(settings.UPLOAD_DIR, "thumbnails")
    orig_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    orig_path = str(orig_dir / (name + ext))
    thumb_path = str(thumb_dir / (name + ext))

    with open(orig_path, "wb") as fh:
        fh.write(data)

    img = Image.open(io.BytesIO(data)).convert("RGB")
    scale = _THUMB_WIDTH / img.width
    thumb = img.resize((_THUMB_WIDTH, int(img.height * scale)), Image.LANCZOS)
    thumb.save(thumb_path)

    return orig_path, thumb_path
