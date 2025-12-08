# Edge Function Test Suite

Automated tests for the `gemini-chat` Edge Function.

---

## Test Files

### `edge_function_tests.ps1` (Windows PowerShell)
- **Platform**: Windows PowerShell 5.1+
- **Tests**: 7 test cases
- **Execution**: `.\edge_function_tests.ps1`

### `edge_function_tests.sh` (Bash)
- **Platform**: Linux, macOS, Git Bash
- **Tests**: 7 test cases
- **Execution**: `bash edge_function_tests.sh`

---

## Test Cases

### 1. Positive Sentiment Analysis
Tests AI sentiment analysis with a very positive text input.

**Expected**:
- `sentiment`: "very_positive" or "positive"
- `sentimentScore`: > 0.5
- `energyLevel`: > 60

### 2. Negative Sentiment Analysis
Tests AI sentiment analysis with a negative text input.

**Expected**:
- `sentiment`: "negative" or "very_negative"
- `sentimentScore`: < 0
- `energyLevel`: < 50

### 3. Neutral Sentiment Analysis
Tests AI sentiment analysis with a neutral text input.

**Expected**:
- `sentiment`: "neutral"
- `sentimentScore`: -0.2 to 0.2
- `energyLevel`: 40-60

### 4. Weekly Summary Generation
Tests AI weekly summary with sample moments.

**Expected**:
- `emotionalTrend`: one of ["ascending", "stable", "descending", "volatile"]
- `dominantEmotions`: array of 1-5 emotions
- `keyMoments`: array of moment objects
- `insights`: array of 1-5 insight strings
- `suggestedFocus`: non-empty string

### 5. Error Handling - Missing Content
Tests that the function rejects requests with missing required fields.

**Expected**:
- Response contains `error` field
- Status code 400

### 6. Error Handling - Invalid Action
Tests that the function rejects unknown actions.

**Expected**:
- Response contains `error` field
- Error message mentions unknown action

### 7. Legacy Chat (Backward Compatibility)
Tests that the old chat interface still works.

**Expected**:
- Response contains `success: true`
- Response contains `response` field with chat text

---

## Prerequisites

### 1. Supabase CLI Installed
```bash
npx supabase --version
```

### 2. Project Linked
```bash
npx supabase link --project-ref <your-project-ref>
```

### 3. Function Deployed
```bash
npx supabase functions deploy gemini-chat
```

### 4. Gemini API Key Set
```bash
npx supabase secrets list | grep GEMINI_API_KEY
```

If missing:
```bash
npx supabase secrets set GEMINI_API_KEY=<your-key>
```

---

## Running Tests

### Windows (PowerShell)
```powershell
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\tests
.\edge_function_tests.ps1
```

### Linux/Mac/Git Bash
```bash
cd /c/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/tests
bash edge_function_tests.sh
```

### Make Bash Script Executable (Linux/Mac)
```bash
chmod +x edge_function_tests.sh
./edge_function_tests.sh
```

---

## Expected Output

### Success
```
==================================================
Test 1: Analyze Moment Sentiment (Positive)
==================================================
→ Testing: Positive sentiment analysis
✓ Positive sentiment analysis passed

[... more tests ...]

==================================================
TEST SUMMARY
==================================================

Total Tests Run:     7
Tests Passed:        7
Tests Failed:        0

==================================================
✓ ALL TESTS PASSED
==================================================
```

### Failure
```
==================================================
Test 1: Analyze Moment Sentiment (Positive)
==================================================
→ Testing: Positive sentiment analysis
✗ Missing expected field: sentiment

[... more tests ...]

==================================================
TEST SUMMARY
==================================================

Total Tests Run:     7
Tests Passed:        5
Tests Failed:        2

==================================================
✗ SOME TESTS FAILED
==================================================
```

---

## Interpreting Results

### All Tests Passed
✅ Edge Function is working correctly
✅ AI sentiment analysis is functional
✅ Weekly summary generation is functional
✅ Error handling is correct
✅ Backward compatibility maintained

**Action**: Mark deployment as successful

### Some Tests Failed
⚠️ Investigate failures

**Common Issues**:

1. **API Key Not Set**
   - Error: "API key not configured"
   - Fix: `npx supabase secrets set GEMINI_API_KEY=<key>`

2. **Function Not Deployed**
   - Error: "Function not found"
   - Fix: `npx supabase functions deploy gemini-chat`

3. **AI Model Rate Limit**
   - Error: Response timeout or 429 status
   - Fix: Wait 1 minute and retry

4. **Network Issues**
   - Error: Connection timeout
   - Fix: Check internet connection and Supabase status

---

## Manual Testing

If automated tests fail, test manually:

### Test Sentiment Analysis
```bash
npx supabase functions invoke gemini-chat --data '{
  "action": "analyze_moment_sentiment",
  "payload": {
    "content": "Teste manual de sentimento"
  }
}'
```

### Test Weekly Summary
```bash
npx supabase functions invoke gemini-chat --data '{
  "action": "generate_weekly_summary",
  "payload": {
    "moments": [
      {
        "id": "test",
        "content": "Teste",
        "emotion": "neutral",
        "sentiment_data": {"sentiment": "neutral", "sentimentScore": 0},
        "tags": [],
        "created_at": "2025-12-06T00:00:00Z"
      }
    ]
  }
}'
```

---

## Troubleshooting

### Tests Take Too Long
**Cause**: AI model latency
**Solution**: This is normal. Gemini API can take 2-5 seconds per request.

### Tests Fail Intermittently
**Cause**: AI model non-determinism or rate limits
**Solution**:
1. Check rate limits: `npx supabase functions logs gemini-chat`
2. Retry tests after 1 minute

### JSON Parse Errors
**Cause**: AI model returned non-JSON response
**Solution**:
1. Check function logs: `npx supabase functions logs gemini-chat`
2. Verify prompt templates in `index.ts`

### Permission Denied (Bash)
**Cause**: Script not executable
**Solution**: `chmod +x edge_function_tests.sh`

---

## Adding New Tests

To add a new test case:

### PowerShell
```powershell
Print-Header "Test 8: Your New Test"

$payload = @'
{
  "your": "payload"
}
'@

Test-Action `
  -TestName "Your test name" `
  -Action "your_action" `
  -Payload $payload `
  -ExpectedFields @("field1", "field2")
```

### Bash
```bash
print_header "Test 8: Your New Test"

test_action \
  "Your test name" \
  "your_action" \
  '{"your": "payload"}' \
  "field1,field2"
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Test Edge Functions
  run: |
    npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    npx supabase secrets set GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}
    bash supabase/tests/edge_function_tests.sh
```

### Exit Codes
- `0`: All tests passed
- `1`: Some tests failed

---

## Related Documentation

- `docs/DEPLOYMENT_INSTRUCTIONS_20251206.md` - Full deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
- `supabase/functions/gemini-chat/index.ts` - Function source code

---

**Last Updated**: 2025-12-06
**Test Suite Version**: 1.0
**Maintained By**: Backend Architect Agent
