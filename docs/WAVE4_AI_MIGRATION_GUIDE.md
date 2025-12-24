# Wave 4: AI Services Consolidation - Migration Guide

## Overview

Wave 4 consolidates all Gemini AI integrations into a unified `useWorkspaceAI` hook and fixes critical security vulnerabilities.

**Key Changes:**
- ✅ Single unified hook for all AI operations
- ✅ Security vulnerability fixed (API keys moved to backend)
- ✅ Consistent error handling and loading states
- ✅ Token optimization strategies
- ✅ Backward compatibility maintained

---

## Critical Security Fix

### BEFORE (INSECURE - DO NOT USE):
```typescript
// ❌ VULNERABLE: Exposes API key in frontend
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenAI(GEMINI_API_KEY) // ❌ EXPOSED!

const result = await genAI.generateContent(prompt)
```

### AFTER (SECURE):
```typescript
// ✅ SECURE: API key stays in backend
import { GeminiClient } from '@/lib/gemini'

const gemini = GeminiClient.getInstance()
const result = await gemini.call({
  action: 'deep_research',
  payload: { query, include_sources: true }
})
```

**Why this matters:**
- API keys in frontend code can be extracted by anyone
- Edge Functions run on backend with secure environment variables
- All API calls are authenticated via Supabase session tokens

---

## Migration Paths

### 1. Migrating from `useGeminiLive`

**BEFORE:**
```typescript
import { useGeminiLive } from '../hooks/useGeminiLive'

function PodcastStudio() {
  const {
    liveMode,
    connectionStatus,
    startSession,
    stopSession
  } = useGeminiLive({ dossier })

  // ...
}
```

**AFTER:**
```typescript
import { useWorkspaceAI } from '@/modules/studio/hooks/useWorkspaceAI'
import { useGeminiLive } from '../hooks/useGeminiLive' // Keep for now (Live WebSocket)

function PodcastStudio() {
  // Use consolidated hook for AI operations
  const ai = useWorkspaceAI()

  // Keep useGeminiLive only for WebSocket features (temporary)
  const live = useGeminiLive({ dossier })

  // Now you have access to all AI operations
  const handleGenerateDossier = async () => {
    const dossier = await ai.generateDossier('Elon Musk', 'Inovação')
  }

  const handleDeepResearch = async () => {
    const result = await ai.deepResearch('Elon Musk: CEO da Tesla', {
      include_sources: true,
      max_depth: 3
    })
  }
}
```

**Note:** `useGeminiLive` is still functional for WebSocket-based features (monitor/cohost mode). It will be integrated into `useWorkspaceAI` in a future iteration.

---

### 2. Migrating from `geminiDeepResearch.ts`

**BEFORE:**
```typescript
import { performDeepResearch } from '@/api/geminiDeepResearch'

async function searchGuest() {
  const result = await performDeepResearch({
    query: 'Elon Musk: CEO da Tesla',
    include_sources: true,
    max_depth: 2
  })
}
```

**AFTER (Option A - Recommended):**
```typescript
import { useWorkspaceAI } from '@/modules/studio/hooks/useWorkspaceAI'

function GuestSearch() {
  const ai = useWorkspaceAI()

  async function searchGuest() {
    const result = await ai.deepResearch('Elon Musk: CEO da Tesla', {
      include_sources: true,
      max_depth: 2
    })

    // Access loading state
    if (ai.isResearching) {
      console.log('Researching...')
    }

    // Handle errors
    if (ai.error) {
      console.error(ai.error)
      ai.clearError()
    }
  }
}
```

**AFTER (Option B - Backward Compatible):**
```typescript
// The old API still works (now secure), but shows deprecation warning
import { performDeepResearch } from '@/api/geminiDeepResearch'

async function searchGuest() {
  // ⚠️  Console warning: "Use useWorkspaceAI().deepResearch() instead"
  const result = await performDeepResearch({
    query: 'Elon Musk: CEO da Tesla',
    include_sources: true
  })
}
```

---

### 3. Migrating from Direct `podcastAIService` Calls

**BEFORE:**
```typescript
import { generateDossier, searchGuestProfile } from '@/modules/studio/services/podcastAIService'

async function loadGuestData() {
  const dossier = await generateDossier('Elon Musk', 'Inovação')
  const profile = await searchGuestProfile('Bill Gates', 'Microsoft Founder')
}
```

**AFTER:**
```typescript
import { useWorkspaceAI } from '@/modules/studio/hooks/useWorkspaceAI'

function WorkspaceView() {
  const ai = useWorkspaceAI()

  async function loadGuestData() {
    // Same functionality, better UX with loading states
    const dossier = await ai.generateDossier('Elon Musk', 'Inovação')
    const profile = await ai.searchGuestProfile('Bill Gates', 'Microsoft Founder')

    // Access granular loading states
    console.log('Generating dossier:', ai.isGeneratingDossier)
    console.log('Searching profile:', ai.isSearching)
  }
}
```

**Why migrate?**
- Unified loading states (`isGeneratingDossier`, `isSearching`, etc.)
- Consistent error handling
- Better TypeScript types
- Easier to test and maintain

---

