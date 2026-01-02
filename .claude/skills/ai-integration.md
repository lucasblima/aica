# AI Integration Skill

Skill para integração com APIs de Inteligência Artificial, incluindo Google Gemini, ElevenLabs, e padrões de prompt engineering.

---

## Quando Usar Esta Skill

Use quando precisar:
- Integrar Google Gemini para geração de texto
- Implementar text-to-speech com ElevenLabs
- Criar prompts efetivos
- Gerenciar streaming de respostas
- Otimizar custos de API

---

## Google Gemini Integration

### Setup Inicial

```typescript
// src/lib/gemini/client.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Modelos disponíveis
export const MODELS = {
  FLASH: 'gemini-1.5-flash',      // Rápido, barato
  PRO: 'gemini-1.5-pro',          // Mais capaz, mais caro
  FLASH_8B: 'gemini-1.5-flash-8b', // Mais rápido ainda
} as const;

export function getModel(modelId: keyof typeof MODELS = 'FLASH') {
  return genAI.getGenerativeModel({ model: MODELS[modelId] });
}
```

### Geração Simples

```typescript
// src/lib/gemini/generate.ts

import { getModel } from './client';

export async function generateText(prompt: string): Promise<string> {
  const model = getModel('FLASH');

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('[Gemini] Generation error:', error);
    throw error;
  }
}
```

### Streaming Responses

```typescript
// src/lib/gemini/stream.ts

import { getModel } from './client';

export async function* streamText(prompt: string): AsyncGenerator<string> {
  const model = getModel('FLASH');

  try {
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error('[Gemini] Streaming error:', error);
    throw error;
  }
}

// Uso em componente React
function StreamingComponent() {
  const [text, setText] = useState('');

  const handleGenerate = async () => {
    setText('');
    for await (const chunk of streamText('Escreva uma história...')) {
      setText(prev => prev + chunk);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate}>Gerar</button>
      <p>{text}</p>
    </div>
  );
}
```

### Chat Conversations

```typescript
// src/lib/gemini/chat.ts

import { getModel } from './client';
import type { Content } from '@google/generative-ai';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export class GeminiChat {
  private history: Content[] = [];
  private model = getModel('FLASH');

  async sendMessage(message: string): Promise<string> {
    const chat = this.model.startChat({
      history: this.history,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    // Atualizar histórico
    this.history.push(
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: response }] }
    );

    return response;
  }

  clearHistory() {
    this.history = [];
  }

  getHistory(): ChatMessage[] {
    return this.history.map(item => ({
      role: item.role as 'user' | 'model',
      content: item.parts[0].text,
    }));
  }
}
```

### System Instructions

```typescript
// src/lib/gemini/agents.ts

import { getModel } from './client';

interface AgentConfig {
  systemInstruction: string;
  temperature?: number;
  maxTokens?: number;
}

export function createAgent(config: AgentConfig) {
  const model = getModel('PRO');

  return model.startChat({
    history: [],
    systemInstruction: config.systemInstruction,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 2000,
    },
  });
}

// Exemplo: Agente de Sugestões para Podcast
export const podcastSuggestionsAgent = createAgent({
  systemInstruction: `
    Você é um assistente especializado em criação de conteúdo para podcasts.
    Seu papel é sugerir tópicos, estruturas de episódios e perguntas para entrevistas.

    Diretrizes:
    - Seja criativo mas relevante
    - Considere o público-alvo
    - Sugira tópicos com potencial de engajamento
    - Forneça estruturas práticas e acionáveis

    Formato de resposta:
    - Use markdown para formatação
    - Organize em seções claras
    - Inclua exemplos quando apropriado
  `,
  temperature: 0.8,
});
```

---

## Prompt Engineering

### Estrutura de Prompts

```typescript
// src/lib/gemini/prompts/templates.ts

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
}

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  PODCAST_TOPICS: {
    name: 'Sugestão de Tópicos',
    template: `
Contexto: Podcast sobre {{theme}}
Público-alvo: {{audience}}
Episódios anteriores: {{previousTopics}}

Tarefa: Sugira 5 tópicos para próximos episódios.

Para cada tópico, forneça:
1. Título atrativo
2. Descrição breve (2-3 linhas)
3. 3 pontos-chave a abordar
4. Potencial convidado (tipo de especialista)

Formato: JSON
{
  "topics": [
    {
      "title": "",
      "description": "",
      "keyPoints": [],
      "guestType": ""
    }
  ]
}
    `,
    variables: ['theme', 'audience', 'previousTopics'],
  },

  EPISODE_OUTLINE: {
    name: 'Estrutura de Episódio',
    template: `
Tópico: {{topic}}
Duração alvo: {{duration}} minutos
Formato: {{format}}

Crie uma estrutura detalhada para este episódio de podcast.

