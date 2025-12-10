# Redesign do Fluxo de Cadastro e Pesquisa de Convidados - Módulo Podcast

**Data:** 2025-12-10
**Auditor:** UX Expert Agent
**Filosofia:** Princípios de Design de Jony Ive

---

## Executive Summary

O módulo de podcast apresenta problemas críticos de usabilidade que impedem a produção eficiente de episódios. Este documento propõe um redesign completo baseado nos princípios de simplicidade, clareza e foco no usuário.

**Problemas Identificados:**
- Fluxo de cadastro confuso e fragmentado
- Falta de transparência sobre fontes de informação
- Ausência de aprovação de conteúdo pelo convidado
- Pesquisa falha frequentemente sem feedback adequado
- Geração de pautas inconsistente

**Solução Proposta:**
Um fluxo linear, transparente e orientado a tarefas que coloca o usuário no controle total do processo.

---

## 1. Auditoria do Fluxo Atual

### 1.1 Como Funciona Hoje

#### Cadastro de Convidado (GuestIdentificationWizard)

**Fluxo:**
1. Usuário digita nome + referência opcional
2. Sistema chama `searchGuestProfile()` do `podcastProductionService`
3. Se encontrar, mostra perfil para confirmação
4. Usuário escolhe tema (auto ou manual) + scheduling
5. Sistema cria episódio no Supabase
6. Redireciona para PreProductionHub

**Problemas:**
- ❌ **Feedback inadequado quando pesquisa falha** - cria perfil "fallback" sem deixar claro que os dados são incompletos
- ❌ **Sem distinção entre convidado público vs comum** - trata todos como figuras públicas
- ❌ **Não permite adicionar contatos** - email, WhatsApp são ignorados
- ❌ **Sem indicador de qualidade da pesquisa** - confidence_score existe mas não é mostrado
- ❌ **Erro silencioso** - quando API falha, usa mock sem avisar claramente

#### Pesquisa e Curadoria (PreProductionHub)

**Fluxo:**
1. Sistema carrega dados existentes OU inicia pesquisa automática
2. Chama `generateDossier()` via `geminiService`
3. Exibe biografia, ficha técnica, notícias em tabs
4. Permite adicionar fontes personalizadas (dialog modal)
5. Chat com IA para perguntas sobre o convidado

**Problemas:**
- ❌ **Fontes não são mostradas** - usuário não sabe de onde vêm as informações
- ❌ **Sem indicador de confiabilidade** - todas as informações parecem igualmente válidas
- ❌ **Adicionar fontes é "escondido"** - botão discreto na parte inferior
- ❌ **Processamento de fontes falha** - URLs não são realmente buscadas, arquivos não são processados
- ❌ **Chat é mock** - resposta fake, não usa dados reais do dossier
- ❌ **Aviso de "low context" só aparece se bio < 200 chars** - critério arbitrário

#### Geração de Pauta (PautaGeneratorPanel)

**Fluxo:**
1. Usuário clica botão "IA" no PreProductionHub
2. Modal abre com form: tema, contexto, fontes, estilo, duração
3. Sistema gera outline + perguntas + ice breakers
4. Preview em tabs (outline, questions, sources)
5. Usuário aplica pauta
6. Sistema salva no banco + converte para formato legacy

**Problemas:**
- ❌ **Campos redundantes** - tema já foi definido no wizard
- ❌ **Fontes duplicadas** - permite adicionar fontes aqui E no PreProductionHub
- ❌ **Preview é read-only** - não permite editar seções
- ❌ **Sem status de progresso persistente** - não mostra se pauta foi aprovada
- ❌ **Versionamento confuso** - badge mostra "v2 salva" mas não explica o que significa

### 1.2 Dados no Banco

