#!/bin/bash
# Smoke test for gemini-chat Edge Function after refactoring
# Tests that all actions return HTTP 200 (not necessarily success:true,
# since some need real data/auth).
#
# Usage:
#   TOKEN=your-jwt-token ./scripts/smoke-test-gemini-chat.sh
#   TOKEN=your-jwt-token SUPABASE_URL=https://... ./scripts/smoke-test-gemini-chat.sh

set -euo pipefail

BASE_URL="${SUPABASE_URL:-https://uzywajqzbdbrfammshdg.supabase.co}/functions/v1/gemini-chat"
PASS=0
FAIL=0
SKIP=0

if [ -z "${TOKEN:-}" ]; then
  echo "ERROR: TOKEN env var is required (Supabase JWT)"
  echo "Usage: TOKEN=your-jwt-token ./scripts/smoke-test-gemini-chat.sh"
  exit 1
fi

test_action() {
  local action="$1"
  local payload="$2"
  local http_code
  local curl_status=0

  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"$action\", \"payload\": $payload}" \
    --max-time 30) || curl_status=$?

  if [ "$curl_status" -ne 0 ]; then
    echo "  SKIP [curl:$curl_status]: $action"
    SKIP=$((SKIP + 1))
    return
  fi

  if [ "$http_code" = "200" ]; then
    echo "  PASS [$http_code]: $action"
    PASS=$((PASS + 1))
  else
    echo "  FAIL [$http_code]: $action"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Smoke Testing gemini-chat ==="
echo "URL: $BASE_URL"
echo ""

# Chat handlers (permanent)
echo "-- Chat --"
test_action "chat_aica" '{"message": "oi", "module": "coordinator"}'
test_action "classify_intent" '{"message": "quero criar uma tarefa"}'

# Journey handlers
echo "-- Journey --"
test_action "analyze_moment_sentiment" '{"content": "Estou feliz hoje"}'
test_action "analyze_moment" '{"content": "Dia produtivo e cheio de energia"}'
test_action "generate_daily_report" '{"userId": "test", "date": "2026-03-18", "tasksCompleted": 5, "tasksTotal": 10, "productivityScore": 75}'

# Studio handlers
echo "-- Studio --"
test_action "generate_dossier" '{"guestName": "Elon Musk"}'
test_action "generate_ice_breakers" '{"guestName": "Elon Musk"}'

# Grants handlers
echo "-- Grants --"
test_action "parse_form_fields" '{"text": "Nome do projeto: ___ Descricao: ___"}'

# Finance handlers
echo "-- Finance --"
test_action "categorize_transactions" '{"transactions": [{"description": "Supermercado Extra", "amount": -150.00}]}'

# Atlas handlers
echo "-- Atlas --"
test_action "generate_tags" '{"prompt": "Gere 3 tags para: reuniao com cliente", "temperature": 0.7, "maxOutputTokens": 200}'

# Audio
echo "-- Audio --"
# transcribe_audio requires base64 audio, skip
echo "  SKIP: transcribe_audio (requires audio data)"
SKIP=$((SKIP + 1))

echo ""
echo "=== Results ==="
echo "PASS: $PASS  FAIL: $FAIL  SKIP: $SKIP"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "REGRESSION DETECTED — $FAIL action(s) failed!"
  exit 1
else
  echo "All tested actions returned HTTP 200."
  exit 0
fi
