# Finance Integration - Connection Archetypes

Este documento descreve a integração entre o módulo de Connections (Habitat, Ventures, Academia, Tribo) e o módulo de Finance pessoal.

## Visão Geral

A integração permite:

1. **Sincronização de transações** de espaços compartilhados para finanças pessoais
2. **Rastreamento de splits** e pagamentos em grupo
3. **Visão consolidada** de balanços e pendências
4. **Importação** de transações pessoais para espaços compartilhados

## Arquitetura

```
src/modules/connections/
├── services/
│   └── financeIntegrationService.ts    # Lógica de integração
├── hooks/
│   └── useFinanceIntegration.ts        # Hooks React Query
├── components/
│   ├── SpaceFinanceSummary.tsx         # Resumo financeiro do espaço
│   ├── MemberBalanceCard.tsx           # Saldo do usuário
│   ├── SplitPaymentTracker.tsx         # Rastreamento de splits
│   └── SyncToFinanceButton.tsx         # Botão de sincronização
```

## Serviço de Integração

### financeIntegrationService.ts

Fornece funções para:

#### 1. Sincronizar para Finanças Pessoais

```typescript
await syncToPersonalFinance(connectionTransactionId, {
  personalCategoryId: 'housing',  // Categoria de destino
  autoSync: true,                 // Sincronizar transações futuras
  syncRecurring: true,            // Sincronizar recorrentes
});
```

**Comportamento:**
- Calcula apenas a parte do usuário em splits
- Adiciona tags e contexto do espaço
- Cria link bidirecional entre transações

#### 2. Importar de Finanças Pessoais

```typescript
await importFromPersonalFinance(
  spaceId,
  ['tx-id-1', 'tx-id-2']
);
```

**Comportamento:**
- Copia transações selecionadas para o espaço
- Mantém referência à transação original
- Define payer como único pagador (split_type: 'payer_only')

#### 3. Obter Resumo Financeiro do Espaço

```typescript
const summary = await getSpaceFinanceSummary(spaceId, {
  start: '2024-01-01',
  end: '2024-01-31'
});

// Retorna:
// {
//   totalIncome: number,
//   totalExpenses: number,
//   netBalance: number,
//   pendingPayments: number,
//   byCategory: [...],
//   byMember: [...]
// }
```

#### 4. Calcular Balanço do Usuário

```typescript
const balance = await getUserBalance(spaceId, userId);

// Retorna:
// {
//   totalOwed: number,        // Quanto o usuário deve
//   totalToReceive: number,   // Quanto o usuário tem a receber
//   netBalance: number,       // Saldo líquido
//   pendingItems: [...]       // Itens pendentes detalhados
// }
```

#### 5. Marcar Split como Pago

```typescript
await markSplitAsPaid(transactionId, memberId);
```

**Comportamento:**
- Atualiza o status de pagamento do membro
- Se todos pagaram, marca transação como paga
- Invalida caches relevantes

## Hooks React Query

### useFinanceIntegration

Hook principal que combina todas as funcionalidades:

```typescript
const {
  summary,              // SpaceFinanceSummary
  balance,              // UserBalance
  isLoading,
  error,
  syncToPersonal,       // Mutation
  importFromPersonal,   // Mutation
  markAsPaid,          // Mutation
  refetchSummary,
  refetchBalance,
} = useFinanceIntegration(spaceId);
```

### Hooks Individuais

```typescript
// Resumo financeiro
const { data, isLoading } = useSpaceFinanceSummary(spaceId, dateRange);

// Balanço do usuário
const { data, isLoading } = useUserBalance(spaceId);

// Sincronizar para pessoal
const syncMutation = useSyncToPersonalFinance();
await syncMutation.mutateAsync({ transactionId, options });

// Importar de pessoal
const importMutation = useImportFromPersonalFinance();
await importMutation.mutateAsync({ spaceId, transactionIds });

// Marcar como pago
const markPaidMutation = useMarkSplitAsPaid();
await markPaidMutation.mutateAsync({ transactionId, memberId });

// Status de pagamento de split
const { data } = useSplitPaymentStatus(transactionId);
```

