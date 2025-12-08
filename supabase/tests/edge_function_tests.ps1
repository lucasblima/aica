# =====================================================
# EDGE FUNCTION TESTS - gemini-chat (PowerShell)
# =====================================================
# This script tests all actions of the gemini-chat Edge Function
# Windows PowerShell version
# =====================================================

# Test counters
$TESTS_RUN = 0
$TESTS_PASSED = 0
$TESTS_FAILED = 0

# Function to print colored output
function Print-Header {
  param([string]$Message)
  Write-Host "==================================================" -ForegroundColor Blue
  Write-Host $Message -ForegroundColor Blue
  Write-Host "==================================================" -ForegroundColor Blue
}

function Print-Success {
  param([string]$Message)
  Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
  param([string]$Message)
  Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Info {
  param([string]$Message)
  Write-Host "→ $Message" -ForegroundColor Yellow
}

# Function to test an endpoint
function Test-Action {
  param(
    [string]$TestName,
    [string]$Action,
    [string]$Payload,
    [string[]]$ExpectedFields
  )

  $script:TESTS_RUN++
  Print-Info "Testing: $TestName"

  # Create request JSON
  $requestJson = @{
    action = $Action
    payload = $Payload | ConvertFrom-Json
  } | ConvertTo-Json -Depth 10

  # Save to temp file
  $tempFile = [System.IO.Path]::GetTempFileName()
  $requestJson | Out-File -FilePath $tempFile -Encoding UTF8

  # Invoke function
  try {
    $response = npx supabase functions invoke gemini-chat --data "@$tempFile" 2>&1 | Out-String
    $responseObj = $response | ConvertFrom-Json

    # Check if request succeeded
    if (-not $responseObj.success) {
      Print-Error "Action returned success=false"
      Write-Host $response
      $script:TESTS_FAILED++
      Remove-Item $tempFile
      return $false
    }

    # Check for expected fields
    $result = $responseObj.result
    foreach ($field in $ExpectedFields) {
      if (-not ($result.PSObject.Properties.Name -contains $field)) {
        Print-Error "Missing expected field: $field"
        $script:TESTS_FAILED++
        Remove-Item $tempFile
        return $false
      }
    }

    Print-Success "$TestName passed"
    $script:TESTS_PASSED++
    Remove-Item $tempFile
    return $true

  } catch {
    Print-Error "Request failed: $_"
    $script:TESTS_FAILED++
    if (Test-Path $tempFile) {
      Remove-Item $tempFile
    }
    return $false
  }
}

# =====================================================
# TEST 1: Analyze Moment Sentiment - Positive
# =====================================================
Print-Header "Test 1: Analyze Moment Sentiment (Positive)"

$payload1 = @'
{
  "content": "Hoje foi um dia incrível! Consegui finalizar o projeto e me sinto muito realizado e energizado."
}
'@

Test-Action `
  -TestName "Positive sentiment analysis" `
  -Action "analyze_moment_sentiment" `
  -Payload $payload1 `
  -ExpectedFields @("timestamp", "sentiment", "sentimentScore", "emotions", "triggers", "energyLevel")

# =====================================================
# TEST 2: Analyze Moment Sentiment - Negative
# =====================================================
Print-Header "Test 2: Analyze Moment Sentiment (Negative)"

$payload2 = @'
{
  "content": "Me sinto muito frustrado e cansado hoje. Nada deu certo e estou exausto."
}
'@

Test-Action `
  -TestName "Negative sentiment analysis" `
  -Action "analyze_moment_sentiment" `
  -Payload $payload2 `
  -ExpectedFields @("timestamp", "sentiment", "sentimentScore", "emotions", "triggers", "energyLevel")

# =====================================================
# TEST 3: Analyze Moment Sentiment - Neutral
# =====================================================
Print-Header "Test 3: Analyze Moment Sentiment (Neutral)"

$payload3 = @'
{
  "content": "Hoje foi um dia normal. Fiz as tarefas de rotina e agora estou descansando."
}
'@

Test-Action `
  -TestName "Neutral sentiment analysis" `
  -Action "analyze_moment_sentiment" `
  -Payload $payload3 `
  -ExpectedFields @("timestamp", "sentiment", "sentimentScore", "emotions", "triggers", "energyLevel")

# =====================================================
# TEST 4: Generate Weekly Summary
# =====================================================
Print-Header "Test 4: Generate Weekly Summary"

$payload4 = @'
{
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
}
'@

Test-Action `
  -TestName "Weekly summary generation" `
  -Action "generate_weekly_summary" `
  -Payload $payload4 `
  -ExpectedFields @("emotionalTrend", "dominantEmotions", "keyMoments", "insights", "suggestedFocus")

# =====================================================
# TEST 5: Error Handling - Missing Content
# =====================================================
Print-Header "Test 5: Error Handling - Missing Content"

$script:TESTS_RUN++
Print-Info "Testing: Missing content field"

$tempFile = [System.IO.Path]::GetTempFileName()
'{"action":"analyze_moment_sentiment","payload":{}}' | Out-File -FilePath $tempFile -Encoding UTF8

try {
  $response = npx supabase functions invoke gemini-chat --data "@$tempFile" 2>&1 | Out-String
  $responseObj = $response | ConvertFrom-Json

  if ($responseObj.error) {
    Print-Success "Error handling working correctly"
    $script:TESTS_PASSED++
  } else {
    Print-Error "Should have returned an error for missing content"
    $script:TESTS_FAILED++
  }
} catch {
  Print-Success "Error handling working correctly (threw exception)"
  $script:TESTS_PASSED++
} finally {
  Remove-Item $tempFile
}

# =====================================================
# TEST 6: Error Handling - Invalid Action
# =====================================================
Print-Header "Test 6: Error Handling - Invalid Action"

$script:TESTS_RUN++
Print-Info "Testing: Invalid action"

$tempFile = [System.IO.Path]::GetTempFileName()
'{"action":"invalid_action","payload":{}}' | Out-File -FilePath $tempFile -Encoding UTF8

try {
  $response = npx supabase functions invoke gemini-chat --data "@$tempFile" 2>&1 | Out-String
  $responseObj = $response | ConvertFrom-Json

  if ($responseObj.error) {
    Print-Success "Invalid action handling working correctly"
    $script:TESTS_PASSED++
  } else {
    Print-Error "Should have returned an error for invalid action"
    $script:TESTS_FAILED++
  }
} catch {
  Print-Success "Invalid action handling working correctly (threw exception)"
  $script:TESTS_PASSED++
} finally {
  Remove-Item $tempFile
}

# =====================================================
# TEST 7: Legacy Chat (Backward Compatibility)
# =====================================================
Print-Header "Test 7: Legacy Chat Request"

$script:TESTS_RUN++
Print-Info "Testing: Legacy chat interface"

$tempFile = [System.IO.Path]::GetTempFileName()
'{"message":"Olá, como você pode me ajudar?"}' | Out-File -FilePath $tempFile -Encoding UTF8

try {
  $response = npx supabase functions invoke gemini-chat --data "@$tempFile" 2>&1 | Out-String
  $responseObj = $response | ConvertFrom-Json

  if ($responseObj.success -and $responseObj.response) {
    Print-Success "Legacy chat interface working"
    $script:TESTS_PASSED++
  } else {
    Print-Error "Legacy chat interface failed"
    $script:TESTS_FAILED++
  }
} catch {
  Print-Error "Legacy chat interface failed: $_"
  $script:TESTS_FAILED++
} finally {
  Remove-Item $tempFile
}

# =====================================================
# TEST SUMMARY
# =====================================================
Print-Header "TEST SUMMARY"

Write-Host ""
Write-Host "Total Tests Run:     $TESTS_RUN" -ForegroundColor Blue
Write-Host "Tests Passed:        $TESTS_PASSED" -ForegroundColor Green
Write-Host "Tests Failed:        $TESTS_FAILED" -ForegroundColor Red
Write-Host ""

if ($TESTS_FAILED -eq 0) {
  Write-Host "==================================================" -ForegroundColor Green
  Write-Host "✓ ALL TESTS PASSED" -ForegroundColor Green
  Write-Host "==================================================" -ForegroundColor Green
  exit 0
} else {
  Write-Host "==================================================" -ForegroundColor Red
  Write-Host "✗ SOME TESTS FAILED" -ForegroundColor Red
  Write-Host "==================================================" -ForegroundColor Red
  exit 1
}
