"""Per-user NotebookLM client wrapper."""

import asyncio
import json
import logging
from typing import Optional

from notebooklm import AuthTokens, NotebookLMClient
from notebooklm.types import AudioFormat, AudioLength

from services.crypto_service import decrypt_cookies
from services.job_service import get_supabase, update_job_status

logger = logging.getLogger(__name__)

AUDIO_FORMAT_MAP = {
    "deep-dive": AudioFormat.DEEP_DIVE,
    "brief": AudioFormat.BRIEF,
    "critique": AudioFormat.CRITIQUE,
    "debate": AudioFormat.DEBATE,
}

AUDIO_LENGTH_MAP = {
    "short": AudioLength.SHORT,
    "default": AudioLength.DEFAULT,
    "long": AudioLength.LONG,
}


async def get_nlm_client(user_id: str) -> NotebookLMClient:
    """Load user's NotebookLM credentials and return an authenticated client."""
    sb = get_supabase()
    result = (
        sb.table("notebooklm_auth_sessions")
        .select("encrypted_cookies")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise ValueError("NotebookLM not connected. Please authenticate first.")

    raw_json = decrypt_cookies(result.data[0]["encrypted_cookies"])
    auth = AuthTokens._from_dict(json.loads(raw_json))
    return NotebookLMClient(auth=auth)


async def generate_audio(
    user_id: str,
    job_id: str,
    content: str,
    title: str = "AICA Audio",
    audio_format: str = "brief",
    audio_length: str = "short",
    language: str = "pt-BR",
    instructions: Optional[str] = None,
):
    """Generate audio overview from text content. Runs as background task."""
    try:
        update_job_status(job_id, "processing")

        async with await get_nlm_client(user_id) as client:
            nb = await client.notebooks.create(title)
            notebook_id = nb.id

            update_job_status(job_id, "processing", notebook_id=notebook_id)

            source = await client.sources.add_text(
                nb.id, title, content, wait=True, wait_timeout=120.0
            )

            fmt = AUDIO_FORMAT_MAP.get(audio_format, AudioFormat.BRIEF)
            length = AUDIO_LENGTH_MAP.get(audio_length, AudioLength.SHORT)

            status = await client.artifacts.generate_audio(
                nb.id,
                language=language,
                audio_format=fmt,
                audio_length=length,
                instructions=instructions,
            )

            # Poll for completion (max 5 min)
            for _ in range(150):
                artifacts = await client.artifacts.list(nb.id)
                audio_artifacts = [a for a in artifacts if a.kind and a.kind.name == "audio"]
                if audio_artifacts and audio_artifacts[-1].status == 3:
                    artifact = audio_artifacts[-1]
                    update_job_status(
                        job_id,
                        "completed",
                        result_url=artifact.url,
                        artifact_id=artifact.id,
                        result_metadata={
                            "notebook_id": notebook_id,
                            "format": audio_format,
                            "language": language,
                        },
                    )
                    return
                if audio_artifacts and audio_artifacts[-1].status == 4:
                    raise RuntimeError("NotebookLM audio generation failed")
                await asyncio.sleep(2)

            raise TimeoutError("Audio generation timed out after 5 minutes")

    except Exception as e:
        logger.error(f"Audio generation failed for job {job_id}: {e}")
        update_job_status(job_id, "failed", error_message=str(e))
