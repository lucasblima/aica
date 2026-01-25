# Implementation Plan - Issue #92
## feat(whatsapp): Exibir lista de contatos sincronizados com UI rica

**Issue:** https://github.com/lucasblima/Aica_frontend/issues/92
**Priority:** P1-high
**Type:** Frontend/UX

---

## Estado Atual

### Componentes Existentes
| Componente | Localização | Descrição |
|------------|-------------|-----------|
| `ContactsView.tsx` | `src/pages/` | Página principal com grid básico |
| `ContactCard.tsx` | `src/components/features/` | Card simples com avatar, nome, health score |
| `ContactCardGrid.tsx` | `src/components/features/` | Grid com loading/empty states |
| `ContactDetailModal.tsx` | `src/components/features/` | Modal com notas e análise Aica |
| `VirtualList.tsx` | `src/modules/connections/components/` | Virtualização pronta com @tanstack/react-virtual |

### Serviços Disponíveis
- `contactNetworkService.ts` - CRUD, health score, sentiment
- `contactSearchService.ts` - Busca semântica com embeddings
- `whatsappContactSyncService.ts` - Sincronização WhatsApp

### Campos Disponíveis (contact_network)
```typescript
// WhatsApp
whatsapp_id, whatsapp_phone, whatsapp_name,
whatsapp_profile_pic_url, last_whatsapp_message_at, whatsapp_metadata

// Core
name, phone_number, email, avatar_url, relationship_type

// Métricas
health_score, sentiment_trend, engagement_level,
interaction_count, last_interaction_at
```

---

## Tasks de Implementação

### PHASE 1: UI Foundation
**Objetivo:** Criar componentes utilitários base

| Task | Descrição | Arquivos | Status |
|------|-----------|----------|--------|
| 1.1 | Criar utility `formatRelativeTime()` | `src/lib/dateUtils.ts` | ✅ Done |
| 1.2 | Criar `RelationshipScoreBadge` com cores e emojis | `src/components/ui/RelationshipScoreBadge.tsx` | ✅ Done |
| 1.3 | Criar `ContactAvatar` com fallback chain (WhatsApp pic → initials) | `src/components/ui/ContactAvatar.tsx` | ✅ Done |

**Acceptance Criteria Phase 1:**
- [x] `formatRelativeTime(date)` retorna "há X dias/horas/minutos"
- [x] Badge mostra score colorido (verde >70, amarelo 40-70, vermelho <40)
- [x] Avatar mostra foto do WhatsApp ou iniciais como fallback

---

### PHASE 2: WhatsApp Contact Card
**Objetivo:** Card rico com todas as informações do contato

| Task | Descrição | Arquivos | Status |
|------|-----------|----------|--------|
| 2.1 | Criar `WhatsAppContactCard.tsx` com layout rico | `src/modules/connections/components/WhatsAppContactCard.tsx` | ✅ Done |
| 2.2 | Adicionar quick actions (Chat, Favoritar) | Mesmo arquivo | ✅ Done |
| 2.3 | Exibir última mensagem com timestamp relativo | Mesmo arquivo | ✅ Done |
| 2.4 | Adicionar indicadores visuais (online, favorito, novo) | Mesmo arquivo | ✅ Done |

**Acceptance Criteria Phase 2:**
- [x] Card exibe: avatar, nome, telefone, health score, última interação
- [x] Botões de ação funcionais
- [x] Timestamp "Última mensagem há X dias" visível
- [x] Card responsivo (mobile-first)

---

### PHASE 3: Lista com Performance e Filtros
**Objetivo:** Lista virtualizada com filtros avançados

| Task | Descrição | Arquivos | Status |
|------|-----------|----------|--------|
| 3.1 | Criar `WhatsAppContactList.tsx` usando VirtualList existente | `src/modules/connections/components/WhatsAppContactList.tsx` | ✅ Done |
| 3.2 | Implementar hook `useContactFilters` | `src/modules/connections/hooks/useContactFilters.ts` | ✅ Done |
| 3.3 | Criar UI de filtros (chips: Todos, Favoritos, Recentes, Por categoria) | `src/modules/connections/components/ContactFilters.tsx` | ✅ Done |
| 3.4 | Implementar ordenação (nome, score, última interação) | `src/modules/connections/hooks/useContactFilters.ts` (combined) | ✅ Done |
| 3.5 | Criar barra de busca integrada | `src/modules/connections/components/ContactSearchBar.tsx` | ✅ Done |

**Acceptance Criteria Phase 3:**
- [x] Lista renderiza 500+ contatos sem lag (<16ms por frame)
- [x] Filtros funcionam combinados
- [x] Busca por nome/telefone instantânea (debounced)
- [x] Ordenação persiste na sessão

---

### PHASE 4: Integração e Polish
**Objetivo:** Integrar na ContactsView e finalizar

| Task | Descrição | Arquivos | Status |
|------|-----------|----------|--------|
| 4.1 | Integrar componentes na `ContactsView.tsx` | `src/pages/ContactsView.tsx` | ✅ Done |
| 4.2 | Criar empty states customizados por filtro | `WhatsAppContactList.tsx` (built-in) | ✅ Done |
| 4.3 | Otimizar performance (React.memo, useMemo) | Todos os componentes novos | ✅ Done |
| 4.4 | Adicionar testes unitários | `src/modules/connections/__tests__/` | ⏳ Follow-up |

**Acceptance Criteria Phase 4:**
- [x] ContactsView usa novos componentes
- [x] Empty states informativos para cada filtro
- [ ] Lighthouse Performance Score > 90 (requires deployment verification)
- [ ] Cobertura de testes > 80% (follow-up task)

---

## Arquitetura de Componentes

```
ContactsView.tsx (page)
├── ContactSearchBar.tsx
├── ContactFilters.tsx (chips de filtro)
└── WhatsAppContactList.tsx (virtualizado)
    └── WhatsAppContactCard.tsx (cada item)
        ├── ContactAvatar.tsx
        ├── RelationshipScoreBadge.tsx
        └── QuickActions (Chat, Favorite)
```

---

## Dependências entre Tasks

```
Phase 1 (Foundation)
    │
    ├── 1.1 formatRelativeTime ──┐
    ├── 1.2 ScoreBadge ──────────┼──→ Phase 2 (Card)
    └── 1.3 Avatar ──────────────┘        │
                                          │
                                          ▼
                                    Phase 3 (List)
                                          │
                                          ▼
                                    Phase 4 (Integration)
```

---

## Estimativa de Tempo

| Phase | Tasks | Estimativa |
|-------|-------|------------|
| Phase 1 | 3 tasks | ~2h |
| Phase 2 | 4 tasks | ~3h |
| Phase 3 | 5 tasks | ~4h |
| Phase 4 | 4 tasks | ~3h |
| **Total** | **16 tasks** | **~12h** |

---

## Notas de Implementação

1. **Evitar conflitos com #118:** Não modificar `webhook-evolution` ou serviços de backend
2. **Reutilizar VirtualList:** Já existe em `src/modules/connections/components/`
3. **Design System:** Seguir padrões existentes em `ContactCard.tsx`
4. **Mobile-first:** Todos os componentes devem ser responsivos
5. **Acessibilidade:** Usar roles ARIA apropriados

---

**Criado em:** 2026-01-22
**Última atualização:** 2026-01-22
**Status:** ✅ Implementation Complete (Tests pending as follow-up)