**Tabelas envolvidas:**
```
podcast_episodes
  - id, show_id, title, guest_name, episode_theme
  - biography, controversies, ice_breakers, technical_sheet
  - status, scheduled_date, location
  - recording_*, transcript_*, cuts_*

podcast_guest_research
  - episode_id, guest_name, guest_reference
  - biography, bio_summary, bio_sources
  - full_name, birth_date, occupation, social_media
  - controversies, recent_news, custom_sources
  - chat_history, low_context_warning, research_quality_score

podcast_generated_pautas
  - episode_id, user_id, guest_name, theme, version
  - biography, key_facts, controversies, technical_sheet
  - outline_title, estimated_duration, confidence_score
  - tone, depth, focus_areas, ice_breakers, is_active

podcast_pauta_outline_sections
  - pauta_id, section_type, title, description, duration, key_points

podcast_pauta_questions
  - pauta_id, question_text, category, priority, follow_ups, context

podcast_pauta_sources
  - pauta_id, source_type, title, url, snippet, reliability

podcast_topics
  - episode_id, category, question_text, completed, order, archived
  - sponsor_script, is_sponsor_topic

podcast_topic_categories
  - episode_id, name, color, order
```

**Observação:** Redundância entre `podcast_episodes` e `podcast_guest_research` - biografia e technical_sheet duplicados.

---

## 2. Proposta de Novo Fluxo - Filosofia Jony Ive

### 2.1 Princípios Fundamentais

**"Simplicidade não é a ausência de confusão, é a presença de clareza."**

1. **Eliminar etapas desnecessárias** - cada clique deve ter propósito claro
2. **Tornar o invisível visível** - mostrar de onde vêm os dados, qual é a qualidade
3. **Feedback imediato** - usuário sempre sabe o que está acontecendo
4. **Controle ao usuário** - permitir edição, aprovação, reversão
5. **Design orientado a tarefas** - cada tela resolve UMA tarefa específica

### 2.2 Novo Fluxo Proposto

#### FASE 1: Identificação do Convidado

**Objetivo:** Coletar informações básicas e determinar tipo de pesquisa

**Tela 1: Tipo de Convidado**
```
┌─────────────────────────────────────────────────┐
│  Que tipo de convidado você vai entrevistar?   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────┐  ┌───────────────────┐ │
│  │  🌐 Figura Pública│  │  👤 Pessoa Comum  │ │
│  │                   │  │                   │ │
│  │  Pesquisa         │  │  Cadastro         │ │
│  │  automática com   │  │  manual com       │ │
│  │  IA               │  │  informações      │ │
│  │                   │  │  fornecidas       │ │
│  └───────────────────┘  └───────────────────┘ │
│                                                 │
│  Exemplos:                                      │
│  • Figura Pública: Políticos, celebridades,    │
│    CEOs, acadêmicos conhecidos                 │
│  • Pessoa Comum: Empreendedores locais,        │
│    profissionais especializados, ativistas     │
│    comunitários                                 │
└─────────────────────────────────────────────────┘
```

**Por quê?** Elimina falsos positivos - se o sistema sabe que é "pessoa comum", não tenta buscar na Wikipedia.

---

**Tela 2A: Figura Pública - Pesquisa Automática**
```
┌─────────────────────────────────────────────────┐
│  Nome do Convidado                              │
│  ┌───────────────────────────────────────────┐ │
│  │ Eduardo Paes                              │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Referência (opcional - ajuda a IA)            │
│  ┌───────────────────────────────────────────┐ │
│  │ Prefeito do Rio de Janeiro               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Voltar]              [Buscar Perfil →]       │
└─────────────────────────────────────────────────┘
```

**Tela 2B: Pessoa Comum - Cadastro Manual**
```
┌─────────────────────────────────────────────────┐
│  Informações do Convidado                       │
│                                                 │
│  Nome Completo *                                │
│  ┌───────────────────────────────────────────┐ │
│  │ Maria Silva Santos                        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Profissão/Área *                               │
│  ┌───────────────────────────────────────────┐ │
│  │ Empreendedora Social                      │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Bio curta (o que você já sabe sobre a pessoa) │
│  ┌───────────────────────────────────────────┐ │
│  │ Fundadora da ONG Educação Para Todos,    │ │
│  │ trabalha com educação inclusiva há 10    │ │
│  │ anos no Rio de Janeiro.                  │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  📧 Email                                       │
│  ┌───────────────────────────────────────────┐ │
│  │ maria@exemplo.com                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  📱 WhatsApp                                    │
│  ┌───────────────────────────────────────────┐ │
│  │ +55 21 99999-9999                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Voltar]              [Continuar →]           │
└─────────────────────────────────────────────────┘
```

**Decisão de Design:** Email e WhatsApp são coletados AQUI, não depois. Fluxo único.

