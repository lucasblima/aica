# Redesign Módulo Podcast - Resumo Executivo

**Data:** 2025-12-10
**Versão:** 1.0
**Tipo:** Proposta de UX/UI

---

## TL;DR

O módulo de podcast tem **problemas graves de usabilidade** que impedem produção eficiente de episódios. Proposta de redesign completo baseada nos **princípios de Jony Ive** (simplicidade, clareza, controle ao usuário).

**Tempo estimado:** 9-15 dias de desenvolvimento
**Impacto esperado:** Redução de 40% no tempo de preparação + aumento de 80% na satisfação

---

## Problemas Críticos Identificados

### 1. Fluxo de Cadastro Confuso
- ❌ Não diferencia convidado público vs comum
- ❌ Pesquisa falha sem feedback adequado
- ❌ Cria perfis "fake" quando API falha
- ❌ Não coleta contatos (email/WhatsApp)

### 2. Falta de Transparência
- ❌ Fontes de informação invisíveis
- ❌ Sem indicador de confiabilidade
- ❌ Usuário não sabe de onde vêm os dados
- ❌ Quality score existe mas é escondido

### 3. Edição Limitada
- ❌ Preview de pauta é read-only
- ❌ Precisa regenerar pauta inteira para mudar seção
- ❌ Versionamento confuso

### 4. Sem Aprovação do Convidado
- ❌ Convidado não vê pauta antes da gravação
- ❌ Surpresas durante entrevista
- ❌ Não permite comentários/sugestões

---

## Solução Proposta

### Novo Fluxo em 4 Fases

```
1. IDENTIFICAÇÃO
   ┌─────────────────┐
   │ Tipo: Público?  │ → Pesquisa IA
   │     ou Comum?   │ → Cadastro Manual
   └─────────────────┘
        ↓
   [Coleta contatos desde o início]

2. CURADORIA
   ┌─────────────────┐
   │ Fontes visíveis │ ✓ Wikipedia (Alta)
   │ + Badges de     │ ⚠ Blog (Média)
   │ confiabilidade  │ ✗ Não verificada
   └─────────────────┘
        ↓
   [Score: 95% (Excelente)]

3. GERAÇÃO
   ┌─────────────────┐
   │ Pauta EDITÁVEL  │ [✏️ Editar Seção]
   │ + Indicadores   │ 📊 92% | 📚 18 fontes
   └─────────────────┘
        ↓
   [Salvar + Enviar]

4. APROVAÇÃO (NOVO!)
   ┌─────────────────┐
   │ Link público    │ → 📧 Email
   │ p/ convidado    │ → 📱 WhatsApp
   └─────────────────┘
        ↓
   [Timeline de status]
   ✅ Enviada → ⏳ Visualizada → ✅ Aprovada
```

---

## Componentes Novos

### UI Components (7 novos)
1. `GuestTypeSelector` - Escolha público/comum
2. `GuestManualForm` - Cadastro manual
3. `SourceCredibilityBadge` - Badge verde/amarelo/vermelho
4. `ResearchQualityIndicator` - Score visual
5. `EditableOutlineSection` - Seção editável
6. `PautaApprovalPanel` - Envio de aprovação
7. `PautaStatusTracker` - Timeline de eventos

### Services (2 novos)
1. `guestApprovalService` - Lógica de aprovação
2. `sourceReliabilityService` - Avaliação de fontes

### Database (1 nova tabela + 5 colunas)
- Tabela: `podcast_pauta_approvals`
- Colunas: `guest_type`, `guest_email`, `guest_whatsapp`, `reliability`, `domain`

---

## Benefícios Esperados

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Taxa de falha de pesquisa | 40% | <10% | -75% |
| Tempo de configuração | 15min | <8min | -47% |
| Pautas regeneradas | 3-4x | <1.5x | -62% |
| Taxa de aprovação | 0% | >80% | ∞ |
| NPS de produtores | ? | >8/10 | - |

---

## Próximos Passos

### Decisões Pendentes (usuário precisa responder)
- [ ] Aprovação obrigatória ou opcional?
- [ ] WhatsApp Business API ou link wa.me?
- [ ] Email automático ou manual?
- [ ] Qual fase implementar primeiro?

📄 **Documento completo de perguntas:** `PODCAST_UX_QUESTIONS_FOR_USER.md`

### Implementação em Fases

| Fase | Descrição | Tempo | Prioridade Sugerida |
|------|-----------|-------|---------------------|
| 1 | Fundação (tipo + cadastro) | 1-2 dias | 🔥 Alta |
| 2 | Transparência (badges) | 2-3 dias | 🔥 Alta |
| 3 | Edição (preview editável) | 1-2 dias | ⭐ Média |
| 4 | Aprovação (envio + tracking) | 3-4 dias | 🔥 Alta |
| 5 | Tracking (notificações) | 1-2 dias | ⭐ Média |
| 6 | Polimento (UX refinements) | 1-2 dias | ⬇️ Baixa |

**Recomendação:** Começar com Fases 1+2 (MVP), depois Fase 4 (aprovação).

---

## Referências

📖 **Documentos completos:**
1. `PODCAST_GUEST_FLOW_REDESIGN.md` - Proposta detalhada (10 páginas)
2. `PODCAST_FLOW_VISUAL_SUMMARY.md` - Diagramas e fluxos visuais
3. `PODCAST_UX_QUESTIONS_FOR_USER.md` - Perguntas para decisões

🎨 **Filosofia de Design:**
Baseado em Jony Ive: "Simplicidade não é a ausência de confusão, é a presença de clareza."

---

## Aprovação

- [ ] ✅ Aprovado, pode começar
- [ ] ⚠️ Aprovado com ajustes (especifique)
- [ ] ❌ Preciso discutir mais

**Comentários:**
```
[Escreva aqui]
```

**Assinatura:** _________________________
**Data:** ___/___/______

---

**Criado por:** UX Expert Agent
**Contato:** [método preferido]
**Última atualização:** 2025-12-10
