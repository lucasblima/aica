# Gemini Security & Token Optimization Guide

## Table of Contents
1. [Security Architecture](#security-architecture)
2. [API Key Management](#api-key-management)
3. [Token Optimization Strategies](#token-optimization-strategies)
4. [Error Handling & Retry Logic](#error-handling--retry-logic)
5. [Model Selection Guidelines](#model-selection-guidelines)
6. [Performance Monitoring](#performance-monitoring)

---

## Security Architecture

### Three-Layer Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  - No API keys                                              │
│  - Only authenticated requests                              │
│  - GeminiClient.getInstance() ONLY                          │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Edge Function Layer                        │
│  - Validates Supabase auth token                           │
│  - Retrieves API key from Supabase secrets                 │
│  - Rate limiting & abuse prevention                        │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Gemini API Layer                        │
│  - Receives authenticated requests only                     │
│  - API key never exposed to client                         │
└─────────────────────────────────────────────────────────────┘
```

### Security Principles

#### 1. Never Expose API Keys in Frontend

**WRONG ❌:**
```typescript
// NEVER DO THIS - API key exposed in browser
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenAI(GEMINI_API_KEY)

// Anyone can extract this from browser DevTools:
// - Network tab shows requests
// - Source maps reveal env variables
// - Bundle analysis exposes secrets
```

**CORRECT ✅:**
```typescript
// API key stays in Supabase Edge Function secrets
import { GeminiClient } from '@/lib/gemini'

const gemini = GeminiClient.getInstance()
const result = await gemini.call({
  action: 'deep_research',
  payload: { query }
})
```

#### 2. Always Validate Authentication

```typescript
// Edge Function (Deno)
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  // 1. Validate auth token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Get secure API key from environment
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

  // 3. Make authenticated call to Gemini
  // ...
})
```

#### 3. Implement Rate Limiting

```typescript
// Edge Function with rate limiting
const RATE_LIMIT = 10 // requests per minute
const rateCache = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRate = rateCache.get(userId)

  if (!userRate || now > userRate.resetAt) {
    rateCache.set(userId, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (userRate.count >= RATE_LIMIT) {
    return false
  }

  userRate.count++
  return true
}

// In Edge Function:
if (!checkRateLimit(user.id)) {
  return new Response('Rate limit exceeded', { status: 429 })
}
```

---

## API Key Management

### Where API Keys Should Live

#### ✅ Correct Locations:
1. **Supabase Edge Function Secrets** (Production)
   ```bash
   supabase secrets set GEMINI_API_KEY=your_api_key_here
   ```

2. **Local Edge Function `.env`** (Development)
   ```bash
   # supabase/.env.local
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Encrypted Vault** (Backup)
   - 1Password, LastPass, or similar
   - Never in git repository

#### ❌ Incorrect Locations:
1. Frontend `.env` files
2. Git repository (even in `.gitignore`)
3. Client-side JavaScript/TypeScript
4. Browser localStorage/sessionStorage
5. Public documentation

### Rotation Strategy

```typescript
/**
 * API Key Rotation Protocol
 *
 * 1. Generate new API key in Google AI Studio
 * 2. Update Supabase secrets (production + staging)
 * 3. Update local .env files
 * 4. Test thoroughly
 * 5. Revoke old API key after 24h grace period
 *
 * Frequency: Every 90 days or immediately if compromised
 */
```

---

## Token Optimization Strategies

### Understanding Token Costs

**Gemini 2.0 Flash Pricing (as of 2025):**
- Input: ~$0.075 per 1M tokens
- Output: ~$0.30 per 1M tokens
- Cached input: ~$0.01875 per 1M tokens (75% discount)

**Example Cost Calculation:**
```typescript
// Deep Research Operation
const INPUT_TOKENS = 800
const OUTPUT_TOKENS = 3000
const COST = (800 * 0.075 + 3000 * 0.30) / 1_000_000
// = $0.00096 per deep research (~0.1 cents)

// Monthly estimate: 1000 users × 10 researches/user × $0.001
// = $10/month for deep research feature
```

### Strategy 1: Model Selection

Use the right model for the right task:

```typescript
// Fast model (gemini-2.0-flash) for quick tasks
const USE_FAST_FOR = [
  'suggest_guest',        // Simple suggestion
  'suggest_topic',        // Quick topic idea
  'analyze_news',         // Sentiment analysis
  'finance_chat',         // Simple chat responses
  'categorize_task',      // Task categorization
]

// Smart model (gemini-2.5-flash) for complex tasks
const USE_SMART_FOR = [
  'generate_dossier',     // Comprehensive biography
  'deep_research',        // Multi-source research
  'analyze_spending',     // Financial pattern analysis
  'generate_pauta',       // NotebookLM-style outline
]

// Automatic selection in GeminiClient
export function getModelForUseCase(action: string): GeminiModel {
  return USE_CASE_TO_MODEL[action] || 'fast'
}
```

### Strategy 2: Context Limiting

**Problem:** Long prompts = high costs

**Solution:** Truncate and summarize

```typescript
// ❌ BAD: Sending entire conversation history
async function chatWithAI(messages: Message[]) {
  const allMessages = messages.map(m => m.content).join('\n')
  // Could be 10,000+ tokens!

  return gemini.call({
    action: 'finance_chat',
    payload: { context: allMessages } // Expensive!
  })
}

// ✅ GOOD: Limit context window
async function chatWithAI(messages: Message[]) {
  const recentMessages = messages.slice(-10) // Last 10 messages only
  const context = recentMessages.map(m => m.content).join('\n')
  // ~500-1000 tokens

  return gemini.call({
    action: 'finance_chat',
    payload: { context }
  })
}

// ✅ EVEN BETTER: Summarize old context
async function chatWithAI(messages: Message[]) {
  const oldMessages = messages.slice(0, -10)
  const recentMessages = messages.slice(-10)

  // Summarize old conversation (done once, cached)
  const summary = await summarizeContext(oldMessages)

  const context = `
    Previous context: ${summary}

    Recent messages:
    ${recentMessages.map(m => m.content).join('\n')}
  `

  return gemini.call({
    action: 'finance_chat',
    payload: { context }
  })
}
```

### Strategy 3: Response Truncation

```typescript
// ❌ BAD: No output limits
const prompt = `
  Write a comprehensive biography of Elon Musk.
  Include all achievements, controversies, and timeline.
`
// Could generate 5000+ tokens

// ✅ GOOD: Specify length constraints
const prompt = `
  Write a biography of Elon Musk.

  Requirements:
  - Maximum 500 words
  - 3 paragraphs
  - Focus on: career highlights, major controversies, current status
`
// Generates ~300-400 tokens
```

### Strategy 4: Instruction Caching

```typescript
/**
 * IMPORTANT: Gemini supports caching of system instructions
 * Reuse system instructions across calls to save 75% on input tokens
 */

// ❌ BAD: Rebuilding system instruction every time
function generateDossier(guestName: string) {
  const SYSTEM_INSTRUCTION = `
    Você é um pesquisador profissional...
    [2000 tokens of instructions]
  `

  return gemini.call({
    action: 'generate_dossier',
    payload: { guestName, systemInstruction: SYSTEM_INSTRUCTION }
  })
  // Pays full price for 2000 tokens every time!
}

// ✅ GOOD: System instruction cached in Edge Function
function generateDossier(guestName: string) {
  // System instruction lives in Edge Function
  // Only variable data sent in payload
  return gemini.call({
    action: 'generate_dossier',
    payload: { guestName }
  })
  // First call: 2000 tokens
  // Subsequent calls: 500 tokens (75% discount on cached system instruction)
}
```

### Strategy 5: Batch Operations

```typescript
// ❌ BAD: Multiple individual calls
async function analyzeArticles(articles: Article[]) {
  const results = []
  for (const article of articles) {
    const result = await gemini.call({
      action: 'analyze_news',
      payload: { article }
    })
    results.push(result)
  }
  return results
  // 10 articles × 300 tokens overhead = 3000 tokens wasted
}

// ✅ GOOD: Single batch call
async function analyzeArticles(articles: Article[]) {
  const result = await gemini.call({
    action: 'analyze_news',
    payload: { articles } // All at once
  })
  return result
  // 300 tokens overhead (once) = 2700 tokens saved
}
```

### Strategy 6: Client-Side Caching

```typescript
// Cache AI results to avoid redundant calls
class AICache {
  private cache = new Map<string, { data: any; expiresAt: number }>()
  private TTL = 3600000 // 1 hour

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key)

    if (cached && now < cached.expiresAt) {
      console.log('Cache hit:', key)
      return cached.data as T
    }

    console.log('Cache miss:', key)
    const data = await fetcher()
    this.cache.set(key, { data, expiresAt: now + this.TTL })
    return data
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

// Usage in hook
export function useWorkspaceAI() {
  const cacheRef = useRef(new AICache())

  const generateDossier = async (guestName: string) => {
    return cacheRef.current.get(
      `dossier:${guestName}`,
      () => podcastAIService.generateDossier(guestName)
    )
  }
}
```

---

## Error Handling & Retry Logic

### Automatic Retry Implementation

```typescript
// From @/lib/gemini/retry.ts
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelay = options?.baseDelay ?? 1000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        throw error
      }

      // Check if error is retryable
      if (error instanceof GeminiError) {
        if (error.code === 'RATE_LIMITED') {
          // Exponential backoff for rate limits
          const delay = baseDelay * Math.pow(2, attempt)
          console.log(`Rate limited, retrying in ${delay}ms...`)
          await sleep(delay)
          continue
        }

        if (error.code === 'SERVER_ERROR') {
          // Fixed delay for server errors
          console.log(`Server error, retrying in ${baseDelay}ms...`)
          await sleep(baseDelay)
          continue
        }

        // Don't retry auth errors or network errors
        throw error
      }

      throw error
    }
  }

  throw new Error('Max retries exceeded')
}
```

### Retry Strategy by Error Type

| Error Code | Status | Retry? | Strategy |
|------------|--------|--------|----------|
| `UNAUTHORIZED` | 401 | ❌ No | User must re-authenticate |
| `RATE_LIMITED` | 429 | ✅ Yes | Exponential backoff (1s, 2s, 4s) |
| `SERVER_ERROR` | 500-503 | ✅ Yes | Fixed delay (1s) |
| `NETWORK_ERROR` | - | ❌ No | Show offline message |

### Error Handling Best Practices

```typescript
// ✅ GOOD: Graceful degradation
async function generateDossier(guestName: string): Promise<Dossier> {
  try {
    const response = await gemini.call({
      action: 'generate_dossier',
      payload: { guestName }
    })
    return response.result
  } catch (error) {
    if (error instanceof GeminiError) {
      switch (error.code) {
        case 'RATE_LIMITED':
          // Inform user, suggest retry later
          return createFallbackDossier(guestName, 'Rate limit exceeded. Try again in a moment.')

        case 'SERVER_ERROR':
          // Server issue, already retried
          return createFallbackDossier(guestName, 'Service temporarily unavailable.')

        case 'UNAUTHORIZED':
          // Auth issue, redirect to login
          throw new Error('Please log in to continue')

        default:
          return createFallbackDossier(guestName, 'Unable to generate dossier.')
      }
    }

    // Unknown error
    console.error('Unexpected error:', error)
    return createFallbackDossier(guestName, 'An unexpected error occurred.')
  }
}

function createFallbackDossier(guestName: string, message: string): Dossier {
  return {
    guestName,
    episodeTheme: 'Carreira & Atualidades',
    biography: message,
    controversies: [],
    suggestedTopics: [],
    iceBreakers: []
  }
}
```

---

## Model Selection Guidelines

### Model Comparison

| Model | Speed | Quality | Cost | Use Cases |
|-------|-------|---------|------|-----------|
| `gemini-2.0-flash` | ⚡️ Fast | ⭐️⭐️⭐️ Good | $ Cheap | Quick suggestions, chat, categorization |
| `gemini-2.5-flash` | 🐢 Slower | ⭐️⭐️⭐️⭐️⭐️ Excellent | $$ Moderate | Research, dossiers, complex analysis |
| `gemini-2.0-flash-exp` | ⚡️ Fast | ⭐️⭐️⭐️⭐️ Very Good | $ Cheap | Experimental features, testing |
| `text-embedding-004` | ⚡️ Fast | N/A | $ Cheap | Embeddings for RAG/search |

### Decision Tree

```
Need to generate embeddings for RAG?
├─ Yes → Use text-embedding-004
└─ No
   │
   Is latency critical (< 3s)?
   ├─ Yes → Use gemini-2.0-flash
   │
   └─ No
      │
      Requires deep analysis or research?
      ├─ Yes → Use gemini-2.5-flash
      └─ No → Use gemini-2.0-flash
```

### Override Model Selection

```typescript
// Use default (auto-selected based on action)
await gemini.call({
  action: 'generate_dossier'
  // Uses gemini-2.5-flash automatically
})

// Override to faster model (testing, less important)
await gemini.call({
  action: 'generate_dossier',
  model: 'fast' // Override to gemini-2.0-flash
})

// Override to experimental (new features)
await gemini.call({
  action: 'generate_dossier',
  model: 'experimental' // Use gemini-2.0-flash-exp
})
```

---

## Performance Monitoring

### Token Usage Tracking

```typescript
// Edge Function logs token usage
export async function handler(req: Request) {
  const startTime = Date.now()

  const response = await gemini.generateContent(prompt)

  const latency = Date.now() - startTime
  const tokensUsed = {
    input: response.usageMetadata.promptTokenCount,
    output: response.usageMetadata.candidatesTokenCount
  }

  console.log('[Gemini Metrics]', {
    action: request.action,
    model: request.model,
    latency,
    tokensUsed,
    cached: response.usageMetadata.cachedContentTokenCount > 0
  })

  return {
    result: response.text(),
    tokensUsed,
    latencyMs: latency,
    cached: response.usageMetadata.cachedContentTokenCount > 0
  }
}
```

### Client-Side Monitoring

```typescript
export function useWorkspaceAI() {
  const metricsRef = useRef({
    totalCalls: 0,
    totalLatency: 0,
    totalTokens: { input: 0, output: 0 }
  })

  const deepResearch = async (query: string) => {
    const startTime = Date.now()

    const response = await geminiClient.call({
      action: 'deep_research',
      payload: { query }
    })

    // Track metrics
    const latency = Date.now() - startTime
    metricsRef.current.totalCalls++
    metricsRef.current.totalLatency += latency

    if (response.tokensUsed) {
      metricsRef.current.totalTokens.input += response.tokensUsed.input
      metricsRef.current.totalTokens.output += response.tokensUsed.output
    }

    console.log('[AI Metrics]', {
      action: 'deep_research',
      latency,
      tokensUsed: response.tokensUsed,
      averageLatency: metricsRef.current.totalLatency / metricsRef.current.totalCalls
    })

    return response.result
  }
}
```

### Cost Estimation

```typescript
// Calculate monthly cost estimate
function estimateMonthlyCost(usage: {
  totalInputTokens: number
  totalOutputTokens: number
  cachedInputTokens: number
}) {
  const INPUT_PRICE = 0.075 / 1_000_000  // $0.075 per 1M tokens
  const OUTPUT_PRICE = 0.30 / 1_000_000  // $0.30 per 1M tokens
  const CACHED_PRICE = 0.01875 / 1_000_000 // 75% discount

  const regularInputCost = (usage.totalInputTokens - usage.cachedInputTokens) * INPUT_PRICE
  const cachedInputCost = usage.cachedInputTokens * CACHED_PRICE
  const outputCost = usage.totalOutputTokens * OUTPUT_PRICE

  return {
    total: regularInputCost + cachedInputCost + outputCost,
    breakdown: {
      regularInput: regularInputCost,
      cachedInput: cachedInputCost,
      output: outputCost
    },
    savings: usage.cachedInputTokens * (INPUT_PRICE - CACHED_PRICE)
  }
}

// Example monthly estimate
const monthlyUsage = {
  totalInputTokens: 5_000_000,    // 5M input tokens
  totalOutputTokens: 2_000_000,   // 2M output tokens
  cachedInputTokens: 3_000_000    // 3M cached (60% cache hit rate)
}

const cost = estimateMonthlyCost(monthlyUsage)
console.log('Monthly AI cost:', cost)
// {
//   total: $0.81,
//   breakdown: {
//     regularInput: $0.15,
//     cachedInput: $0.06,
//     output: $0.60
//   },
//   savings: $0.18 (18% cost reduction from caching)
// }
```

---

## Summary Checklist

### Security ✅
- [ ] Never instantiate `GoogleGenAI` in frontend
- [ ] Always use `GeminiClient.getInstance()`
- [ ] Store API keys only in Edge Function secrets
- [ ] Validate authentication for all AI calls
- [ ] Implement rate limiting
- [ ] Rotate API keys every 90 days

### Token Optimization ✅
- [ ] Use appropriate model for each task
- [ ] Limit context windows (last 10 messages)
- [ ] Specify output length constraints
- [ ] Cache system instructions
- [ ] Batch multiple operations
- [ ] Cache AI results client-side

### Error Handling ✅
- [ ] Implement automatic retry with exponential backoff
- [ ] Handle rate limits gracefully
- [ ] Provide fallback responses
- [ ] Log errors for debugging
- [ ] Clear error states appropriately

### Monitoring ✅
- [ ] Track token usage per operation
- [ ] Monitor latency metrics
- [ ] Calculate cost estimates
- [ ] Measure cache hit rates
- [ ] Set up alerts for anomalies

---

**Last Updated:** 2025-01-20 (Wave 4)
**Maintained By:** AI Integration Agent
**Next Review:** Wave 5 (Component Migration)
