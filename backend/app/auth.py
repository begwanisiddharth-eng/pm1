import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.database import get_db, hash_password, verify_password, _EMPTY_BOARD

router = APIRouter(prefix="/api/auth")


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def get_current_user(request: Request) -> str:
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/login")
def login(
    body: LoginRequest,
    request: Request,
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, str]:
    row = db.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        [body.username],
    ).fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session["user"] = row["username"]
    return {"username": row["username"]}


@router.post("/register", status_code=201)
def register(
    body: RegisterRequest,
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, str]:
    if len(body.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = db.execute(
        "SELECT 1 FROM users WHERE username = ?", [body.username.strip()]
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")
    password_hash = hash_password(body.password)
    cursor = db.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [body.username.strip(), password_hash],
    )
    user_id = cursor.lastrowid
    db.execute(
        "INSERT INTO boards (user_id, name, content) VALUES (?, ?, ?)",
        [user_id, "My Board", json.dumps(_EMPTY_BOARD)],
    )
    db.commit()
    return {"username": body.username.strip()}


@router.post("/logout")
def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"ok": True}


@router.get("/me")
def me(username: str = Depends(get_current_user)) -> dict[str, str]:
    return {"username": username}


@router.patch("/password")
def change_password(
    body: ChangePasswordRequest,
    username: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, bool]:
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    row = db.execute(
        "SELECT password_hash FROM users WHERE username = ?",
        [username],
    ).fetchone()
    if not row or not verify_password(body.current_password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = hash_password(body.new_password)
    db.execute(
        "UPDATE users SET password_hash = ? WHERE username = ?",
        [new_hash, username],
    )
    db.commit()
    return {"ok": True}
