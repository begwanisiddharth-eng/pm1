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


def test_change_password_unauthenticated(client: TestClient) -> None:
    resp = client.patch(
        "/api/auth/password",
        json={"current_password": "password", "new_password": "newpassword"},
    )
    assert resp.status_code == 401
