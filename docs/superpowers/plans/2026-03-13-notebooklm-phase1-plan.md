# NotebookLM Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add NotebookLM audio generation to AICA via a Python microservice, enabling 6 modules to generate personalized audio content.

**Architecture:** New `aica-notebooklm` Cloud Run microservice (FastAPI + notebooklm-py) behind a Supabase Edge Function proxy. Frontend calls Edge Function → forwards to Python service → calls NotebookLM API → stores result in Supabase. Async job tracking via `notebooklm_jobs` table + Realtime subscriptions.

**Tech Stack:** Python 3.12, FastAPI, notebooklm-py, Supabase Edge Functions (Deno), React hooks, Supabase Realtime

**Design Doc:** `docs/plans/2026-03-13-notebooklm-integration-design.md`

---

## File Structure

### New Files — Python Microservice

```
backend/notebooklm/
├── Dockerfile                          # Python 3.12-slim, port 8082
├── requirements.txt                    # notebooklm-py, fastapi, uvicorn, supabase, pyjwt, cryptography
├── .env.notebooklm.example            # Env var template
├── cloudbuild-notebooklm.yaml         # Cloud Build config
├── main.py                            # FastAPI app entry point
├── auth.py                            # JWT verification + NotebookLM cookie management
├── routers/
│   ├── __init__.py
│   ├── health.py                      # GET /health
│   ├── notebooks.py                   # POST /notebooks, DELETE /notebooks/{id}
│   └── artifacts.py                   # POST /generate/audio, GET /jobs/{id}
├── services/
│   ├── __init__.py
│   ├── nlm_client.py                  # Per-user NotebookLMClient wrapper
│   ├── job_service.py                 # Async job CRUD (Supabase)
│   └── crypto_service.py             # Cookie encryption/decryption
└── tests/
    ├── __init__.py
    ├── test_auth.py                   # JWT + cookie tests
    ├── test_artifacts.py              # Audio generation tests
    └── conftest.py                    # Fixtures
```

### New Files — Edge Function

```
supabase/functions/notebooklm-proxy/
└── index.ts                           # Action-based proxy → Python microservice
```

### New Files — Frontend

```
src/services/notebookLmService.ts      # Service layer (singleton)
src/hooks/useNotebookLmJob.ts          # Realtime job subscription hook
src/components/features/notebooklm/
├── AudioPlayer.tsx                    # Reusable audio player
├── GenerateAudioButton.tsx            # "Generate Audio" trigger with loading state
└── NotebookLMAuthGate.tsx             # Auth check + login prompt
```

### New Files — Database

```
supabase/migrations/20260313100001_add_notebooklm_tables.sql
```

### Modified Files

```
src/modules/journey/components/weekly/  — Add audio button to weekly summary
src/modules/finance/components/         — Add audio button to monthly digest
src/modules/connections/components/whatsapp/ContactDossierCard.tsx — Add audio button
src/modules/flux/services/              — Add audio generation to weekly plan dispatch
src/modules/studio/components/workspace/ — Add audio generation to post-production
src/modules/grants/components/          — Add "Import to NotebookLM" button
```

---

## Chunk 1: Infrastructure (Tasks 1-6)

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260313100001_add_notebooklm_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- NotebookLM auth sessions (per user)
CREATE TABLE IF NOT EXISTS public.notebooklm_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_cookies TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notebooklm_auth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own auth"
  ON public.notebooklm_auth_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NotebookLM async job tracking