## Complete API Reference

### `useWorkspaceAI` Interface

```typescript
interface UseWorkspaceAI {
  // === Dossier Generation ===
  generateDossier: (
    guestName: string,
    theme?: string,
    customSources?: CustomSource[]
  ) => Promise<Dossier>
  isGeneratingDossier: boolean

  // === Guest Profile Search ===
  searchGuestProfile: (
    name: string,
    reference: string
  ) => Promise<GuestSearchResult>
  isSearching: boolean

  // === Topic Suggestions ===
  suggestTrendingGuest: () => Promise<string>
  suggestTrendingTheme: (guestName: string) => Promise<string>
  isSuggesting: boolean

  // === Deep Research ===
  deepResearch: (
    query: string,
    options?: ResearchOptions
  ) => Promise<ResearchResult>
  isResearching: boolean

  // === Ice Breaker Generation ===
  generateMoreIceBreakers: (
    guestName: string,
    theme: string,
    existing: string[],
    count?: number
  ) => Promise<string[]>
  isGeneratingIceBreakers: boolean

  // === Gemini Live (WebSocket) ===
  liveMode: LiveMode
  connectionStatus: ConnectionStatus

  // === Error Handling ===
  error: Error | null
  clearError: () => void
}
```

### Usage Examples

#### Example 1: Generate Dossier with Custom Sources
```typescript
function DossierGenerator() {
  const ai = useWorkspaceAI()

  const handleGenerate = async () => {
    const dossier = await ai.generateDossier(
      'Elon Musk',
      'Inovação e Tecnologia',
      [
        {
          id: '1',
          url: 'https://example.com/article',
          title: 'Recent Interview',
          type: 'article'
        }
      ]
    )

    console.log('Biography:', dossier.biography)
    console.log('Controversies:', dossier.controversies)
    console.log('Topics:', dossier.suggestedTopics)
  }

  return (
    <button onClick={handleGenerate} disabled={ai.isGeneratingDossier}>
      {ai.isGeneratingDossier ? 'Generating...' : 'Generate Dossier'}
    </button>
  )
}
```

#### Example 2: Deep Research with Loading & Error States
```typescript
function GuestResearch() {
  const ai = useWorkspaceAI()
  const [result, setResult] = useState<ResearchResult | null>(null)

  const handleResearch = async () => {
    try {
      const data = await ai.deepResearch('Elon Musk: CEO da Tesla', {
        include_sources: true,
        max_depth: 3
      })

      if (data.success) {
        setResult(data)
      } else {
        console.error('Research failed:', data.error)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    }
  }

  return (
    <div>
      <button onClick={handleResearch} disabled={ai.isResearching}>
        {ai.isResearching ? 'Researching...' : 'Start Research'}
      </button>

      {ai.error && (
        <div className="error">
          Error: {ai.error.message}
          <button onClick={ai.clearError}>Dismiss</button>
        </div>
      )}

      {result && (
        <div>
          <h2>{result.full_name}</h2>
          <p>Confidence: {result.confidence_score}%</p>
          <p>Quality: {result.quality_score}%</p>
          <p>{result.biography}</p>
        </div>
      )}
    </div>
  )
}
```

#### Example 3: Suggest Guest & Theme
```typescript
function TopicSuggester() {
  const ai = useWorkspaceAI()
  const [guest, setGuest] = useState('')
  const [theme, setTheme] = useState('')

  const handleSuggestGuest = async () => {
    const suggestion = await ai.suggestTrendingGuest()
    setGuest(suggestion)
  }

  const handleSuggestTheme = async () => {
    if (!guest) return
    const suggestion = await ai.suggestTrendingTheme(guest)
    setTheme(suggestion)
  }

  return (
    <div>
      <button onClick={handleSuggestGuest} disabled={ai.isSuggesting}>
        Suggest Guest
      </button>
      {guest && <p>Guest: {guest}</p>}

      <button onClick={handleSuggestTheme} disabled={ai.isSuggesting || !guest}>
        Suggest Theme
      </button>
      {theme && <p>Theme: {theme}</p>}
    </div>
  )
}
```

---

## Token Optimization Strategies

### Model Selection
The hook automatically selects the optimal model based on the operation:

- **Fast Model (`gemini-2.0-flash`)**: Quick operations < 10s
  - `suggestTrendingGuest()`
  - `suggestTrendingTheme()`

- **Smart Model (`gemini-2.5-flash`)**: Complex operations requiring quality
  - `generateDossier()`
  - `deepResearch()`
  - `searchGuestProfile()`
  - `generateMoreIceBreakers()`

### Token Usage Estimates

| Operation | Model | Input Tokens | Output Tokens | Latency |
|-----------|-------|-------------|---------------|---------|
| `suggestTrendingGuest` | smart | ~200 | ~50 | 2-4s |
| `suggestTrendingTheme` | smart | ~300 | ~30 | 2-4s |
| `generateDossier` | smart | ~500 | 1500-2000 | 5-8s |
| `deepResearch` | smart | ~800 | 2000-3000 | 8-12s |
| `searchGuestProfile` | smart | ~400 | ~800 | 3-5s |
| `generateMoreIceBreakers` | smart | ~600 | ~400 | 3-5s |

