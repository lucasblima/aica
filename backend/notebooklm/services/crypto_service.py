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