CREATE TABLE IF NOT EXISTS public.notebooklm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('audio', 'video', 'slides', 'report', 'quiz', 'flashcards', 'mind_map', 'infographic', 'data_table', 'research')),
  module TEXT NOT NULL CHECK (module IN ('studio', 'journey', 'finance', 'grants', 'connections', 'flux', 'atlas', 'agenda', 'cross')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data JSONB DEFAULT '{}',
  result_url TEXT,
  result_metadata JSONB DEFAULT '{}',
  error_message TEXT,
  notebook_id TEXT,
  artifact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.notebooklm_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own jobs"
  ON public.notebooklm_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON public.notebooklm_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update jobs (backend writes status)
CREATE POLICY "Service can update jobs"
  ON public.notebooklm_jobs FOR UPDATE
  USING (true);

-- Enable Realtime for job status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notebooklm_jobs;

-- Index for fast job lookups
CREATE INDEX idx_notebooklm_jobs_user_status ON public.notebooklm_jobs(user_id, status);
CREATE INDEX idx_notebooklm_jobs_created ON public.notebooklm_jobs(created_at DESC);
```

- [ ] **Step 2: Preview migration**

Run: `npx supabase db diff`
Expected: Shows the new tables and policies

- [ ] **Step 3: Apply migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 4: Verify tables exist**

Run: `npx supabase db push` (check output for success)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260313100001_add_notebooklm_tables.sql
git commit -m "feat(database): add notebooklm_auth_sessions and notebooklm_jobs tables

RLS policies included. Realtime enabled for job status updates.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Python Microservice — Skeleton + Auth

**Files:**
- Create: `backend/notebooklm/main.py`
- Create: `backend/notebooklm/auth.py`
- Create: `backend/notebooklm/requirements.txt`
- Create: `backend/notebooklm/.env.notebooklm.example`
- Create: `backend/notebooklm/routers/__init__.py`
- Create: `backend/notebooklm/routers/health.py`
- Create: `backend/notebooklm/services/__init__.py`
- Create: `backend/notebooklm/services/crypto_service.py`
- Test: `backend/notebooklm/tests/test_auth.py`

- [ ] **Step 1: Write requirements.txt**

```
fastapi>=0.109.0
uvicorn>=0.27.0
notebooklm-py>=0.3.0
python-multipart>=0.0.7
supabase>=2.3.0
python-dotenv>=1.0.1
pydantic>=2.6.0
pyjwt>=2.8.1
cryptography>=42.0.0
httpx>=0.27.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

- [ ] **Step 2: Write .env.notebooklm.example**

```bash
# Supabase
SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Encryption key for NotebookLM cookies (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
NLM_COOKIE_ENCRYPTION_KEY=your-fernet-key

# Service
PORT=8082
```

- [ ] **Step 3: Write crypto_service.py**

```python
"""Encrypt/decrypt NotebookLM cookies for secure storage."""

import os
from cryptography.fernet import Fernet

_key = os.getenv("NLM_COOKIE_ENCRYPTION_KEY", "")


def get_fernet() -> Fernet:
    if not _key:
        raise RuntimeError("NLM_COOKIE_ENCRYPTION_KEY not set")
    return Fernet(_key.encode() if isinstance(_key, str) else _key)


def encrypt_cookies(raw_json: str) -> str:
    return get_fernet().encrypt(raw_json.encode()).decode()


def decrypt_cookies(encrypted: str) -> str:
    return get_fernet().decrypt(encrypted.encode()).decode()
```

- [ ] **Step 4: Write auth.py**

```python
"""JWT verification and NotebookLM auth management."""

import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Verify Supabase JWT and return user_id."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no sub claim")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

- [ ] **Step 5: Write routers/health.py**

```python
"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "healthy", "service": "aica-notebooklm"}
```

- [ ] **Step 6: Write main.py**

```python
"""AICA NotebookLM Microservice — FastAPI entry point."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers.health import router as health_router  # noqa: E402

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
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
```

- [ ] **Step 7: Write test for auth**

```python
"""Tests for JWT verification."""

import jwt
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

# Set env before importing app
import os
os.environ["SUPABASE_JWT_SECRET"] = "test-secret-key-for-jwt-verification"
os.environ["NLM_COOKIE_ENCRYPTION_KEY"] = "dGVzdC1rZXktZm9yLWVuY3J5cHRpb24tMzI="

from main import app  # noqa: E402

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["service"] == "aica-notebooklm"


def make_jwt(sub: str = "user-123", expired: bool = False) -> str:
    import time
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + (-3600 if expired else 3600),
        "iat": int(time.time()),
    }
    return jwt.encode(payload, "test-secret-key-for-jwt-verification", algorithm="HS256")


def test_crypto_encrypt_decrypt():
    from services.crypto_service import encrypt_cookies, decrypt_cookies
    original = '{"cookies": [{"name": "SID", "value": "abc123"}]}'
    encrypted = encrypt_cookies(original)
    assert encrypted != original
    decrypted = decrypt_cookies(encrypted)
    assert decrypted == original
```

- [ ] **Step 8: Run tests**

Run: `cd backend/notebooklm && pip install -r requirements.txt && pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add backend/notebooklm/
git commit -m "feat(notebooklm): add Python microservice skeleton with auth + health check

FastAPI app on port 8082. JWT verification mirrors aica-agents pattern.
Cookie encryption via Fernet for secure NotebookLM auth storage.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Dockerfile + Cloud Build Config

**Files:**
- Create: `backend/notebooklm/Dockerfile`
- Create: `backend/notebooklm/cloudbuild-notebooklm.yaml`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app

COPY . .

USER appuser

ENV PORT=8082
EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8082/health')" || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
```

- [ ] **Step 2: Write cloudbuild-notebooklm.yaml**

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/aica-notebooklm', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/aica-notebooklm']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'aica-notebooklm'
      - '--image=gcr.io/$PROJECT_ID/aica-notebooklm'
      - '--region=southamerica-east1'
      - '--platform=managed'
      - '--port=8082'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--min-instances=0'
      - '--max-instances=5'
      - '--timeout=120s'
      - '--concurrency=10'
      - '--allow-unauthenticated'
      - '--set-secrets=SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest,SUPABASE_JWT_SECRET=SUPABASE_JWT_SECRET:latest,NLM_COOKIE_ENCRYPTION_KEY=NLM_COOKIE_ENCRYPTION_KEY:latest'

options:
  logging: CLOUD_LOGGING_ONLY

timeout: '600s'
```

- [ ] **Step 3: Commit**

```bash
git add backend/notebooklm/Dockerfile backend/notebooklm/cloudbuild-notebooklm.yaml
git commit -m "feat(notebooklm): add Dockerfile and Cloud Build config

Port 8082, python:3.12-slim, scale 0-5, southamerica-east1.
Secrets from Secret Manager.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Artifacts Router (Audio Generation)

**Files:**
- Create: `backend/notebooklm/routers/artifacts.py`
- Create: `backend/notebooklm/routers/notebooks.py`
- Create: `backend/notebooklm/services/nlm_client.py`
- Create: `backend/notebooklm/services/job_service.py`
- Modify: `backend/notebooklm/main.py` (register routers)
- Test: `backend/notebooklm/tests/test_artifacts.py`

- [ ] **Step 1: Write test for artifact generation**

```python
"""Tests for artifact generation endpoints."""

import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

os.environ["SUPABASE_JWT_SECRET"] = "test-secret-key-for-jwt-verification"
os.environ["NLM_COOKIE_ENCRYPTION_KEY"] = "dGVzdC1rZXktZm9yLWVuY3J5cHRpb24tMzI="
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"

from main import app  # noqa: E402

client = TestClient(app)


def make_auth_header(sub: str = "user-123") -> dict:
    import jwt, time
    token = jwt.encode(
        {"sub": sub, "aud": "authenticated", "exp": int(time.time()) + 3600},
        "test-secret-key-for-jwt-verification",
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@patch("routers.artifacts.create_job")
@patch("routers.artifacts.process_audio_job")
def test_generate_audio_creates_job(mock_process, mock_create):
    mock_create.return_value = "job-uuid-123"
    response = client.post(
        "/generate/audio",
        json={
            "module": "journey",
            "content": "Weekly summary text here",
            "format": "brief",
            "language": "pt-BR",
        },
        headers=make_auth_header(),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["job_id"] == "job-uuid-123"
    mock_create.assert_called_once()


def test_generate_audio_requires_auth():
    response = client.post(
        "/generate/audio",
        json={"module": "journey", "content": "test"},
    )
    assert response.status_code == 403  # No auth header


def test_generate_audio_validates_module():
    response = client.post(
        "/generate/audio",
        json={"module": "invalid_module", "content": "test"},
        headers=make_auth_header(),
    )
    assert response.status_code == 422  # Pydantic validation error
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/notebooklm && pytest tests/test_artifacts.py -v`
Expected: FAIL (routers.artifacts not found)

- [ ] **Step 3: Write job_service.py**

```python
"""Async job management via Supabase."""

import os
from datetime import datetime, timezone
from typing import Optional

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


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
```

- [ ] **Step 4: Write nlm_client.py**

```python
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

# Map string names to enums
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
            # Create notebook with content as source
            nb = await client.notebooks.create(title)
            notebook_id = nb.id

            update_job_status(job_id, "processing", notebook_id=notebook_id)

            # Add content as text source
            source = await client.sources.add_text(
                nb.id, title, content, wait=True, wait_timeout=120.0
            )

            # Generate audio
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
                if audio_artifacts and audio_artifacts[-1].status == 3:  # completed
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
                if audio_artifacts and audio_artifacts[-1].status == 4:  # failed
                    raise RuntimeError("NotebookLM audio generation failed")
                await asyncio.sleep(2)

            raise TimeoutError("Audio generation timed out after 5 minutes")

    except Exception as e:
        logger.error(f"Audio generation failed for job {job_id}: {e}")
        update_job_status(job_id, "failed", error_message=str(e))
```

- [ ] **Step 5: Write routers/artifacts.py**

```python
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
```

- [ ] **Step 6: Write routers/notebooks.py**

```python
"""Notebook management endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import verify_token
from services.nlm_client import get_nlm_client

router = APIRouter()


class NotebookResponse(BaseModel):
    success: bool
    data: dict


@router.get("/notebooks")
async def list_notebooks(
    user_id: str = Depends(verify_token),
) -> NotebookResponse:
    """List user's NotebookLM notebooks."""
    async with await get_nlm_client(user_id) as client:
        notebooks = await client.notebooks.list()
        return NotebookResponse(
            success=True,
            data={"notebooks": [{"id": nb.id, "title": nb.title} for nb in notebooks]},
        )


@router.delete("/notebooks/{notebook_id}")
async def delete_notebook(
    notebook_id: str,
    user_id: str = Depends(verify_token),
) -> NotebookResponse:
    """Delete a NotebookLM notebook."""
    async with await get_nlm_client(user_id) as client:
        await client.notebooks.delete(notebook_id)
        return NotebookResponse(success=True, data={"deleted": notebook_id})
```

- [ ] **Step 7: Update main.py to register routers**

Add after the health router registration:

```python
from routers.artifacts import router as artifacts_router  # noqa: E402
from routers.notebooks import router as notebooks_router  # noqa: E402

app.include_router(artifacts_router)
app.include_router(notebooks_router)
```

- [ ] **Step 8: Write conftest.py**

```python
"""Shared test fixtures."""

import os

os.environ["SUPABASE_JWT_SECRET"] = "test-secret-key-for-jwt-verification"
os.environ["NLM_COOKIE_ENCRYPTION_KEY"] = "dGVzdC1rZXktZm9yLWVuY3J5cHRpb24tMzI="
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"
```

- [ ] **Step 9: Run tests**

Run: `cd backend/notebooklm && pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 10: Commit**

```bash
git add backend/notebooklm/
git commit -m "feat(notebooklm): add artifact generation + job management + notebook CRUD

Audio generation via notebooklm-py with async job tracking.
Background tasks for long-running artifact creation.
Per-user NotebookLM client with encrypted cookie auth.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Edge Function Proxy

**Files:**
- Create: `supabase/functions/notebooklm-proxy/index.ts`

- [ ] **Step 1: Write the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'

const TAG = '[notebooklm-proxy]'

// Python microservice URL (set via Supabase secrets)
const NLM_SERVICE_URL = Deno.env.get('NLM_SERVICE_URL') || 'http://localhost:8082'

interface ProxyRequest {
  action: string
  payload?: Record<string, unknown>
}

// Map frontend actions to Python microservice endpoints
const ACTION_MAP: Record<string, { method: string; path: string }> = {
  generate_audio: { method: 'POST', path: '/generate/audio' },
  get_job_status: { method: 'GET', path: '/jobs' },
  list_notebooks: { method: 'GET', path: '/notebooks' },
  delete_notebook: { method: 'DELETE', path: '/notebooks' },
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: jsonHeaders }
      )
    }

    // Verify JWT with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user token' }),
        { status: 401, headers: jsonHeaders }
      )
    }

    // Parse request
    const { action, payload = {} }: ProxyRequest = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'action is required' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const route = ACTION_MAP[action]
    if (!route) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Build URL with path params
    let url = `${NLM_SERVICE_URL}${route.path}`
    if (action === 'get_job_status' && payload.job_id) {
      url = `${url}/${payload.job_id}`
    }
    if (action === 'delete_notebook' && payload.notebook_id) {
      url = `${url}/${payload.notebook_id}`
    }

    // Forward to Python microservice
    const fetchOptions: RequestInit = {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    }

    if (route.method === 'POST') {
      fetchOptions.body = JSON.stringify(payload)
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    console.log(TAG, `Action ${action} → ${response.status} for user ${user.id}`)

    return new Response(
      JSON.stringify(data),
      { status: response.status, headers: jsonHeaders }
    )

  } catch (error) {
    console.error(TAG, 'Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: jsonHeaders }
    )
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/notebooklm-proxy/
git commit -m "feat(edge-functions): add notebooklm-proxy Edge Function

Action-based routing to Python microservice. JWT validation via Supabase.
Actions: generate_audio, get_job_status, list_notebooks, delete_notebook.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Frontend Service Layer + Hooks

**Files:**
- Create: `src/services/notebookLmService.ts`
- Create: `src/hooks/useNotebookLmJob.ts`
- Create: `src/components/features/notebooklm/AudioPlayer.tsx`
- Create: `src/components/features/notebooklm/GenerateAudioButton.tsx`

- [ ] **Step 1: Write notebookLmService.ts**

```typescript
/**
 * NotebookLM service layer — singleton client for all NotebookLM operations.
 * Calls the notebooklm-proxy Edge Function which forwards to Python microservice.
 */

import { supabase } from '@/services/supabaseClient'

export type AudioFormat = 'deep-dive' | 'brief' | 'critique' | 'debate'
export type AudioLength = 'short' | 'default' | 'long'
export type NlmModule = 'studio' | 'journey' | 'finance' | 'grants' | 'connections' | 'flux' | 'atlas' | 'agenda' | 'cross'

export interface GenerateAudioParams {
  module: NlmModule
  content: string
  title?: string
  format?: AudioFormat
  length?: AudioLength
  language?: string
  instructions?: string
}

export interface NlmJob {
  id: string
  user_id: string
  job_type: string
  module: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  input_data: Record<string, unknown>
  result_url: string | null
  result_metadata: Record<string, unknown>
  error_message: string | null
  notebook_id: string | null
  artifact_id: string | null
  created_at: string
  completed_at: string | null
}

async function callProxy<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('notebooklm-proxy', {
    body: { action, payload },
  })

  if (error) {
    throw new Error(error.message || 'NotebookLM proxy call failed')
  }

  if (!data.success) {
    throw new Error(data.error || 'NotebookLM operation failed')
  }

  return data.data as T
}