---

**Tela 3: Confirmação de Perfil (Figura Pública)**

```
┌─────────────────────────────────────────────────┐
│  Este é o perfil correto?                       │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐ │
│  │  [Photo]  Eduardo Paes                    │ │
│  │           Prefeito do Rio de Janeiro      │ │
│  │                                           │ │
│  │  Político brasileiro, atual prefeito do   │ │
│  │  Rio de Janeiro desde 2021...            │ │
│  │                                           │ │
│  │  📊 Confiança da Pesquisa: 95%           │ │
│  │  📰 Fontes: 12 encontradas               │ │
│  │  ✓ Wikipedia, G1, O Globo, Veja          │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ⚠️  Se este NÃO for o perfil correto:         │
│  Adicione mais detalhes na referência          │
│  (ex: "Prefeito 2021-2024" ou "Ex-deputado")  │
│                                                 │
│  [← Não é esse]        [✓ Confirmar]          │
└─────────────────────────────────────────────────┘
```

**Novidade:** Mostra indicadores de qualidade IMEDIATAMENTE.

---

#### FASE 2: Curadoria de Informações

**Tela 4: Centro de Pesquisa (Research Hub)**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Eduardo Paes - Prefeito do Rio de Janeiro                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                     │
│  [Bio] [Ficha Técnica] [Notícias] [Fontes]                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Biografia                                                  │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │                                                             │  │
│  │  Eduardo da Costa Paes (Rio de Janeiro, 14 de novembro    │  │
│  │  de 1969) é um advogado e político brasileiro...          │  │
│  │                                                             │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│  │  📊 Qualidade da Pesquisa: 95% (Excelente)                │  │
│  │                                                             │  │
│  │  Fontes Consultadas:                                       │  │
│  │  ✓ Wikipedia (pt.wikipedia.org) - Alta confiabilidade     │  │
│  │  ✓ G1 Globo (g1.globo.com) - Alta confiabilidade          │  │
│  │  ✓ Prefeitura do Rio (rio.rj.gov.br) - Oficial            │  │
│  │  ⚠ Blog político (exemplo.com) - Média confiabilidade     │  │
│  │                                                             │  │
│  │  [+ Adicionar Fontes Personalizadas]                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [← Voltar]  [Editar Informações]  [Gerar Pauta →]                │
└─────────────────────────────────────────────────────────────────────┘
```

**Mudanças Críticas:**
1. **Fontes sempre visíveis** - badge de confiabilidade por fonte
2. **Qualidade numérica clara** - "95% (Excelente)" vs só "confidence_score: 95"
3. **Botão "Editar Informações"** - permite corrigir erros da IA

---

**Modal: Adicionar Fontes Personalizadas**

```
┌─────────────────────────────────────────────────┐
│  Adicionar Fontes Personalizadas                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Por que adicionar fontes?                      │
│  • Enriquecer informações sobre o convidado    │
│  • Garantir precisão de dados específicos      │
│  • Adicionar contexto único da sua pesquisa    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ [📄 Upload] [🔗 Link] [📝 Texto]        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  (UPLOAD ativo)                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Solte o arquivo aqui ou clique         │   │
│  │  para selecionar                        │   │
│  │                                         │   │
│  │  Formatos: PDF, TXT, DOCX, XLSX        │   │
│  │  Tamanho máximo: 10MB                  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Arquivos adicionados:                         │
│  ┌─────────────────────────────────────────┐   │
│  │ 📄 curriculo_eduardo_paes.pdf (2.3 MB) │   │
│  │    Processando... [████████░░] 80%     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ⚠️  Importante: Arquivos são analisados       │
│     pela IA e citados nas perguntas geradas.   │
│                                                 │
│  [Cancelar]                    [Processar]     │
└─────────────────────────────────────────────────┘
```

**Novidade:** Feedback de processamento REAL, não silencioso.

---

#### FASE 3: Geração e Aprovação de Pauta

**Tela 5: Configurar Pauta**

```
┌─────────────────────────────────────────────────┐
│  Gerar Pauta para Eduardo Paes                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tema do Episódio                               │
│  ┌───────────────────────────────────────────┐ │
│  │ Desafios da Gestão Pública no Rio        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Duração estimada                               │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐          │
│  │ 30m │  │ 60m │  │ 90m │  │120m │          │
│  └─────┘  └──█──┘  └─────┘  └─────┘          │
│           (selecionado)                         │
│                                                 │
│  Tom da Conversa                                │
│  ┌─────────────────────────────────────────┐   │
│  │ ○ Formal      ○ Casual                  │   │
│  │ ● Humano      ○ Investigativo           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Profundidade                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Rasa  ────●─────────── Profunda        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Áreas de Foco (opcional)                       │
│  ┌───────────────────────────────────────────┐ │
│  │ #Urbanismo #SaúdePública #Educação       │ │
│  │ [+ Adicionar]                            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [← Voltar]              [Gerar Pauta →]       │
└─────────────────────────────────────────────────┘
```

**Mudança:** Campos intuitivos com sliders visuais.

---

**Tela 6: Preview da Pauta Gerada**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Pauta Gerada - Eduardo Paes                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                     │
│  [Estrutura] [Perguntas] [Fontes] [Exportar]                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ESTRUTURA DO EPISÓDIO (60 min)                            │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│  │                                                             │  │
│  │  🎬 Abertura (5 min)                           [Editar]    │  │
│  │  • Apresentação do convidado                              │  │
│  │  • Contextualização do tema                               │  │
│  │  • Quebra-gelo sobre trajetória política                  │  │
│  │                                                             │  │
│  │  📍 Bloco 1: Gestão da Cidade (20 min)        [Editar]    │  │
│  │  • Principais desafios enfrentados                        │  │
│  │  • Projetos prioritários da gestão                        │  │
│  │  • Relação com governo estadual/federal                   │  │
│  │                                                             │  │
│  │  ☕ Intervalo/Patrocínio (2 min)              [Editar]    │  │
│  │                                                             │  │
│  │  📍 Bloco 2: Polêmicas e Desafios (18 min)   [Editar]    │  │
│  │  • Críticas à administração anterior                      │  │
│  │  • Posicionamento sobre casos controversos                │  │
│  │  • Planos para reduzir violência urbana                   │  │
│  │                                                             │  │
│  │  🎯 Fechamento (10 min)                        [Editar]    │  │
│  │  • Visão de futuro para o Rio                            │  │
│  │  • Mensagem aos cariocas                                  │  │
│  │  • Recado final                                           │  │
│  │                                                             │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│  │  📊 Qualidade: 92% | 📚 18 fontes | ⏱️ 55-65 min real   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Ações:                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ 📤 Enviar  │  │ 💾 Salvar  │  │ ✏️ Editar │  │ 🔄 Regenerar│  │
│  │ ao Convidado│  │ Rascunho   │  │ Completo  │  │            │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                     │
│  [← Voltar]                        [Aplicar e Continuar →]        │
└─────────────────────────────────────────────────────────────────────┘
```

