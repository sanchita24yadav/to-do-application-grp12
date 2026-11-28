import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.admin import router as admin_router
from app.routes.tasks import router as tasks_router
from app.ai import router as ai_router
from app.productivity import router as productivity_router

app = FastAPI(
    title="To-Do Application API",
    description="User and Admin Authentication APIs",
    version="1.0.0"
)

# Read allowed origins from env, with localhost defaults for dev
origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(tasks_router)
app.include_router(ai_router)
app.include_router(productivity_router)


@app.get("/")
def home():
    return {"message": "To-Do Application API is running"}
