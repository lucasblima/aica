# Exemplos de Uso - Otimizações de Performance

Este documento mostra como usar as otimizações de performance implementadas.

## 1. Lazy Loading de Módulos

### Uso Básico
```tsx
import { Suspense } from 'react';
import { HabitatModule, loadArchetypeModule } from '@/modules/connections';
import { DashboardSkeleton } from '@/modules/connections/components/skeletons';

function HabitatPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HabitatModule />
    </Suspense>
  );
}
```

### Carregamento Dinâmico
```tsx
import { loadArchetypeModule } from '@/modules/connections';

async function loadModule(archetype: string) {
  try {
    const module = await loadArchetypeModule(archetype);
    // Usar módulo...
  } catch (error) {
    console.error('Failed to load module:', error);
  }
}
```

---

## 2. Virtual Scrolling

### VirtualList - Lista Simples
```tsx
import { VirtualList } from '@/modules/connections/components';

function NotesView({ notes }) {
  return (
    <VirtualList
      items={notes}
      renderItem={(note) => <NoteCard key={note.id} note={note} />}
      estimateSize={100}
      className="h-[600px]"
      emptyMessage="Nenhuma nota encontrada"
    />
  );
}
```

### VirtualGrid - Grid de Itens
```tsx
import { VirtualGrid } from '@/modules/connections/components';

function InventoryView({ items }) {
  return (
    <VirtualGrid
      items={items}
      renderItem={(item) => <InventoryCard key={item.id} item={item} />}
      columns={3}
      gap={16}
      itemHeight={240}
      className="h-[800px]"
    />
  );
}
```

### Conditional Virtual Scrolling
```tsx
import { VirtualGrid } from '@/modules/connections/components';

function SmartInventoryGrid({ items }) {
  const THRESHOLD = 50;

  // Usar virtualização apenas para listas grandes
  if (items.length > THRESHOLD) {
    return (
      <VirtualGrid
        items={items}
        renderItem={(item) => <InventoryCard item={item} />}
        columns={3}
        itemHeight={240}
      />
    );
  }

  // Grid normal para listas pequenas
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => <InventoryCard key={item.id} item={item} />)}
    </div>
  );
}
```

---

## 3. Query Caching

### Usar Configurações de Cache
```tsx
import { useQuery } from '@tanstack/react-query';
import { connectionQueryConfig } from '@/modules/connections/lib';
import { spaceService } from '@/modules/connections/services';

function SpaceDetails({ spaceId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => spaceService.getSpaceById(spaceId),
    ...connectionQueryConfig.spaces, // Cache de 10 minutos
  });

  // ...
}
```

### Prefetch de Dados
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { createPrefetchHelpers } from '@/modules/connections/lib';
import * as services from '@/modules/connections/services';

function SpaceList({ spaces }) {
  const queryClient = useQueryClient();
  const { prefetchSpaceData } = createPrefetchHelpers(services);

  const handleMouseEnter = (spaceId: string) => {
    // Prefetch dados quando usuário passa o mouse
    prefetchSpaceData(queryClient, spaceId);
  };

  return (
    <div>
      {spaces.map(space => (
        <SpaceCard
          key={space.id}
          space={space}
          onMouseEnter={() => handleMouseEnter(space.id)}
        />
      ))}
    </div>
  );
}
```

### Invalidação Inteligente
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { createInvalidationHelpers } from '@/modules/connections/lib';

function AddMemberButton({ spaceId }) {
  const queryClient = useQueryClient();
  const { invalidateMembers } = createInvalidationHelpers();

  const handleAddMember = async (memberData) => {
    await memberService.addMember(memberData);

    // Invalidar apenas cache de membros
    invalidateMembers(queryClient, spaceId);
  };

  // ...
}
```

---

## 4. Otimização de Imagens

### OptimizedImage
```tsx
import { OptimizedImage } from '@/modules/connections/components';

function PropertyPhoto({ photoUrl }) {
  return (
    <OptimizedImage
      src={photoUrl}
      alt="Property photo"
      width={800}
      height={600}
      placeholder="blur"
      className="rounded-lg"
    />
  );
}
```

