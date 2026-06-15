from fastapi import Request
from jose import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


def _user_or_ip_key(request: Request) -> str:
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=_user_or_ip_key)
