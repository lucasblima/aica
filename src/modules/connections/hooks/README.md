# Connections Module - React Hooks

Este diretório contém todos os hooks React para o módulo de Connections, seguindo o padrão do projeto (sem React Query).

## Hooks Disponíveis

### 1. `useSpaces`

Hook para gerenciar múltiplos connection spaces.

**Uso:**
```tsx
import { useSpaces } from '@/modules/connections/hooks';

function MyComponent() {
  const { spaces, loading, createSpace, toggleFavorite } = useSpaces({
    archetype: 'habitat' // Opcional: filtrar por arquétipo
  });

  const handleCreate = async () => {
    await createSpace({
      archetype: 'habitat',
      name: 'Minha Casa',
      subtitle: 'Residência familiar'
    });
  };

  return (
    <div>
      {spaces.map(space => (
        <div key={space.id}>{space.name}</div>
      ))}
    </div>
  );
}
```

**Retorno:**
- `spaces`: Array de ConnectionSpace
- `loading`: Estado de carregamento
- `error`: Erro (se houver)
- `createSpace`: Função para criar novo space
- `toggleFavorite`: Função para favoritar/desfavoritar
- `refresh`: Função para recarregar dados

---

### 2. `useSpace`

Hook para gerenciar um único connection space com seus membros.

**Uso:**
```tsx
import { useSpace } from '@/modules/connections/hooks';

function SpaceDetail({ spaceId }: { spaceId: string }) {
  const { space, loading, updateSpace, deleteSpace } = useSpace(spaceId);

  const handleUpdate = async () => {
    await updateSpace({
      name: 'Nome Atualizado',
      description: 'Nova descrição'
    });
  };

  return (
    <div>
      <h1>{space?.name}</h1>
      <p>Membros: {space?.members.length}</p>
    </div>
  );
}
```

**Retorno:**
- `space`: ConnectionSpace com members array
- `loading`: Estado de carregamento
- `error`: Erro (se houver)
- `updateSpace`: Função para atualizar space
- `deleteSpace`: Função para deletar space
- `updateLastAccessed`: Atualizar timestamp de acesso
- `refresh`: Função para recarregar dados

---

### 3. `useSpaceMembers`

Hook para gerenciar membros de um space.

**Uso:**
```tsx
import { useSpaceMembers } from '@/modules/connections/hooks';

function MembersList({ spaceId }: { spaceId: string }) {
  const {
    members,
    loading,
    isAdmin,
    addMember,
    removeMember,
    updateRole
  } = useSpaceMembers(spaceId);

  const handleAddMember = async () => {
    await addMember({
      external_name: 'João Silva',
      external_email: 'joao@example.com',
      role: 'member'
    });
  };

  const handleUpdateRole = async (memberId: string) => {
    await updateRole(memberId, 'admin');
  };

  return (
    <div>
      {isAdmin && <button onClick={handleAddMember}>Adicionar Membro</button>}
      {members.map(member => (
        <div key={member.id}>
          {member.external_name || 'Usuário'} - {member.role}
        </div>
      ))}
    </div>
  );
}
```

**Retorno:**
- `members`: Array de ConnectionMember
- `loading`: Estado de carregamento
- `error`: Erro (se houver)
- `isAdmin`: Se o usuário atual é admin
- `isAdminLoading`: Estado de carregamento da verificação de admin
- `addMember`: Função para adicionar membro
- `removeMember`: Função para remover membro
- `updateRole`: Função para atualizar role
- `refresh`: Função para recarregar dados

---

### 4. `useSpaceEvents`

Hook para gerenciar eventos de um space.

**Uso:**
```tsx
import { useSpaceEvents } from '@/modules/connections/hooks';

function EventsList({ spaceId }: { spaceId: string }) {
  const {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent
  } = useSpaceEvents(spaceId, {
    start: '2024-01-01',
    end: '2024-12-31'
  });

  const handleCreateEvent = async () => {
    await createEvent({
      title: 'Reunião de Equipe',
      starts_at: '2024-01-15T10:00:00Z',
      location: 'Escritório',
      rsvp_enabled: true
    });
  };

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          {event.title} - {new Date(event.starts_at).toLocaleDateString()}
        </div>
      ))}
    </div>
  );
}
```

**Retorno:**
- `events`: Array de ConnectionEvent
- `loading`: Estado de carregamento
- `error`: Erro (se houver)
- `createEvent`: Função para criar evento
- `updateEvent`: Função para atualizar evento
- `deleteEvent`: Função para deletar evento
- `refresh`: Função para recarregar dados

---

### 5. `useUpcomingEvents`

Hook para buscar próximos eventos de todos os spaces do usuário.

**Uso:**
```tsx
import { useUpcomingEvents } from '@/modules/connections/hooks';

function UpcomingEventsList() {
  const { upcomingEvents, loading } = useUpcomingEvents(10);

  return (
    <div>
      <h2>Próximos Eventos</h2>
      {upcomingEvents.map(event => (
        <div key={event.id}>
          {event.title} - {event.space.name}
        </div>
      ))}
    </div>
  );
}
```

**Retorno:**
- `upcomingEvents`: Array de ConnectionEvent com space data
- `loading`: Estado de carregamento
- `error`: Erro (se houver)
- `refresh`: Função para recarregar dados

---

## Padrões Implementados

### 1. Estado Local com useState
Todos os hooks usam `useState` para gerenciar estado local, seguindo o padrão do projeto sem React Query.

### 2. Auto-fetch com useEffect
Os hooks fazem fetch automático dos dados quando o componente monta ou quando dependências mudam.

```tsx
useEffect(() => {
  if (user?.id && spaceId) {
    fetchData();
  }
}, [user?.id, spaceId, fetchData]);
```

### 3. Otimistic Updates
Hooks como `useSpaces` implementam atualizações otimistas para melhor UX:

```tsx
const toggleFavorite = async (spaceId: string) => {
  // Atualiza UI imediatamente
  setSpaces(prev => prev.map(space =>
    space.id === spaceId
      ? { ...space, is_favorite: !space.is_favorite }
      : space
  ));

  try {
    await service.toggleFavorite(spaceId);
  } catch (err) {
    // Reverte em caso de erro
    await fetchSpaces();
    throw err;
  }
};
```

### 4. Error Handling
Todos os hooks capturam e expõem erros através da propriedade `error`.

### 5. Loading States
Estados de loading são gerenciados consistentemente em todas as operações.

## Dependências

- `useAuth` - Hook de autenticação do projeto
- Services do módulo Connections (spaceService, memberService, eventService)
- Tipos do módulo Connections

## Exportações

Todos os hooks são exportados através do arquivo `index.ts`:

```tsx
import {
  useSpaces,
  useSpace,
  useSpaceMembers,
  useSpaceEvents,
  useUpcomingEvents
} from '@/modules/connections/hooks';
```