export const notebookLmService = {
  generateAudio: (params: GenerateAudioParams) =>
    callProxy<{ job_id: string; status: string }>('generate_audio', params),

  getJobStatus: (jobId: string) =>
    callProxy<NlmJob>('get_job_status', { job_id: jobId }),

  listNotebooks: () =>
    callProxy<{ notebooks: Array<{ id: string; title: string }> }>('list_notebooks'),

  deleteNotebook: (notebookId: string) =>
    callProxy<{ deleted: string }>('delete_notebook', { notebook_id: notebookId }),
}
```

- [ ] **Step 2: Write useNotebookLmJob.ts**

```typescript
/**
 * Hook for subscribing to NotebookLM job status updates via Supabase Realtime.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { notebookLmService, type NlmJob, type GenerateAudioParams } from '@/services/notebookLmService'

interface UseNotebookLmJobReturn {
  job: NlmJob | null
  isLoading: boolean
  error: string | null
  generateAudio: (params: GenerateAudioParams) => Promise<void>
}

export function useNotebookLmJob(): UseNotebookLmJobReturn {
  const [job, setJob] = useState<NlmJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to job updates via Realtime
  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed') return

    const channel = supabase
      .channel(`nlm-job:${job.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notebooklm_jobs',
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          const updated = payload.new as NlmJob
          setJob(updated)
          if (updated.status === 'completed' || updated.status === 'failed') {
            setIsLoading(false)
            if (updated.status === 'failed') {
              setError(updated.error_message || 'Generation failed')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [job?.id, job?.status])

  const generateAudio = useCallback(async (params: GenerateAudioParams) => {
    setIsLoading(true)
    setError(null)
    setJob(null)

    try {
      const { job_id } = await notebookLmService.generateAudio(params)
      // Set initial job state
      setJob({
        id: job_id,
        status: 'pending',
        job_type: 'audio',
        module: params.module,
        result_url: null,
      } as NlmJob)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setIsLoading(false)
    }
  }, [])

  return { job, isLoading, error, generateAudio }
}
```

- [ ] **Step 3: Write AudioPlayer.tsx**

```tsx
/**
 * Reusable audio player for NotebookLM-generated audio content.
 * Used across all modules (Journey, Finance, Connections, Flux, Studio).
 */

