# 🔥 Tribo - Arquétipo de Comunidade

**Filosofia:** A "fogueira digital" - pertencimento intencional e coordenação de interesses compartilhados. Antítese da rede social moderna.

## 🎨 Design Specs

- **Cores:** Warm oranges (#9B4D3A), terracotta, inviting colors
- **Cards:** `ceramic-concave` para fotos, cards como convites calorosos
- **Metáfora:** "Fogueira" - gathering place, welcoming, warm
- **Tipografia:** Friendly, arredondada
- **Animações:** Warm pulses, gathering effects

## 📁 Estrutura do Módulo

```
tribo/
├── types.ts                    # Type definitions completas
├── index.ts                    # Main export
├── components/
│   ├── index.ts
│   ├── TriboDashboard.tsx      # Community hub principal
│   ├── RitualCard.tsx          # Card de evento recorrente
│   ├── RitualRSVP.tsx          # Interface de confirmação
│   ├── BringListEditor.tsx     # Editor do que levar
│   ├── SharedResourceCard.tsx  # Card de recurso compartilhado
│   ├── GroupFundCard.tsx       # Card de vaquinha
│   ├── ContributionTracker.tsx # Rastreador de contribuições
│   ├── DiscussionThread.tsx    # Thread de discussão
│   ├── PollVoting.tsx          # Interface de votação
│   └── MemberDirectory.tsx     # Diretório de membros
├── services/
│   ├── ritualService.ts        # CRUD para rituais
│   ├── resourceService.ts      # CRUD para recursos
│   ├── fundService.ts          # CRUD para fundos
│   └── discussionService.ts    # CRUD para discussões
├── hooks/
│   ├── useRituals.ts           # Hooks para rituais e occurrences
│   ├── useResources.ts         # Hooks para recursos
│   ├── useFunds.ts             # Hooks para fundos
│   └── useDiscussions.ts       # Hooks para discussões
└── views/
    ├── index.ts
    ├── TriboHome.tsx           # Entry point
    ├── RitualDetail.tsx        # Detalhes do ritual
    ├── ResourcesView.tsx       # Lista de recursos
    ├── FundsView.tsx           # Vaquinhas
    └── DiscussionsView.tsx     # Discussões

Total: 27 arquivos TypeScript
```

## 🗄️ Database Schema

### Tabelas Principais

1. **tribo_rituals** - Eventos recorrentes
   - RRULE para recorrência (iCal format)
   - Horário padrão, duração, local
   - Flag de obrigatório
   - Comparecimento típico

2. **tribo_ritual_occurrences** - Instâncias específicas
   - Link para ritual e evento
   - Bring list (JSON)
   - RSVP data (JSON)
   - Status (scheduled/completed/cancelled)

3. **tribo_shared_resources** - Recursos compartilhados
   - Equipamentos, espaços, veículos
   - Status de disponibilidade
   - Holder atual e data de devolução
   - Imagens e notas de uso

4. **tribo_group_funds** - Vaquinhas
   - Meta e valor atual
   - Tipo: voluntary/mandatory/proportional
   - Deadline e status

5. **tribo_fund_contributions** - Contribuições
   - Link para membro e fundo
   - Confirmação e método de pagamento
   - Transaction tracking

6. **tribo_discussions** - Discussões
   - Categorias: announcement/question/decision/general
   - Poll support com options e votes
   - Pin e resolve status

7. **tribo_discussion_replies** - Respostas
   - Threading support
   - Reactions (JSON)

## 🚀 Usage Examples

### 1. Usar o Dashboard

```tsx
import { TriboDashboard } from '@/modules/connections/tribo';

function MyPage() {
  return (
    <TriboDashboard
      spaceId="space-123"
      memberId="member-456"
    />
  );
}
```

### 2. Criar um Ritual

```tsx
import { useCreateRitual } from '@/modules/connections/tribo';

function CreateRitualForm() {
  const createRitual = useCreateRitual();

  const handleSubmit = async () => {
    await createRitual.mutateAsync({
      spaceId: 'space-123',
      name: 'Reunião Semanal',
      description: 'Nossa reunião de planejamento',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      defaultTime: '19:00',
      defaultDurationMinutes: 90,
      isMandatory: true,
    });
  };

  return <button onClick={handleSubmit}>Criar Ritual</button>;
}
```

### 3. RSVP para Evento

```tsx
import { useRSVP } from '@/modules/connections/tribo';

function RSVPButton({ occurrenceId, memberId }) {
  const rsvp = useRSVP();

  return (
    <button
      onClick={() =>
        rsvp.mutateAsync({
          occurrenceId,
          memberId,
          status: 'yes',
        })
      }
    >
      Confirmar Presença
    </button>
  );
}
```

### 4. Contribuir para Vaquinha

```tsx
import { useCreateContribution } from '@/modules/connections/tribo';

function ContributeButton({ fundId, memberId }) {
  const contribute = useCreateContribution();

  const handleContribute = async () => {
    await contribute.mutateAsync({
      fundId,
      memberId,
      amount: 50.00,
      paymentMethod: 'pix',
    });
  };

  return <button onClick={handleContribute}>Contribuir R$ 50</button>;
}
```

### 5. Criar Discussão com Poll

```tsx
import { useCreateDiscussion } from '@/modules/connections/tribo';

function CreatePoll() {
  const createDiscussion = useCreateDiscussion();

  const handleCreate = async () => {
    await createDiscussion.mutateAsync({
      spaceId: 'space-123',
      title: 'Qual o melhor dia para reunião?',
      category: 'decision',
      isPoll: true,
      pollOptions: ['Segunda', 'Quarta', 'Sexta'],
      pollDeadline: '2025-12-20T23:59:00Z',
    });
  };

  return <button onClick={handleCreate}>Criar Enquete</button>;
}
```

## 🎯 Key Features

### Rituais (Recurring Events)
- ✅ Eventos recorrentes com RRULE
- ✅ RSVP (Yes/No/Maybe)
- ✅ Bring list com atribuição
- ✅ Tracking de comparecimento

### Recursos Compartilhados
- ✅ Equipamentos, espaços, veículos
- ✅ Sistema de check-out/devolução
- ✅ Fotos e instruções de uso
- ✅ Valor estimado

### Vaquinhas
- ✅ Metas de arrecadação
- ✅ Tipos: voluntary/mandatory/proportional
- ✅ Tracking de contribuições
- ✅ Status de confirmação

### Discussões
- ✅ Categorias (announcement/question/decision/general)
- ✅ Threading de respostas
- ✅ Reactions
- ✅ Pin e resolve
- ✅ Polls integrados

### Member Directory
- ✅ Perfis contextuais
- ✅ RSVP history
- ✅ Contribution tracking
- ✅ Discussion activity

## 🔐 Permissions (RLS)

- **Members** podem:
  - Ver todos os recursos do espaço
  - RSVP para rituais
  - Contribuir para vaquinhas
  - Criar discussões e responder
  - Reservar recursos

- **Admins/Moderators** podem:
  - Criar e gerenciar rituais
  - Gerenciar recursos
  - Gerenciar vaquinhas
  - Moderar discussões (pin/resolve)
  - Confirmar contribuições

## 🎨 Design Philosophy

A Tribo é a fogueira digital - um espaço caloroso e acolhedor onde as pessoas se reúnem intencionalmente. Cada elemento do design reforça essa metáfora:

- **Cores quentes** (#9B4D3A, terracotta) evocam o calor do fogo
- **Cards arredondados** parecem convites amigáveis
- **Animações suaves** como pulsos de calor
- **Tipografia arredondada** é acolhedora e inclusiva

## 📊 Analytics Potential

O módulo está pronto para analytics:
- Taxa de comparecimento em rituais
- Recursos mais utilizados
- Sucesso de vaquinhas
- Engajamento em discussões
- Atividade de membros

## 🚦 Status

✅ **COMPLETO** - Todas as funcionalidades implementadas:
- [x] SQL Migration com 7 tabelas
- [x] Types completos com 50+ interfaces
- [x] 4 Services com CRUD completo
- [x] 4 Hooks modules com React Query
- [x] 10 Components UI
- [x] 5 Views completas

**Próximos passos sugeridos:**
1. Integrar com sistema de notificações
2. Adicionar suporte a imagens (upload)
3. Implementar calendar sync
4. Analytics dashboard
5. Mobile-first optimization
