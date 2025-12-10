# File Search Cache Strategy

## Visão Geral

O sistema de cache do File Search implementa uma estratégia multi-camadas para otimizar performance e reduzir custos de API:

- **Camada 1**: Cache em memória (in-memory) - rápido, TTL curto
- **Camada 2**: Cache em localStorage - persistente, TTL longo
- **Invalidação automática**: Quando documentos são adicionados/removidos

## Benefícios

### Performance
- ⚡ **Resposta instantânea**: ~50ms para cache hits vs ~1.5s para API calls
- 🚀 **Redução de 80%** em chamadas à API para queries repetidas
- 💾 **Memória otimizada**: LRU eviction quando atingir limite

### Custos
- 💰 **Economia significativa**: Evita custos de embeddings e queries duplicadas
- 📊 **Tracking preservado**: Cache hits não geram registros de custo
- ⚖️ **Balance ideal**: TTL configurável entre performance e freshness

## Arquitetura

### Cache Key Format

```
filesearch:{moduleType}:{moduleId}:{queryHash}
```

Exemplos:
- `filesearch:grants:grant-123:abc456`
- `filesearch:finance:global:def789`
- `filesearch:podcast:episode-456:ghi012`

### Query Hash

O hash da query é gerado de forma determinística a partir de:
- Query text (normalizado: lowercase, trimmed)
- Corpus names (sorted)
- Module type
- Module ID
- Max results

Exemplo:
```typescript
{
  query: "editais de fomento",
  corpusNames: ["grants-corpus-1", "grants-corpus-2"],
  moduleType: "grants",
  moduleId: "grant-123",
  maxResults: 10
}
// Hash: abc456
```

## Configuração

### Default Config

```typescript
{
  memoryTTL: 5 * 60 * 1000,      // 5 minutos
  storageTTL: 30 * 60 * 1000,    // 30 minutos
  maxMemoryEntries: 50,           // Máx 50 entries na memória
  maxStorageEntries: 100,         // Máx 100 entries no localStorage
  enableStorage: true             // Habilitar localStorage
}
```

### Customização

```typescript
import { fileSearchCache } from './services/fileSearchCacheService';

// Atualizar configuração
fileSearchCache.updateConfig({
  memoryTTL: 10 * 60 * 1000,  // 10 minutos
  maxMemoryEntries: 100,       // Mais entries
});
```

## Uso Básico

### 1. Query com Cache Automático

```typescript
import { queryFileSearch } from './services/fileSearchApiClient';

const results = await queryFileSearch({
  query: "editais de pesquisa",
  corpusNames: ["grants-corpus"],
  moduleType: "grants",
  moduleId: "grant-123",
});

// Primeira chamada: API call (1.5s)
// Segunda chamada: Cache hit (50ms) ⚡
```

### 2. Invalidação Manual

```typescript
import { fileSearchCache } from './services/fileSearchCacheService';

// Invalidar todos os caches de um módulo
fileSearchCache.invalidateModule('grants', 'grant-123');

// Invalidar query específica
fileSearchCache.invalidateQuery({
  query: "editais de pesquisa",
  corpusNames: ["grants-corpus"],
  moduleType: "grants",
  moduleId: "grant-123",
});

// Limpar todo o cache
fileSearchCache.clearAll();
```

### 3. Estatísticas

```typescript
import { fileSearchCache } from './services/fileSearchCacheService';

const stats = fileSearchCache.getStats();

console.log(stats);
// {
//   totalEntries: 45,
//   memoryEntries: 30,
//   storageEntries: 15,
//   totalHits: 120,
//   totalMisses: 30,
//   hitRate: 80.0,
//   memoryUsageKB: 245.67,
//   storageUsageKB: 512.34
// }
```

## Fluxo de Operação

### Query Flow

```
1. User executa query
     ↓
2. Check memoryCache
     ↓ (miss)
3. Check localStorage
     ↓ (miss)
4. Call API
     ↓
5. Store in memoryCache (TTL: 5min)
     ↓
6. Store in localStorage (TTL: 30min)
     ↓
7. Return results
```