## Componentes

### 1. SpaceFinanceSummary

Exibe resumo financeiro do espaço com:
- Total de receitas/despesas
- Saldo líquido
- Breakdown por categoria
- Breakdown por membro
- Alerta de pagamentos pendentes

```tsx
<SpaceFinanceSummary
  spaceId={spaceId}
  dateRange={{ start: '2024-01-01', end: '2024-01-31' }}
/>
```

### 2. MemberBalanceCard

Mostra o que o usuário deve/recebe no espaço:

```tsx
<MemberBalanceCard
  spaceId={spaceId}
  onPaymentClick={(txId) => handleMarkPaid(txId)}
/>
```

**Features:**
- Visualização de débitos/créditos
- Lista de itens pendentes
- Botão para marcar como pago

### 3. SplitPaymentTracker

Visualiza status de pagamento de uma despesa dividida:

```tsx
<SplitPaymentTracker
  transactionId={transactionId}
  description="Aluguel Janeiro"
  onMemberClick={(memberId) => viewMemberDetails(memberId)}
/>
```

**Features:**
- Progress bar de pagamento
- Lista de membros com status
- Botão para confirmar pagamento

### 4. SyncToFinanceButton

Botão com modal para sincronizar com finanças pessoais:

```tsx
<SyncToFinanceButton
  transactionId={transactionId}
  transactionDescription="Aluguel"
  amount={1500}
  variant="primary"
  size="md"
/>
```

**Features:**
- Modal de confirmação
- Seleção de categoria
- Opção de auto-sync
- Feedback visual

## Integrações por Archetype

### Habitat

**Localização:** `habitat/components/HabitatDashboard.tsx`

**Integração:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <SpaceFinanceSummary spaceId={spaceId} />
  <MemberBalanceCard spaceId={spaceId} />
</div>
```

**Casos de Uso:**
- Despesas de condomínio
- Aluguel compartilhado
- Manutenção e reparos
- Contas de utilities

### Ventures

**Localização:** `ventures/components/VenturesDashboard.tsx`

**Integração:**
```tsx
<FinanceOverviewCard
  spaceId={spaceId}
  onViewDetails={() => navigate('/finance')}
/>
```

**Features:**
- Comparação mês vs mês anterior
- Receitas e despesas operacionais
- Margem de lucro
- Top categorias de despesas
- Link para métricas detalhadas

**Casos de Uso:**
- Receitas de vendas/serviços
- Despesas operacionais
- Investimentos
- Folha de pagamento

### Tribo

**Localização:** `tribo/components/`

**Integração:**

**GroupFundCard.tsx:**
```tsx
<SyncToFinanceButton
  transactionId={fund.id}
  transactionDescription={fund.title}
  amount={fund.currentAmount}
  variant="ghost"
  size="sm"
/>
```

**ContributionTracker.tsx:**
```tsx
{contrib.isConfirmed && (
  <SyncToFinanceButton
    transactionId={contrib.id}
    transactionDescription={`Contribuição: ${fund.title}`}
    amount={contrib.amount}
    variant="ghost"
    size="sm"
  />
)}
```

**Casos de Uso:**
- Vaquinhas para eventos
- Contribuições mensais
- Doações
- Presentes coletivos

### Academia

**Nota:** Academia não possui integração financeira direta, pois foca em gestão de conhecimento e aprendizado.

## Schema de Banco de Dados

### connection_transactions

Tabela principal para transações compartilhadas:

```sql
CREATE TABLE connection_transactions (
  id UUID PRIMARY KEY,
  space_id UUID REFERENCES connection_spaces(id),
  created_by UUID REFERENCES auth.users(id),

  -- Detalhes da transação
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  type connection_transaction_type NOT NULL,
  category TEXT,

  -- Data
  transaction_date TIMESTAMPTZ NOT NULL,

  -- Split
  split_type connection_transaction_split_type DEFAULT 'payer_only',
  split_data JSONB DEFAULT '{}',

  -- Pagamento
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),

  -- Recorrência
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,

  -- Link para finanças pessoais (futuro)
  personal_transaction_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Split Data Structure

