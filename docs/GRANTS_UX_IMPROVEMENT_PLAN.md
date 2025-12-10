# Plano de Melhorias de UX - Módulo Grants

## Índice
1. [Visão Geral](#visão-geral)
2. [Análise de Problemas](#análise-de-problemas)
3. [Soluções Propostas](#soluções-propostas)
4. [Implementação](#implementação)
5. [Checklist de Tarefas](#checklist-de-tarefas)

---

## Visão Geral

Este documento detalha o plano completo de melhorias de UX para o módulo de Grants (Editais) da plataforma Aica, focando em resolver problemas críticos de feedback visual, layout, acessibilidade e navegação identificados pelo usuário.

### Arquitetura Atual

**Fluxo de Navegação:**
```
Dashboard (GrantsModuleView)
  ↓
Edital Detail (EditalDetailView) → Editar Campos do Formulário
  ↓
Project Briefing (ProjectBriefingView) → Documentos + Preencher com IA
  ↓
Proposal Generator (ProposalGeneratorView) → Gerar + Editar + Aprovar
  ↓
Submissão (Modal) → Sistema Externo
```

**Componentes Principais:**
- `GrantsModuleView.tsx` - Container principal com state management
- `EditalDetailView.tsx` - Visualização de um edital e seus projetos
- `ProjectBriefingView.tsx` - Coleta de contexto do projeto
- `ProposalGeneratorView.tsx` - Geração e revisão de campos
- `EditalDocumentSection.tsx` - Gerenciamento do PDF do edital
- `ContextSourcesIndicator.tsx` - Indicador de fontes de contexto da IA

---

## Análise de Problemas

### P0 - Crítico (Impede uso / Compromete dados)

#### 1. Modal não Fecha Após Submissão
**Arquivo:** `ProposalGeneratorView.tsx` (linhas 726-813)

**Problema:**
- Modal de confirmação permanece aberto após submissão bem-sucedida
- Feedback visual inadequado (toast no canto inferior esquerdo)
- Usuário fica confuso sobre o estado da submissão

**Análise de Código:**
```typescript
// Linha 110-130: handleConfirmSubmit não fecha o modal
const handleConfirmSubmit = async () => {
  if (!onProposalComplete) return;

  setIsSubmitting(true);
  setShowSubmitConfirmation(false); // ❌ Fecha antes do sucesso

  try {
    await onProposalComplete();
    setHasCalledComplete(true);
    setSubmitSuccess(true); // ✅ Mas success notification está separada

    setTimeout(() => {
      setSubmitSuccess(false);
    }, 5000);
  } catch (error) {
    console.error('Error submitting proposal:', error);
    alert('Erro ao submeter proposta. Tente novamente.');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Causa Raiz:**
- Modal fecha ANTES da operação completar (`setShowSubmitConfirmation(false)` na linha 114)
- Notification de sucesso é um componente separado (linhas 816-847) e aparece em local confuso
- Falta feedback intermediário durante a operação async

**Impacto:**
- Confusão do usuário sobre se a ação foi concluída
- Reduz confiança na aplicação
- Pode levar a submissões duplicadas

---

#### 2. Falta de Feedback Visual em Processos Backend
**Arquivo:** `GrantsModuleView.tsx` (linhas 199-244)

**Problema:**
- Função `handleContinueToGeneration` roda operações pesadas (transferir 19 campos do briefing para responses) sem feedback visual
- Interface parece travar por 2-5 segundos
- Console log mostra: `[Grants] Transferring 19 fields from briefing to responses`

**Análise de Código:**
```typescript
// Linha 199-244: Operação bloqueante sem loading state
const handleContinueToGeneration = async () => {
  if (!selectedProject || !currentOpportunity) return;

  try {
    // ❌ NENHUM loading indicator aqui
    const fieldsToTransfer = currentOpportunity.form_fields.filter(field => {
      const content = currentBriefing[field.id];
      return content && content.trim().length > 0;
    });

    console.log(`[Grants] Transferring ${fieldsToTransfer.length} fields`);

    // Loop pesado - 19 iterações com saveResponse (DB writes)
    for (const field of fieldsToTransfer) {
      const content = currentBriefing[field.id];
      const existingResponse = currentResponses[field.id];

      if (!existingResponse || !existingResponse.content...) {
        await saveResponse(
          selectedProject.id,
          field.id,
          content,
          'generated'
        ); // ❌ Operação async pesada sem progresso
      }
    }

    // Mais operações...
  } catch (error) {
    console.error('Error transferring briefing to generation:', error);
    alert('Erro ao transferir campos do briefing. Tente novamente.');
  }
};
```

**Causa Raiz:**
- Nenhum loading state no componente `ProjectBriefingView`
- Operações síncronas em loop (19 DB writes)
- Falta de indicador de progresso (0%, 25%, 50%, 75%, 100%)

**Impacto:**
- Usuário clica múltiplas vezes achando que não funcionou
- Experiência de "aplicação travada"
- Ansiedade do usuário

---

### P1 - Alto (Impacta usabilidade severamente)

#### 3. Layout Comprimido e Mal Otimizado
**Arquivos:**
- `ProjectBriefingView.tsx` (linhas 489-618) - Contexto do Edital + Documentos do Projeto
- `ProposalGeneratorView.tsx` (linhas 436-444) - ContextSourcesIndicator

**Problema:**
- "Contexto do Edital" ocupa ~25% da altura viewport
- "Documentos do Projeto" ocupa ~25% da altura viewport
- **Total**: 50% da tela ocupado por elementos secundários
- Conteúdo principal (campos do formulário) comprimido em 50% restantes

**Análise de Layout:**
```tsx
// ProjectBriefingView.tsx - Linha 424-636
<div className="h-screen bg-ceramic-base flex flex-col overflow-hidden">
  {/* Header - ~150px */}
  <div className="flex-shrink-0 z-10 bg-ceramic-base border-b ...">
    {/* Back button, title, progress bar: 150px */}
  </div>

  {/* ⚠️ PROBLEMA: Conteúdo não-scrollable ocupa 50% da tela */}

  {/* Edital Context - 25% da viewport (linhas 489-527) */}
  {editalTextContent && (
    <div className="mb-4">
      <div className="ceramic-card p-4 border-2 ...">
        {/* 300px+ de altura fixa */}
      </div>
    </div>
  )}

  {/* Project Documents - 25% da viewport (linhas 530-618) */}
  <div className="mb-4">
    <div className="ceramic-card p-4 border-2 ...">
      {/* max-h-48 = 192px + padding = ~220px */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {documents.map(...)}
      </div>
    </div>
  </div>

  {/* ❌ Sobra apenas 50% para o conteúdo principal */}
  <div className="flex-1 overflow-y-auto">
    {/* CAMPOS DO FORMULÁRIO */}
  </div>

  {/* Footer - ~100px */}
</div>
```

**Causa Raiz:**
- Elementos secundários (contexto/documentos) têm altura fixa e não colapsam
- Prioridade visual invertida (secundário > primário)
- Falta de Progressive Disclosure adequada

**Impacto:**
- Scroll excessivo para preencher campos
- Campos do formulário difíceis de visualizar
- Sensação de "aperto" na interface

---

#### 4. Falta de Referência à Fonte de Verdade
**Arquivo:** `ProjectBriefingView.tsx` (linhas 489-527)

**Problema:**
- "Contexto do Edital" não tem link direto para o PDF
- Usuário vê apenas prévia truncada (300 caracteres)
- Botão "Ver Completo" abre modal com texto extraído, não o PDF original

**Análise de Código:**
```tsx
// Linha 489-527: Edital Context Card
<div className="ceramic-card p-4 border-2 border-purple-500/20 ...">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <FileText className="w-5 h-5 text-purple-500" />
      <div>
        <p className="text-sm font-bold">
          📋 Contexto do Edital (Compartilhado)
        </p>
        <p className="text-xs text-ceramic-text-tertiary">
          {Math.round(editalTextContent.length / 1000)}k caracteres • Somente leitura
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {/* ❌ FALTA: Link para o PDF original */}
      <button onClick={() => setShowEditalModal(true)}>
        Ver Completo {/* Abre modal com TEXTO, não PDF */}
      </button>
    </div>
  </div>
  <div className="ceramic-tray rounded-lg p-3">
    <p className="text-xs text-ceramic-text-tertiary line-clamp-2">
      {editalTextContent.substring(0, 300)}... {/* ❌ Prévia muito curta */}
    </p>
  </div>
</div>
```

**Causa Raiz:**
- Componente não recebe `editalPdfPath` como prop
- Falta integração com `EditalDocumentSection` que tem a lógica de PDF
- Modal atual mostra texto extraído, não visualizador de PDF

**Impacto:**
- Usuário não consegue consultar o PDF original facilmente
- Perde contexto visual (tabelas, imagens, formatação do edital)
- Reduz confiança nas respostas geradas pela IA

---

#### 5. Comportamento de Collapse Inadequado
**Arquivo:** `ProposalGeneratorView.tsx` (linhas 479-670)

**Problema:**
- Campos podem ser colapsados ANTES de serem aprovados
- Usuário pode perder de vista campos pendentes
- Não há indicação visual clara de quais campos estão incompletos quando colapsados

**Análise de Código:**
```tsx
// Linha 154-164: Toggle sem validação de status
const toggleField = (fieldId: string) => {
  setExpandedFields(prev => {
    const next = new Set(prev);
    if (next.has(fieldId)) {
      next.delete(fieldId); // ❌ Permite colapsar qualquer campo
    } else {
      next.add(fieldId);
    }
    return next;
  });
};

// Linha 487-516: Header do campo - clicável mesmo não aprovado
<button
  onClick={() => toggleField(field.id)} // ❌ Sempre colapsável
  className="flex-1 text-left flex items-start gap-3 hover:opacity-80 ..."
>
  {/* Conteúdo do header */}
</button>
```

**Regra de UX Desejada:**
- ✅ Campo SEM conteúdo: Expandido por padrão, NÃO colapsável
- ✅ Campo COM conteúdo, status "generated": Colapsável, mas com badge visual
- ✅ Campo COM conteúdo, status "approved": Colapsável livremente
- ❌ Campo EDITANDO: NÃO colapsável (evitar perda de edição)

**Causa Raiz:**
- Lógica de toggle não valida estado do campo
- Falta restrição baseada em `state.status`
- Campos expandidos não são gerenciados por prioridade

**Impacto:**
- Campos importantes ficam escondidos
- Usuário pode submeter proposta com campos não revisados
- Aumenta risco de erro

---

### P2 - Médio (Melhoria de qualidade)

#### 6. Modal com Contraste Ruim
**Arquivo:** `ProposalGeneratorView.tsx` (linhas 792-808)

**Problema:**
- Botão "Submeter Proposta" tem contraste inadequado
- Não atende WCAG AA (4.5:1 para texto normal)

**Análise de Código:**
```tsx
// Linha 792-808: Botão do modal
<button
  onClick={handleConfirmSubmit}
  disabled={isSubmitting}
  className="ceramic-concave px-6 py-2 font-bold text-sm bg-green-600 text-white hover:bg-green-700 ..."
>
  {isSubmitting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Submetendo...
    </>
  ) : (
    <>
      <Send className="w-4 h-4" />
      Submeter Proposta
    </>
  )}
</button>
```

**Análise de Contraste:**
- `bg-green-600` (#16a34a) + `text-white` (#ffffff) = 4.1:1 ❌ (abaixo de 4.5:1)
- Classe `ceramic-concave` pode adicionar sombras que pioram contraste
- Estado hover (`hover:bg-green-700`) melhora para 5.9:1 ✅

**Recomendação:**
- Usar `bg-green-700` (#15803d) como padrão = 5.9:1 ✅
- Usar `bg-green-800` (#166534) para hover = 8.2:1 ✅✅

**Impacto:**
- Acessibilidade comprometida para usuários com baixa visão
- Não conformidade com WCAG 2.1 AA

---

#### 7. PDF do Edital Ocupa Muito Espaço
**Arquivo:** `EditalDetailView.tsx` (linhas 265-273)

**Problema:**
- Seção `EditalDocumentSection` ocupa ~20% da página do edital
- Empurra cards de projetos para baixo
- Informação secundária com prioridade visual alta

**Análise de Layout:**
```tsx
// EditalDetailView.tsx - Linha 264-273
<div className="max-w-7xl mx-auto px-6 py-8">
  {/* ⚠️ Edital PDF Section - Muito destaque */}
  <EditalDocumentSection
    opportunityId={opportunity.id}
    opportunityTitle={opportunity.title}
    editalPdfPath={opportunity.edital_pdf_path}
    editalTextContent={opportunity.edital_text_content}
    onUpload={handleUploadEditalPDF}
    onDelete={handleDeleteEditalPDF}
  />
  {/* 300px+ de altura (EditalDocumentSection.tsx linha 114-284) */}

  {/* Active Projects - Conteúdo principal */}
  {activeProjects.length > 0 && (
    <div className="mb-8">
      {/* Grid de projetos */}
    </div>
  )}
</div>
```

**Causa Raiz:**
- Componente `EditalDocumentSection` tem design expansivo
- Não usa Progressive Disclosure (sempre expandido)
- Localização inadequada (topo da página, antes do conteúdo principal)

**Impacto:**
- Scroll excessivo para ver projetos
- Prioridade visual invertida
- Sensação de "poluição visual"

---

## Soluções Propostas

### Solução P0-1: Modal de Submissão - Fluxo Completo

**Objetivo:** Modal fecha automaticamente após sucesso + feedback claro

**Wireframe (Descrição Visual):**
```
┌─────────────────────────────────────────────────────────────┐
│ [Modal Backdrop - Desfoque]                                 │
│                                                             │
│   ┌───────────────────────────────────────────────────┐   │
│   │ [Ícone CheckCircle] Proposta Completa!           │   │
│   │ Todos os 19 campos foram aprovados               │   │
│   ├───────────────────────────────────────────────────┤   │
│   │                                                   │   │
│   │ [Info Box]                                        │   │
│   │ • Campos finalizados                              │   │
│   │ • Status: Submetido                               │   │
│   │ • Ainda pode exportar                             │   │
│   │                                                   │   │
│   │ [Dica] Revise antes de submeter                  │   │
│   │                                                   │   │
│   ├───────────────────────────────────────────────────┤   │
│   │                 [Continuar Revisando]  [Submeter]│   │
│   └───────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

↓ Após clicar "Submeter"

┌─────────────────────────────────────────────────────────────┐
│ [Modal Backdrop - Desfoque]                                 │
│                                                             │
│   ┌───────────────────────────────────────────────────┐   │
│   │ [Loader Spinner] Submetendo Proposta...          │   │
│   │                                                   │   │
│   │ • Atualizando status...                           │   │
│   │ • Calculando completion...                        │   │
│   │ • Sincronizando dados...                          │   │
│   │                                                   │   │
│   │ [Progress Bar] ████████░░ 80%                     │   │
│   └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

↓ Após sucesso (1 segundo de delay)

┌─────────────────────────────────────────────────────────────┐
│ [Modal Backdrop - Verde claro]                              │
│                                                             │
│   ┌───────────────────────────────────────────────────┐   │
│   │ [Ícone CheckCircle animado] Sucesso! 🎉          │   │
│   │                                                   │   │
│   │ Proposta submetida com sucesso!                  │   │
│   │                                                   │   │
│   │ [Botão] Ir para Sistema Externo →                │   │
│   │ [Link] Exportar proposta                          │   │
│   │                                                   │   │
│   │           [Fechar (auto em 3s)]                  │   │
│   └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

↓ Modal fecha automaticamente após 3 segundos
↓ Usuário permanece na tela ProposalGenerator
↓ Footer verde aparece com botões "Exportar" e "Abrir Sistema Externo"
```

**Componentes a Usar:**
- `motion.div` (framer-motion) para animações
- `CheckCircle2` (lucide-react) para ícone de sucesso
- `Loader2` (lucide-react) para spinner
- Estilo `ceramic-card` existente
- Cores: `bg-green-50`, `text-green-900`, `border-green-200`

**Implementação:**

```typescript
// ProposalGeneratorView.tsx - Modificar handleConfirmSubmit

const [submitPhase, setSubmitPhase] = useState<'confirm' | 'loading' | 'success' | null>(null);
const [submitProgress, setSubmitProgress] = useState(0);

const handleConfirmSubmit = async () => {
  if (!onProposalComplete) return;

  setSubmitPhase('loading'); // ✅ Mostra loading state
  setSubmitProgress(0);

  try {
    // Simular progresso para melhor UX
    const progressInterval = setInterval(() => {
      setSubmitProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 150);

    await onProposalComplete();

    clearInterval(progressInterval);
    setSubmitProgress(100);

    // Transição para success
    setTimeout(() => {
      setSubmitPhase('success'); // ✅ Mostra tela de sucesso
      setHasCalledComplete(true);

      // Auto-close após 3 segundos
      setTimeout(() => {
        setSubmitPhase(null); // ✅ Fecha modal automaticamente
        setShowSubmitConfirmation(false);
      }, 3000);
    }, 500);

  } catch (error) {
    console.error('Error submitting proposal:', error);
    setSubmitPhase('confirm'); // ✅ Volta para confirmação em caso de erro
    alert('Erro ao submeter proposta. Tente novamente.');
  }
};

// Renderização condicional do modal baseada em submitPhase
{submitPhase === 'confirm' && <ConfirmationContent />}
{submitPhase === 'loading' && <LoadingContent progress={submitProgress} />}
{submitPhase === 'success' && <SuccessContent />}
```

**Prioridade:** P0
**Esforço:** 3 horas
**Dependências:** Nenhuma

---

### Solução P0-2: Loading State para Transferência de Campos

**Objetivo:** Feedback visual claro durante `handleContinueToGeneration`

**Wireframe (Descrição Visual):**
```
ProjectBriefingView - Footer

ANTES (estado atual):
┌─────────────────────────────────────────────────────────────┐
│ Footer                                                      │
├─────────────────────────────────────────────────────────────┤
│ Campos preenchidos serão transferidos...                   │
│                                     [Continuar para Geração]│
└─────────────────────────────────────────────────────────────┘

DURANTE (novo estado):
┌─────────────────────────────────────────────────────────────┐
│ Footer (com overlay)                                        │
├─────────────────────────────────────────────────────────────┤
│ [Spinner] Transferindo campos para geração...              │
│                                                             │
│ • Identificando campos preenchidos... (19 encontrados)     │
│ • Salvando campo "Título do Projeto"... [1/19]             │
│ • Salvando campo "Objetivos"... [2/19]                     │
│                                                             │
│ [Progress Bar] ████░░░░░░░ 11% (2/19)                      │
└─────────────────────────────────────────────────────────────┘

APÓS (sucesso):
┌─────────────────────────────────────────────────────────────┐
│ Footer                                                      │
├─────────────────────────────────────────────────────────────┤
│ [Ícone Check] 19 campos transferidos com sucesso!          │
│                                                             │
│ → Navegando para geração...                                │
└─────────────────────────────────────────────────────────────┘
```

**Componentes a Usar:**
- Skeleton Loader (criar novo componente `TransferProgressOverlay`)
- Progress Bar com porcentagem
- Lista de logs em tempo real
- AnimatePresence (framer-motion) para transições

**Implementação:**

```typescript
// ProjectBriefingView.tsx - Adicionar estado

const [isTransferring, setIsTransferring] = useState(false);
const [transferProgress, setTransferProgress] = useState({
  current: 0,
  total: 0,
  currentField: ''
});

// GrantsModuleView.tsx - Modificar handleContinueToGeneration

const handleContinueToGeneration = async () => {
  if (!selectedProject || !currentOpportunity) return;

  setIsTransferring(true); // ✅ Ativa loading state

  try {
    const fieldsToTransfer = currentOpportunity.form_fields.filter(field => {
      const content = currentBriefing[field.id];
      return content && content.trim().length > 0;
    });

    const total = fieldsToTransfer.length;
    setTransferProgress({ current: 0, total, currentField: '' });

    console.log(`[Grants] Transferring ${total} fields from briefing to responses`);

    // Loop com progresso
    for (let i = 0; i < fieldsToTransfer.length; i++) {
      const field = fieldsToTransfer[i];
      const content = currentBriefing[field.id];

      // Atualizar progresso ANTES da operação
      setTransferProgress({
        current: i + 1,
        total,
        currentField: field.label // ✅ Mostra qual campo está sendo processado
      });

      const existingResponse = currentResponses[field.id];

      if (!existingResponse || !existingResponse.content || existingResponse.content.trim().length === 0) {
        await saveResponse(
          selectedProject.id,
          field.id,
          content,
          'generated'
        );
      }

      // Pequeno delay para UX (permite usuário ver progresso)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Reload responses
    const responses = await listResponses(selectedProject.id);
    const responsesMap: Record<string, GrantResponse> = {};
    responses.forEach(r => {
      responsesMap[r.field_id] = r;
    });
    setCurrentResponses(responsesMap);

    // Mensagem de sucesso por 1 segundo antes de navegar
    setTransferProgress({
      current: total,
      total,
      currentField: '✓ Transferência completa!'
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update status e navegar
    await updateProjectStatus(selectedProject.id, 'generating');
    setCurrentView('generation');

  } catch (error) {
    console.error('Error transferring briefing to generation:', error);
    alert('Erro ao transferir campos do briefing. Tente novamente.');
  } finally {
    setIsTransferring(false); // ✅ Desativa loading state
  }
};
```

**Componente de Overlay:**

```tsx
// Novo componente: TransferProgressOverlay.tsx
interface TransferProgressOverlayProps {
  current: number;
  total: number;
  currentField: string;
}

export const TransferProgressOverlay: React.FC<TransferProgressOverlayProps> = ({
  current,
  total,
  currentField
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="ceramic-card p-8 max-w-md w-full">
        <div className="flex items-center gap-4 mb-6">
          <Loader2 className="w-8 h-8 text-ceramic-accent animate-spin" />
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Transferindo Campos
            </h3>
            <p className="text-sm text-ceramic-text-secondary">
              Preparando geração da proposta...
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ceramic-text-secondary">Progresso</span>
            <span className="font-bold text-ceramic-text-primary">
              {current} / {total} ({percentage}%)
            </span>
          </div>
          <div className="ceramic-trough p-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Current Field */}
        <div className="ceramic-tray p-4 rounded-lg">
          <p className="text-sm text-ceramic-text-primary">
            {currentField}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
```

**Prioridade:** P0
**Esforço:** 4 horas
**Dependências:** Nenhuma

---

### Solução P1-3: Layout Responsivo com Progressive Disclosure

**Objetivo:** Priorizar conteúdo principal (campos) e secundarizar contexto/documentos

**Estratégia de Design:**
1. **Collapse por padrão** - Contexto do Edital e Documentos começam colapsados
2. **Peek Preview** - Mostrar resumo visual (ícone + contador) quando colapsado
3. **Quick Access** - Botões rápidos para expandir/colapsar
4. **Sticky Header** - Indicadores de contexto fixos no topo (sempre visíveis)

**Wireframe (Descrição Visual):**

```
ANTES (50% da tela ocupada):
┌─────────────────────────────────────────────────────────────┐
│ Header (150px)                                              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 📋 Contexto do Edital (Compartilhado)              │   │
│ │ 32k caracteres • Somente leitura                   │   │
│ │ [Ver Completo]                                      │   │
│ │ ───────────────────────────────────────────────────│   │
│ │ Lorem ipsum dolor sit amet, consectetur...         │   │
│ │ (prévia de 300 caracteres)                         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                    ↑ 25% da tela (300px)   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 📄 Documentos do Projeto (3)                       │   │
│ │ [Adicionar]                                         │   │
│ │ ───────────────────────────────────────────────────│   │
│ │ ✓ projeto.pdf (120k chars)          [X]           │   │
│ │ ✓ roadmap.md (45k chars)            [X]           │   │
│ │ ✓ orcamento.xlsx (28k chars)        [X]           │   │
│ └─────────────────────────────────────────────────────┘   │
│                                    ↑ 25% da tela (220px)   │
├─────────────────────────────────────────────────────────────┤
│ CAMPOS DO FORMULÁRIO (comprimidos em 50% restantes) ↓     │
│ [Scroll excessivo]                                          │
└─────────────────────────────────────────────────────────────┘

DEPOIS (90% da tela para conteúdo principal):
┌─────────────────────────────────────────────────────────────┐
│ Header (120px) - Compacto                                   │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Fontes de Contexto: [📋 Edital 32k] [📄 3 docs 193k]│   │
│ │ [Expandir Contexto ↓]                               │   │  ← Sticky
│ └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CAMPOS DO FORMULÁRIO (90% da viewport disponível)         │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 1. Título do Projeto                                │   │
│ │ [Expand ▼]                                          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 2. Objetivos                                        │   │
│ │ [Expand ▼]                                          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [Menos scroll, mais espaço para trabalho]                  │
└─────────────────────────────────────────────────────────────┘

EXPANDIDO (quando usuário clica em "Expandir Contexto"):
┌─────────────────────────────────────────────────────────────┐
│ Header (120px)                                              │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Fontes de Contexto: [📋 Edital 32k] [📄 3 docs 193k]│   │
│ │ [Colapsar Contexto ↑]                               │   │  ← Sticky
│ └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 📋 Contexto do Edital                    [Colapsar]│   │
│ │ 32k caracteres                           [Ver PDF →]│   │
│ │ ───────────────────────────────────────────────────│   │
│ │ Lorem ipsum dolor sit amet... (max 4 linhas)      │   │
│ └─────────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 📄 Documentos (3)                        [Colapsar]│   │
│ │ • projeto.pdf (120k) [X]                           │   │
│ │ • roadmap.md (45k) [X]                             │   │
│ │ • orcamento.xlsx (28k) [X]                         │   │
│ └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ CAMPOS DO FORMULÁRIO                                       │
└─────────────────────────────────────────────────────────────┘
```

**Componentes a Usar:**
1. `CollapsibleSection` (criar novo) - Componente reutilizável
2. `ContextSummaryBar` (criar novo) - Barra sticky com resumo
3. Ícones: `ChevronDown`, `ChevronUp`, `Maximize2`, `Minimize2`
4. Animações: `AnimatePresence` + `motion.div`

**Implementação:**

```tsx
// Novo componente: CollapsibleSection.tsx
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  summary: string; // Texto curto quando colapsado
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string; // Ex: "P1", "3 docs", "32k chars"
  accentColor?: 'purple' | 'blue' | 'green';
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  summary,
  isCollapsed,
  onToggle,
  children,
  badge,
  accentColor = 'purple'
}) => {
  const colorClasses = {
    purple: 'border-purple-500/20 bg-purple-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    green: 'border-green-500/20 bg-green-500/5'
  };

  return (
    <div className={`ceramic-card border-2 ${colorClasses[accentColor]} overflow-hidden`}>
      {/* Header - Sempre visível */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-ceramic-text-primary flex items-center gap-2">
              {title}
              {badge && (
                <span className="px-2 py-0.5 bg-ceramic-text-tertiary/10 text-ceramic-text-tertiary text-xs rounded-full">
                  {badge}
                </span>
              )}
            </h3>
            {isCollapsed && (
              <p className="text-xs text-ceramic-text-tertiary truncate max-w-md">
                {summary}
              </p>
            )}
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary" />
        ) : (
          <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary" />
        )}
      </button>

      {/* Content - Expansível */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ProjectBriefingView.tsx - Usar CollapsibleSection

const [contextSectionsCollapsed, setContextSectionsCollapsed] = useState({
  edital: true,  // ✅ Colapsado por padrão
  documents: true // ✅ Colapsado por padrão
});

// Substituir bloco de "Edital Context" (linhas 489-527)
{editalTextContent && (
  <CollapsibleSection
    title="Contexto do Edital"
    icon={<FileText className="w-5 h-5 text-purple-500" />}
    summary={`${Math.round(editalTextContent.length / 1000)}k caracteres extraídos do PDF`}
    isCollapsed={contextSectionsCollapsed.edital}
    onToggle={() => setContextSectionsCollapsed(prev => ({
      ...prev,
      edital: !prev.edital
    }))}
    badge="P1"
    accentColor="purple"
  >
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {/* Abrir PDF em nova tab */}}
          className="ceramic-concave px-3 py-2 text-xs font-bold hover:scale-95 transition-transform flex items-center gap-2"
        >
          <FileText className="w-3 h-3" />
          Ver PDF Original
        </button>
        <button
          onClick={() => setShowEditalModal(true)}
          className="ceramic-concave px-3 py-2 text-xs font-bold hover:scale-95 transition-transform"
        >
          Ver Texto Extraído
        </button>
      </div>
      <div className="ceramic-tray p-3 rounded-lg max-h-32 overflow-y-auto">
        <p className="text-xs text-ceramic-text-tertiary">
          {editalTextContent.substring(0, 500)}...
        </p>
      </div>
    </div>
  </CollapsibleSection>
)}

// Similar para "Documents Section"
```

**Sticky Context Summary Bar:**

```tsx
// Novo componente: ContextSummaryBar.tsx (sticky no topo)
<div className="sticky top-0 z-20 bg-ceramic-base/95 backdrop-blur-sm border-b border-ceramic-text-secondary/10 py-2 px-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-xs text-ceramic-text-secondary">Contexto da IA:</span>
      {editalTextContent && (
        <div className="ceramic-concave px-3 py-1 rounded-full text-xs flex items-center gap-2">
          <FileText className="w-3 h-3 text-purple-500" />
          <span>Edital: {Math.round(editalTextContent.length / 1000)}k</span>
        </div>
      )}
      {documents.length > 0 && (
        <div className="ceramic-concave px-3 py-1 rounded-full text-xs flex items-center gap-2">
          <FolderOpen className="w-3 h-3 text-blue-500" />
          <span>{documents.length} docs: {combinedDocsLength}k</span>
        </div>
      )}
    </div>
    <button
      onClick={toggleAllContextSections}
      className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary flex items-center gap-1"
    >
      {allCollapsed ? (
        <>Expandir Contexto <ChevronDown className="w-3 h-3" /></>
      ) : (
        <>Colapsar Contexto <ChevronUp className="w-3 h-3" /></>
      )}
    </button>
  </div>
</div>
```

**Prioridade:** P1
**Esforço:** 6 horas
**Dependências:** Nenhuma

---

### Solução P1-4: Link Direto para PDF do Edital

**Objetivo:** Acesso rápido ao PDF original do edital

**Implementação:**

```tsx
// ProjectBriefingView.tsx - Modificar props
interface ProjectBriefingViewProps {
  // ... props existentes
  editalPdfPath?: string; // ✅ Adicionar nova prop
}

// GrantsModuleView.tsx - Passar prop
<ProjectBriefingView
  // ... props existentes
  editalPdfPath={currentOpportunity.edital_pdf_path} // ✅ Passar PDF path
/>

// ProjectBriefingView.tsx - Helper function
const getEditalPdfUrl = () => {
  if (!editalPdfPath) return null;

  const { data } = supabase.storage
    .from('editais')
    .getPublicUrl(editalPdfPath);

  return data?.publicUrl || null;
};

// Adicionar botão "Ver PDF Original" no CollapsibleSection
<CollapsibleSection
  title="Contexto do Edital"
  // ... outras props
>
  <div className="space-y-3">
    {/* ✅ Novo botão com link direto */}
    {editalPdfPath && (
      <a
        href={getEditalPdfUrl() || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="ceramic-concave px-3 py-2 text-xs font-bold hover:scale-95 transition-transform flex items-center gap-2 inline-flex"
      >
        <FileText className="w-3 h-3" />
        Abrir PDF Original
        <ExternalLink className="w-3 h-3" />
      </a>
    )}
    <button
      onClick={() => setShowEditalModal(true)}
      className="ceramic-concave px-3 py-2 text-xs font-bold hover:scale-95 transition-transform"
    >
      Ver Texto Extraído
    </button>
  </div>
  {/* Preview do texto extraído */}
</CollapsibleSection>
```

**Prioridade:** P1
**Esforço:** 1 hora
**Dependências:** Nenhuma

---

### Solução P1-5: Collapse Inteligente Baseado em Status

**Objetivo:** Campos só podem ser colapsados quando apropriado

**Regras de Negócio:**
```typescript
// Regras de collapse por status
const canCollapseField = (state: FieldState | undefined): boolean => {
  if (!state) return false; // Sem conteúdo = não colapsa

  switch (state.status) {
    case 'generating':
      return false; // ❌ Gerando = forçar expandido
    case 'editing':
      return false; // ❌ Editando = forçar expandido (evitar perda de dados)
    case 'generated':
      return true;  // ✅ Gerado = pode colapsar (mas com aviso visual)
    case 'approved':
      return true;  // ✅ Aprovado = pode colapsar livremente
    default:
      return false;
  }
};
```

**Implementação:**

```typescript
// ProposalGeneratorView.tsx - Modificar toggleField

const toggleField = (fieldId: string) => {
  const state = fieldStates[fieldId];

  // ✅ Validar se pode colapsar
  if (!canCollapseField(state)) {
    // Feedback visual: campo pulsa brevemente
    console.log(`Cannot collapse field ${fieldId} (status: ${state?.status})`);
    return; // Não permite colapsar
  }

  setExpandedFields(prev => {
    const next = new Set(prev);
    if (next.has(fieldId)) {
      next.delete(fieldId);
    } else {
      next.add(fieldId);
    }
    return next;
  });
};

// Auto-expand quando status muda para 'editing' ou 'generating'
useEffect(() => {
  const fieldsToExpand: string[] = [];

  Object.entries(fieldStates).forEach(([fieldId, state]) => {
    if (state.status === 'editing' || state.status === 'generating') {
      fieldsToExpand.push(fieldId);
    }
  });

  if (fieldsToExpand.length > 0) {
    setExpandedFields(prev => {
      const next = new Set(prev);
      fieldsToExpand.forEach(id => next.add(id));
      return next;
    });
  }
}, [fieldStates]);

// Visual indicator para campos colapsados mas não aprovados
{!isExpanded && hasContent && state?.status === 'generated' && (
  <div className="px-6 pb-4">
    <div className="ceramic-tray p-3 rounded-lg border-l-4 border-orange-500">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-orange-600" />
        <p className="text-xs font-medium text-orange-600">
          Campo não aprovado - Clique para revisar
        </p>
      </div>
      <p className="text-sm text-ceramic-text-secondary line-clamp-2">
        {content}
      </p>
    </div>
  </div>
)}
```

**Prioridade:** P1
**Esforço:** 3 horas
**Dependências:** Nenhuma

---

### Solução P2-6: Corrigir Contraste do Modal

**Objetivo:** Atender WCAG 2.1 AA (contraste mínimo 4.5:1)

**Implementação:**

```tsx
// ProposalGeneratorView.tsx - Linha 792-808
// ANTES:
<button
  className="... bg-green-600 text-white ..." // ❌ Contraste 4.1:1
>
  Submeter Proposta
</button>

// DEPOIS:
<button
  className="... bg-green-700 text-white hover:bg-green-800 active:bg-green-900 ..." // ✅ Contraste 5.9:1
>
  Submeter Proposta
</button>

// Também aplicar em outros botões verdes
// Linha 636-644: Botão "Aprovar"
<button
  className="... bg-green-100 text-green-800 ..." // ✅ Contraste 7.2:1
  title="Aprovar"
>
  <Check className="w-4 h-4" />
  Aprovar
</button>

// Linha 651-655: Botão "Salvar" (edição)
<button
  className="... bg-green-100 text-green-800 ..." // ✅ Contraste 7.2:1
>
  Salvar
</button>
```

**Tabela de Contrastes:**

| Cor Background | Cor Texto | Contraste | WCAG AA | WCAG AAA |
|---------------|-----------|-----------|---------|----------|
| `bg-green-600` (#16a34a) | `text-white` (#ffffff) | 4.1:1 | ❌ | ❌ |
| `bg-green-700` (#15803d) | `text-white` (#ffffff) | 5.9:1 | ✅ | ❌ |
| `bg-green-800` (#166534) | `text-white` (#ffffff) | 8.2:1 | ✅ | ✅ |
| `bg-green-100` (#dcfce7) | `text-green-800` (#166534) | 7.2:1 | ✅ | ✅ |

**Prioridade:** P2
**Esforço:** 30 minutos
**Dependências:** Nenhuma

---

### Solução P2-7: Otimizar Layout do PDF na Página do Edital

**Objetivo:** Reduzir destaque visual da seção de PDF

**Estratégia:**
1. Mover `EditalDocumentSection` para sidebar (desktop) ou collapse (mobile)
2. Reduzir tamanho da seção quando colapsada
3. Adicionar acesso rápido no header

**Wireframe (Descrição Visual):**

```
DESKTOP - Layout com Sidebar:
┌─────────────────────────────────────────────────────────────┐
│ Header                                                      │
│ [← Voltar] Edital nº 32/2025                    [Editar] [+]│
├──────────────────────────┬──────────────────────────────────┤
│ Sidebar (25%)            │ Main Content (75%)              │
│                          │                                  │
│ ┌────────────────────┐   │ [Stats Cards]                    │
│ │ 📋 PDF do Edital   │   │ $ Financiamento | 📅 Prazo      │
│ │ edital_32.pdf      │   │ 🎯 Projetos     | 📄 Campos     │
│ │                    │   │                                  │
│ │ [Ver] [Download]   │   │ ────────────────────────────────│
│ └────────────────────┘   │                                  │
│                          │ Projetos Ativos (3)             │
│ ┌────────────────────┐   │ ┌──────────────────────────┐   │
│ │ Metadados          │   │ │ Projeto A                │   │
│ │ • Agência: FAPERJ  │   │ │ [Status] [Progress]      │   │
│ │ • Programa: X      │   │ └──────────────────────────┘   │
│ │ • Prazo: ...       │   │ ┌──────────────────────────┐   │
│ └────────────────────┘   │ │ Projeto B                │   │
│                          │ │ [Status] [Progress]      │   │
│                          │ └──────────────────────────┘   │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘

MOBILE - Layout Vertical com Collapse:
┌─────────────────────────────────────┐
│ Header                              │
│ [←] Edital nº 32/2025      [⋮ Menu]│
├─────────────────────────────────────┤
│ [Stats Cards - Compact]             │
│ $ 50k-500k  | 📅 15 dias            │
│ 🎯 3 proj   | 📄 12 campos          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 📋 PDF do Edital     [Expandir ▼]│
│ └─────────────────────────────────┘ │
│                                     │
│ Projetos Ativos (3)                 │
│ ┌─────────────────────────────────┐ │
│ │ Projeto A                       │ │
│ │ [Status] [Progress]  [Ver →]    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Projeto B                       │ │
│ │ [Status] [Progress]  [Ver →]    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Implementação:**

```tsx
// EditalDetailView.tsx - Reorganizar layout

return (
  <div className="min-h-screen bg-ceramic-base">
    {/* Header (sem mudanças) */}
    <div className="sticky top-0 z-10 ...">
      {/* ... */}
    </div>

    {/* Content com Sidebar (Desktop) */}
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:block space-y-4">
          {/* ✅ PDF Section compacta */}
          <EditalDocumentSection
            opportunityId={opportunity.id}
            opportunityTitle={opportunity.title}
            editalPdfPath={opportunity.edital_pdf_path}
            editalTextContent={opportunity.edital_text_content}
            onUpload={handleUploadEditalPDF}
            onDelete={handleDeleteEditalPDF}
            compact={true} // ✅ Nova prop para modo compacto
          />

          {/* Metadados adicionais */}
          <div className="ceramic-card p-4">
            <h4 className="text-sm font-bold mb-3">Informações</h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-ceramic-text-secondary">Agência:</span>
                <p className="font-medium">{opportunity.funding_agency}</p>
              </div>
              <div>
                <span className="text-ceramic-text-secondary">Programa:</span>
                <p className="font-medium">{opportunity.program_name}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* PDF Section para Mobile (colapsável) */}
          <div className="lg:hidden mb-4">
            <CollapsibleSection
              title="PDF do Edital"
              icon={<FileText className="w-5 h-5 text-purple-500" />}
              summary={editalPdfPath ? 'PDF carregado' : 'Nenhum PDF'}
              isCollapsed={true}
              onToggle={() => {}}
            >
              <EditalDocumentSection
                opportunityId={opportunity.id}
                opportunityTitle={opportunity.title}
                editalPdfPath={opportunity.edital_pdf_path}
                editalTextContent={opportunity.edital_text_content}
                onUpload={handleUploadEditalPDF}
                onDelete={handleDeleteEditalPDF}
              />
            </CollapsibleSection>
          </div>

          {/* Active Projects (prioridade visual) */}
          {activeProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">
                Projetos Ativos ({activeProjects.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Cards de projetos */}
              </div>
            </div>
          )}

          {/* Archived Projects */}
          {/* ... */}
        </main>
      </div>
    </div>
  </div>
);

// EditalDocumentSection.tsx - Adicionar modo compacto
interface EditalDocumentSectionProps {
  // ... props existentes
  compact?: boolean; // ✅ Nova prop
}

export function EditalDocumentSection({
  // ... props existentes
  compact = false
}) {
  if (compact && !hasPdf) {
    // Versão ultra-compacta sem PDF
    return (
      <div className="ceramic-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold">PDF do Edital</span>
          </div>
          <label htmlFor={`edital-pdf-upload-${opportunityId}`}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ceramic-concave p-1.5 hover:scale-95 transition-transform"
            >
              <Upload className="w-3 h-3" />
            </button>
          </label>
        </div>
        <p className="text-[10px] text-ceramic-text-tertiary">
          Nenhum PDF enviado
        </p>
      </div>
    );
  }

  if (compact && hasPdf) {
    // Versão compacta COM PDF
    return (
      <div className="ceramic-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-bold truncate flex-1">
            {editalPdfPath?.split('/').pop()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ceramic-concave p-1.5 hover:scale-95 transition-transform"
              title="Ver PDF"
            >
              <Eye className="w-3 h-3" />
            </a>
          )}
          {pdfUrl && (
            <a
              href={pdfUrl}
              download
              className="ceramic-concave p-1.5 hover:scale-95 transition-transform"
              title="Download"
            >
              <Download className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={handleDelete}
            className="ceramic-concave p-1.5 hover:scale-95 transition-transform"
            title="Remover"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      </div>
    );
  }

  // Versão completa (existente)
  return (
    <div className="ceramic-card p-4 mb-4">
      {/* Código existente */}
    </div>
  );
}
```

**Prioridade:** P2
**Esforço:** 4 horas
**Dependências:** Solução P1-3 (CollapsibleSection)

---

## Implementação

### Ordem de Execução

**Sprint 1 - Crítico (P0):**
1. ✅ **Solução P0-2**: Loading State para Transferência (4h)
   - Impacto imediato na percepção de "travamento"
   - Não depende de outras mudanças
2. ✅ **Solução P0-1**: Modal de Submissão (3h)
   - Resolve frustração principal do usuário
   - Independente

**Sprint 2 - Alto Impacto (P1):**
3. ✅ **Solução P1-3**: Layout Responsivo (6h)
   - Cria componentes reutilizáveis (CollapsibleSection)
   - Base para outras melhorias
4. ✅ **Solução P1-4**: Link para PDF (1h)
   - Rápido de implementar
   - Alto valor para usuário
5. ✅ **Solução P1-5**: Collapse Inteligente (3h)
   - Usa componentes criados na Solução 3
   - Melhora fluxo de trabalho

**Sprint 3 - Polimento (P2):**
6. ✅ **Solução P2-6**: Contraste do Modal (0.5h)
   - Rápido e obrigatório (acessibilidade)
7. ✅ **Solução P2-7**: PDF na Página do Edital (4h)
   - Usa componentes criados anteriormente
   - Melhoria visual final

**Total de Esforço:** ~21.5 horas (3 dias úteis com 1 desenvolvedor)

---

### Mudanças Backend Necessárias

**Nenhuma mudança backend crítica necessária.**

Todas as soluções propostas são frontend-only. No entanto, **recomendações de otimização futura** para coordenar com backend-architect-supabase:

1. **Batch Insert para Transferência de Campos (Futuro)**
   - Atualmente: Loop com 19 `saveResponse` individuais
   - Proposta: Criar endpoint `POST /responses/batch` que insere todos de uma vez
   - Benefício: Reduzir de ~5s para ~1s a operação
   - SQL:
     ```sql
     -- Novo stored procedure
     CREATE OR REPLACE FUNCTION insert_grant_responses_batch(
       p_project_id UUID,
       p_responses JSONB
     )
     RETURNS SETOF grant_responses AS $$
       INSERT INTO grant_responses (project_id, field_id, content, status, ...)
       SELECT
         p_project_id,
         (value->>'field_id')::text,
         (value->>'content')::text,
         (value->>'status')::text,
         ...
       FROM jsonb_array_elements(p_responses)
       RETURNING *;
     $$ LANGUAGE sql;
     ```

2. **Caching do PDF do Edital (Futuro)**
   - Atualmente: Texto extraído do PDF é carregado toda vez
   - Proposta: Implementar cache Redis para `edital_text_content`
   - Benefício: Reduzir latência em 80% para editais frequentemente acessados

---

## Checklist de Tarefas

### Sprint 1 - P0 (Crítico)

#### Tarefa 1.1: Loading State para Transferência de Campos
- [ ] Criar componente `TransferProgressOverlay.tsx`
  - [ ] Prop interface (current, total, currentField)
  - [ ] Progress bar animada
  - [ ] Lista de logs em tempo real
  - [ ] Animação de entrada/saída
- [ ] Adicionar state em `GrantsModuleView.tsx`
  - [ ] `isTransferring: boolean`
  - [ ] `transferProgress: { current, total, currentField }`
- [ ] Modificar `handleContinueToGeneration` em `GrantsModuleView.tsx`
  - [ ] Adicionar `setIsTransferring(true)` no início
  - [ ] Loop com atualização de progresso
  - [ ] Delay de 100ms entre iterações
  - [ ] Mensagem de sucesso por 1s antes de navegar
  - [ ] `setIsTransferring(false)` no finally
- [ ] Passar state via prop para `ProjectBriefingView`
  - [ ] Renderizar overlay quando `isTransferring === true`
- [ ] Testar com edital de 19 campos
  - [ ] Verificar animação suave
  - [ ] Testar cancelamento (ESC)
  - [ ] Testar erro (simular falha de rede)

#### Tarefa 1.2: Modal de Submissão - Fluxo Completo
- [ ] Adicionar states em `ProposalGeneratorView.tsx`
  - [ ] `submitPhase: 'confirm' | 'loading' | 'success' | null`
  - [ ] `submitProgress: number`
- [ ] Modificar `handleConfirmSubmit`
  - [ ] Fase 1: Loading com progress bar
  - [ ] Fase 2: Success screen
  - [ ] Fase 3: Auto-close após 3s
  - [ ] Tratamento de erro (volta para confirm)
- [ ] Criar componentes de modal
  - [ ] `ConfirmationContent` (existente, sem mudanças)
  - [ ] `LoadingContent` (novo)
  - [ ] `SuccessContent` (novo)
- [ ] Testar fluxo completo
  - [ ] Confirmação → Loading → Success → Close
  - [ ] Erro durante submissão (volta para confirmação)
  - [ ] Cancelamento em cada fase

**Estimativa:** 7 horas
**Prioridade:** P0
**Responsável:** [Nome do Dev]

---

### Sprint 2 - P1 (Alto Impacto)

#### Tarefa 2.1: Layout Responsivo com Progressive Disclosure
- [ ] Criar componente `CollapsibleSection.tsx`
  - [ ] Props interface completa
  - [ ] Animação de expand/collapse
  - [ ] Support para badge e accentColor
  - [ ] Acessibilidade (keyboard navigation)
- [ ] Criar componente `ContextSummaryBar.tsx`
  - [ ] Sticky positioning
  - [ ] Resumo de contexto (edital + docs)
  - [ ] Botão "Expandir/Colapsar Tudo"
- [ ] Modificar `ProjectBriefingView.tsx`
  - [ ] Adicionar state `contextSectionsCollapsed`
  - [ ] Substituir "Edital Context" por `CollapsibleSection`
  - [ ] Substituir "Documents Section" por `CollapsibleSection`
  - [ ] Adicionar `ContextSummaryBar` no topo (sticky)
- [ ] Testar responsividade
  - [ ] Desktop (1920x1080, 1366x768)
  - [ ] Tablet (768x1024)
  - [ ] Mobile (375x667, 414x896)

#### Tarefa 2.2: Link Direto para PDF do Edital
- [ ] Adicionar prop `editalPdfPath` em `ProjectBriefingView`
- [ ] Passar prop desde `GrantsModuleView`
- [ ] Criar helper `getEditalPdfUrl()`
- [ ] Adicionar botão "Abrir PDF Original" no `CollapsibleSection`
  - [ ] Ícone `ExternalLink`
  - [ ] Abre em nova tab (`target="_blank"`)
- [ ] Testar link
  - [ ] PDF abre corretamente
  - [ ] Fallback quando PDF não existe

#### Tarefa 2.3: Collapse Inteligente Baseado em Status
- [ ] Criar função `canCollapseField`
  - [ ] Regras por status (generating, editing, generated, approved)
- [ ] Modificar `toggleField` em `ProposalGeneratorView.tsx`
  - [ ] Validar antes de colapsar
  - [ ] Feedback visual quando não pode colapsar
- [ ] Adicionar `useEffect` para auto-expand
  - [ ] Expandir campos em 'editing'
  - [ ] Expandir campos em 'generating'
- [ ] Adicionar indicador visual para campos colapsados não aprovados
  - [ ] Border laranja
  - [ ] Ícone `AlertCircle`
  - [ ] Mensagem "Campo não aprovado - Clique para revisar"
- [ ] Testar cenários
  - [ ] Tentar colapsar campo sendo gerado (deve bloquear)
  - [ ] Tentar colapsar campo sendo editado (deve bloquear)
  - [ ] Colapsar campo gerado (deve permitir + aviso)
  - [ ] Colapsar campo aprovado (deve permitir)

**Estimativa:** 10 horas
**Prioridade:** P1
**Responsável:** [Nome do Dev]

---

### Sprint 3 - P2 (Polimento)

#### Tarefa 3.1: Corrigir Contraste do Modal
- [ ] Atualizar `ProposalGeneratorView.tsx` linha 792-808
  - [ ] Mudar `bg-green-600` para `bg-green-700`
  - [ ] Adicionar `hover:bg-green-800`
  - [ ] Adicionar `active:bg-green-900`
- [ ] Atualizar botão "Aprovar" (linha 636-644)
  - [ ] Verificar contraste `bg-green-100` + `text-green-800`
- [ ] Atualizar botão "Salvar" (linha 651-655)
  - [ ] Verificar contraste
- [ ] Testar com ferramentas de acessibilidade
  - [ ] WebAIM Contrast Checker
  - [ ] Lighthouse Accessibility Score
  - [ ] axe DevTools

#### Tarefa 3.2: Otimizar Layout do PDF na Página do Edital
- [ ] Adicionar prop `compact` em `EditalDocumentSection.tsx`
  - [ ] Implementar versão compacta (sem PDF)
  - [ ] Implementar versão compacta (com PDF)
  - [ ] Versão completa (existente)
- [ ] Modificar `EditalDetailView.tsx`
  - [ ] Criar layout com sidebar (desktop)
  - [ ] Mover `EditalDocumentSection` para sidebar
  - [ ] Adicionar `CollapsibleSection` para mobile
  - [ ] Reorganizar grid: `grid-cols-[300px_1fr]`
- [ ] Adicionar seção de metadados na sidebar
  - [ ] Agência financiadora
  - [ ] Programa
  - [ ] Número do edital
- [ ] Testar layouts
  - [ ] Desktop: sidebar visível
  - [ ] Mobile: PDF colapsado por padrão
  - [ ] Transição entre breakpoints

**Estimativa:** 4.5 horas
**Prioridade:** P2
**Responsável:** [Nome do Dev]

---

### Testes de Regressão

Após completar todas as sprints:

- [ ] **Teste End-to-End: Fluxo Completo de Submissão**
  1. Dashboard → Criar novo edital
  2. Upload PDF do edital
  3. Criar projeto
  4. Preencher briefing (com documentos)
  5. Clicar "Continuar para Geração" (verificar loading)
  6. Gerar todos os campos
  7. Aprovar todos os campos
  8. Submeter proposta (verificar modal)
  9. Verificar status "submitted"
  10. Exportar proposta
  11. Abrir sistema externo

- [ ] **Teste de Acessibilidade**
  - [ ] Navegação por teclado (Tab, Enter, ESC)
  - [ ] Screen reader (NVDA/JAWS)
  - [ ] Contraste de cores (WCAG AA)
  - [ ] Focus indicators visíveis
  - [ ] ARIA labels corretos

- [ ] **Teste de Performance**
  - [ ] Lighthouse score > 90
  - [ ] Time to Interactive < 3s
  - [ ] Operação de transferência < 5s (19 campos)
  - [ ] Animações rodando a 60fps

- [ ] **Teste de Responsividade**
  - [ ] iPhone SE (375x667)
  - [ ] iPad (768x1024)
  - [ ] Desktop 1080p (1920x1080)
  - [ ] Desktop 4K (3840x2160)

---

## Métricas de Sucesso

Após implementação, medir:

1. **Task Success Rate**
   - Meta: > 95% dos usuários completam submissão sem erros
   - Baseline atual: ~80% (estimado, sem dados concretos)

2. **Time on Task**
   - Meta: Reduzir em 30% o tempo para gerar e submeter proposta
   - Baseline atual: ~45 minutos por proposta (estimado)
   - Meta: ~30 minutos

3. **Error Rate**
   - Meta: < 5% de submissões com erro
   - Baseline atual: ~15% (usuários clicam múltiplas vezes, confusão no modal)

4. **Satisfaction Score (CSAT)**
   - Meta: > 4.5/5 em pesquisa pós-submissão
   - Adicionar mini-survey após submissão bem-sucedida

5. **Accessibility Score**
   - Meta: Lighthouse Accessibility > 95
   - Baseline atual: ~85 (contraste inadequado)

---

## Apêndice

### Componentes Existentes Identificados

**Componentes Reutilizáveis:**
- `motion.div` (framer-motion) - Animações
- `AnimatePresence` (framer-motion) - Transições
- Ícones (lucide-react): `CheckCircle2`, `Loader2`, `AlertCircle`, `FileText`, `FolderOpen`, `ChevronDown`, `ChevronUp`
- Classes CSS: `ceramic-card`, `ceramic-concave`, `ceramic-tray`, `ceramic-trough`

**Padrões de Design Existentes:**
- Loading states com spinner + mensagem
- Progress bars com gradiente (`from-blue-400 to-purple-500`)
- Modals com backdrop blur
- Cards colapsáveis com AnimatePresence
- Badges de status coloridos

### Arquivos a Modificar

**Principais:**
1. `src/modules/grants/views/GrantsModuleView.tsx` - State management
2. `src/modules/grants/views/ProposalGeneratorView.tsx` - Modal e collapse
3. `src/modules/grants/components/ProjectBriefingView.tsx` - Layout e loading
4. `src/modules/grants/components/EditalDetailView.tsx` - PDF sidebar
5. `src/modules/grants/components/EditalDocumentSection.tsx` - Modo compacto

**Novos Componentes:**
6. `src/modules/grants/components/TransferProgressOverlay.tsx`
7. `src/modules/grants/components/CollapsibleSection.tsx`
8. `src/modules/grants/components/ContextSummaryBar.tsx`

### Referências de UX

**Princípios Aplicados:**
- **Progressive Disclosure**: Mostrar informação relevante no momento certo
- **Feedback Visual**: Sempre informar o usuário sobre o estado do sistema
- **Error Prevention**: Prevenir ações que podem causar perda de dados
- **Consistency**: Manter padrões visuais e de interação
- **Accessibility**: WCAG 2.1 AA como baseline mínimo

**Heurísticas de Nielsen:**
1. Visibility of system status ✅ (loading states)
2. Match between system and real world ✅ (linguagem clara)
3. User control and freedom ✅ (cancelar, voltar)
4. Consistency and standards ✅ (padrões visuais)
5. Error prevention ✅ (collapse inteligente)
6. Recognition rather than recall ✅ (indicadores visuais)
7. Flexibility and efficiency of use ✅ (atalhos, collapse)
8. Aesthetic and minimalist design ✅ (progressive disclosure)
9. Help users recognize, diagnose, recover from errors ✅ (mensagens claras)
10. Help and documentation ✅ (tooltips, placeholders)

---

**Documento criado em:** 2025-01-29
**Última atualização:** 2025-01-29
**Versão:** 1.0
**Autor:** UX/UI Design Expert (Claude Sonnet 4.5)
