"""Shared test fixtures."""

import os

os.environ["SUPABASE_JWT_SECRET"] = "test-secret-key-for-jwt-verification"
os.environ["NLM_COOKIE_ENCRYPTION_KEY"] = "v8ZRxR6LoIe4r4kA9yaHNKyHiRjKa80FXxuqHDtQeLY="
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"