**Mudanças Críticas:**
1. **Botões de edição por seção** - não é read-only
2. **Botão "Enviar ao Convidado"** - novo fluxo de aprovação
3. **Indicadores claros** - qualidade, fontes, tempo estimado

---

**Tela 7: Enviar para Aprovação do Convidado**

```
┌─────────────────────────────────────────────────┐
│  Enviar Pauta para Aprovação                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  A pauta será enviada para:                     │
│                                                 │
│  Eduardo Paes                                   │
│  📧 eduardo.paes@rio.rj.gov.br                 │
│  📱 +55 21 99999-9999                          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ✓ Estrutura do episódio                   │ │
│  │ ✓ Perguntas principais (20)               │ │
│  │ ✓ Tópicos sensíveis destacados            │ │
│  │ ✗ Fontes de pesquisa (privado)            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  O convidado receberá:                          │
│  • Link para visualizar a pauta online         │
│  • Possibilidade de comentar/sugerir mudanças  │
│  • Botão "Aprovar" ou "Solicitar Alterações"   │
│                                                 │
│  Mensagem personalizada (opcional):             │
│  ┌───────────────────────────────────────────┐ │
│  │ Olá Eduardo! Segue a pauta que preparamos │ │
│  │ para nossa conversa. Fique à vontade para │ │
│  │ sugerir alterações.                       │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Prazo para aprovação:                          │
│  ┌─────────┐                                    │
│  │ 3 dias  ▼│                                   │
│  └─────────┘                                    │
│                                                 │
│  [Cancelar]        [📤 Enviar por Email]       │
│                    [📱 Enviar por WhatsApp]     │
└─────────────────────────────────────────────────┘
```

