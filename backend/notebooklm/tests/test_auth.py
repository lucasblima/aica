"""Tests for JWT verification and crypto service."""

import time
import os

# Ensure env vars are set before imports
os.environ["SUPABASE_JWT_SECRET"] = "test-secret-key-for-jwt-verification"
os.environ["NLM_COOKIE_ENCRYPTION_KEY"] = "v8ZRxR6LoIe4r4kA9yaHNKyHiRjKa80FXxuqHDtQeLY="

import jwt as pyjwt
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def make_jwt(sub: str = "user-123", expired: bool = False) -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + (-3600 if expired else 3600),
        "iat": int(time.time()),
    }
    return pyjwt.encode(payload, "test-secret-key-for-jwt-verification", algorithm="HS256")


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "aica-notebooklm"


def test_crypto_encrypt_decrypt():
    from services.crypto_service import encrypt_cookies, decrypt_cookies
    original = '{"cookies": [{"name": "SID", "value": "abc123"}]}'
    encrypted = encrypt_cookies(original)
    assert encrypted != original
    decrypted = decrypt_cookies(encrypted)
    assert decrypted == original