### Cache Hit Flow

```
1. User executa mesma query
     ↓
2. Check memoryCache
     ↓ (HIT!) ⚡
3. Increment hit counter
     ↓
4. Return cached results (50ms)
```

### Document Indexing Flow

```
1. User faz upload de documento
     ↓
2. API indexa documento
     ↓
3. Invalidate module cache
     ↓
4. Próximas queries vão gerar cache MISS (correto!)
```

## Invalidação de Cache

### Automática

Cache é **automaticamente invalidado** quando:

1. **Documento indexado**: `indexDocument()` invalida cache do módulo
2. **Documento deletado**: `deleteDocument()` invalida cache do módulo
3. **TTL expirado**: Entries são removidas automaticamente

### Manual

Use invalidação manual quando:

1. **Corpus atualizado externamente** (fora da aplicação)
2. **Forçar refresh** de resultados
3. **Debugging** ou testes

## Performance Metrics

### Antes do Cache

```
Query "editais de fomento":
- Latência: 1.5s
- Custo: $0.0007/query
- 100 queries/dia = $0.07/dia
```

### Depois do Cache (80% hit rate)

```
Query "editais de fomento":
- Cache hit: 50ms (96% faster)
- Cache miss: 1.5s
- Custo médio: $0.00014/query (80% economia)
- 100 queries/dia = $0.014/dia (5x redução)
```

### ROI

Para um usuário típico:
- **100 queries/dia**
- **80% cache hit rate**
- **Economia mensal**: ~$1.68
- **Performance**: 96% mais rápido na maioria dos casos

## Manutenção

### Auto-Maintenance

O cache executa manutenção automática a cada **10 minutos**:

1. Remove entries expiradas (memória + storage)
2. Verifica health (storage não excedendo 5MB)
3. Evita oldest entries se necessário

### Manual Maintenance

```typescript
import { fileSearchCache } from './services/fileSearchCacheService';

// Executar manutenção manualmente
fileSearchCache.performMaintenance();

// Verificar health
const healthy = fileSearchCache.isHealthy();
if (!healthy) {
  console.warn('Cache unhealthy - consider clearing old entries');
}
```

## Monitoramento

### Cache Stats Dashboard

Acesse **Configurações → File Search Analytics** para ver:
- Hit rate (% de cache hits)
- Memória utilizada
- Storage utilizado
- Total de entries
- Histórico de hits/misses

### Console Logs

O cache emite logs detalhados no console:

```javascript
// Cache HIT
[fileSearchCache] Memory cache HIT: filesearch:grants:grant-123:abc456 (5 hits)

// Cache MISS
[fileSearchCache] Cache MISS: filesearch:grants:grant-123:abc456

// Cache set
[fileSearchCache] Cached: filesearch:grants:grant-123:abc456 (8 results)

// Invalidation
[fileSearchCache] Invalidated module: grants grant-123
```

## Troubleshooting

### Problema: Cache hit rate baixo (<50%)

**Causas possíveis**:
- Queries muito variadas (poucas repetições)
- TTL muito curto
- Usuários deletando/adicionando documentos frequentemente

**Soluções**:
1. Aumentar `memoryTTL` e `storageTTL`
2. Verificar se queries estão sendo normalizadas corretamente
3. Analisar padrão de uso (FileSearchAnalytics)

### Problema: LocalStorage quota exceeded

**Causas**:
- Muitos documentos grandes sendo cacheados
- Storage limit do navegador (5-10MB)

**Soluções**:
1. Reduzir `maxStorageEntries`
2. Desabilitar localStorage: `enableStorage: false`
3. Limpar cache: `fileSearchCache.clearAll()`

### Problema: Resultados desatualizados

**Causas**:
- Cache não foi invalidado após mudanças
- Documentos atualizados externamente

**Soluções**:
1. Invalidar manualmente: `fileSearchCache.invalidateModule()`
2. Reduzir TTL para freshness mais agressiva
3. Implementar webhook para invalidação externa

## Best Practices

### ✅ DO