### OptimizedAvatar
```tsx
import { OptimizedAvatar } from '@/modules/connections/components';

function MemberCard({ member }) {
  return (
    <div className="flex items-center gap-3">
      <OptimizedAvatar
        src={member.avatarUrl}
        name={member.name}
        size="lg"
      />
      <div>
        <h3>{member.name}</h3>
        <p>{member.role}</p>
      </div>
    </div>
  );
}
```

### Avatar com Fallback
```tsx
import { OptimizedAvatar } from '@/modules/connections/components';

// Se src falhar ou não existir, mostra iniciais com cor baseada no nome
<OptimizedAvatar
  src={undefined} // ou URL inválida
  name="João Silva"
  size="md"
/>
// Renderiza: JS em círculo colorido
```

---

## 5. Skeleton Loading

### Uso Básico
```tsx
import { GridItemSkeleton, ListItemSkeleton } from '@/modules/connections/components';

function InventoryView() {
  const { items, loading } = useInventory();

  if (loading) {
    return <GridItemSkeleton count={6} />;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => <InventoryCard key={item.id} item={item} />)}
    </div>
  );
}
```

### Skeletons Disponíveis
```tsx
import {
  SpaceCardSkeleton,
  SpaceMemberListSkeleton,
  DashboardSkeleton,
  ListItemSkeleton,
  GridItemSkeleton,
  TableSkeleton,
  DetailViewSkeleton,
  FormSkeleton,
} from '@/modules/connections/components';

// Space cards
<SpaceCardSkeleton />

// Lista de membros (3 itens por padrão)
<SpaceMemberListSkeleton count={5} />

// Dashboard completo
<DashboardSkeleton />

// Lista genérica
<ListItemSkeleton count={10} />

// Grid de itens
<GridItemSkeleton count={9} />

// Tabela
<TableSkeleton rows={5} cols={4} />

// View de detalhe
<DetailViewSkeleton />

// Formulário
<FormSkeleton fields={6} />
```

---

## 6. Debounced Search

### useDebouncedSearch
```tsx
import { useDebouncedSearch } from '@/modules/connections/hooks';

function SearchableInventory() {
  const {
    query,
    setQuery,
    results,
    isSearching,
    isEmpty
  } = useDebouncedSearch(
    (q) => inventoryService.search(q),
    { delay: 300, minQueryLength: 2 }
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar itens..."
      />

      {isSearching && <Spinner />}

      {isEmpty && <p>Nenhum resultado encontrado</p>}

      {results.map(item => (
        <InventoryCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### useDebouncedValue
```tsx
import { useDebouncedValue } from '@/modules/connections/hooks';

function FilterableList() {
  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebouncedValue(filter, 500);

  // Este effect só roda quando debouncedFilter muda (500ms após última digitação)
  useEffect(() => {
    fetchFilteredData(debouncedFilter);
  }, [debouncedFilter]);

  return (
    <input
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
    />
  );
}
```

### useThrottle
```tsx
import { useThrottle } from '@/modules/connections/hooks';

function ScrollTracker() {
  const handleScroll = useThrottle(() => {
    console.log('Scroll event');
    // Executado no máximo a cada 100ms
  }, 100);

  return (
    <div onScroll={handleScroll} className="h-screen overflow-auto">
      {/* Conteúdo */}
    </div>
  );
}
```

---

## 7. Performance Monitoring

### useRenderCount
```tsx
import { useRenderCount } from '@/modules/connections/lib';

function ExpensiveComponent() {
  useRenderCount('ExpensiveComponent');
  // Console em DEV: [ExpensiveComponent] Render #1, #2, #3...

  // Se ver muitos re-renders, investigar!
  return <div>...</div>;
}
```

### useMountTime
```tsx
import { useMountTime } from '@/modules/connections/lib';

function DashboardView() {
  useMountTime('DashboardView');
  // Console em DEV: [DashboardView] Mounted in 245.67ms

  return <Dashboard />;
}
```

### useWhyDidYouUpdate
```tsx
import { useWhyDidYouUpdate } from '@/modules/connections/lib';