**Novidade:** Fluxo de aprovação externo - convidado não precisa ter conta.

---

#### FASE 4: Acompanhamento de Aprovação

**Tela 8: Status da Pauta**

```
┌─────────────────────────────────────────────────┐
│  Pauta - Eduardo Paes                           │
│  Status: ⏳ Aguardando Aprovação                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Timeline:                                      │
│  ✅ 10/12 14:30 - Pauta gerada                 │
│  ✅ 10/12 14:35 - Enviada para aprovação       │
│  ⏳ 10/12 15:00 - Visualizada pelo convidado   │
│  ⏳ Aguardando retorno (prazo: 13/12)          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  💬 Comentários do Convidado (1 novo)     │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                                           │ │
│  │  Eduardo Paes - 10/12 15:05              │ │
│  │  "Gostei muito da estrutura! Sugiro      │ │
│  │   adicionar uma pergunta sobre o projeto │ │
│  │   de revitalização da Zona Portuária."   │ │
│  │                                           │ │
│  │  [Responder] [Adicionar à Pauta]         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Ações:                                         │
│  ┌────────────┐  ┌────────────┐               │
│  │ 📝 Editar  │  │ 📤 Reenviar│               │
│  │ Pauta      │  │ Lembrete   │               │
│  └────────────┘  └────────────┘               │
│                                                 │
│  [← Voltar ao Dashboard]                       │
└─────────────────────────────────────────────────┘
```

**Novidade:** Transparência total sobre o status da aprovação.

---

## 3. Componentes Necessários

### 3.1 Novos Componentes de UI

#### GuestTypeSelector
**Localização:** `src/modules/podcast/components/GuestTypeSelector.tsx`

**Responsabilidade:**
- Escolha entre "Figura Pública" vs "Pessoa Comum"
- Define estratégia de pesquisa

**Props:**
```typescript
interface GuestTypeSelectorProps {
  onSelectType: (type: 'public' | 'private') => void;
}
```

**Design:**
- Card visual com ícones grandes
- Texto explicativo sobre cada opção
- Exemplos concretos

---

#### GuestManualForm
**Localização:** `src/modules/podcast/components/GuestManualForm.tsx`

**Responsabilidade:**
- Cadastro manual para pessoas comuns
- Validação de email/WhatsApp
- Campos: nome, profissão, bio, contatos

**Props:**
```typescript
interface GuestManualFormProps {
  onSubmit: (data: ManualGuestData) => void;
  onBack: () => void;
}

interface ManualGuestData {
  fullName: string;
  occupation: string;
  bioShort: string;
  email?: string;
  whatsapp?: string;
}
```

---

#### SourceCredibilityBadge
**Localização:** `src/modules/podcast/components/SourceCredibilityBadge.tsx`

**Responsabilidade:**
- Mostrar confiabilidade da fonte
- Cor-coded: verde (alta), amarelo (média), vermelho (baixa)
- Tooltip com explicação

**Props:**
```typescript
interface SourceCredibilityBadgeProps {
  source: {
    url: string;
    title: string;
    reliability: 'high' | 'medium' | 'low';
  };
  showDetails?: boolean;
}
```

**Visual:**
```
✓ Wikipedia - Alta Confiabilidade
⚠ Blog Pessoal - Média Confiabilidade
✗ Fonte Não Verificada - Baixa Confiabilidade
```

---

#### ResearchQualityIndicator
**Localização:** `src/modules/podcast/components/ResearchQualityIndicator.tsx`

**Responsabilidade:**
- Mostrar qualidade geral da pesquisa
- Barra de progresso visual
- Explicação do score

**Props:**
```typescript
interface ResearchQualityIndicatorProps {
  score: number; // 0-100
  sourcesCount: number;
  showDetails?: boolean;
}
```

**Visual:**
```
📊 Qualidade da Pesquisa: 95% (Excelente)
██████████████████░░ 95/100

12 fontes consultadas
✓ 8 alta confiabilidade
⚠ 3 média confiabilidade
✗ 1 baixa confiabilidade
```

