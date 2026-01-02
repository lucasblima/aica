# E2E Test Gap Analysis - Podcast Guest Approval Flow

**Status**: 41 testes falhando (0/41 passando)
**Data**: 2 Janeiro 2026
**Branch**: `main` (após merge do PR #19)

---

## 📊 Resumo Executivo

Todos os 41 testes E2E estão falhando devido a uma combinação de:
1. **Bloqueador Crítico**: Falha no setup de autenticação (100% dos testes afetados)
2. **Incompatibilidades de Componentes**: Texto esperado vs implementado
3. **Funcionalidades Faltantes**: Features que os testes esperam mas não existem
4. **Arquitetura Desatualizada**: Testes apontando para componentes deprecated

---

## 🚨 Bloqueador Crítico: Auth Setup

### Problema

**Arquivo**: `tests/e2e/auth.setup.ts`
**Erro**: `Still on landing page after authentication - session injection failed`

**Comportamento Observado**:
```
✓ Supabase API authentication successful
   User ID: bb4f6c20-07cf-4f7e-a8b6-141afee10abe
✓ Auth script added to initialize before page load
✓ Navigated to http://localhost:3000 with pre-loaded auth session
📍 Current page URL: http://localhost:3000/landing
🔑 LocalStorage contents: [
  {
    "key": "sb-gppebtrshbvuzatmebhr-auth-token",
    "valueLength": 1429
  }
]
⚠️ Still on landing page - taking screenshot for debugging
❌ Authentication setup failed
```

**Causa Raiz**:
- LocalStorage contém sessão válida (`sb-*-auth-token` com 1429 caracteres)
- App não reconhece a sessão e redireciona para `/landing` em vez de `/home`
- Race condition: App carrega antes da sessão ser reconhecida pelo Supabase

**Impacto**:
- **41/41 testes falham** porque nenhum consegue passar da página de landing
- Testes esperam navegação para `/home` → `/podcast` → abrir wizard
- Todos timeout em `locator.click: Timeout 15000ms exceeded` (linha 147+)

### Solução Recomendada

Aplicar o mesmo fix usado em sessões anteriores:

```typescript
// tests/e2e/auth.setup.ts

// Add page.addInitScript() BEFORE goto
await page.addInitScript(() => {
  // Set onboarding completion flag
  localStorage.setItem('onboarding_completed', 'true');

  // Ensure session is recognized immediately
  window.addEventListener('load', () => {
    const event = new Event('storage');
    window.dispatchEvent(event);
  });
});

await page.goto('/');
await page.waitForURL(/\/(home|meudia)/, { timeout: 15000 });
```

**Prioridade**: 🔴 **P0 - Bloqueador total**
**Estimativa**: 2-3 horas (implementar + validar)

---

## 🔍 Lacunas Identificadas por Categoria

### 1. Incompatibilidades de Texto/UI

#### 1.1 Nome do Card no Home

**Arquivo**: `tests/e2e/pages/GuestWizardPage.ts:139`

**Esperado**:
```typescript
const podcastCard = this.page.locator('text=Podcast Copilot');
```

**Implementado**: `src/pages/Home.tsx:399`
```typescript
<p className="text-sm font-bold">
  Podcast AI
</p>
```

**Solução**: Atualizar texto no Home.tsx para "Podcast Copilot" OU atualizar teste para "Podcast AI"

**Prioridade**: 🟡 P2 - Ajuste simples
**Estimativa**: 15 minutos

---

#### 1.2 Wizard não Integrado na View Principal

**Arquivo**: `tests/e2e/pages/GuestWizardPage.ts:135-145`

**Esperado**:
- Clicar em card "Podcast Copilot" no Home
- Navegar para view de podcast
- Encontrar botão "Novo Episódio" ou similar
- Abrir `GuestIdentificationWizard`

**Status Atual**:
- `PodcastCopilotView.tsx` existe mas está **DEPRECATED** (linha 2)
- Migração para `StudioMainView` não está completa
- Wizard existe em `src/modules/podcast/components/GuestIdentificationWizard.tsx` ✅
- Mas **não está integrado** em nenhuma view acessível

**Rotas Afetadas**:
- `/podcast` → Redireciona para `/studio` (segundo deprecation notice)
- `/studio` → Existe mas wizard pode não estar disponível

**Solução**:
1. **Opção A** (Curto prazo): Re-ativar PodcastCopilotView temporariamente para E2E
2. **Opção B** (Longo prazo): Completar migração para StudioMainView e integrar wizard lá

**Prioridade**: 🟠 P1 - Funcionalidade central
**Estimativa**:
- Opção A: 2-4 horas
- Opção B: 1-2 dias

---

### 2. Funcionalidades Faltantes

#### 2.1 PreProduction Hub - Funcionalidade Parcial

**Arquivo**: `tests/e2e/podcast-guest-approval-flow.spec.ts`

**Testes Afetados**: 10+ testes esperam PreProduction funcional

**Esperado pelos Testes**:
- View `PreProductionHub` renderiza após completar wizard ✅
- Exibe nome do convidado ✅
- Botão "Enviar Aprovação" visível
- Dialog de geração de link
- Opções de envio: Email, WhatsApp, Copiar Link
- Geração de token de aprovação
- Armazenamento em `podcast_approval_tokens` table

**Status Atual**:
```typescript
// src/modules/podcast/views/PreProductionHub.tsx
// Arquivo existe (14,509 bytes)
```

**Verificação Necessária**:
- [ ] Botão "Enviar Aprovação" implementado?
- [ ] `GuestApprovalLinkDialog` integrado?
- [ ] Geração de tokens funcionando?
- [ ] Tabela `podcast_approval_tokens` existe no DB?

**Ação**: Ler `PreProductionHub.tsx` e verificar implementação completa

**Prioridade**: 🟠 P1 - Feature core
**Estimativa**: 4-8 horas (se faltando features)

---

#### 2.2 Guest Approval Page - Acesso Público

**Arquivo**: `tests/e2e/podcast-guest-approval-flow.spec.ts:404-439`

**Testes Afetados**:
- 4.1: Should display guest approval page with correct route structure
- 4.2: Should handle invalid approval token gracefully
- 4.3: Should reject expired approval tokens (30+ days)

**Esperado**:
- Rota pública: `/guest-approval/:token`
- Não requer autenticação
- Exibe informações do episódio
- Permite aprovação/rejeição
- Valida token (existe, não expirado)
- Atualiza status no DB

**Status Atual**:
```typescript
// src/modules/podcast/views/GuestApprovalPage.tsx
// Arquivo existe (19,546 bytes)
```

**Verificação Necessária**:
- [ ] Rota `/guest-approval/:token` configurada?
- [ ] Validação de token implementada?
- [ ] Expiração (30 dias) checada?
- [ ] Atualização de status funcionando?

**Ação**: Verificar roteamento e implementação completa

**Prioridade**: 🟠 P1 - Feature core
**Estimativa**: 4-6 horas (se faltando implementação)

---

#### 2.3 Gemini API Integration - Error Handling

**Arquivo**: `tests/e2e/podcast-guest-approval-flow.spec.ts:503-534`

**Testes Afetados**:
- 5.1: Should handle Gemini API failures with fallback
- 5.2: Should handle network errors gracefully

**Esperado**:
- Se Gemini API falhar → Usar perfil fallback genérico
- Não bloquear wizard
- Exibir mensagem de aviso
- Permitir continuar com dados básicos

**Status Atual**:
```typescript
// src/modules/podcast/services/guestResearchService.ts
// Implementado na Fase 2 (Task 2.2)
```

**Verificação Necessária**:
- [ ] Try/catch em chamadas Gemini?
- [ ] Fallback profile definido?
- [ ] UI mostra erro graciosamente?

**Ação**: Verificar error handling no service

**Prioridade**: 🟡 P2 - Robustez
**Estimativa**: 2-4 horas

---

### 3. Database Schema - Validação

#### 3.1 Tabelas Necessárias

**Esperadas pelos Testes**:

```sql
-- 1. podcast_episodes (EXISTE - criado no wizard)
CREATE TABLE podcast_episodes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  guest_name VARCHAR(255),
  guest_phone VARCHAR(20),
  guest_email VARCHAR(255),
  theme VARCHAR(500),
  theme_mode VARCHAR(20),
  season INTEGER,
  location VARCHAR(100),
  scheduled_date DATE,
  scheduled_time TIME,
  guest_research_id UUID,
  created_at TIMESTAMPTZ
);

-- 2. podcast_guest_research (EXISTE - Fase 2)
CREATE TABLE podcast_guest_research (
  id UUID PRIMARY KEY,
  guest_name VARCHAR(255),
  reference_context TEXT,
  profile_summary TEXT,
  biography TEXT,
  notable_facts TEXT[],
  key_topics TEXT[],
  gemini_response JSONB,
  created_at TIMESTAMPTZ
);

-- 3. podcast_approval_tokens (FALTANDO?)
CREATE TABLE podcast_approval_tokens (
  id UUID PRIMARY KEY,
  episode_id UUID REFERENCES podcast_episodes,
  token VARCHAR(255) UNIQUE,
  delivery_method VARCHAR(20), -- 'email', 'whatsapp', 'link'
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  approved BOOLEAN DEFAULT NULL,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Verificação Necessária**:
- [ ] Conectar ao Supabase e verificar tabelas existentes
- [ ] Criar migration para `podcast_approval_tokens` se faltando
- [ ] Adicionar índices para performance (token, episode_id)

**Prioridade**: 🟠 P1 - Infraestrutura
**Estimativa**: 1-2 horas

---

### 4. Arquitetura - Deprecated Components

#### 4.1 PodcastCopilotView Deprecated

**Problema**:
- Testes apontam para `/podcast` route
- `PodcastCopilotView.tsx` está DEPRECATED (linha 2-30)
- Migração para `StudioMainView` incompleta

**Deprecation Notice** (src/views/PodcastCopilotView.tsx):
```typescript
/**
 * @deprecated This file is deprecated and will be removed in version 2.0
 *
 * New Architecture (Use this instead):
 * - src/modules/studio/views/StudioMainView.tsx
 * - src/modules/studio/context/StudioContext.tsx
 *
 * Migration Guide:
 * 1. Replace route: <Route path="/podcast" element={<PodcastCopilotView />} />
 * 2. With: <Route path="/studio" element={<StudioProvider><StudioMainView /></StudioProvider>} />
 * 3. The /podcast route now redirects to /studio automatically
 */
```

**Decisão Necessária**:

**Opção 1 - Manter Deprecated para E2E**:
- Pros: Testes passam mais rápido
- Cons: Mantém código obsoleto, debt técnico

**Opção 2 - Atualizar Testes para Studio**:
- Pros: Alinhado com arquitetura nova
- Cons: Requer mais trabalho (atualizar 41 testes)

**Opção 3 - Completar Migração**:
- Pros: Resolve debt técnico
- Cons: Maior esforço (implementar Studio + atualizar testes)

**Recomendação**: Opção 1 no curto prazo, Opção 3 no backlog

**Prioridade**: 🟡 P2 - Debt técnico
**Estimativa**:
- Opção 1: 0 horas (já funciona)
- Opção 2: 4-6 horas
- Opção 3: 2-3 dias

---

## 📋 Lista de Ações Prioritizadas

### 🔴 P0 - Bloqueadores (Crítico)

| # | Ação | Arquivo | Estimativa | Impacto |
|---|------|---------|------------|---------|
| 1 | Corrigir auth setup (session injection + onboarding) | `tests/e2e/auth.setup.ts` | 2-3h | Desbloqueia 41/41 testes |

### 🟠 P1 - Funcionalidades Core (Alta)

| # | Ação | Arquivo | Estimativa | Impacto |
|---|------|---------|------------|---------|
| 2 | Integrar wizard em view acessível | `src/views/PodcastCopilotView.tsx` ou `StudioMainView.tsx` | 2-4h | Habilita workflows 1 & 2 (11 testes) |
| 3 | Implementar botão "Enviar Aprovação" no PreProductionHub | `src/modules/podcast/views/PreProductionHub.tsx` | 4-6h | Habilita approval flow (8 testes) |
| 4 | Criar tabela `podcast_approval_tokens` | Nova migration | 1-2h | Infraestrutura para approval |
| 5 | Implementar geração de approval tokens | `src/modules/podcast/services/approvalService.ts` | 3-4h | Workflow de aprovação (5 testes) |
| 6 | Configurar rota pública `/guest-approval/:token` | `src/App.tsx` ou `routes.tsx` | 2-3h | Acesso público (3 testes) |

### 🟡 P2 - Melhorias e Robustez (Média)

| # | Ação | Arquivo | Estimativa | Impacto |
|---|------|---------|------------|---------|
| 7 | Atualizar texto "Podcast AI" → "Podcast Copilot" | `src/pages/Home.tsx:399` | 15min | Teste de navegação (1 teste) |
| 8 | Adicionar error handling Gemini API com fallback | `src/modules/podcast/services/guestResearchService.ts` | 2-4h | Robustez (2 testes) |
| 9 | Implementar validação de token expirado (30 dias) | `src/modules/podcast/views/GuestApprovalPage.tsx` | 1-2h | Edge case (1 teste) |

### 🟢 P3 - Debt Técnico (Baixa)

| # | Ação | Arquivo | Estimativa | Impacto |
|---|------|---------|------------|---------|
| 10 | Decidir: Completar migração Studio ou manter deprecated | Arquitetura | TBD | Longo prazo |
| 11 | Atualizar testes para Studio (se opção 2/3) | `tests/e2e/**` | 4-6h | Alinhamento arquitetural |

---

## 🎯 Roadmap de Implementação

### Sprint 1: Desbloquear Testes (4-6 horas)

**Objetivo**: Fazer primeiros testes passarem

1. ✅ **Fix Auth Setup** (P0) - 2-3h
   - Implementar page.addInitScript()
   - Adicionar onboarding_completed flag
   - Validar navegação para /home

2. ✅ **Integrar Wizard** (P1) - 2-4h
   - Opção A: Re-ativar botão em PodcastCopilotView
   - Opção B: Integrar em StudioMainView
   - Adicionar botão "Novo Episódio"

**Resultado Esperado**: 5-10 testes básicos passando (Workflow 1.1, 2.1)

---

### Sprint 2: Approval Flow (8-12 horas)

**Objetivo**: Implementar fluxo de aprovação completo

3. ✅ **Database Schema** (P1) - 1-2h
   - Criar migration para `podcast_approval_tokens`
   - Adicionar índices

4. ✅ **PreProduction Hub** (P1) - 4-6h
   - Adicionar botão "Enviar Aprovação"
   - Integrar `GuestApprovalLinkDialog`
   - Implementar geração de token
   - Opções: Email, WhatsApp, Copiar Link

5. ✅ **Approval Service** (P1) - 3-4h
   - Criar `approvalService.ts`
   - Gerar tokens únicos (uuid v4)
   - Salvar em DB com expiração

6. ✅ **Rota Pública** (P1) - 2-3h
   - Configurar `/guest-approval/:token`
   - Sem autenticação required
   - Validar token existe e não expirou

**Resultado Esperado**: 20-25 testes passando (Workflows 1, 2, 4)

---

### Sprint 3: Robustez & Edge Cases (4-8 horas)

**Objetivo**: Error handling e casos extremos

7. ✅ **Gemini Error Handling** (P2) - 2-4h
   - Try/catch em guestResearchService
   - Perfil fallback genérico
   - UI mostra aviso mas permite continuar

8. ✅ **Token Validation** (P2) - 1-2h
   - Checar expiração (30 dias)
   - Retornar 404 se inválido
   - Retornar 410 Gone se expirado

9. ✅ **UI Polish** (P2) - 1-2h
   - Atualizar texto "Podcast AI"
   - Mensagens de erro claras
   - Loading states

**Resultado Esperado**: 35-40 testes passando (90%+)

---

### Sprint 4: Cleanup & Docs (2-4 horas)

**Objetivo**: Finalizar para produção

10. ✅ **Testes Restantes** - 1-2h
    - Debug testes específicos
    - Ajustes finos

11. ✅ **Documentação** - 1-2h
    - Atualizar PODCAST_WORKFLOW.md
    - Adicionar seção de Approval Flow
    - Atualizar changelog

**Resultado Esperado**: 41/41 testes passando (100%)

---

## 📊 Métricas de Progresso

### Status Atual

| Métrica | Valor | Target |
|---------|-------|--------|
| Testes Passando | 0/41 (0%) | 41/41 (100%) |
| Workflows Funcionais | 0/2 | 2/2 |
| Features Implementadas | 3/6 | 6/6 |
| Debt Técnico | Alto | Baixo |

### Status Esperado Após Sprints

| Após Sprint | Testes | Features | Horas Totais |
|-------------|--------|----------|--------------|
| Sprint 1 | 5-10 (12-24%) | 2/6 (33%) | 4-6h |
| Sprint 2 | 20-25 (49-61%) | 5/6 (83%) | 12-18h |
| Sprint 3 | 35-40 (85-98%) | 6/6 (100%) | 16-26h |
| Sprint 4 | 41/41 (100%) | 6/6 (100%) | 18-30h |

**Estimativa Total**: 18-30 horas de desenvolvimento

---

## 🔬 Detalhamento de Testes por Categoria

### Workflow 1: Public Figure (5 testes)

| Teste | Status | Bloqueador | Feature Faltando |
|-------|--------|------------|------------------|
| 1.1: Create episode via research | ❌ | Auth | - |
| 1.2: Display approval button | ❌ | Auth | Botão "Enviar Aprovação" |
| 1.3: Generate approval link | ❌ | Auth | Dialog + Token generation |
| 1.4: Validate episode data | ❌ | Auth | - |
| 1.5: Email delivery method | ❌ | Auth | Email option no dialog |

### Workflow 2: Common Person (6 testes)

| Teste | Status | Bloqueador | Feature Faltando |
|-------|--------|------------|------------------|
| 2.1: Create via manual form | ❌ | Auth | - |
| 2.2: Store contact info | ❌ | Auth | - |
| 2.3: Validate phone format | ❌ | Auth | - |
| 2.4: Display in PreProduction | ❌ | Auth | - |
| 2.5: Generate approval link | ❌ | Auth | Dialog + Token |
| 2.6: Skip Step 2 | ❌ | Auth | - |

### Workflow Comparison (3 testes)

| Teste | Status | Bloqueador | Feature Faltando |
|-------|--------|------------|------------------|
| 3.1: Both create valid episodes | ❌ | Auth | - |
| 3.2: Public has research data | ❌ | Auth | - |
| 3.3: Common has manual data only | ❌ | Auth | - |

### Guest Approval Page (3 testes)

| Teste | Status | Bloqueador | Feature Faltando |
|-------|--------|------------|------------------|
| 4.1: Display page with route | ❌ | Auth | Rota pública configurada |
| 4.2: Handle invalid token | ❌ | Auth | Validação + erro 404 |
| 4.3: Reject expired tokens | ❌ | Auth | Check expiração 30 dias |

### Error Handling (3+ testes)

| Teste | Status | Bloqueador | Feature Faltando |
|-------|--------|------------|------------------|
| 5.1: Gemini API failure fallback | ❌ | Auth | Try/catch + fallback profile |
| 5.2: Network error gracefully | ❌ | Auth | Error boundaries |
| 5.3: Minimal data validation | ❌ | Auth | - |

---

## 🛠️ Arquivos para Criar/Modificar

### Criar (Novos Arquivos)

```
src/modules/podcast/services/
├── approvalService.ts                    # Token generation & validation

supabase/migrations/
├── YYYYMMDD_podcast_approval_tokens.sql  # Nova tabela

tests/e2e/
├── .auth.json                            # Regenerar com fix
```

### Modificar (Arquivos Existentes)

```
tests/e2e/
├── auth.setup.ts                         # Fix session injection

src/modules/podcast/views/
├── PreProductionHub.tsx                  # Adicionar botão aprovação
├── GuestApprovalPage.tsx                 # Validação de token

src/modules/podcast/components/
├── GuestApprovalLinkDialog.tsx           # Integrar geração

src/modules/podcast/services/
├── guestResearchService.ts               # Error handling

src/pages/
├── Home.tsx                              # Texto "Podcast Copilot"

src/
├── App.tsx ou routes.tsx                 # Rota pública /guest-approval/:token

docs/modules/
├── PODCAST_WORKFLOW.md                   # Adicionar seção Approval
```

---

## 📖 Referências

- **Test File**: `tests/e2e/podcast-guest-approval-flow.spec.ts`
- **Page Object**: `tests/e2e/pages/GuestWizardPage.ts`
- **Workflow Docs**: `docs/modules/PODCAST_WORKFLOW.md`
- **PR Original**: #19 (Phases 1-4)
- **GitHub Issue**: #15

---

## 🎬 Próximos Passos Imediatos

1. **Revisar este documento** com o time
2. **Decidir abordagem** (Opção A vs B para integração wizard)
3. **Criar issues no GitHub** para cada Sprint
4. **Iniciar Sprint 1** (Fix auth + integração wizard)
5. **Daily checkpoint** após cada ação prioritária

---

**Última Atualização**: 2 Janeiro 2026
**Autor**: Claude Code Analysis
**Status**: Aguardando decisão de implementação