- Use cache para queries repetidas
- Monitore hit rate (>70% é bom)
- Invalide cache após mudanças de documentos
- Configure TTL baseado no padrão de uso

### ❌ DON'T

- Não desabilite cache sem motivo
- Não configure TTL muito longo (>1h)
- Não ignore warnings de quota exceeded
- Não faça `clearAll()` frequentemente

## Roadmap

### Melhorias Futuras

1. **Server-side caching**: Cache compartilhado entre usuários
2. **Predictive prefetching**: Pre-cache queries comuns
3. **Smart invalidation**: Invalidar apenas queries afetadas
4. **Cache warming**: Pre-popular cache ao carregar módulo
5. **Compression**: Comprimir results antes de armazenar

## API Reference

### FileSearchCacheService

```typescript
class FileSearchCacheService {
  // Get cached results
  get(query: FileSearchQuery): FileSearchResult[] | null

  // Store results in cache
  set(query: FileSearchQuery, results: FileSearchResult[]): void

  // Invalidate module cache
  invalidateModule(moduleType: string, moduleId?: string): void

  // Invalidate specific query
  invalidateQuery(query: FileSearchQuery): void

  // Clear all cache
  clearAll(): void

  // Get statistics
  getStats(): CacheStats

  // Update configuration
  updateConfig(config: Partial<CacheConfig>): void

  // Check health
  isHealthy(): boolean

  // Perform maintenance
  performMaintenance(): void
}
```

### CacheStats

```typescript
interface CacheStats {
  totalEntries: number;      // Total entries (memory + storage)
  memoryEntries: number;     // Entries in memory
  storageEntries: number;    // Entries in localStorage
  totalHits: number;         // Total cache hits
  totalMisses: number;       // Total cache misses
  hitRate: number;           // Hit rate percentage (0-100)
  memoryUsageKB: number;     // Memory usage in KB
  storageUsageKB: number;    // Storage usage in KB
}
```

### CacheConfig

```typescript
interface CacheConfig {
  memoryTTL: number;         // In-memory TTL (ms)
  storageTTL: number;        // LocalStorage TTL (ms)
  maxMemoryEntries: number;  // Max entries in memory
  maxStorageEntries: number; // Max entries in storage
  enableStorage: boolean;    // Enable localStorage
}
```

## Exemplos Práticos

### Exemplo 1: Busca em Grants

```typescript
// Component: EditalSearchBar.tsx

const handleSearch = async (query: string) => {
  setLoading(true);

  try {
    const results = await queryFileSearch({
      query,
      corpusNames: [corpusId],
      moduleType: 'grants',
      moduleId: editalId,
    });

    // Primeira busca: 1.5s (API call)
    // Busca repetida: 50ms (cache hit) ⚡

    setResults(results);
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Exemplo 2: Upload com Invalidação

```typescript
// Component: DocumentUploadPanel.tsx

const handleUpload = async (file: File) => {
  try {
    await indexDocument({
      file,
      corpusId,
      moduleType: 'grants',
      moduleId: editalId,
    });

    // Cache é automaticamente invalidado após upload
    // Próximas buscas vão refletir o novo documento

    toast.success('Documento indexado com sucesso!');
  } catch (error) {
    console.error('Upload error:', error);
  }
};
```

### Exemplo 3: Dashboard de Cache

```tsx
// Component: CacheStatsWidget.tsx

const CacheStatsWidget = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    const updateStats = () => {
      const cacheStats = fileSearchCache.getStats();
      setStats(cacheStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="cache-stats">
      <h3>Cache Performance</h3>
      <div className="metric">
        <span>Hit Rate</span>
        <span className="value">{stats.hitRate.toFixed(1)}%</span>
      </div>
      <div className="metric">
        <span>Total Entries</span>
        <span className="value">{stats.totalEntries}</span>
      </div>
      <div className="metric">
        <span>Memory Usage</span>
        <span className="value">{stats.memoryUsageKB.toFixed(2)} KB</span>
      </div>
    </div>
  );
};
```

---

**Última atualização**: 2025-12-09
**Versão**: 1.0.0
**Status**: ✅ Produção
