"""Async job management via Supabase."""

import os
from datetime import datetime, timezone
from typing import Optional

from functools import lru_cache

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


@lru_cache(maxsize=1)
def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def create_job(
    user_id: str,
    job_type: str,
    module: str,
    input_data: dict,
) -> str:
    """Create a new job and return its ID."""
    sb = get_supabase()
    result = sb.table("notebooklm_jobs").insert({
        "user_id": user_id,
        "job_type": job_type,
        "module": module,
        "status": "pending",
        "input_data": input_data,
    }).execute()
    return result.data[0]["id"]


def update_job_status(
    job_id: str,
    status: str,
    result_url: Optional[str] = None,
    result_metadata: Optional[dict] = None,
    error_message: Optional[str] = None,
    notebook_id: Optional[str] = None,
    artifact_id: Optional[str] = None,
):
    """Update job status (called by background processor)."""
    sb = get_supabase()
    update = {"status": status}
    if result_url:
        update["result_url"] = result_url
    if result_metadata:
        update["result_metadata"] = result_metadata
    if error_message:
        update["error_message"] = error_message
    if notebook_id:
        update["notebook_id"] = notebook_id
    if artifact_id:
        update["artifact_id"] = artifact_id
    if status in ("completed", "failed"):
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    sb.table("notebooklm_jobs").update(update).eq("id", job_id).execute()


def get_job(job_id: str, user_id: str) -> Optional[dict]:
    """Get job by ID, scoped to user."""
    sb = get_supabase()
    result = sb.table("notebooklm_jobs").select("*").eq("id", job_id).eq("user_id", user_id).execute()
    return result.data[0] if result.data else None
