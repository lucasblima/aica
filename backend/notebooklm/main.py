"""AICA NotebookLM Microservice — FastAPI entry point."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers.health import router as health_router  # noqa: E402
from routers.artifacts import router as artifacts_router  # noqa: E402
from routers.notebooks import router as notebooks_router  # noqa: E402

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://aica.guru",
    "https://dev.aica.guru",
]

app = FastAPI(
    title="AICA NotebookLM Service",
    description="NotebookLM integration for AICA Life OS",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS", "DELETE"],
    allow_headers=["authorization", "content-type", "x-client-info", "apikey"],
)

app.include_router(health_router)
app.include_router(artifacts_router)
app.include_router(notebooks_router)