import { useRef, useState } from 'react'

interface AudioPlayerProps {
  url: string
  title?: string
  className?: string
}

export function AudioPlayer({ url, title, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setProgress(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const time = parseFloat(e.target.value)
    audioRef.current.currentTime = time
    setProgress(time)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      {title && (
        <p className="text-sm text-ceramic-text-secondary mb-2 truncate">{title}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center flex-shrink-0 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1 accent-amber-500"
        />
        <span className="text-xs text-ceramic-text-secondary tabular-nums w-12 text-right">
          {formatTime(progress)}/{formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write GenerateAudioButton.tsx**

```tsx
/**
 * "Generate Audio" button with loading state and result display.
 * Wraps useNotebookLmJob hook for easy integration into any module.
 */

import { useNotebookLmJob } from '@/hooks/useNotebookLmJob'
import { AudioPlayer } from './AudioPlayer'
import type { GenerateAudioParams } from '@/services/notebookLmService'

interface GenerateAudioButtonProps {
  params: Omit<GenerateAudioParams, 'module'> & { module: GenerateAudioParams['module'] }
  label?: string
  className?: string
}

export function GenerateAudioButton({
  params,
  label = 'Gerar Audio',
  className = '',
}: GenerateAudioButtonProps) {
  const { job, isLoading, error, generateAudio } = useNotebookLmJob()

  const handleClick = () => {
    generateAudio(params)
  }

  // Show player if audio is ready
  if (job?.status === 'completed' && job.result_url) {
    return (
      <div className={className}>
        <AudioPlayer url={job.result_url} title={params.title} />
        <button
          onClick={handleClick}
          className="mt-2 text-xs text-ceramic-text-secondary hover:text-amber-600 transition-colors"
        >
          Regenerar audio
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {job?.status === 'processing' ? 'Gerando audio...' : 'Iniciando...'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6.253v11.494M18.364 5.636a9 9 0 010 12.728" />
            </svg>
            {label}
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 text-xs text-ceramic-error">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/services/notebookLmService.ts src/hooks/useNotebookLmJob.ts src/components/features/notebooklm/
git commit -m "feat(notebooklm): add frontend service layer, job hook, and audio UI components

notebookLmService: singleton proxy client for Edge Function.
useNotebookLmJob: Realtime subscription for async job tracking.
AudioPlayer: Ceramic-styled reusable audio player.
GenerateAudioButton: One-click audio generation with loading states.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: Phase 1 Audio Features (Tasks 7-12)

### Task 7: Journey Weekly Audio (J1)

**Files:**
- Modify: Weekly summary component (find the component that displays weekly summaries in Journey)
- Reference: `src/modules/journey/` components

- [ ] **Step 1: Identify the weekly summary component**

Run: `grep -r "weekly" src/modules/journey/components/ --include="*.tsx" -l`
Identify the component that renders the weekly summary view.

- [ ] **Step 2: Add GenerateAudioButton to weekly summary**

Import and add the button below the weekly summary text:

```tsx
import { GenerateAudioButton } from '@/components/features/notebooklm/GenerateAudioButton'

// Inside the weekly summary render:
<GenerateAudioButton
  params={{
    module: 'journey',
    content: weeklySummary.summary_text,
    title: `Resumo Semanal - ${formatDate(weeklySummary.week_start)}`,
    format: 'brief',
    length: 'short',
    language: 'pt-BR',
    instructions: 'Tom reflexivo e encorajador. Fale sobre padrões emocionais, momentos marcantes e recomendações para a próxima semana. Estilo de coaching pessoal.',
  }}
  label="Ouvir Resumo"
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`
Expected: Build passes

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(journey): add weekly audio summary via NotebookLM

Users can generate a 3-5 min audio podcast of their weekly
consciousness journey. Reflexive, encouraging tone in Portuguese.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Finance Monthly Audio (F1)

**Files:**
- Modify: Finance monthly digest component
- Reference: `src/modules/finance/` components

- [ ] **Step 1: Identify the monthly digest component**

Run: `grep -r "digest\|monthly\|resumo" src/modules/finance/components/ --include="*.tsx" -l`

- [ ] **Step 2: Add GenerateAudioButton to monthly digest**

```tsx
import { GenerateAudioButton } from '@/components/features/notebooklm/GenerateAudioButton'

<GenerateAudioButton
  params={{
    module: 'finance',
    content: monthlyDigest.summary,
    title: `Briefing Financeiro - ${monthName} ${year}`,
    format: 'brief',
    length: 'short',
    language: 'pt-BR',
    instructions: 'Tom de coach financeiro amigável. Cubra: receita vs despesas, top categorias, oportunidades de economia, nota de saúde financeira, uma dica acionável.',
  }}
  label="Ouvir Briefing"
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`
Expected: Build passes

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(finance): add monthly audio briefing via NotebookLM

Friendly financial coach audio: income vs expenses, top categories,
savings opportunities, health score.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Connections Dossier Audio (C1)

**Files:**
- Modify: `src/modules/connections/components/whatsapp/ContactDossierCard.tsx`

- [ ] **Step 1: Read ContactDossierCard.tsx**

Understand the component structure and where to add the audio button.

- [ ] **Step 2: Add GenerateAudioButton to dossier card**

```tsx
import { GenerateAudioButton } from '@/components/features/notebooklm/GenerateAudioButton'

// After the dossier summary section:
<GenerateAudioButton
  params={{
    module: 'connections',
    content: `Contato: ${dossier.contact_name}. Perfil: ${dossier.dossier_summary}. Tópicos: ${dossier.dossier_topics?.join(', ')}. Pendências: ${dossier.dossier_pending_items?.join(', ')}. Tendência: ${dossier.sentiment_trend}.`,
    title: `Dossier - ${dossier.contact_name}`,
    format: 'brief',
    length: 'short',
    language: 'pt-BR',
    instructions: 'Resumo de 2-3 minutos para ouvir antes de ligar ou reunir com este contato. Tom profissional mas amigável. Inclua pontos-chave e itens pendentes.',
  }}
  label="Ouvir Dossier"
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(connections): add dossier audio summary via NotebookLM

2-3 min audio brief of contact profile for pre-meeting preparation.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Flux Training Audio (X1)

**Files:**
- Modify: Flux weekly plan component or dispatch service
- Reference: `src/modules/flux/` components

- [ ] **Step 1: Identify the weekly plan component**

Run: `grep -r "weekly\|semanal\|plano" src/modules/flux/components/ --include="*.tsx" -l`

- [ ] **Step 2: Add GenerateAudioButton**

```tsx
import { GenerateAudioButton } from '@/components/features/notebooklm/GenerateAudioButton'

<GenerateAudioButton
  params={{
    module: 'flux',
    content: formatWeeklyPlanForAudio(weeklyPlan),
    title: `Treino Semanal - ${athlete.name}`,
    format: 'brief',
    length: 'short',
    language: 'pt-BR',
    instructions: 'Tom motivacional de coach. Explique os exercícios da semana, foco de cada sessão, e dicas de recuperação. Energize o atleta!',
  }}
  label="Gerar Audio do Treino"
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(flux): add weekly training audio brief via NotebookLM

Motivational coach-style audio explaining the week's training plan.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Studio Episode Audio (S1)

**Files:**
- Modify: Studio post-production component
- Reference: `src/modules/studio/components/workspace/`

- [ ] **Step 1: Identify the post-production component**

Run: `grep -r "post.production\|PostProduction" src/modules/studio/components/ --include="*.tsx" -l`

- [ ] **Step 2: Add GenerateAudioButton**

```tsx
import { GenerateAudioButton } from '@/components/features/notebooklm/GenerateAudioButton'

<GenerateAudioButton
  params={{
    module: 'studio',
    content: `${episode.show_notes}\n\n${episode.transcript}`,
    title: `Intro - ${episode.title}`,
    format: 'brief',
    length: 'short',
    language: 'pt-BR',
    instructions: 'Narração de 2-3 minutos para intro do episódio. Tom envolvente, destaque os pontos principais do episódio. Estilo podcast profissional.',
  }}
  label="Gerar Intro/Outro"
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(studio): add episode intro/outro audio via NotebookLM

AI-generated 2-3 min narration from show notes + transcript.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Grants Edital Import (G1)

**Files:**
- Modify: Grants opportunity component (where editals are displayed)
- Reference: `src/modules/grants/` components

- [ ] **Step 1: Identify the edital/opportunity component**

Run: `grep -r "edital\|opportunity\|OpportunityDetail" src/modules/grants/components/ --include="*.tsx" -l`

- [ ] **Step 2: Add "Import to NotebookLM" + Study Guide generation**

This is different from audio — it creates a NotebookLM notebook from the edital PDF and generates a study guide report.

```tsx
import { GenerateAudioButton } from '@/components/features/notebooklm/GenerateAudioButton'

{/* Study guide audio from edital */}
<GenerateAudioButton
  params={{
    module: 'grants',
    content: `Edital: ${opportunity.title}. Critérios de avaliação: ${opportunity.evaluation_criteria}. Temas elegíveis: ${opportunity.eligible_themes}. Prazo: ${opportunity.deadline}. Valor: ${opportunity.funding_amount}.`,
    title: `Study Guide - ${opportunity.title}`,
    format: 'deep-dive',
    length: 'default',
    language: 'pt-BR',
    instructions: 'Análise detalhada do edital. Cubra: critérios de avaliação, temas prioritários, dicas de preparação, erros comuns a evitar, checklist de documentos necessários.',
  }}
  label="Gerar Study Guide"
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(grants): add edital study guide audio via NotebookLM

Deep-dive audio analysis of edital criteria, tips, and preparation checklist.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Final Verification

- [ ] **Step 1: Full build check**

Run: `npm run build && npm run typecheck`
Expected: 0 errors

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: Existing tests still pass

- [ ] **Step 3: Python tests**

Run: `cd backend/notebooklm && pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 4: Final commit (if any loose changes)**

```bash
git add -A
git commit -m "chore: finalize NotebookLM Phase 1 integration

6 audio features across Journey, Finance, Connections, Flux, Studio, Grants.
Python microservice, Edge Function proxy, frontend service layer.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Deployment Checklist

- [ ] Set Supabase secrets: `npx supabase secrets set NLM_SERVICE_URL=<cloud-run-url>`
- [ ] Deploy Edge Function: `npx supabase functions deploy notebooklm-proxy --no-verify-jwt`
- [ ] Deploy Python service: `gcloud builds submit --config=backend/notebooklm/cloudbuild-notebooklm.yaml --region=southamerica-east1 --project=gen-lang-client-0948335762 backend/notebooklm/`
- [ ] Apply migration: `npx supabase db push`
- [ ] Create Secret Manager secrets: `NLM_COOKIE_ENCRYPTION_KEY`
- [ ] Test on staging (dev.aica.guru)
- [ ] Validate with user