Inclua:
- Introdução com gancho
- Segmentos principais
- Transições
- Conclusão com call-to-action
- Timestamps sugeridos
    `,
    variables: ['topic', 'duration', 'format'],
  },
};

export function fillTemplate(
  templateId: string,
  values: Record<string, string>
): string {
  const template = PROMPT_TEMPLATES[templateId];
  if (!template) throw new Error(`Template ${templateId} not found`);

  let result = template.template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return result;
}
```

### Técnicas de Prompting

```markdown
## 1. Few-Shot Prompting

```typescript
const fewShotPrompt = `
Classifique o sentimento do texto.

Exemplos:
Texto: "Adorei o novo recurso!"
Sentimento: positivo

Texto: "Está tudo quebrado"
Sentimento: negativo

Texto: "O recurso funciona"
Sentimento: neutro

Texto: "${userInput}"
Sentimento:
`;
```

## 2. Chain of Thought

```typescript
const cotPrompt = `
Analise esta decisão de negócio passo a passo.

Decisão: ${decision}

Passos da análise:
1. Primeiro, identifique os stakeholders envolvidos
2. Em seguida, liste os prós
3. Depois, liste os contras
4. Considere riscos potenciais
5. Finalmente, dê sua recomendação

Comece sua análise:
`;
```

## 3. Role Prompting

```typescript
const rolePrompt = `
Você é um experiente produtor de podcasts com 15 anos de experiência
em entrevistas com CEOs de startups de tecnologia.

Como esse produtor experiente, analise o seguinte tópico e sugira
a melhor abordagem para uma entrevista:

Tópico: ${topic}
`;
```
```

### Structured Output (JSON)

```typescript
// src/lib/gemini/structured.ts

import { getModel } from './client';

export async function generateStructured<T>(
  prompt: string,
  schema: object
): Promise<T> {
  const model = getModel('FLASH');

  const structuredPrompt = `
${prompt}

IMPORTANTE: Responda APENAS com JSON válido seguindo este schema:
${JSON.stringify(schema, null, 2)}

Não inclua markdown, explicações ou texto adicional.
Apenas o JSON.
`;

  const result = await model.generateContent(structuredPrompt);
  const text = result.response.text();

  // Limpar possíveis marcadores de código
  const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

  try {
    return JSON.parse(cleanJson) as T;
  } catch (error) {
    console.error('[Gemini] JSON parse error:', text);
    throw new Error('Failed to parse structured response');
  }
}

// Uso
interface TopicSuggestion {
  title: string;
  description: string;
  tags: string[];
}

const suggestions = await generateStructured<{ topics: TopicSuggestion[] }>(
  'Sugira 3 tópicos para podcast de tecnologia',
  {
    topics: [{
      title: 'string',
      description: 'string',
      tags: ['string'],
    }],
  }
);
```

---

## ElevenLabs Integration

### Setup

```typescript
// src/services/elevenLabsService.ts

const ELEVEN_LABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

interface TextToSpeechOptions {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}
```

### Listar Vozes

```typescript
export async function getVoices(): Promise<Voice[]> {
  const response = await fetch(`${BASE_URL}/voices`, {
    headers: {
      'xi-api-key': ELEVEN_LABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const data = await response.json();
  return data.voices;
}
```

### Text-to-Speech

