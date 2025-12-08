#!/bin/bash
# =====================================================
# EDGE FUNCTION TESTS - gemini-chat
# =====================================================
# This script tests all actions of the gemini-chat Edge Function
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_header() {
  echo -e "${BLUE}=================================================="
  echo -e "$1"
  echo -e "==================================================${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}→ $1${NC}"
}

# Function to test an endpoint
test_action() {
  local test_name=$1
  local action=$2
  local payload=$3
  local expected_fields=$4

  TESTS_RUN=$((TESTS_RUN + 1))

  print_info "Testing: $test_name"

  # Create request JSON
  local request_json=$(cat <<EOF
{
  "action": "$action",
  "payload": $payload
}
EOF
)

  # Invoke function
  local response=$(npx supabase functions invoke gemini-chat --data "$request_json" 2>&1)
  local exit_code=$?

  # Check if request succeeded
  if [ $exit_code -ne 0 ]; then
    print_error "Request failed: $response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi

  # Parse response
  local success=$(echo "$response" | jq -r '.success // false')
  local result=$(echo "$response" | jq -r '.result // empty')

  if [ "$success" != "true" ]; then
    print_error "Action returned success=false"
    echo "$response" | jq .
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi

  # Check for expected fields
  IFS=',' read -ra FIELDS <<< "$expected_fields"
  for field in "${FIELDS[@]}"; do
    local field_value=$(echo "$result" | jq -r ".$field // empty")
    if [ -z "$field_value" ] || [ "$field_value" = "null" ]; then
      print_error "Missing expected field: $field"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
    fi
  done

  print_success "$test_name passed"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  return 0
}

# =====================================================
# TEST 1: Analyze Moment Sentiment - Positive
# =====================================================
print_header "Test 1: Analyze Moment Sentiment (Positive)"

test_action \
  "Positive sentiment analysis" \
  "analyze_moment_sentiment" \
  '{"content": "Hoje foi um dia incrível! Consegui finalizar o projeto e me sinto muito realizado e energizado."}' \
  "timestamp,sentiment,sentimentScore,emotions,triggers,energyLevel"

# =====================================================
# TEST 2: Analyze Moment Sentiment - Negative
# =====================================================
print_header "Test 2: Analyze Moment Sentiment (Negative)"

test_action \
  "Negative sentiment analysis" \
  "analyze_moment_sentiment" \
  '{"content": "Me sinto muito frustrado e cansado hoje. Nada deu certo e estou exausto."}' \
  "timestamp,sentiment,sentimentScore,emotions,triggers,energyLevel"

# =====================================================
# TEST 3: Analyze Moment Sentiment - Neutral
# =====================================================
print_header "Test 3: Analyze Moment Sentiment (Neutral)"

test_action \
  "Neutral sentiment analysis" \
  "analyze_moment_sentiment" \
  '{"content": "Hoje foi um dia normal. Fiz as tarefas de rotina e agora estou descansando."}' \
  "timestamp,sentiment,sentimentScore,emotions,triggers,energyLevel"

# =====================================================
# TEST 4: Generate Weekly Summary - Single Week
# =====================================================
print_header "Test 4: Generate Weekly Summary"

test_action \
  "Weekly summary generation" \
  "generate_weekly_summary" \
  '{
    "moments": [
      {
        "id": "test-1",
        "content": "Hoje me senti muito produtivo no trabalho. Consegui finalizar 3 tarefas importantes.",
        "emotion": "happy",
        "sentiment_data": {
          "sentiment": "positive",
          "sentimentScore": 0.7
        },
        "tags": ["trabalho", "produtividade"],
        "created_at": "2025-12-01T10:00:00Z"
      },
      {
        "id": "test-2",
        "content": "Tive um dia difícil, mas consegui superar os desafios com resiliência.",
        "emotion": "determined",
        "sentiment_data": {
          "sentiment": "neutral",
          "sentimentScore": 0.1
        },
        "tags": ["saude", "desafio"],
        "created_at": "2025-12-03T14:00:00Z"
      },
      {
        "id": "test-3",
        "content": "Passei tempo com a família e me senti muito grato por esses momentos.",
        "emotion": "grateful",
        "sentiment_data": {
          "sentiment": "very_positive",
          "sentimentScore": 0.9
        },
        "tags": ["familia", "gratidao"],
        "created_at": "2025-12-05T18:00:00Z"
      }
    ]
  }' \
  "emotionalTrend,dominantEmotions,keyMoments,insights,suggestedFocus"

# =====================================================
# TEST 5: Error Handling - Missing Content
# =====================================================
print_header "Test 5: Error Handling - Missing Content"

TESTS_RUN=$((TESTS_RUN + 1))
print_info "Testing: Missing content field"

response=$(npx supabase functions invoke gemini-chat --data '{"action":"analyze_moment_sentiment","payload":{}}' 2>&1)
error=$(echo "$response" | jq -r '.error // empty')

if [ -n "$error" ]; then
  print_success "Error handling working correctly"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  print_error "Should have returned an error for missing content"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =====================================================
# TEST 6: Error Handling - Invalid Action
# =====================================================
print_header "Test 6: Error Handling - Invalid Action"

TESTS_RUN=$((TESTS_RUN + 1))
print_info "Testing: Invalid action"

response=$(npx supabase functions invoke gemini-chat --data '{"action":"invalid_action","payload":{}}' 2>&1)
error=$(echo "$response" | jq -r '.error // empty')

if [ -n "$error" ]; then
  print_success "Invalid action handling working correctly"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  print_error "Should have returned an error for invalid action"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =====================================================
# TEST 7: Legacy Chat (Backward Compatibility)
# =====================================================
print_header "Test 7: Legacy Chat Request"

TESTS_RUN=$((TESTS_RUN + 1))
print_info "Testing: Legacy chat interface"

response=$(npx supabase functions invoke gemini-chat --data '{"message":"Olá, como você pode me ajudar?"}' 2>&1)
success=$(echo "$response" | jq -r '.success // false')
chat_response=$(echo "$response" | jq -r '.response // empty')

if [ "$success" = "true" ] && [ -n "$chat_response" ]; then
  print_success "Legacy chat interface working"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  print_error "Legacy chat interface failed"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =====================================================
# TEST SUMMARY
# =====================================================
print_header "TEST SUMMARY"

echo ""
echo -e "${BLUE}Total Tests Run:     $TESTS_RUN${NC}"
echo -e "${GREEN}Tests Passed:        $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed:        $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}=================================================="
  echo -e "✓ ALL TESTS PASSED"
  echo -e "==================================================${NC}"
  exit 0
else
  echo -e "${RED}=================================================="
  echo -e "✗ SOME TESTS FAILED"
  echo -e "==================================================${NC}"
  exit 1
fi
