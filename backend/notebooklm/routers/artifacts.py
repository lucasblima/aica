"""Artifact generation endpoints."""

import asyncio
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel, field_validator

from auth import verify_token
from services.job_service import create_job, get_job
from services.nlm_client import generate_audio

router = APIRouter()

VALID_MODULES = {"studio", "journey", "finance", "grants", "connections", "flux", "atlas", "agenda", "cross"}


class GenerateAudioRequest(BaseModel):
    module: str
    content: str
    title: str = "AICA Audio"
    format: str = "brief"
    length: str = "short"
    language: str = "pt-BR"
    instructions: Optional[str] = None

    @field_validator("module")
    @classmethod
    def validate_module(cls, v: str) -> str:
        if v not in VALID_MODULES:
            raise ValueError(f"Invalid module: {v}. Must be one of {VALID_MODULES}")
        return v

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        valid = {"deep-dive", "brief", "critique", "debate"}
        if v not in valid:
            raise ValueError(f"Invalid format: {v}. Must be one of {valid}")
        return v


class JobStatusResponse(BaseModel):
    success: bool
    data: dict


def process_audio_job(user_id: str, job_id: str, request: GenerateAudioRequest):
    """Run audio generation in background thread with its own event loop."""
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(
            generate_audio(
                user_id=user_id,
                job_id=job_id,
                content=request.content,
                title=request.title,
                audio_format=request.format,
                audio_length=request.length,
                language=request.language,
                instructions=request.instructions,
            )
        )
    finally:
        loop.close()


@router.post("/generate/audio")
async def generate_audio_endpoint(
    request: GenerateAudioRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
) -> JobStatusResponse:
    """Start async audio generation. Returns job_id for polling."""
    job_id = create_job(
        user_id=user_id,
        job_type="audio",
        module=request.module,
        input_data=request.model_dump(),
    )
    background_tasks.add_task(process_audio_job, user_id, job_id, request)
    return JobStatusResponse(
        success=True,
        data={"job_id": job_id, "status": "pending"},
    )


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    user_id: str = Depends(verify_token),
) -> JobStatusResponse:
    """Poll job status."""
    job = get_job(job_id, user_id)
    if not job:
        return JobStatusResponse(success=False, data={"error": "Job not found"})
    return JobStatusResponse(success=True, data=job)