```typescript
export async function textToSpeech(options: TextToSpeechOptions): Promise<Blob> {
  const {
    text,
    voiceId,
    modelId = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  const response = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS error: ${response.status}`);
  }

  return response.blob();
}
```

### Streaming Audio

```typescript
export async function streamTextToSpeech(
  options: TextToSpeechOptions
): Promise<ReadableStream<Uint8Array>> {
  const { text, voiceId, modelId = 'eleven_multilingual_v2' } = options;

  const response = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs streaming error: ${response.status}`);
  }

  return response.body!;
}
```

### Audio Player Component

```typescript
// src/components/AudioPlayer.tsx

import { useState, useRef } from 'react';
import { textToSpeech } from '../services/elevenLabsService';

interface AudioPlayerProps {
  text: string;
  voiceId: string;
}

export function AudioPlayer({ text, voiceId }: AudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const blob = await textToSpeech({ text, voiceId });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Auto-play
      if (audioRef.current) {
        audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="px-4 py-2 bg-ceramic-accent text-white rounded-lg"
      >
        {isLoading ? 'Gerando...' : 'Ouvir'}
      </button>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} controls />
      )}
    </div>
  );
}
```

---

## Rate Limiting & Caching

### Rate Limiter

```typescript
// src/lib/rateLimiter.ts

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async acquire(): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Limpar requests antigas
    this.requests = this.requests.filter(time => time > windowStart);

    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getTimeUntilNext(): number {
    if (this.requests.length === 0) return 0;

    const oldestRequest = this.requests[0];
    const availableAt = oldestRequest + this.config.windowMs;
    return Math.max(0, availableAt - Date.now());
  }
}

// Instâncias por serviço
export const geminiLimiter = new RateLimiter({
  maxRequests: 60,    // 60 requests
  windowMs: 60000,    // por minuto
});

export const elevenLabsLimiter = new RateLimiter({
  maxRequests: 100,   // Verificar tier da conta
  windowMs: 60000,
});
```

### Response Cache

```typescript
// src/lib/cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  private generateKey(prompt: string, options?: object): string {
    return JSON.stringify({ prompt, options });
  }

  get(prompt: string, options?: object): T | null {
    const key = this.generateKey(prompt, options);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(prompt: string, data: T, options?: object): void {
    const key = this.generateKey(prompt, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const geminiCache = new ResponseCache<string>(5 * 60 * 1000);
```

### Wrapper com Rate Limit + Cache

```typescript
// src/lib/gemini/safeGenerate.ts

import { generateText } from './generate';
import { geminiLimiter } from '../rateLimiter';
import { geminiCache } from '../cache';

export async function safeGenerateText(
  prompt: string,
  options?: { useCache?: boolean }
): Promise<string> {
  const useCache = options?.useCache ?? true;

  // Check cache
  if (useCache) {
    const cached = geminiCache.get(prompt);
    if (cached) {
      console.log('[Gemini] Cache hit');
      return cached;
    }
  }

  // Check rate limit
  const canProceed = await geminiLimiter.acquire();
  if (!canProceed) {
    const waitTime = geminiLimiter.getTimeUntilNext();
    throw new Error(`Rate limited. Try again in ${waitTime}ms`);
  }

  // Generate
  const result = await generateText(prompt);

  // Cache result
  if (useCache) {
    geminiCache.set(prompt, result);
  }

  return result;
}
```

---

## Cost Tracking

### Token Counter

```typescript
// src/lib/gemini/costs.ts

interface UsageRecord {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

// Preços aproximados (verificar preços atuais)
const PRICES = {
  'gemini-1.5-flash': {
    input: 0.075 / 1_000_000,   // por token
    output: 0.30 / 1_000_000,
  },
  'gemini-1.5-pro': {
    input: 1.25 / 1_000_000,
    output: 5.00 / 1_000_000,
  },
};

class CostTracker {
  private usage: UsageRecord[] = [];

  record(model: string, inputTokens: number, outputTokens: number): void {
    const prices = PRICES[model] || PRICES['gemini-1.5-flash'];
    const cost = (inputTokens * prices.input) + (outputTokens * prices.output);

    this.usage.push({
      timestamp: Date.now(),
      model,
      inputTokens,
      outputTokens,
      cost,
    });
  }

  getTotalCost(since?: Date): number {
    const sinceTimestamp = since?.getTime() || 0;
    return this.usage
      .filter(r => r.timestamp >= sinceTimestamp)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getUsageSummary(since?: Date) {
    const sinceTimestamp = since?.getTime() || 0;
    const filtered = this.usage.filter(r => r.timestamp >= sinceTimestamp);

    return {
      totalRequests: filtered.length,
      totalInputTokens: filtered.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: filtered.reduce((sum, r) => sum + r.outputTokens, 0),
      totalCost: filtered.reduce((sum, r) => sum + r.cost, 0),
    };
  }
}

export const costTracker = new CostTracker();
```

### Integração com Generate

```typescript
// Modificar generateText para tracking
export async function generateTextWithTracking(
  prompt: string,
  model: string = 'gemini-1.5-flash'
): Promise<string> {
  const modelInstance = getModel(model);
  const result = await modelInstance.generateContent(prompt);

  // Extrair contagem de tokens
  const usageMetadata = result.response.usageMetadata;
  if (usageMetadata) {
    costTracker.record(
      model,
      usageMetadata.promptTokenCount,
      usageMetadata.candidatesTokenCount
    );
  }

  return result.response.text();
}
```

---

## Error Handling

### Retry Logic

```typescript
// src/lib/retry.ts

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Não fazer retry em erros definitivos
      if (error.message.includes('API key')) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt),
          config.maxDelayMs
        );
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

### Fallback Strategies

```typescript
// src/lib/gemini/fallback.ts

export async function generateWithFallback(prompt: string): Promise<string> {
  // Tentar modelo principal
  try {
    return await generateText(prompt);
  } catch (error) {
    console.warn('Primary model failed, trying fallback');
  }

  // Fallback para modelo mais simples
  try {
    const fallbackModel = getModel('FLASH_8B');
    const result = await fallbackModel.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Fallback also failed');
  }

  // Resposta default
  return 'Desculpe, não foi possível gerar uma resposta no momento.';
}
```

---

## Links Úteis

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [ElevenLabs API Docs](https://docs.elevenlabs.io)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Anthropic Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering)