O campo `split_data` armazena um array de objetos:

```typescript
interface TransactionSplit {
  member_id: string;
  amount?: number;      // Valor fixo
  percentage?: number;  // Ou porcentagem
  paid: boolean;        // Status de pagamento
}
```

**Exemplos:**

```json
// Split igual (3 pessoas, R$ 300 total)
[
  { "member_id": "user-1", "percentage": 33.33, "paid": true },
  { "member_id": "user-2", "percentage": 33.33, "paid": false },
  { "member_id": "user-3", "percentage": 33.34, "paid": false }
]

// Split fixo
[
  { "member_id": "user-1", "amount": 150, "paid": true },
  { "member_id": "user-2", "amount": 100, "paid": false },
  { "member_id": "user-3", "amount": 50, "paid": false }
]
```

## Mapeamento de Categorias

O serviço mapeia automaticamente categorias de connections para finanças:

```typescript
const mapping = {
  'rent': 'housing',
  'utilities': 'housing',
  'groceries': 'food',
  'supplies': 'shopping',
  'maintenance': 'housing',
  'equipment': 'shopping',
  'event': 'entertainment',
  'contribution': 'other',
};
```

## Boas Práticas

### 1. Sempre verificar permissões

```typescript
// Service verifica automaticamente
const userId = (await supabase.auth.getUser()).data.user?.id;
if (!userId) throw new Error('User not authenticated');
```

### 2. Invalidar caches após mutações

```typescript
const syncMutation = useSyncToPersonalFinance();

onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
}
```

### 3. Tratar erros adequadamente

```typescript
try {
  await syncToPersonalFinance(txId);
} catch (error) {
  console.error('Error syncing:', error);
  // Mostrar toast/notification
}
```

### 4. Usar date ranges consistentes

```typescript
import { getDefaultDateRange } from '../services/financeIntegrationService';

const range = getDefaultDateRange(); // Mês atual
```

## Próximos Passos

### Features Planejadas

1. **Sincronização bidirecional automática**
   - Atualizar finanças quando connection muda
   - Atualizar connection quando finanças muda

2. **Reconciliação de pagamentos**
   - Marcar automaticamente como pago via bank feed
   - Sugerir matches entre transações

3. **Relatórios consolidados**
   - Dashboard único com todas as fontes
   - Export para Excel/PDF

4. **Integrações bancárias**
   - Plaid/Belvo para sync automático
   - Webhooks de pagamento

5. **Split inteligente**
   - IA para sugerir divisão justa
   - Histórico de divisões anteriores

## Troubleshooting

### Transação não sincroniza

**Problema:** `syncToPersonalFinance` falha

**Soluções:**
1. Verificar se usuário tem permissão no espaço
2. Verificar se transação existe
3. Verificar se já foi sincronizada (campo `personal_transaction_id`)

### Balance incorreto

**Problema:** `getUserBalance` retorna valores errados

**Soluções:**
1. Verificar se split_data está correto
2. Verificar se todos os splits somam 100%
3. Re-calcular splits:

```typescript
const recalculated = await getSpaceFinanceSummary(spaceId);
```

### RLS errors

**Problema:** "permission denied for table connection_transactions"

**Soluções:**
1. Verificar se RLS está habilitado
2. Verificar se políticas estão corretas
3. Verificar se usuário é membro do espaço

## Suporte

Para dúvidas ou problemas:
- Consulte a documentação do módulo Finance
- Revise os exemplos de uso nos testes
- Entre em contato com a equipe de desenvolvimento
