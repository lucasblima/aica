# Resumo Visual - Redesign Módulo Podcast

## Comparação: Antes vs Depois

### ANTES - Fluxo Atual (Problemático)

```
┌─────────────────────────────────────────────────────┐
│  CADASTRO DE CONVIDADO                              │
│  GuestIdentificationWizard                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Digite nome + referência                        │
│     └─> searchGuestProfile()                        │
│         ├─> [SUCESSO] Mostra perfil                │
│         │   └─> Confirma                            │
│         │       └─> Define tema                     │
│         │           └─> Cria episódio               │
│         │                                           │
│         └─> [FALHA] Cria perfil "fallback"         │
│             └─> ⚠️  Não avisa claramente           │
│                 └─> Usuário acha que deu certo    │
│                                                     │
│  PROBLEMAS:                                         │
│  ❌ Sem distinção público/comum                    │
│  ❌ Não coleta email/WhatsApp                      │
│  ❌ Feedback inadequado em falhas                  │
│  ❌ Confiança da pesquisa escondida                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  PESQUISA E CURADORIA                               │
│  PreProductionHub                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Bio] [Ficha] [News] [Chat]                       │
│                                                     │
│  "Eduardo Paes (Rio de Janeiro, 1969) é um        │
│   advogado e político brasileiro..."               │
│                                                     │
│  📊 Fontes: ???                                     │
│  📊 Qualidade: ???                                  │
│  📊 De onde veio isso: ???                          │
│                                                     │
│  [+ Adicionar Fontes] ← Botão escondido lá embaixo│
│                                                     │
│  PROBLEMAS:                                         │
│  ❌ Fontes invisíveis                              │
│  ❌ Sem indicador de confiabilidade                │
│  ❌ Chat não funciona (mock)                       │
│  ❌ Processar fontes falha silenciosamente         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  GERAÇÃO DE PAUTA                                   │
│  PautaGeneratorPanel                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tema: _______________  (já foi definido antes!)   │
│  Contexto: ___________                              │
│  Fontes: [+]  (de novo??)                          │
│  Tom: [Casual] [Formal]                            │
│  Duração: 60min                                     │
│                                                     │
│  [Gerar]                                            │
│  ↓                                                  │
│  Preview (READ-ONLY)                                │
│  [Aplicar] → Salva + converte para Topics         │
│                                                     │
│  PROBLEMAS:                                         │
│  ❌ Campos redundantes                             │
│  ❌ Preview não editável                           │
│  ❌ Sem aprovação do convidado                     │
│  ❌ Versionamento confuso                          │
└─────────────────────────────────────────────────────┘
```

---

### DEPOIS - Novo Fluxo (Proposto)