### Cost Optimization Tips

1. **Cache Results**: Store dossiers and research results in local state
2. **Debounce User Input**: Wait for user to finish typing before calling AI
3. **Batch Operations**: Generate multiple ice breakers at once
4. **Use Custom Sources**: Provide known sources to reduce research time

```typescript
// Example: Cache dossier to avoid regeneration
function WorkspaceView() {
  const ai = useWorkspaceAI()
  const [cachedDossier, setCachedDossier] = useState<Dossier | null>(null)

  const generateOrUseCached = async (guestName: string) => {
    if (cachedDossier?.guestName === guestName) {
      return cachedDossier // Reuse cached
    }

    const dossier = await ai.generateDossier(guestName)
    setCachedDossier(dossier)
    return dossier
  }
}
```

---

## Error Handling

### Automatic Retry Logic
The underlying `GeminiClient` implements automatic retry with exponential backoff:

- **Rate Limit (429)**: Retries with exponential backoff (1s, 2s, 4s)
- **Server Error (500)**: Retries with fixed 1s delay
- **Other Errors**: Fails immediately

### Error Types
```typescript
interface GeminiError extends Error {
  code: 'UNAUTHORIZED' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'NETWORK_ERROR'
  statusCode?: number
}
```

### Error Handling Example
```typescript
function SafeAIOperation() {
  const ai = useWorkspaceAI()

  const handleOperation = async () => {
    try {
      const result = await ai.deepResearch('Query')

      // Check for semantic errors
      if (!result.success) {
        console.error('Operation failed:', result.error)
        return
      }

      // Process successful result
      console.log(result)

    } catch (error) {
      // Network/auth errors caught here
      if (error instanceof GeminiError) {
        switch (error.code) {
          case 'UNAUTHORIZED':
            console.error('User not logged in')
            break
          case 'RATE_LIMITED':
            console.error('Too many requests, try again later')
            break
          case 'SERVER_ERROR':
            console.error('Server error, retrying...')
            break
          default:
            console.error('Network error:', error.message)
        }
      }
    } finally {
      // Clear error state if needed
      ai.clearError()
    }
  }
}
```

---

## Security Best Practices

### ✅ DO:
- Use `GeminiClient.getInstance()` for all Gemini calls
- Keep API keys in Supabase Edge Function secrets
- Validate user authentication before AI operations
- Log operations for auditing

### ❌ DO NOT:
- Instantiate `GoogleGenAI` directly in frontend
- Store API keys in `.env` files committed to git
- Skip authentication checks
- Expose raw API responses to users

### Secure Pattern:
```typescript
// ✅ CORRECT: Use GeminiClient → Edge Functions
const gemini = GeminiClient.getInstance()
const result = await gemini.call({
  action: 'deep_research',
  payload: { query }
})

// ❌ WRONG: Direct API call (exposes key)
const genAI = new GoogleGenAI(VITE_GEMINI_API_KEY)
const result = await genAI.generateContent(prompt)
```

---

## Testing Guidelines

### Unit Testing
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useWorkspaceAI } from './useWorkspaceAI'

describe('useWorkspaceAI', () => {
  it('should generate dossier', async () => {
    const { result } = renderHook(() => useWorkspaceAI())

    // Check initial state
    expect(result.current.isGeneratingDossier).toBe(false)

    // Call operation
    const promise = result.current.generateDossier('Elon Musk')

    // Check loading state
    await waitFor(() => {
      expect(result.current.isGeneratingDossier).toBe(true)
    })

    // Wait for completion
    const dossier = await promise

    expect(dossier.guestName).toBe('Elon Musk')
    expect(result.current.isGeneratingDossier).toBe(false)
  })
})
```

### Mocking for Tests
```typescript
// Mock GeminiClient for testing
jest.mock('@/lib/gemini', () => ({
  GeminiClient: {
    getInstance: () => ({
      call: jest.fn().mockResolvedValue({
        result: {
          guestName: 'Test Guest',
          biography: 'Test bio',
          controversies: [],
          suggestedTopics: [],
          iceBreakers: []
        }
      })
    })
  }
}))
```

---

## Rollout Plan

### Wave 4 (Current - Infrastructure)
- ✅ Create `useWorkspaceAI` hook
- ✅ Fix security vulnerability in `geminiDeepResearch.ts`
- ✅ Maintain backward compatibility
- ✅ Document migration paths

### Wave 5 (Component Migration)
- Update all component imports to use `useWorkspaceAI`
- Remove deprecated `geminiDeepResearch.ts`
- Integrate Gemini Live into `useWorkspaceAI`
- Remove `useGeminiLive` (after Live integration)

### Wave 6 (Cleanup)
- Remove all backward compatibility shims
- Finalize API surface
- Performance optimization
- Production readiness

---

## Support & Questions

If you encounter issues during migration:

1. Check this guide for common patterns
2. Review the TypeScript types in `useWorkspaceAI.ts`
3. Check console for deprecation warnings
4. Test with mock data before production

**Remember:** All existing code continues to work (now securely). Migration is recommended but not required immediately.
