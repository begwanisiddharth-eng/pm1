import pytest
from fastapi.testclient import TestClient

from app.main import FRONTEND_OUT, app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    client.post("/api/auth/login", json={"username": "user", "password": "password"})
    return client


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


def test_login_success(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})

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