```
┌─────────────────────────────────────────────────────┐
│  FASE 1: IDENTIFICAÇÃO                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tela 1: TIPO DE CONVIDADO                          │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 🌐 PÚBLICO   │  │ 👤 COMUM     │                │
│  │              │  │              │                │
│  │ IA busca     │  │ Você preenche│                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  └─> [Público]                                      │
│      ├─> Tela 2A: Nome + Referência                │
│      │   └─> searchGuestProfile()                  │
│      │       └─> Tela 3: CONFIRMAÇÃO               │
│      │           📊 Confiança: 95%                  │
│      │           📰 Fontes: 12 encontradas          │
│      │           ✅ Wikipedia, G1, O Globo          │
│      │           └─> Confirmar                      │
│      │                                               │
│      └─> [Comum]                                    │
│          └─> Tela 2B: Cadastro Manual              │
│              ├─> Nome completo                     │
│              ├─> Profissão                         │
│              ├─> Bio curta                         │
│              ├─> 📧 Email (obrigatório)            │
│              └─> 📱 WhatsApp (opcional)            │
│                                                     │
│  ✅ Clara distinção público/comum                  │
│  ✅ Coleta contatos desde o início                 │
│  ✅ Feedback transparente                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  FASE 2: CURADORIA                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tela 4: CENTRO DE PESQUISA                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ Eduardo Paes - Prefeito do Rio              │   │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│  │                                             │   │
│  │ [Bio] [Ficha] [Notícias] [FONTES]          │   │
│  │                                             │   │
│  │ 📊 Qualidade: 95% (Excelente)              │   │
│  │                                             │   │
│  │ Fontes Consultadas:                         │   │
│  │ ✅ Wikipedia - Alta confiabilidade          │   │
│  │ ✅ G1 Globo - Alta confiabilidade           │   │
│  │ ⚠️  Blog Político - Média confiabilidade    │   │
│  │                                             │   │
│  │ [+ Adicionar Fontes Personalizadas]        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ✅ Fontes sempre visíveis                         │
│  ✅ Badges de confiabilidade                       │
│  ✅ Qualidade numérica clara                       │
│  ✅ Botão "Editar Informações"                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  FASE 3: GERAÇÃO DE PAUTA                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tela 5: CONFIGURAR PAUTA                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ Tema: Gestão Pública no Rio                  │ │
│  │ Duração: [30m] [60m✓] [90m] [120m]          │ │
│  │ Tom: [Formal] [Casual] [Humano✓]            │ │
│  │ Profundidade: [────●────] (slider)           │ │
│  │ Foco: #Urbanismo #Saúde                      │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Tela 6: PREVIEW EDITÁVEL                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🎬 Abertura (5 min)           [✏️ Editar]    │ │
│  │ • Apresentação do convidado                  │ │
│  │ • Quebra-gelo sobre trajetória               │ │
│  │                                               │ │
│  │ 📍 Bloco 1 (20 min)           [✏️ Editar]    │ │
│  │ • Principais desafios                        │ │
│  │ • Projetos prioritários                      │ │
│  │                                               │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │ 📊 Qualidade: 92% | 📚 18 fontes            │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [💾 Salvar] [✏️ Editar] [📤 Enviar ao Convidado]  │
│                                                     │
│  ✅ Editável por seção                             │
│  ✅ Indicadores claros                             │
│  ✅ Opção de aprovação                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  FASE 4: APROVAÇÃO (NOVO!)                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tela 7: ENVIAR PARA APROVAÇÃO                      │
│  ┌───────────────────────────────────────────────┐ │
│  │ Enviar para:                                  │ │
│  │ Eduardo Paes                                  │ │
│  │ 📧 eduardo.paes@rio.rj.gov.br                │ │
│  │                                               │ │
│  │ O convidado receberá:                         │ │
│  │ • Link para visualizar pauta                 │ │
│  │ • Botão "Aprovar" ou "Sugerir Mudanças"     │ │
│  │                                               │ │
│  │ Prazo: [3 dias ▼]                            │ │
│  │                                               │ │
│  │ [📤 Enviar Email] [📱 Enviar WhatsApp]       │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Tela 8: STATUS                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Timeline:                                     │ │
│  │ ✅ 10/12 14:30 - Pauta gerada                │ │
│  │ ✅ 10/12 14:35 - Enviada                     │ │
│  │ ✅ 10/12 15:00 - Visualizada                 │ │
│  │ ⏳ Aguardando retorno (prazo: 13/12)         │ │
│  │                                               │ │
│  │ 💬 Comentário do Convidado:                  │ │
│  │ "Sugiro adicionar pergunta sobre             │ │
│  │  revitalização da Zona Portuária"            │ │
│  │                                               │ │
│  │ [Responder] [Adicionar à Pauta]              │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ✅ Transparência total                            │
│  ✅ Comunicação bidirecional                       │
│  ✅ Versionamento claro                            │
└─────────────────────────────────────────────────────┘
```

---

## Mapa de Componentes

```
src/modules/podcast/
│
├── components/
│   ├── GuestTypeSelector.tsx           ← NOVO
│   ├── GuestManualForm.tsx             ← NOVO
│   ├── SourceCredibilityBadge.tsx      ← NOVO
│   ├── ResearchQualityIndicator.tsx    ← NOVO
│   ├── EditableOutlineSection.tsx      ← NOVO
│   ├── PautaApprovalPanel.tsx          ← NOVO
│   ├── PautaStatusTracker.tsx          ← NOVO
│   │
│   ├── GuestIdentificationWizard.tsx   ← MODIFICAR
│   ├── PreProductionHub.tsx            ← MODIFICAR
│   └── PautaGeneratorPanel.tsx         ← MODIFICAR
│
├── services/
│   ├── guestApprovalService.ts         ← NOVO
│   ├── sourceReliabilityService.ts     ← NOVO
│   │
│   ├── podcastProductionService.ts     ← MODIFICAR
│   └── pautaGeneratorService.ts        ← OK (não precisa mudar)
│
└── types.ts                             ← ADICIONAR TIPOS
```

---

## Diagrama de Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────┐
│  DATABASE SCHEMA                                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  podcast_episodes                                              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id, show_id, title, guest_name, episode_theme            │ │
│  │ + guest_type ('public' | 'private')        ← NOVO        │ │
│  │ + guest_email                              ← NOVO        │ │
│  │ + guest_whatsapp                           ← NOVO        │ │
│  │ biography, controversies, technical_sheet                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  podcast_guest_research (já existe)                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ episode_id, guest_name, guest_reference                  │ │
│  │ biography, bio_sources                                   │ │
│  │ full_name, occupation, social_media                      │ │
│  │ controversies, research_quality_score                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  podcast_pauta_sources (já existe)                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ pauta_id, source_type, title, url, snippet               │ │
│  │ + reliability ('high'|'medium'|'low')      ← NOVO        │ │
│  │ + domain                                   ← NOVO        │ │
│  │ + is_whitelisted                           ← NOVO        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  podcast_pauta_approvals                       ← NOVA TABELA  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id, pauta_id, approval_token, status                     │ │
│  │ sent_via ('email' | 'whatsapp')                          │ │
│  │ sent_at, viewed_at, responded_at                         │ │
│  │ guest_comments (JSONB)                                   │ │
│  │ expires_at                                               │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Implementação

