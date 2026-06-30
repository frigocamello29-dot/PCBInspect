import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


REG_PAYLOAD = {"email": "test@example.com", "password": "Secret123!", "full_name": "Test User"}


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    r = await client.post("/api/auth/register", json=REG_PAYLOAD)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == REG_PAYLOAD["email"]
    assert body["full_name"] == REG_PAYLOAD["full_name"]
    assert "id" in body
    assert "access_token" in r.cookies
    assert "refresh_token" in r.cookies


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    r = await client.post("/api/auth/register", json=REG_PAYLOAD)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    r = await client.post("/api/auth/login", json={"email": REG_PAYLOAD["email"], "password": REG_PAYLOAD["password"]})
    assert r.status_code == 200
    assert "access_token" in r.cookies
    assert "refresh_token" in r.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    r = await client.post("/api/auth/login", json={"email": REG_PAYLOAD["email"], "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    r = await client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient):
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    r = await client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == REG_PAYLOAD["email"]


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    r = await client.get("/api/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotates_token(client: AsyncClient):
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    old_refresh = client.cookies.get("refresh_token")

    r = await client.post("/api/auth/refresh")
    assert r.status_code == 200
    new_refresh = r.cookies.get("refresh_token")
    assert new_refresh is not None
    assert new_refresh != old_refresh


@pytest.mark.asyncio
async def test_refresh_no_cookie(client: AsyncClient):
    r = await client.post("/api/auth/refresh")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_refresh_replay_revokes_family(client: AsyncClient):
    """Reusing an already-consumed refresh token must revoke the whole family."""
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    original_refresh = client.cookies.get("refresh_token")

    await client.post("/api/auth/refresh")

    client.cookies.set("refresh_token", original_refresh)
    r = await client.post("/api/auth/refresh")
    assert r.status_code == 401

    r2 = await client.post("/api/auth/refresh")
    assert r2.status_code == 401


@pytest.mark.asyncio
async def test_logout_clears_cookies(client: AsyncClient):
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    r = await client.post("/api/auth/logout")
    assert r.status_code == 204
    assert client.cookies.get("access_token") in (None, "")


@pytest.mark.asyncio
async def test_after_logout_me_returns_401(client: AsyncClient):
    await client.post("/api/auth/register", json=REG_PAYLOAD)
    await client.post("/api/auth/logout")
    r = await client.get("/api/auth/me")
    assert r.status_code == 401