---

#### PautaApprovalPanel
**Localização:** `src/modules/podcast/components/PautaApprovalPanel.tsx`

**Responsabilidade:**
- Interface para enviar pauta ao convidado
- Escolher método (email/WhatsApp)
- Tracking de status

**Props:**
```typescript
interface PautaApprovalPanelProps {
  pauta: GeneratedPauta;
  guestContact: {
    email?: string;
    whatsapp?: string;
  };
  onSend: (method: 'email' | 'whatsapp', message?: string) => Promise<void>;
}
```

---

#### PautaStatusTracker
**Localização:** `src/modules/podcast/components/PautaStatusTracker.tsx`

**Responsabilidade:**
- Timeline de eventos
- Status: enviada, visualizada, comentada, aprovada, rejeitada
- Notificações de mudanças

**Props:**
```typescript
interface PautaStatusTrackerProps {
  episodeId: string;
  realtime?: boolean; // Subscribe to Supabase realtime
}
```

---

#### EditableOutlineSection
**Localização:** `src/modules/podcast/components/EditableOutlineSection.tsx`

**Responsabilidade:**
- Seção editável da pauta
- Inline editing
- Auto-save

**Props:**
```typescript
interface EditableOutlineSectionProps {
  section: OutlineSection;
  onUpdate: (updated: OutlineSection) => void;
  readOnly?: boolean;
}
```

---

### 3.2 Novos Serviços

#### guestApprovalService
**Localização:** `src/modules/podcast/services/guestApprovalService.ts`

**Responsabilidades:**
- Gerar link público para visualização de pauta
- Enviar email/WhatsApp com link
- Capturar aprovação/comentários do convidado
- Notificar produtor de mudanças

**Funções:**
```typescript
// Gera token único para aprovação
generateApprovalLink(episodeId: string, pautaId: string): Promise<string>

// Envia pauta por email
sendApprovalEmail(
  email: string,
  guestName: string,
  approvalLink: string,
  customMessage?: string
): Promise<boolean>

// Envia pauta por WhatsApp (via API Business)
sendApprovalWhatsApp(
  phone: string,
  guestName: string,
  approvalLink: string,
  customMessage?: string
): Promise<boolean>

// Busca status de aprovação
getApprovalStatus(pautaId: string): Promise<ApprovalStatus>

// Adiciona comentário do convidado
addGuestComment(
  pautaId: string,
  comment: string,
  guestToken: string
): Promise<boolean>

// Aprovar pauta
approvePauta(pautaId: string, guestToken: string): Promise<boolean>

// Solicitar alterações
requestChanges(
  pautaId: string,
  changes: string,
  guestToken: string
): Promise<boolean>
```

**Tabela Nova:**
```sql
CREATE TABLE podcast_pauta_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID REFERENCES podcast_generated_pautas(id) ON DELETE CASCADE,
  approval_token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'viewed', 'approved', 'changes_requested', 'expired')),
  sent_via TEXT CHECK (sent_via IN ('email', 'whatsapp')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  guest_comments JSONB, -- Array de comentários
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### sourceReliabilityService
**Localização:** `src/modules/podcast/services/sourceReliabilityService.ts`

**Responsabilidades:**
- Avaliar confiabilidade de URLs
- Domain whitelist (Wikipedia, G1, etc = alta)
- Heurísticas (HTTPS, domínio .gov, .edu = média/alta)

**Funções:**
```typescript
evaluateSourceReliability(url: string): SourceReliability

interface SourceReliability {
  reliability: 'high' | 'medium' | 'low';
  reason: string;
  domain: string;
  isWhitelisted: boolean;
}
```

---

## 4. Estrutura de Dados Atualizada

### 4.1 Extensão da Tabela `podcast_episodes`

```sql
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS guest_type TEXT CHECK (guest_type IN ('public', 'private'));
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS guest_whatsapp TEXT;
```

### 4.2 Extensão da Tabela `podcast_pauta_sources`

```sql
ALTER TABLE podcast_pauta_sources ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE podcast_pauta_sources ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN DEFAULT FALSE;
```

---

## 5. Fluxo de Dados Completo

### 5.1 Figura Pública

```
[GuestTypeSelector: public]
  ↓
