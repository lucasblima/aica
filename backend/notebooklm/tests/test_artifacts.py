"""Tests for artifact generation endpoints."""

import os
import time

os.environ["SUPABASE_JWT_SECRET"] = "test-secret-key-for-jwt-verification"
os.environ["NLM_COOKIE_ENCRYPTION_KEY"] = "dGVzdC1rZXktZm9yLWVuY3J5cHRpb24tMzI="
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"

import jwt as pyjwt
from unittest.mock import patch
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def make_auth_header(sub: str = "user-123") -> dict:
    token = pyjwt.encode(
        {"sub": sub, "aud": "authenticated", "exp": int(time.time()) + 3600, "iat": int(time.time())},
        "test-secret-key-for-jwt-verification",
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@patch("routers.artifacts.create_job", return_value="job-uuid-123")
@patch("routers.artifacts.process_audio_job")
def test_generate_audio_creates_job(mock_process, mock_create):
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
    assert response.status_code == 403


def test_generate_audio_validates_module():
    response = client.post(
        "/generate/audio",
        json={"module": "invalid_module", "content": "test"},
        headers=make_auth_header(),
    )
    assert response.status_code == 422
