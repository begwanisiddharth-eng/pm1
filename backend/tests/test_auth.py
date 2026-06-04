from fastapi.testclient import TestClient


def test_change_password_success(auth_client: TestClient) -> None:
    resp = auth_client.patch(
        "/api/auth/password",
        json={"current_password": "password", "new_password": "newpassword"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    # Log out then log in with the new password
    auth_client.post("/api/auth/logout")
    login_resp = auth_client.post(
        "/api/auth/login",
        json={"username": "user", "password": "newpassword"},
    )
    assert login_resp.status_code == 200


def test_change_password_wrong_current(auth_client: TestClient) -> None:
    resp = auth_client.patch(
        "/api/auth/password",
        json={"current_password": "wrongpassword", "new_password": "newpassword"},
    )
    assert resp.status_code == 400
    assert "incorrect" in resp.json()["detail"].lower()


def test_change_password_too_short(auth_client: TestClient) -> None:
    resp = auth_client.patch(
        "/api/auth/password",
        json={"current_password": "password", "new_password": "abc"},
    )
    assert resp.status_code == 400
    assert "6" in resp.json()["detail"]


def test_register_username_too_short(client: TestClient) -> None:
    resp = client.post(
        "/api/auth/register",
        json={"username": "ab", "password": "validpass"},
    )
    assert resp.status_code == 400
    assert "3" in resp.json()["detail"]


def test_register_password_too_short(client: TestClient) -> None:
    resp = client.post(
        "/api/auth/register",
        json={"username": "validuser", "password": "abc"},
    )
    assert resp.status_code == 400
    assert "6" in resp.json()["detail"]


def test_register_duplicate_username(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "validpass"},
    )
    resp = client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "anotherpass"},
    )
    assert resp.status_code == 409


def test_register_creates_board(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "newuser", "password": "validpass"},
    )
    client.post("/api/auth/login", json={"username": "newuser", "password": "validpass"})
    resp = client.get("/api/boards")
    assert resp.status_code == 200
    boards = resp.json()
    assert len(boards) == 1
    assert boards[0]["name"] == "My Board"


def test_change_password_unauthenticated(client: TestClient) -> None:
    resp = client.patch(
        "/api/auth/password",
        json={"current_password": "password", "new_password": "newpassword"},
    )
    assert resp.status_code == 401
