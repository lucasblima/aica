# API Integrations Skill

Skill para integração com APIs externas, incluindo autenticação, rate limiting, error handling e padrões de implementação.

---

## Quando Usar Esta Skill

Use quando precisar:
- Integrar APIs de terceiros
- Implementar autenticação de APIs
- Gerenciar rate limiting e retry
- Processar webhooks
- Fazer upload/download de arquivos

---

## Estrutura de Service

### Template Base

```typescript
// src/services/[nome]Service.ts

interface ServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

class BaseApiService {
  protected baseUrl: string;
  protected apiKey?: string;
  protected defaultTimeout: number;

  constructor(config: ServiceConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.timeout || 30000;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## Autenticação de APIs

### API Key

```typescript
// Header Authorization
headers: {
  'Authorization': `Bearer ${API_KEY}`,
}

// Header customizado
headers: {
  'X-API-Key': API_KEY,
}

// Query parameter
const url = `${baseUrl}?api_key=${API_KEY}`;
```

### OAuth 2.0

```typescript
// src/services/oauth/oauthClient.ts

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scopes: string[];
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

class OAuthClient {
  private config: OAuthConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: this.config.scopes.join(' '),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to obtain access token');
    }

    const data: TokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000 - 60000);

    return this.accessToken;
  }
}
```

### HMAC Signature

```typescript
// src/services/hmacAuth.ts