### ✅ FASE 1: Fundação (1-2 dias)
- [ ] Criar migration para adicionar colunas `guest_type`, `guest_email`, `guest_whatsapp`
- [ ] Criar componente `GuestTypeSelector`
- [ ] Criar componente `GuestManualForm`
- [ ] Atualizar `GuestIdentificationWizard` para usar novo fluxo
- [ ] Testar fluxo público vs comum

### ✅ FASE 2: Transparência (2-3 dias)
- [ ] Criar `sourceReliabilityService` com domain whitelist
- [ ] Criar componente `SourceCredibilityBadge`
- [ ] Criar componente `ResearchQualityIndicator`
- [ ] Adicionar colunas `reliability`, `domain`, `is_whitelisted` em `podcast_pauta_sources`
- [ ] Atualizar `PreProductionHub` para mostrar badges
- [ ] Atualizar `pautaGeneratorService` para avaliar fontes

### ✅ FASE 3: Edição (1-2 dias)
- [ ] Criar componente `EditableOutlineSection`
- [ ] Tornar `PautaGeneratorPanel` preview editável
- [ ] Implementar auto-save de edições
- [ ] Adicionar modal de edição completa

### ✅ FASE 4: Aprovação (3-4 dias)
- [ ] Criar migration para tabela `podcast_pauta_approvals`
- [ ] Criar `guestApprovalService`
- [ ] Implementar função `generateApprovalLink()`
- [ ] Criar componente `PautaApprovalPanel`
- [ ] Criar página pública `/approve/{token}`
- [ ] Integrar email (SendGrid/Resend)
- [ ] Implementar WhatsApp (wa.me fallback)

### ✅ FASE 5: Tracking (1-2 dias)
- [ ] Criar componente `PautaStatusTracker`
- [ ] Implementar Supabase Realtime subscriptions
- [ ] Adicionar notificações de mudança de status
- [ ] Criar painel de comentários do convidado

### ✅ FASE 6: Polimento (1-2 dias)
- [ ] Animações de transição suaves
- [ ] Loading skeletons
- [ ] Empty states informativos
- [ ] Testes E2E do fluxo completo
- [ ] Documentação de usuário

---

## Decisões de Design - Rationale

### Por que separar Figura Pública vs Pessoa Comum?

**Problema:** Sistema atual assume que todo convidado é figura pública, tentando buscar na web. Quando falha, cria perfil "fake" sem avisar.

**Solução:** Deixar usuário escolher no início. Se é pessoa comum, não desperdiça chamadas de API e coleta dados manualmente desde o início.

**Benefício:**
- ✅ Elimina falsos positivos
- ✅ Expectativas claras
- ✅ Melhor qualidade de dados

---

### Por que mostrar fontes SEMPRE?

**Problema:** Usuário não confia nos dados porque não sabe de onde vêm.

**Solução:** Inspirado no NotebookLM e Perplexity - SEMPRE mostra citações.

**Benefício:**
- ✅ Transparência
- ✅ Credibilidade
- ✅ Permite verificação manual
- ✅ Usuário pode adicionar fontes específicas

---

### Por que aprovação do convidado?

**Problema:** Convidado é surpreendido com perguntas que não esperava, criando momentos constrangedores.

**Solução:** Enviar pauta antecipadamente e permitir comentários/aprovação.

**Benefício:**
- ✅ Melhor preparação do convidado
- ✅ Evita surpresas negativas
- ✅ Aumenta qualidade da entrevista
- ✅ Profissionalismo

---

### Por que edição inline?

**Problema:** Preview read-only frustra usuários que querem ajustar detalhes.

**Solução:** Permitir edição direta em cada seção, com auto-save.

**Benefício:**
- ✅ Controle total
- ✅ Iteração rápida
- ✅ Menos cliques
- ✅ Workflow mais fluido

---

## Próximos Passos

1. **Validação com usuário:** Mostrar protótipos das telas e coletar feedback
2. **Priorização:** Definir qual fase implementar primeiro
3. **Setup de infraestrutura:** Escolher serviço de email/WhatsApp
4. **Desenvolvimento:** Iniciar pela Fase 1 (fundação)

---

**Última atualização:** 2025-12-10
