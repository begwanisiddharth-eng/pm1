import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.ai_router import router as ai_router
from app.auth import router as auth_router
from app.board import router as board_router
from app.database import init_db

APP_DIR = Path(__file__).resolve().parent
FRONTEND_OUT = APP_DIR.parent.parent / "frontend" / "out"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Project Management MVP", lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-change-in-production"),
)

app.include_router(auth_router)
app.include_router(board_router)
app.include_router(ai_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if FRONTEND_OUT.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_OUT, html=True), name="static")