[GuestSearchForm: nome + referência]
  ↓
[searchGuestProfile()] → Gemini Deep Research
  ↓
[GuestProfileConfirmation: mostra score + fontes]
  ↓ (confirma)
[createEpisode()] → guest_type='public'
  ↓
[ResearchHub: mostra bio + sources com badges]
  ↓ (usuário adiciona fontes se quiser)
[PautaConfigForm: tema, tom, duração]
  ↓
[generateCompletePauta()] → com fontes enriquecidas
  ↓
[PautaPreview: editável, mostra qualidade]
  ↓ (salvar)
[savePauta()] → podcast_generated_pautas
  ↓ (enviar aprovação)
[PautaApprovalPanel: escolhe email/WhatsApp]
  ↓
[generateApprovalLink() + sendApprovalEmail()]
  ↓
[PautaStatusTracker: aguarda resposta]
  ↓ (convidado aprova)
[approvePauta()] → status='approved'
  ↓
[PreProductionHub: pronto para gravação]
```

### 5.2 Pessoa Comum

```
[GuestTypeSelector: private]
  ↓
[GuestManualForm: preenche dados + contatos]
  ↓
[createEpisode()] → guest_type='private'
  ↓
[createGuestResearch()] → com dados manuais
  ↓
[ResearchHub: mostra dados inseridos]
  ↓ (usuário DEVE adicionar fontes manualmente)
[CustomSourcesModal: upload PDF/links/texto]
  ↓
[processCustomSources()] → extrai conteúdo
  ↓
[PautaConfigForm: tema, tom, duração]
  ↓
[generateCompletePauta()] → baseada em fontes manuais
  ↓
[PautaPreview: editável]
  ↓ (salvar)
[savePauta()]
  ↓ (enviar aprovação)
[PautaApprovalPanel]
  ↓
