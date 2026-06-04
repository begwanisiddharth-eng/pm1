import pytest
from fastapi.testclient import TestClient

from app.main import FRONTEND_OUT, app


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.skipif(not FRONTEND_OUT.is_dir(), reason="frontend not built — run npm run build in frontend/")
def test_root_serves_frontend(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "<!DOCTYPE html>" in response.text


def test_login_success(auth_client: TestClient) -> None:
    response = auth_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"username": "user"}


def test_login_wrong_password(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
    assert response.status_code == 401


def test_login_wrong_username(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "password"})
    assert response.status_code == 401


def test_me_unauthenticated(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_authenticated(auth_client: TestClient) -> None:
    response = auth_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"username": "user"}


def test_logout(auth_client: TestClient) -> None:
    auth_client.post("/api/auth/logout")
    response = auth_client.get("/api/auth/me")
    assert response.status_code == 401


# --- Registration tests ---

def test_register_success(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": "newuser", "password": "secure123"},
    )
    assert response.status_code == 201
    assert response.json() == {"username": "newuser"}


def test_register_then_login(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "mypassword"},
    )
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "mypassword"},
    )
    assert response.status_code == 200
    assert response.json() == {"username": "testuser"}


def test_register_creates_initial_board(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "boarduser", "password": "pass12345"},
    )
    client.post(
        "/api/auth/login",
        json={"username": "boarduser", "password": "pass12345"},
    )
    response = client.get("/api/boards")
    assert response.status_code == 200
    boards = response.json()
    assert len(boards) == 1
    assert boards[0]["name"] == "My Board"


def test_register_duplicate_username(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "pass12345"},
    )
    response = client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "other123"},
    )
    assert response.status_code == 409


def test_register_short_username(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": "ab", "password": "pass12345"},
    )
    assert response.status_code == 400


def test_register_short_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": "validuser", "password": "abc"},
    )
    assert response.status_code == 400