async function createHmacSignature(
  secret: string,
  payload: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Uso em request
const timestamp = Date.now().toString();
const payload = `${timestamp}.${JSON.stringify(body)}`;
const signature = await createHmacSignature(SECRET, payload);

headers: {
  'X-Signature': signature,
  'X-Timestamp': timestamp,
}
```

---

## Rate Limiting

### Token Bucket

```typescript
// src/lib/rateLimiter/tokenBucket.ts

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(maxTokens: number, refillPerSecond: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  async acquire(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  async waitForToken(tokens: number = 1): Promise<void> {
    while (!(await this.acquire(tokens))) {
      const waitTime = Math.ceil((tokens - this.tokens) / this.refillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Uso
const limiter = new TokenBucket(60, 1); // 60 req/min

async function makeRequest() {
  await limiter.waitForToken();
  return fetch(url);
}
```

### Sliding Window

```typescript
// src/lib/rateLimiter/slidingWindow.ts

class SlidingWindowLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Limpar requests antigas
    this.requests = this.requests.filter(time => time > windowStart);

    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.canMakeRequest()) return 0;

    const oldestRequest = this.requests[0];
    return oldestRequest + this.windowMs - Date.now();
  }
}
```

---

## Retry Logic

### Exponential Backoff

```typescript
// src/lib/retry.ts

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryCondition?: (error: Error) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    retryCondition = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Verificar se deve fazer retry
      if (!retryCondition(lastError)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        // Calcular delay com jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelayMs
        );

        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Condições de retry comuns
const isRetryableError = (error: Error): boolean => {
  if (error instanceof ApiError) {
    // Retry em erros de servidor (5xx) e rate limit (429)
    return error.status >= 500 || error.status === 429;
  }
  // Retry em erros de rede
  return error.name === 'TypeError' || error.message.includes('fetch');
};
```

### Circuit Breaker

```typescript
// src/lib/circuitBreaker.ts

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime?: number;
  private options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

---

## Webhook Handling

### Webhook Receiver

```typescript
// src/services/webhooks/webhookHandler.ts

interface WebhookEvent {
  type: string;
  payload: unknown;
  timestamp: number;
  signature?: string;
}

interface WebhookHandler {
  eventType: string;
  handler: (payload: unknown) => Promise<void>;
}

class WebhookProcessor {
  private handlers: Map<string, WebhookHandler['handler']> = new Map();
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  register(eventType: string, handler: WebhookHandler['handler']): void {
    this.handlers.set(eventType, handler);
  }

  async process(event: WebhookEvent): Promise<void> {
    // Verificar signature
    if (event.signature) {
      const isValid = await this.verifySignature(event);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Buscar handler
    const handler = this.handlers.get(event.type);
    if (!handler) {
      console.warn(`No handler for event type: ${event.type}`);
      return;
    }

    // Processar
    await handler(event.payload);
  }

  private async verifySignature(event: WebhookEvent): Promise<boolean> {
    const payload = JSON.stringify(event.payload) + event.timestamp;
    const expectedSignature = await createHmacSignature(this.secret, payload);
    return event.signature === expectedSignature;
  }
}

// Uso
const webhooks = new WebhookProcessor(WEBHOOK_SECRET);

webhooks.register('payment.completed', async (payload) => {
  // Processar pagamento
});

webhooks.register('user.created', async (payload) => {
  // Processar novo usuário
});
```

### Webhook Sender (com retry)

```typescript
// src/services/webhooks/webhookSender.ts

interface WebhookDelivery {
  url: string;
  payload: unknown;
  retryCount: number;
  nextRetryAt?: Date;
}

class WebhookSender {
  private queue: WebhookDelivery[] = [];
  private maxRetries = 5;

  async send(url: string, payload: unknown): Promise<void> {
    const delivery: WebhookDelivery = {
      url,
      payload,
      retryCount: 0,
    };

    await this.deliver(delivery);
  }

  private async deliver(delivery: WebhookDelivery): Promise<void> {
    try {
      const response = await fetch(delivery.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': await this.sign(delivery.payload),
        },
        body: JSON.stringify(delivery.payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log(`Webhook delivered to ${delivery.url}`);
    } catch (error) {
      await this.handleFailure(delivery, error as Error);
    }
  }

  private async handleFailure(
    delivery: WebhookDelivery,
    error: Error
  ): Promise<void> {
    delivery.retryCount++;

    if (delivery.retryCount <= this.maxRetries) {
      // Exponential backoff
      const delayMs = Math.pow(2, delivery.retryCount) * 1000;
      delivery.nextRetryAt = new Date(Date.now() + delayMs);

      console.log(
        `Webhook failed, retry ${delivery.retryCount}/${this.maxRetries} in ${delayMs}ms`
      );

      this.queue.push(delivery);
      setTimeout(() => this.processQueue(), delayMs);
    } else {
      console.error(`Webhook permanently failed: ${delivery.url}`);
      // Alertar, salvar em dead letter queue, etc.
    }
  }

  private async processQueue(): Promise<void> {
    const now = new Date();
    const ready = this.queue.filter(
      d => !d.nextRetryAt || d.nextRetryAt <= now
    );

    this.queue = this.queue.filter(d => d.nextRetryAt && d.nextRetryAt > now);

    for (const delivery of ready) {
      await this.deliver(delivery);
    }
  }

  private async sign(payload: unknown): Promise<string> {
    return createHmacSignature(
      WEBHOOK_SECRET,
      JSON.stringify(payload)
    );
  }
}
```

---

## File Upload/Download

### Upload com Progress

```typescript
// src/services/fileUpload.ts

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

async function uploadFile(
  url: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Response(xhr.response, { status: xhr.status }));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', url);
    xhr.send(formData);
  });
}

// Uso
await uploadFile('/api/upload', file, (progress) => {
  setUploadProgress(progress.percentage);
});
```

### Chunked Upload

```typescript
// src/services/chunkedUpload.ts

interface ChunkUploadOptions {
  file: File;
  uploadUrl: string;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

async function uploadInChunks({
  file,
  uploadUrl,
  chunkSize = 5 * 1024 * 1024, // 5MB
  onProgress,
}: ChunkUploadOptions): Promise<void> {
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedChunks = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('filename', file.name);

    await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    uploadedChunks++;
    onProgress?.(Math.round((uploadedChunks / totalChunks) * 100));
  }
}
```

### Download com Streaming

```typescript
// src/services/fileDownload.ts

async function downloadFile(
  url: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const contentLength = response.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength) : 0;
  let loaded = 0;

  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (total && onProgress) {
      onProgress(Math.round((loaded / total) * 100));
    }
  }

  // Criar blob e download
  const blob = new Blob(chunks);
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(blobUrl);
}
```

---

## Exemplos de Integrações

### LinkedIn API (conceptual)

```typescript
// src/services/linkedInService.ts

class LinkedInService extends BaseApiService {
  constructor(accessToken: string) {
    super({
      baseUrl: 'https://api.linkedin.com/v2',
      apiKey: accessToken,
    });
  }

  async getProfile(): Promise<LinkedInProfile> {
    return this.request('/me');
  }

  async searchPeople(query: string): Promise<SearchResult[]> {
    return this.request(`/search/people?q=${encodeURIComponent(query)}`);
  }
}
```

### Twitter/X API (conceptual)

```typescript
// src/services/twitterService.ts

class TwitterService {
  private oauth: OAuthClient;

  constructor() {
    this.oauth = new OAuthClient({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      scopes: ['tweet.read', 'users.read'],
    });
  }

  async searchUsers(query: string): Promise<TwitterUser[]> {
    const token = await this.oauth.getAccessToken();

    const response = await fetch(
      `https://api.twitter.com/2/users/search?query=${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data.data;
  }
}
```

---

## Error Handling Patterns

### Typed Errors

```typescript
// src/lib/errors.ts

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, body: any): ApiError {
    return new ApiError(
      response.status,
      body.code || 'UNKNOWN_ERROR',
      body.message || response.statusText,
      body.details
    );
  }

  isRetryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

// Uso
try {
  await apiCall();
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isAuthError()) {
      // Redirecionar para login
    } else if (error.isRetryable()) {
      // Retry automático
    } else {
      // Mostrar erro ao usuário
    }
  }
}
```

---

## Links Úteis

- [HTTP Status Codes](https://httpstatuses.com/)
- [OAuth 2.0 Spec](https://oauth.net/2/)
- [REST API Best Practices](https://restfulapi.net/)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)