[... mesmo fluxo de aprovação]
```

---

## 6. Perguntas ao Usuário

### 6.1 Fluxo de Aprovação

**Q1:** Como deve funcionar o link de aprovação público?
- [ ] Link temporário (expira em 7 dias)
- [ ] Sem necessidade de login
- [ ] Interface simplificada (só visualizar + aprovar/comentar)
- [ ] Notificação ao produtor quando convidado responder

**Q2:** O que acontece se o convidado solicitar mudanças?
- [ ] Produtor edita e reenvia para nova aprovação
- [ ] Produtor pode aceitar/rejeitar sugestões inline
- [ ] Sistema gera nova versão (v2, v3...) automaticamente

**Q3:** Aprovação é obrigatória ou opcional?
- [ ] Opcional - produtor pode "pular" e ir direto para gravação
- [ ] Obrigatória - não permite gravação sem aprovação
- [ ] Depende do tipo de convidado (público = obrigatório, comum = opcional)

### 6.2 Campos Obrigatórios

**Q4:** Quais informações são obrigatórias vs opcionais?

**Para Figura Pública:**
- Nome: obrigatório
- Referência: opcional (mas recomendado)
- Email: opcional
- WhatsApp: opcional

**Para Pessoa Comum:**
- Nome completo: obrigatório
- Profissão: obrigatório
- Bio curta: obrigatório
- Email: obrigatório (para enviar aprovação)
- WhatsApp: opcional

**Q5:** Tema do episódio - quando definir?
- [ ] No wizard inicial (antes de pesquisar)
- [ ] Depois da pesquisa (ao configurar pauta)
- [ ] Permitir mudar depois

### 6.3 Integrações

**Q6:** Como enviar WhatsApp?
- [ ] Usar WhatsApp Business API (requer setup)
- [ ] Gerar link `wa.me` que abre no WhatsApp do usuário
- [ ] Copiar mensagem para clipboard (usuário envia manualmente)

**Q7:** Email - usar serviço próprio ou third-party?
- [ ] SendGrid / Mailgun (requer API key)
- [ ] Supabase Edge Function com Resend
- [ ] Email do próprio usuário (mailto: link)

---

## 7. Implementação Recomendada - Fases

### FASE 1: Fundação (1-2 dias)
- [ ] Criar `GuestTypeSelector` component
- [ ] Criar `GuestManualForm` component
- [ ] Adicionar colunas `guest_type`, `guest_email`, `guest_whatsapp` na tabela
- [ ] Atualizar `GuestIdentificationWizard` para usar novo fluxo

### FASE 2: Transparência (2-3 dias)
- [ ] Criar `SourceCredibilityBadge` component
- [ ] Criar `ResearchQualityIndicator` component
- [ ] Implementar `sourceReliabilityService`
- [ ] Atualizar `PreProductionHub` para mostrar badges de fonte
- [ ] Adicionar colunas de confiabilidade nas tabelas

### FASE 3: Edição (1-2 dias)
- [ ] Criar `EditableOutlineSection` component
- [ ] Tornar preview de pauta editável
- [ ] Implementar auto-save de edições
- [ ] Adicionar botão "Editar Completo" para modal de edição avançada

### FASE 4: Aprovação (3-4 dias)
- [ ] Criar tabela `podcast_pauta_approvals`
- [ ] Implementar `guestApprovalService`
- [ ] Criar `PautaApprovalPanel` component
- [ ] Criar página pública de aprovação (`/approve/{token}`)
- [ ] Implementar envio de email (escolher serviço)
- [ ] Implementar envio de WhatsApp (escolher método)

### FASE 5: Tracking (1-2 dias)
- [ ] Criar `PautaStatusTracker` component
- [ ] Implementar Supabase Realtime para notificações
- [ ] Adicionar badge de status no PreProductionHub
- [ ] Criar painel de comentários do convidado

### FASE 6: Polimento (1-2 dias)
- [ ] Animações de transição
- [ ] Loading states elegantes
- [ ] Empty states informativos
- [ ] Testes de fluxo completo
- [ ] Documentação de uso

**Total estimado: 9-15 dias de desenvolvimento**

---

## 8. Métricas de Sucesso

### 8.1 Indicadores de UX

**Antes (problemas):**
- Taxa de falha de pesquisa: ~40% (mock usado frequentemente)
- Tempo médio de configuração: ~15min
- Pautas regeneradas: 3-4x por episódio (usuário insatisfeito)
- Aprovação de convidado: não existe

**Depois (metas):**
- Taxa de falha de pesquisa: <10%
- Tempo médio de configuração: <8min
- Pautas regeneradas: <1.5x por episódio
- Taxa de aprovação de convidado: >80%
- NPS de produtores: >8/10

### 8.2 Métricas Técnicas

- Latência de geração de pauta: <30s (95th percentile)
- Taxa de erro em processamento de fontes: <5%
- Uptime do sistema de aprovação: >99%
- Tempo de resposta de email: <2min

---

## 9. Riscos e Mitigações

### Risco 1: API de WhatsApp não disponível
**Impacto:** Alto
**Probabilidade:** Média
**Mitigação:** Implementar fallback com link `wa.me` + cópia de mensagem

### Risco 2: Convidados não respondem aprovação
**Impacto:** Médio
**Probabilidade:** Alta
**Mitigação:**
- Permitir "pular aprovação" após prazo
- Enviar lembretes automáticos
- Tornar opcional para pessoas comuns

### Risco 3: Processamento de fontes personalizadas falha
**Impacto:** Alto
**Probabilidade:** Média
**Mitigação:**
- Validação de formatos antes de upload
- Feedback claro de erro
- Permitir adicionar fonte como "texto bruto" se parsing falhar

### Risco 4: Gemini Deep Research retorna dados incorretos
**Impacto:** Alto
**Probabilidade:** Baixa
**Mitigação:**
- Sempre mostrar fontes consultadas
- Permitir edição manual de todos os campos
- Score de confiança visível

---

## 10. Conclusão

Este redesign transforma o módulo de podcast de uma ferramenta confusa e opaca em uma experiência clara, confiável e controlável.

**Princípios aplicados:**
✅ **Simplicidade** - fluxo linear, sem desvios
✅ **Clareza** - sempre mostra de onde vêm os dados
✅ **Controle** - usuário pode editar tudo
✅ **Qualidade** - indicadores visuais de confiabilidade
✅ **Colaboração** - aprovação do convidado integrada

**Próximo passo:** Validar com usuário final e iniciar Fase 1.

---

**Revisões:**
- v1.0 - 2025-12-10 - Proposta inicial