function OptimizedCard({ title, count, onUpdate }) {
  useWhyDidYouUpdate('OptimizedCard', { title, count, onUpdate });
  // Console: [OptimizedCard] Props changed: { onUpdate: { from: fn1, to: fn2 } }
  // Indica que onUpdate não está memoizado!

  return <div>...</div>;
}
```

### Performance Monitor API
```tsx
import { performanceMonitor } from '@/modules/connections/lib';

async function loadData() {
  // Marcar início
  performanceMonitor.mark('data-load-start');

  try {
    const data = await fetchData();

    // Marcar fim
    performanceMonitor.mark('data-load-end');

    // Medir
    performanceMonitor.measure('data-load', 'data-load-start', 'data-load-end');
    // Console: [Performance] data-load: 234.56ms

    return data;
  } catch (error) {
    performanceMonitor.mark('data-load-error');
    throw error;
  }
}

// Ver todas as métricas
performanceMonitor.logMetrics();
```

### measureAsync Helper
```tsx
import { performanceMonitor } from '@/modules/connections/lib';

async function fetchUsers() {
  return performanceMonitor.measureAsync('fetchUsers', async () => {
    const response = await fetch('/api/users');
    return response.json();
  });
  // Console: [Performance] fetchUsers: 345.67ms
}
```

---

## Patterns Recomendados

### 1. Componente Otimizado Completo
```tsx
import React, { useMemo } from 'react';
import { VirtualGrid, GridItemSkeleton, OptimizedImage } from '@/modules/connections/components';
import { useDebouncedValue, useRenderCount } from '@/modules/connections';

function OptimizedInventoryView({ propertyId }) {
  // Monitoring (DEV only)
  useRenderCount('OptimizedInventoryView');

  // Data fetching com cache
  const { items, loading } = useInventory(propertyId);

  // Search com debounce
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Filtro memoizado
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [items, debouncedSearch]);

  // Skeleton durante loading
  if (loading) {
    return <GridItemSkeleton count={6} />;
  }

  // Virtual scrolling para listas grandes
  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar..."
      />

      {filteredItems.length > 50 ? (
        <VirtualGrid
          items={filteredItems}
          renderItem={(item) => <ItemCard item={item} />}
          columns={3}
          itemHeight={240}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// Memoizar componente para evitar re-renders
export default React.memo(OptimizedInventoryView);
```

### 2. Prefetch on Hover
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { createPrefetchHelpers } from '@/modules/connections/lib';

function SpaceCard({ space }) {
  const queryClient = useQueryClient();
  const { prefetchSpaceData } = createPrefetchHelpers(services);

  return (
    <Link
      to={`/spaces/${space.id}`}
      onMouseEnter={() => prefetchSpaceData(queryClient, space.id)}
    >
      <OptimizedImage src={space.coverImage} alt={space.name} />
      <h3>{space.name}</h3>
    </Link>
  );
}
```

### 3. Progressive Loading
```tsx
function DashboardView() {
  return (
    <div>
      {/* Componentes críticos carregam primeiro */}
      <Header />
      <QuickStats />

      {/* Componentes menos importantes são lazy */}
      <Suspense fallback={<ListItemSkeleton count={3} />}>
        <RecentActivity />
      </Suspense>

      <Suspense fallback={<GridItemSkeleton count={6} />}>
        <UpcomingEvents />
      </Suspense>
    </div>
  );
}
```

---

## Troubleshooting

### Virtual Scrolling não funciona
- Verifique se o container tem altura definida (`className="h-[600px]"`)
- Confirme que `estimateSize` está próximo do tamanho real dos itens

### Cache não está funcionando
- Verifique se React Query está configurado
- Confirme que `queryKey` é consistente
- Use DevTools do React Query para debug

### Imagens não otimizam
- Confirme que URL é do Supabase Storage
- Verifique se width/height estão definidos
- Teste em produção (transformações podem não funcionar em dev)

### Performance Monitor não aparece
- Só funciona em DEV (`npm run dev`)
- Verifique console do navegador
- Confirme que `import.meta.env.DEV` é `true`
