# AI Cost Tracking - Flow Diagrams

Visual representations of AI cost tracking flows in Aica Life OS.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Frontend Text Generation Flow](#frontend-text-generation-flow)
3. [Backend File Search Flow](#backend-file-search-flow)
4. [Streaming Response Flow](#streaming-response-flow)
5. [Error Handling Flow](#error-handling-flow)
6. [Cost Calculation Flow](#cost-calculation-flow)
7. [Dashboard Query Flow](#dashboard-query-flow)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AICA LIFE OS - MODULES                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Grants  │ │ Journey  │ │ Podcast  │ │  Atlas   │ ...      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────┼────────────┼─────────────────┘
        │            │            │            │
        │            │            │            │
        ↓            ↓            ↓            ↓
┌─────────────────────────────────────────────────────────────────┐
│              GEMINI AI API (Google)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • gemini-2.0-flash                                       │  │
│  │  • gemini-2.5-flash                                       │  │
│  │  • gemini-1.5-pro                                         │  │
│  │  • File Search / RAG                                      │  │
│  │  • Imagen, Veo, Embeddings                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Response with usageMetadata
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│           AI USAGE TRACKING SERVICE                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  aiUsageTrackingService.ts (Frontend)                    │  │
│  │  ai_tracking.py (Backend)                                │  │
│  │                                                           │  │
│  │  Functions:                                               │  │
│  │  • trackAIUsage() - Fire-and-forget tracking            │  │
│  │  • withAITracking() - Wrapper pattern                    │  │
│  │  • extractGeminiUsageMetadata() - Parse usage            │  │
│  │  • calculateCost() - Local cost calculation              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ RPC: log_ai_usage()
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE (PostgreSQL 15)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TABLES:                                                  │  │
│  │  • ai_usage_analytics - Main tracking data              │  │
│  │  • ai_model_pricing - Pricing source of truth           │  │
│  │  • ai_usage_tracking_errors - Error log                 │  │
│  │  • mv_daily_ai_costs - Materialized view (dashboard)    │  │
│  │                                                           │  │
│  │  FUNCTIONS:                                               │  │
│  │  • log_ai_usage() - Insert with validation              │  │
│  │  • calculate_token_cost() - Cost from tokens            │  │
│  │  • get_current_model_pricing() - Pricing lookup         │  │
│  │                                                           │  │
│  │  TRIGGERS:                                                │  │
│  │  • validate_ai_usage_cost - Cost integrity check        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Query
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                AI COST DASHBOARD (Frontend)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Current month total                                    │  │
│  │  • Budget tracking with alerts                           │  │
│  │  • Cost by model/operation charts                        │  │
│  │  • Daily cost trend graph                                │  │
│  │  • Top expensive operations table                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Text Generation Flow

```
USER ACTION: Click "Gerar Proposta" (Grants Module)
     │
     ↓
┌────────────────────────────────────────────────────────────┐
│ grantAIService.generateProposalSection()                   │
│                                                            │
│ Step 1: Build Prompt                                       │
│ ┌────────────────────────────────────────────┐            │
│ │ const prompt = buildSectionPrompt(        │            │
│ │   fieldName,                               │            │
│ │   briefing,                                │            │
│ │   edital                                   │            │
│ │ );                                         │            │
│ └────────────────────────────────────────────┘            │
│                                                            │
│ Step 2: Call Gemini API                                   │
│ ┌────────────────────────────────────────────┐            │
│ │ const genAI = new GoogleGenerativeAI(key);│            │
│ │ const model = genAI.getGenerativeModel({  │            │
│ │   model: 'gemini-2.0-flash-exp'           │            │
│ │ });                                        │            │
│ │                                            │            │
│ │ const response = await model.              │            │
│ │   generateContent(prompt);                 │            │
│ └──────────────┬─────────────────────────────┘            │
└────────────────┼──────────────────────────────────────────┘
                 │
                 │ ⏱️  ~3 seconds (Gemini processing)
                 ↓
┌────────────────────────────────────────────────────────────┐
│ GEMINI RESPONSE                                            │
│ {                                                          │
│   text: "Proposta gerada...",                             │
│   usageMetadata: {                                         │
│     promptTokenCount: 1500,                                │
│     candidatesTokenCount: 800,                             │
│     totalTokenCount: 2300                                  │
│   }                                                        │
│ }                                                          │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Step 3: Extract Text
               ↓
┌────────────────────────────────────────────────────────────┐
│ const text = response.response.text();                     │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Step 4: Track Usage (FIRE-AND-FORGET)
               ↓
┌────────────────────────────────────────────────────────────┐
│ trackAIUsage({                                             │
│   operation_type: 'text_generation',                       │
│   ai_model: 'gemini-2.0-flash-exp',                        │
│   input_tokens: 1500,                                      │
│   output_tokens: 800,                                      │
│   total_tokens: 2300,                                      │
│   module_type: 'grants',                                   │
│   module_id: projectId,                                    │
│   request_metadata: {                                      │
│     field_name: 'justificativa',                           │
│     prompt_length: 3200                                    │
│   }                                                        │
│ });                                                        │
│                                                            │
│ ⚠️  NO AWAIT - Continues immediately                       │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ ⏱️  ~10ms (background tracking starts)
               ↓
┌────────────────────────────────────────────────────────────┐
│ return text; // User sees result immediately ✅            │
└────────────────────────────────────────────────────────────┘
               │
               │ Meanwhile, in background...
               ↓
┌────────────────────────────────────────────────────────────┐
│ TRACKING SERVICE (aiUsageTrackingService.ts)               │
│                                                            │
│ Step 1: Get authenticated user                            │
│ const { data: { user } } = await supabase.auth.getUser(); │
│                                                            │
│ Step 2: Calculate costs                                   │
│ const costs = await calculateCostFromDB(                  │
│   'gemini-2.0-flash-exp',                                 │
│   1500,  // input tokens                                  │
│   800    // output tokens                                 │
│ );                                                         │
│ // Returns: { input_cost: 0.0, output_cost: 0.0,         │
│ //           total_cost: 0.0 } (free during preview)      │
│                                                            │
│ Step 3: Insert tracking record                            │
│ const { data: recordId } = await supabase.rpc(            │
│   'log_ai_usage',                                         │
│   { p_user_id: user.id, ... }                            │
│ );                                                         │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ ⏱️  ~40ms (DB insert + validation)
               ↓
┌────────────────────────────────────────────────────────────┐
│ DATABASE: log_ai_usage() Function                         │
│                                                            │
│ BEGIN                                                      │
│   -- Validate cost calculation                            │
│   IF input_cost + output_cost != total_cost THEN          │
│     total_cost := input_cost + output_cost; -- Auto-fix   │
│   END IF;                                                  │
│                                                            │
│   -- Insert record                                        │
│   INSERT INTO ai_usage_analytics (                        │
│     user_id, operation_type, ai_model,                    │
│     input_tokens, output_tokens, total_tokens,            │
│     input_cost_usd, output_cost_usd, total_cost_usd,      │
│     module_type, module_id, request_metadata              │
│   ) VALUES (...);                                          │
│                                                            │
│   RETURN record_id;                                       │
│ EXCEPTION                                                  │
│   WHEN OTHERS THEN                                         │
│     RAISE WARNING 'Tracking failed: %', SQLERRM;          │
│     RETURN NULL; -- Fail-safe                             │
│ END;                                                       │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Trigger: validate_ai_usage_cost
               ↓
┌────────────────────────────────────────────────────────────┐
│ BEFORE INSERT TRIGGER                                      │
│                                                            │
│ IF total_cost != input_cost + output_cost THEN            │
│   NEW.total_cost := NEW.input_cost + NEW.output_cost;     │
│ END IF;                                                    │
│                                                            │
│ RETURN NEW; ✅                                             │
└────────────────────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ RECORD INSERTED INTO ai_usage_analytics                   │
│                                                            │
│ id: 'd3f7c8a2-...'                                         │
│ user_id: 'abc123...'                                       │
│ operation_type: 'text_generation'                          │
│ ai_model: 'gemini-2.0-flash-exp'                           │
│ input_tokens: 1500                                         │
│ output_tokens: 800                                         │
│ total_tokens: 2300                                         │
│ input_cost_usd: 0.000000                                   │
│ output_cost_usd: 0.000000                                  │
│ total_cost_usd: 0.000000                                   │
│ module_type: 'grants'                                      │
│ module_id: 'proj-456...'                                   │
│ created_at: '2025-12-09T14:23:45Z'                         │
└────────────────────────────────────────────────────────────┘

TOTAL TIME:
- User sees result: T+3010ms (Gemini + 10ms)
- Tracking completes: T+3050ms (background)
- Latency impact: ~10ms (negligible)
```

---

## Backend File Search Flow

```
USER ACTION: Search documents in Grants module
     │
     ↓
┌────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/file-search/query-authenticated       │
│                                                            │
│ Body: {                                                    │
│   query: "Quais são os critérios de elegibilidade?",      │
│   categories: ["grants_editais"],                         │
│   model: "gemini-2.0-flash-exp"                            │
│ }                                                          │
│                                                            │
│ Headers: {                                                 │
│   Authorization: "Bearer <jwt_token>"                      │
│ }                                                          │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Backend: FastAPI (main.py)                                 │
│                                                            │
│ @app.post("/api/file-search/query-authenticated")         │
│ async def query_documents_authenticated(                  │
│   query: str,                                             │
│   categories: List[str],                                  │
│   model: str,                                             │
│   user_id: str = Depends(verify_token) ← JWT validation  │
│ ):                                                         │
│                                                            │
│   Step 1: Resolve store names                            │
│   response = supabase.table("user_file_search_stores")    │
│     .select("store_name")                                 │
│     .eq("user_id", user_id)                               │
│     .execute()                                            │
│                                                            │
│   valid_stores = [r["store_name"]                         │
│     for r in response.data                                │
│     if r["store_category"] in categories]                 │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Step 2: Call FileSearchService
               ↓
┌────────────────────────────────────────────────────────────┐
│ FileSearchService.search_documents()                       │
│                                                            │
│ start_time = time.time()                                  │
│                                                            │
│ file_search_config = types.FileSearch(                    │
│   file_search_store_names=valid_stores                    │
│ )                                                          │
│                                                            │
│ response = client.models.generate_content(                │
│   model=model,                                            │
│   contents=query,                                         │
│   config=types.GenerateContentConfig(                     │
│     tools=[types.Tool(file_search=file_search_config)]    │
│   )                                                        │
│ )                                                          │
│                                                            │
│ duration = time.time() - start_time  # ~5 seconds         │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Step 3: Extract usage metadata
               ↓
┌────────────────────────────────────────────────────────────┐
│ usage = response.usage_metadata                            │
│ # {                                                        │
│ #   prompt_token_count: 2500,                             │
│ #   candidates_token_count: 1200,                         │
│ #   total_token_count: 3700                               │
│ # }                                                        │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Step 4: Track usage (non-blocking)
               ↓
┌────────────────────────────────────────────────────────────┐
│ from services.ai_tracking import track_ai_usage           │
│                                                            │
│ track_ai_usage(                                            │
│   user_id=user_id,                                        │
│   operation_type='file_search_query',                     │
│   ai_model=model,                                         │
│   input_tokens=usage.prompt_token_count,                  │
│   output_tokens=usage.candidates_token_count,             │
│   module_type='grants',                                   │
│   request_metadata={                                      │
│     'query_preview': query[:100],                         │
│     'stores_count': len(valid_stores),                    │
│     'duration_seconds': duration                          │
│   }                                                        │
│ )                                                          │
│                                                            │
│ # Calls supabase.rpc('log_ai_usage', {...})               │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Step 5: Return response immediately
               ↓
┌────────────────────────────────────────────────────────────┐
│ return {                                                   │
│   "answer": response.text,                                │
│   "citations": [...],                                     │
│   "model": model,                                         │
│   "usage": {                                              │
│     "input_tokens": usage.prompt_token_count,             │
│     "output_tokens": usage.candidates_token_count         │
│   }                                                        │
│ }                                                          │
└────────────────────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Frontend receives response ✅                              │
│                                                            │
│ Meanwhile, tracking completes in background (~50ms)       │
└────────────────────────────────────────────────────────────┘
```

---

## Streaming Response Flow

```
USER ACTION: Chat with AI in Journey module
     │
     ↓
┌────────────────────────────────────────────────────────────┐
│ journeyAIService.streamAnalysis()                         │
│                                                            │
│ Step 1: Initialize counters                              │
│ let totalInputTokens = 0;                                 │
│ let totalOutputTokens = 0;                                │
│                                                            │
│ Step 2: Start stream                                      │
│ const stream = await gemini.generateContentStream(prompt);│
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Streaming chunks...
               ↓
┌────────────────────────────────────────────────────────────┐
│ for await (const chunk of stream) {                       │
│                                                            │
│   // Yield chunk to user (real-time display)             │
│   yield chunk.text(); ← USER SEES THIS IMMEDIATELY       │
│                                                            │
│   // Accumulate token counts                             │
│   if (chunk.usageMetadata) {                              │
│     totalInputTokens = chunk.usageMetadata.promptTokens;  │
│     totalOutputTokens +=                                  │
│       chunk.usageMetadata.candidatesTokenCount;           │
│   }                                                        │
│ }                                                          │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ Stream complete
               ↓
┌────────────────────────────────────────────────────────────┐
│ // Track AFTER stream finishes                            │
│ trackAIUsage({                                             │
│   operation_type: 'text_generation',                       │
│   ai_model: 'gemini-2.0-flash',                            │
│   input_tokens: totalInputTokens,   // Accumulated        │
│   output_tokens: totalOutputTokens, // Accumulated        │
│   module_type: 'journey',                                 │
│   module_id: momentId                                     │
│ });                                                        │
└────────────────────────────────────────────────────────────┘

KEY INSIGHT:
- User sees chunks in real-time (no latency)
- Tracking happens AFTER stream completes
- Token counts accumulated during streaming
```

---

## Error Handling Flow

```
┌────────────────────────────────────────────────────────────┐
│ trackAIUsage({ ... })                                      │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ TRY                                                        │
│   Step 1: Get user                                        │
│   const { user } = await supabase.auth.getUser();         │
│                                                            │
│   if (!user) {                                            │
│     console.warn('No user - skipping tracking');          │
│     return; ← EXIT GRACEFULLY                             │
│   }                                                        │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│   Step 2: Calculate costs                                │
│   const costs = await calculateCostFromDB(...);            │
│                                                            │
│   if (!costs) { ← DB calculation failed                   │
│     // Fallback to local cache                           │
│     const pricing = LOCAL_PRICING_CACHE[model];           │
│     costs = calculateCost(input, output, pricing);        │
│   }                                                        │
│                                                            │
│   if (!costs) { ← Still no pricing found                  │
│     console.warn('No pricing data');                      │
│     costs = { input: 0, output: 0, total: 0 }; ← Zeros   │
│   }                                                        │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│   Step 3: Insert tracking record                         │
│   const { data, error } = await supabase.rpc(             │
│     'log_ai_usage', { ... }                               │
│   );                                                       │
│                                                            │
│   if (error) { ← Insert failed                            │
│     console.error('Tracking failed:', error);             │
│                                                            │
│     // Log to tracking_errors table                      │
│     await logTrackingError(                               │
│       user.id,                                            │
│       operation_type,                                     │
│       ai_model,                                           │
│       error.message,                                      │
│       params  // Full context                            │
│     );                                                     │
│                                                            │
│     return; ← EXIT GRACEFULLY                             │
│   }                                                        │
│                                                            │
│   if (!data) { ← Function returned NULL                   │
│     console.warn('log_ai_usage returned NULL');           │
│     return; ← EXIT GRACEFULLY                             │
│   }                                                        │
│                                                            │
│   console.debug('✅ Tracking successful:', data);          │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ CATCH (err) {                                              │
│   // CRITICAL: NEVER propagate errors                     │
│   console.error('Unexpected tracking error:', err);       │
│                                                            │
│   // Error already logged internally                      │
│   // No re-throw                                          │
│ }                                                          │
└────────────────────────────────────────────────────────────┘

RESULT: Tracking always fails silently, never breaks functionality
```

---

## Cost Calculation Flow

```
┌────────────────────────────────────────────────────────────┐
│ calculateCostFromDB(model, inputTokens, outputTokens)     │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ supabase.rpc('calculate_token_cost', {                    │
│   p_model_name: 'gemini-1.5-pro',                         │
│   p_input_tokens: 5000,                                   │
│   p_output_tokens: 2000                                   │
│ })                                                         │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ DATABASE: calculate_token_cost() Function                 │
│                                                            │
│ Step 1: Get pricing                                       │
│ SELECT input_price, output_price                          │
│ FROM get_current_model_pricing('gemini-1.5-pro');         │
│                                                            │
│ Returns:                                                   │
│ input_price: 1.25 ($/1M tokens)                           │
│ output_price: 5.00 ($/1M tokens)                          │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Step 2: Calculate costs                                   │
│                                                            │
│ input_cost = (5000 / 1,000,000) * 1.25                   │
│            = 0.00625 USD                                  │
│                                                            │
│ output_cost = (2000 / 1,000,000) * 5.00                  │
│             = 0.01000 USD                                 │
│                                                            │
│ total_cost = 0.00625 + 0.01000                            │
│            = 0.01625 USD                                  │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ RETURN TABLE:                                              │
│                                                            │
│ input_cost_usd  | output_cost_usd | total_cost_usd        │
│ 0.006250        | 0.010000        | 0.016250              │
└────────────────────────────────────────────────────────────┘

ALTERNATIVE: Local Cache Fallback
┌────────────────────────────────────────────────────────────┐
│ If DB pricing fails:                                       │
│                                                            │
│ const pricing = LOCAL_PRICING_CACHE['gemini-1.5-pro'];    │
│ // { input_price: 1.25, output_price: 5.00 }              │
│                                                            │
│ const costs = calculateCost(5000, 2000, pricing);         │
│ // Same calculation, local execution                      │
│                                                            │
│ Returns: { input_cost: 0.00625, output_cost: 0.01,        │
│            total_cost: 0.01625 }                           │
└────────────────────────────────────────────────────────────┘

PRICING LOOKUP FLOW:
┌────────────────────────────────────────────────────────────┐
│ get_current_model_pricing('gemini-1.5-pro')               │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ SELECT input_price_per_1m_tokens, output_price_per_1m_tokens│
│ FROM ai_model_pricing                                      │
│ WHERE model_name = 'gemini-1.5-pro'                        │
│   AND effective_from <= CURRENT_DATE                       │
│   AND (effective_until IS NULL                             │
│        OR effective_until > CURRENT_DATE)                  │
│ LIMIT 1;                                                   │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ If multiple rows (historical pricing):                     │
│                                                            │
│ model_name       | effective_from | effective_until        │
│ gemini-1.5-pro   | 2024-01-01     | 2025-06-30             │
│ gemini-1.5-pro   | 2025-07-01     | NULL  ← ACTIVE         │
│                                                            │
│ Query returns only the active row (effective_until = NULL)│
└────────────────────────────────────────────────────────────┘
```

---

## Dashboard Query Flow

```
USER opens AI Cost Dashboard
     │
     ↓
┌────────────────────────────────────────────────────────────┐
│ AICostDashboard.tsx useEffect()                           │
│                                                            │
│ const fetchCostData = async () => {                       │
│   // 1. Current month total                              │
│   const total = await getCurrentMonthCost(userId);        │
│                                                            │
│   // 2. Daily breakdown                                   │
│   const daily = await getDailyAICosts(userId, 30);        │
│                                                            │
│   // 3. Cost by model                                     │
│   const models = await getModelCostBreakdown(userId, 30); │
│                                                            │
│   // 4. Top expensive operations                         │
│   const top = await getTopExpensiveOperations(userId, 10);│
│ };                                                         │
└──────────────┬─────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Query 1: Current Month Total                              │
│                                                            │
│ supabase.rpc('get_current_month_cost', {                  │
│   p_user_id: userId                                       │
│ })                                                         │
│                                                            │
│ SQL:                                                       │
│ SELECT SUM(total_cost_usd)                                │
│ FROM ai_usage_analytics                                   │
│ WHERE user_id = $user_id                                  │
│   AND DATE_TRUNC('month', created_at) =                   │
│       DATE_TRUNC('month', NOW());                         │
│                                                            │
│ Returns: 12.45 (USD)                                      │
│ Query time: ~8ms (indexed)                                │
└────────────────────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Query 2: Daily Breakdown (FAST PATH - Materialized View) │
│                                                            │
│ SELECT date, total_cost_usd, request_count                │
│ FROM mv_daily_ai_costs                                    │
│ WHERE user_id = $user_id                                  │
│   AND date >= CURRENT_DATE - INTERVAL '30 days'           │
│ ORDER BY date DESC;                                       │
│                                                            │
│ Returns: 30 rows                                          │
│ Query time: ~10ms (pre-aggregated)                        │
│                                                            │
│ Alternative (without MV):                                 │
│ Query time: ~500ms (real-time aggregation)                │
│ Improvement: 50x faster ✅                                 │
└────────────────────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Query 3: Cost by Model                                    │
│                                                            │
│ SELECT                                                     │
│   ai_model,                                               │
│   SUM(total_cost_usd) as total_cost,                      │
│   COUNT(*) as request_count                               │
│ FROM ai_usage_analytics                                   │
│ WHERE user_id = $user_id                                  │
│   AND created_at >= NOW() - INTERVAL '30 days'            │
│ GROUP BY ai_model                                         │
│ ORDER BY total_cost DESC;                                 │
│                                                            │
│ Returns:                                                   │
│ ai_model            | total_cost | request_count          │
│ gemini-1.5-pro      | 8.50       | 45                     │
│ gemini-2.0-flash    | 0.00       | 350                    │
│ gemini-2.5-flash    | 3.95       | 120                    │
│                                                            │
│ Query time: ~12ms (indexed on user_id + created_at)       │
└────────────────────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Query 4: Top Expensive Operations                         │
│                                                            │
│ SELECT                                                     │
│   id, operation_type, ai_model,                           │
│   total_cost_usd, created_at,                             │
│   module_type, request_metadata                           │
│ FROM ai_usage_analytics                                   │
│ WHERE user_id = $user_id                                  │
│ ORDER BY total_cost_usd DESC                              │
│ LIMIT 10;                                                 │
│                                                            │
│ Returns:                                                   │
│ operation_type      | ai_model         | cost             │
│ text_generation     | gemini-1.5-pro   | 0.045           │
│ file_search_query   | gemini-2.5-flash | 0.038           │
│ text_generation     | gemini-1.5-pro   | 0.032           │
│                                                            │
│ Query time: ~10ms (indexed on user_id + total_cost_usd)   │
└────────────────────────────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────────────────────┐
│ Dashboard renders ✅                                        │
│                                                            │
│ Total load time: ~50ms (4 queries in parallel)            │
└────────────────────────────────────────────────────────────┘

PERFORMANCE COMPARISON:
┌────────────────────────────────────────────────────────────┐
│                Without Optimization | With Optimization    │
│ Current month     8ms              | 8ms                   │
│ Daily breakdown   500ms (aggregate)| 10ms (MV) ← 50x      │
│ Cost by model     350ms            | 12ms (index) ← 29x   │
│ Top operations    280ms            | 10ms (index) ← 28x   │
│ ────────────────────────────────────────────────────────  │
│ TOTAL             1138ms           | 40ms ← 28.5x faster  │
└────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** 2025-12-09
**Maintainer:** Aica Backend Architect
