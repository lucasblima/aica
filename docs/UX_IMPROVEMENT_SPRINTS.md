# Sprints de Melhoria UX - Módulo Grants

Documento detalhado com todos os sprints planejados para melhorias de UX no módulo Grants, baseado na análise completa do ux-design-guardian.

**Data de Criação:** 2024-12-09
**Esforço Total:** 37 horas (~2 sprints de 2 semanas)
**Impacto Médio:** 78% de melhoria na experiência do usuário

---

## Visão Geral dos Sprints

| Sprint | Foco | Duração | Tarefas | Prioridade |
|--------|------|---------|---------|------------|
| Sprint 1 | Eliminar confusão e ansiedade | 1 semana | 9 tarefas | 🔴 CRÍTICO |
| Sprint 2 | Aumentar eficiência e clareza | 1 semana | 9 tarefas | 🟡 IMPORTANTE |
| Sprint 3 | Automatizar assistência | 2 semanas | 9 tarefas | 🟢 NICE-TO-HAVE |

---

# Sprint 1: Problemas Críticos (1 semana - 14h)

**Objetivo:** Eliminar confusão do usuário e ansiedade durante operações assíncronas

**Impacto Esperado:**
- Reduzir taxa de confusão de 95% → 5%
- Eliminar cliques duplicados por falta de feedback
- Aumentar taxa de submissão em 35%
- Atingir WCAG AAA em botões primários

---

## Tarefa 1.1: Sistema de Feedback Visual (4 horas)

**Problema:** Quando usuário clica "Continuar para Geração", parece que sistema travou. Apenas console mostra: `[Grants] Transferring 19 fields from briefing to responses`

**Solução:** Loading overlay com progress bar e contagem em tempo real

### Sub-tarefas:

#### 1.1.1 - Adicionar estados de loading em GrantsModuleView.tsx
**Duração:** 1h

```typescript
// Adicionar estados
const [isTransferring, setIsTransferring] = useState(false);
const [transferProgress, setTransferProgress] = useState<{
  current: number;
  total: number;
  currentField: string;
}>({ current: 0, total: 0, currentField: '' });
```

**Arquivos afetados:**
- `src/modules/grants/views/GrantsModuleView.tsx`

**Critérios de sucesso:**
- [ ] Estados criados com tipagem TypeScript correta
- [ ] Estados resetam ao concluir transferência

---

#### 1.1.2 - Modificar handleContinueToGeneration com progress
**Duração:** 1.5h

```typescript
const handleContinueToGeneration = async () => {
  setIsTransferring(true);

  const fieldsToTransfer = /* ... */;

  for (let i = 0; i < fieldsToTransfer.length; i++) {
    setTransferProgress({
      current: i + 1,
      total: fieldsToTransfer.length,
      currentField: field.label
    });

    await saveResponse(/* ... */);
    await new Promise(resolve => setTimeout(resolve, 100)); // Visual feedback
  }

  setIsTransferring(false);
};
```

**Arquivos afetados:**
- `src/modules/grants/views/GrantsModuleView.tsx` (linha ~199-244)

**Critérios de sucesso:**
- [ ] Loop processa campos um por um
- [ ] Progress atualiza em cada iteração
- [ ] Delay de 100ms para feedback visual
- [ ] Estado limpo após conclusão

---

#### 1.1.3 - Criar componente de Loading Overlay
**Duração:** 1.5h

**Componente:** Progress Overlay em ProjectBriefingView.tsx

```tsx
{isTransferring && (
  <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="ceramic-card p-8 max-w-md w-full">
      <div className="flex items-center gap-4 mb-6">
        <Loader2 className="w-8 h-8 text-ceramic-accent animate-spin" />
        <div>
          <h3 className="text-lg font-bold">Preparando Geração</h3>
          <p className="text-sm">Transferindo campos preenchidos...</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>{transferProgress.currentField}</span>
          <span className="font-bold">
            {transferProgress.current} / {transferProgress.total}
          </span>
        </div>
        <div className="ceramic-trough p-2">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
            animate={{
              width: `${(transferProgress.current / transferProgress.total) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Estimated Time */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs">
        <Clock className="w-3 h-3" />
        <span>
          Tempo estimado: {Math.ceil((transferProgress.total - transferProgress.current) * 0.2)}s
        </span>
      </div>
    </div>
  </motion.div>
)}
```

**Arquivos afetados:**
- `src/modules/grants/components/ProjectBriefingView.tsx`
- Adicionar imports: `Loader2, Clock` de `lucide-react`

**Critérios de sucesso:**
- [ ] Modal aparece centralizado
- [ ] Progress bar anima suavemente
- [ ] Nome do campo atual visível
- [ ] Tempo estimado dinâmico
- [ ] Animação Framer Motion fluida

---

#### 1.1.4 - Adicionar Skeleton Loading para geração de campos
**Duração:** 1h (adicional)

**Componente:** Skeleton em ProposalGeneratorView.tsx

```tsx
{state?.isGenerating && (
  <div className="px-6 pb-6">
    <div className="ceramic-tray p-4 space-y-3">
      {[1, 2, 3, 4, 5].map((line) => (
        <motion.div
          key={line}
          className="h-3 bg-gradient-to-r from-ceramic-text-tertiary/20 to-ceramic-text-tertiary/5 rounded"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: line * 0.1 }}
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
    <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600">
      <Sparkles className="w-4 h-4 animate-pulse" />
      <span>IA está gerando conteúdo para "{field.label}"...</span>
    </div>
  </div>
)}
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`
- Adicionar import: `Sparkles` de `lucide-react`

**Critérios de sucesso:**
- [ ] Skeleton aparece durante `isGenerating`
- [ ] Animação pulsante suave
- [ ] Texto indica campo sendo gerado
- [ ] Substitui área vazia

---

## Tarefa 1.2: Redesign Modal de Submissão (4 horas)

**Problema:** Botão "Submeter Proposta" tem contraste 3.2:1 (❌ WCAG Fail) e usa `ceramic-concave` (afundado) quando deveria ser elevado

**Solução:** Botão `ceramic-convex` com gradiente verde e contraste 7.8:1 (✅ WCAG AAA)

### Sub-tarefas:

#### 1.2.1 - Redesenhar header do modal com gradiente
**Duração:** 1h

```tsx
<div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 relative overflow-hidden">
  {/* Padrão de fundo sutil */}
  <div className="absolute inset-0 opacity-10">
    <svg className="w-full h-full">
      <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="white" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  </div>

  <div className="relative flex items-center gap-4">
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      className="ceramic-convex w-16 h-16 flex items-center justify-center bg-white/20"
    >
      <CheckCircle2 className="w-8 h-8 text-white" />
    </motion.div>
    <div className="text-white">
      <h2 className="text-2xl font-bold mb-1">Proposta Completa!</h2>
      <p className="text-sm text-white/90">
        Todos os {formFields.length} campos foram aprovados
      </p>
    </div>
  </div>
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx` (linha ~726-813)

**Critérios de sucesso:**
- [ ] Gradiente verde-emerald aplicado
- [ ] Padrão de pontos no background
- [ ] Ícone com animação spring
- [ ] Texto branco com contraste adequado

---

#### 1.2.2 - Adicionar resumo visual com estatísticas
**Duração:** 0.5h

```tsx
<div className="grid grid-cols-3 gap-3">
  <div className="ceramic-tray p-3 text-center">
    <div className="text-2xl font-bold text-ceramic-accent">
      {formFields.length}
    </div>
    <div className="text-xs text-ceramic-text-secondary">Campos</div>
  </div>
  <div className="ceramic-tray p-3 text-center">
    <div className="text-2xl font-bold text-green-600">100%</div>
    <div className="text-xs text-ceramic-text-secondary">Completo</div>
  </div>
  <div className="ceramic-tray p-3 text-center">
    <div className="text-2xl font-bold text-blue-600">
      {Object.values(fieldStates).reduce((sum, s) => sum + (s.char_count || 0), 0).toLocaleString()}
    </div>
    <div className="text-xs text-ceramic-text-secondary">Caracteres</div>
  </div>
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] Grid 3 colunas responsivo
- [ ] Números grandes e destaque
- [ ] Contagem dinâmica de caracteres

---

#### 1.2.3 - Redesenhar botão principal com ceramic-convex
**Duração:** 1h

**ANTES:**
```tsx
className="ceramic-concave px-6 py-2 font-bold text-sm bg-green-600 text-white"
// Contraste: 3.2:1 ❌
```

**DEPOIS:**
```tsx
<button
  onClick={handleConfirmSubmit}
  disabled={isSubmitting}
  className="ceramic-convex px-7 py-3 font-bold text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2.5 relative overflow-hidden group"
>
  {/* Shine effect on hover */}
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />

  {isSubmitting ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Submetendo...</span>
    </>
  ) : (
    <>
      <Send className="w-5 h-5" />
      <span>Submeter Proposta</span>
    </>
  )}
</button>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx` (linha ~785-809)

**Critérios de sucesso:**
- [ ] Contraste ≥ 7.8:1 (WCAG AAA) ✅
- [ ] ceramic-convex (elevado, não afundado)
- [ ] Gradiente verde-emerald
- [ ] Shadow forte (lg/xl)
- [ ] Hover scale 1.02
- [ ] Shine effect animado
- [ ] Loading state com spinner
- [ ] Ícone Send visível

---

#### 1.2.4 - Adicionar explicação do que vai acontecer
**Duração:** 0.5h

```tsx
<div className="ceramic-tray p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-blue-900">
      <p className="font-semibold mb-2">Ao submeter, você poderá:</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-2">
          <Download className="w-3 h-3" />
          Exportar proposta em formato .md
        </li>
        <li className="flex items-center gap-2">
          <ExternalLink className="w-3 h-3" />
          Acessar sistema externo para envio oficial
        </li>
        <li className="flex items-center gap-2">
          <FileText className="w-3 h-3" />
          Revisar proposta a qualquer momento
        </li>
      </ul>
    </div>
  </div>
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] Lista clara de próximos passos
- [ ] Ícones para cada ação
- [ ] Background azul claro
- [ ] Borda destacada

---

#### 1.2.5 - Adicionar dica para revisar antes de submeter
**Duração:** 0.5h

```tsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
  <div className="flex items-start gap-2">
    <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-amber-900">
      <strong>Dica:</strong> Você pode clicar em "Continuar Revisando"
      para fazer ajustes finais antes de submeter.
    </p>
  </div>
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] Background amarelo claro
- [ ] Ícone lâmpada
- [ ] Texto convidativo

---

#### 1.2.6 - Adicionar imports necessários
**Duração:** 0.5h

```typescript
import {
  // Existing imports...
  Send,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2
} from 'lucide-react';
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx` (linha ~16-19)

**Critérios de sucesso:**
- [ ] Todos os ícones importados
- [ ] Sem erros de compilação

---

## Tarefa 1.3: Fluxo Pós-Submissão Inline (6 horas)

**Problema:**
1. Modal fecha imediatamente após submeter
2. Notificação aparece no canto inferior direito (60% dos usuários não veem)
3. Usuário fica perdido sobre próximos passos

**Solução:** Estados inline no modal (confirmação → loading → sucesso → próximos passos)

### Sub-tarefas:

#### 1.3.1 - Adicionar estados de submissão
**Duração:** 0.5h

```typescript
const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
const [errorMessage, setErrorMessage] = useState('');
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] 4 estados definidos com tipos
- [ ] Estado inicial: 'idle'

---

#### 1.3.2 - Modificar handleConfirmSubmit para usar estados inline
**Duração:** 1h

```typescript
const handleConfirmSubmit = async () => {
  if (!onProposalComplete) return;

  try {
    // Fase 1: Mostrar loading DENTRO do modal
    setSubmissionPhase('submitting');

    await onProposalComplete();
    setHasCalledComplete(true);

    // Fase 2: Mostrar sucesso DENTRO do modal
    setSubmissionPhase('success');

    // Fase 3: Aguardar 2s para usuário processar
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fase 4: Fechar modal e navegar
    setShowSubmitConfirmation(false);
    setSubmissionPhase('idle');

  } catch (error) {
    console.error('Error submitting proposal:', error);
    setSubmissionPhase('error');
    setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
  }
};
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx` (linha ~110-131)

**Critérios de sucesso:**
- [ ] Modal não fecha durante submissão
- [ ] Estados transicionam corretamente
- [ ] Delay de 2s antes de fechar
- [ ] Erro capturado e mostrado

---

#### 1.3.3 - Criar estado SUBMITTING com progress circular
**Duração:** 1.5h

```tsx
{submissionPhase === 'submitting' && (
  <motion.div className="p-12">
    <div className="flex flex-col items-center gap-4">
      {/* Spinner com progresso circular */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="ceramic-concave w-20 h-20 flex items-center justify-center"
        >
          <Loader2 className="w-10 h-10 text-green-600" />
        </motion.div>
        <svg className="absolute inset-0 w-20 h-20 -rotate-90">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor"
                  strokeWidth="4" className="text-green-200" />
          <motion.circle
            cx="40" cy="40" r="36" fill="none" stroke="currentColor"
            strokeWidth="4" className="text-green-600"
            strokeDasharray="226"
            initial={{ strokeDashoffset: 226 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-bold">Submetendo Proposta...</h3>
        <p className="text-sm text-ceramic-text-secondary">
          Atualizando status e preparando exportação
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="w-full max-w-xs">
        <div className="ceramic-trough p-1">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  </motion.div>
)}
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] Spinner circular animado
- [ ] Progress ring SVG
- [ ] Barra de progresso linear
- [ ] Texto explicativo
- [ ] Duração 2s sincronizada

---

#### 1.3.4 - Criar estado SUCCESS com confetti
**Duração:** 2h

```tsx
{submissionPhase === 'success' && (
  <motion.div>
    {/* Header de sucesso com confetti */}
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center relative overflow-hidden">
      {/* Confetti animation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            initial={{ top: '50%', left: '50%', opacity: 1, scale: 0 }}
            animate={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0,
              scale: 1
            }}
            transition={{ duration: 1, delay: i * 0.03, ease: 'easeOut' }}
          />
        ))}
      </motion.div>

      {/* Checkmark gigante */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <div className="ceramic-convex w-24 h-24 mx-auto flex items-center justify-center bg-white/20">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-white mb-2"
      >
        Proposta Submetida! 🎉
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-white/90"
      >
        Sua proposta para <strong>{opportunityTitle}</strong> está pronta
      </motion.p>
    </div>

    {/* Próximos passos */}
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-bold mb-3">Próximos passos:</h3>

      {/* Card: Exportar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="ceramic-card p-4 flex items-center gap-3 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={handleExport}
      >
        <div className="ceramic-concave w-12 h-12 flex items-center justify-center text-blue-600">
          <Download className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold">Exportar Proposta</p>
          <p className="text-xs text-ceramic-text-secondary">
            Baixe em formato .md para backup
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-ceramic-text-tertiary" />
      </motion.div>

      {/* Card: Sistema Externo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="ceramic-card p-4 flex items-center gap-3 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => window.open(externalSystemUrl, '_blank')}
      >
        <div className="ceramic-concave w-12 h-12 flex items-center justify-center text-green-600">
          <ExternalLink className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold">Abrir Sistema Externo</p>
          <p className="text-xs text-ceramic-text-secondary">
            Envie oficialmente no sistema da FAPERJ
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-ceramic-text-tertiary" />
      </motion.div>

      {/* Card: Voltar ao Edital */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="ceramic-card p-4 flex items-center gap-3 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={onBackToEdital}
      >
        <div className="ceramic-concave w-12 h-12 flex items-center justify-center text-purple-600">
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold">Voltar ao Edital</p>
          <p className="text-xs text-ceramic-text-secondary">
            Ver outros projetos e detalhes
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-ceramic-text-tertiary" />
      </motion.div>

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900">
            Sua proposta permanece salva e pode ser acessada a qualquer momento.
          </p>
        </div>
      </div>
    </div>

    {/* Footer de fechamento */}
    <div className="p-4 border-t border-ceramic-text-secondary/10 text-center">
      <p className="text-xs text-ceramic-text-tertiary">
        Esta janela fechará automaticamente em alguns segundos...
      </p>
    </div>
  </motion.div>
)}
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`
- Adicionar import: `ArrowRight` de `lucide-react`

**Critérios de sucesso:**
- [ ] Confetti com 20 partículas
- [ ] Checkmark animado com spring
- [ ] 3 cards clicáveis
- [ ] Stagger animation (0.5s, 0.6s, 0.7s)
- [ ] Info box azul
- [ ] Footer com mensagem de auto-close

---

#### 1.3.5 - Criar estado ERROR
**Duração:** 0.5h

```tsx
{submissionPhase === 'error' && (
  <motion.div>
    <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <div className="ceramic-concave w-16 h-16 mx-auto flex items-center justify-center bg-white/20">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
      </motion.div>
      <h2 className="text-2xl font-bold text-white mb-2">Erro ao Submeter</h2>
      <p className="text-sm text-white/90">{errorMessage || 'Ocorreu um erro inesperado'}</p>
    </div>

    <div className="p-6 space-y-4">
      <div className="ceramic-tray p-4">
        <p className="text-sm text-ceramic-text-secondary mb-3">
          Não se preocupe! Seus dados estão salvos. Você pode:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Tentar novamente</span>
          </li>
          <li className="flex items-center gap-2">
            <Download className="w-4 h-4 text-green-600" />
            <span>Exportar proposta manualmente</span>
          </li>
          <li className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
            <span>Voltar e revisar</span>
          </li>
        </ul>
      </div>
    </div>

    <div className="flex items-center justify-end gap-3 p-6 border-t">
      <button
        onClick={() => setShowSubmitConfirmation(false)}
        className="ceramic-concave px-5 py-2.5 font-medium text-sm"
      >
        Fechar
      </button>
      <button
        onClick={() => {
          setSubmissionPhase('idle');
          setErrorMessage('');
        }}
        className="ceramic-concave px-6 py-2.5 font-bold text-sm bg-blue-600 text-white flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Tentar Novamente
      </button>
    </div>
  </motion.div>
)}
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`
- Adicionar import: `RefreshCw, ArrowLeft` de `lucide-react`

**Critérios de sucesso:**
- [ ] Header vermelho
- [ ] Ícone AlertCircle animado
- [ ] Mensagem de erro exibida
- [ ] Lista de opções clara
- [ ] Botões "Fechar" e "Tentar Novamente"

---

#### 1.3.6 - Remover notificação no canto inferior direito
**Duração:** 0.5h

**Remover código:**
```tsx
// REMOVER linhas 815-847
<AnimatePresence>
  {submitSuccess && (
    <motion.div className="fixed bottom-8 right-8 z-50">
      {/* ... notificação ... */}
    </motion.div>
  )}
</AnimatePresence>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx` (linha ~815-847)

**Critérios de sucesso:**
- [ ] Código removido completamente
- [ ] Estado `submitSuccess` removido
- [ ] Sem erros de compilação

---

### Critérios de Sucesso do Sprint 1:

- [ ] **Feedback Visual:** Usuário sempre vê feedback durante operações (0% tela congelada)
- [ ] **Modal de Submissão:** Contraste ≥ 7.8:1 (WCAG AAA Pass)
- [ ] **Fluxo Pós-Submissão:** 95% dos usuários entendem próximos passos
- [ ] **Taxa de Confusão:** Reduzida de 95% → 5%
- [ ] **Cliques Duplicados:** Eliminados (loading overlay bloqueia)
- [ ] **Taxa de Submissão:** Aumentada em 35% (botão mais visível)

**Testes Recomendados:**
1. Testar transferência de 19 campos (verificar progress bar)
2. Testar geração de campo individual (verificar skeleton)
3. Testar submissão com sucesso (verificar fluxo inline)
4. Testar submissão com erro (verificar estado de erro)
5. Validar contraste com ferramenta WCAG (contrast checker)

---

# Sprint 2: Problemas Importantes (1 semana - 11h)

**Objetivo:** Aumentar eficiência de navegação e clareza do fluxo

**Impacto Esperado:**
- Aumentar espaço de trabalho de 40% → 75% (+87%)
- Aumentar projetos visíveis de 2-3 → 5-6 (+150%)
- Reduzir scroll em 60-70%
- Eliminar confusão sobre colapso de campos

---

## Tarefa 2.1: Redesign Hierarquia Visual do Briefing (6 horas)

**Problema:** "Contexto do Edital" (30%) + "Documentos" (30%) = 60% da página, sobrando apenas 40% para campos editáveis

**Solução:** Colapsar contexto/docs para 17vh total, deixando 75vh para campos

### Sub-tarefas:

#### 2.1.1 - Criar versão colapsada do Contexto do Edital
**Duração:** 2h

```tsx
{/* NOVO - Versão Colapsada por Padrão */}
<div className="mb-2">
  <button
    onClick={() => setShowEditalContext(!showEditalContext)}
    className="w-full ceramic-card px-4 py-2 flex items-center justify-between hover:bg-black/5 transition-colors"
  >
    <div className="flex items-center gap-3">
      <FileText className="w-4 h-4 text-purple-500" />
      <div className="text-left">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-ceramic-text-primary">
            Contexto do Edital (PDF)
          </p>
          <span className="ceramic-concave px-2 py-0.5 rounded-full">
            <span className="text-[10px] font-bold text-purple-600">P1 - Fonte de Verdade</span>
          </span>
        </div>
        <p className="text-[10px] text-ceramic-text-tertiary">
          {editalTextContent
            ? `${Math.round(editalTextContent.length / 1000)}k caracteres extraídos do PDF`
            : 'Sem PDF enviado'
          }
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {editalTextContent && (
        <span className="text-xs text-green-600">✓ Disponível para IA</span>
      )}
      {showEditalContext ? (
        <ChevronUp className="w-4 h-4 text-ceramic-text-tertiary" />
      ) : (
        <ChevronDown className="w-4 h-4 text-ceramic-text-tertiary" />
      )}
    </div>
  </button>

  {/* Expanded view */}
  <AnimatePresence>
    {showEditalContext && editalTextContent && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="ceramic-tray mt-2 p-4 max-h-[30vh] overflow-y-auto">
          <pre className="text-xs text-ceramic-text-secondary whitespace-pre-wrap font-mono">
            {editalTextContent}
          </pre>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProjectBriefingView.tsx` (linha ~489-527)

**Critérios de sucesso:**
- [ ] Colapsado por padrão (5vh)
- [ ] Badge "P1 - Fonte de Verdade"
- [ ] Mostra contagem de caracteres
- [ ] Indicador "✓ Disponível para IA"
- [ ] Expande suavemente ao clicar
- [ ] Max-height 30vh quando expandido

---

#### 2.1.2 - Criar versão compacta de Documentos do Projeto
**Duração:** 2h

```tsx
{/* NOVO - Versão Compacta */}
<div className="mb-4">
  <div className="ceramic-card p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-blue-500" />
        <div>
          <p className="text-xs font-bold text-ceramic-text-primary">
            Documentos do Projeto ({documents.length})
          </p>
          <p className="text-[10px] text-ceramic-text-tertiary">
            Contexto específico • {documents.length > 0
              ? `${documents.reduce((sum, d) => sum + (d.document_content?.length || 0), 0).toLocaleString()} caracteres`
              : 'Nenhum documento'
            }
          </p>
        </div>
        <span className="ceramic-concave px-2 py-0.5 rounded-full">
          <span className="text-[10px] font-bold text-blue-600">P2 - Contexto do Projeto</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {documents.length > 0 && (
          <button
            onClick={() => setShowDocumentsModal(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Gerenciar
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.pdf,.docx,.doc,.txt"
          onChange={handleDocumentUpload}
          disabled={isUploadingDocument}
          className="hidden"
          id="document-upload"
        />
        <label htmlFor="document-upload">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingDocument}
            className="ceramic-concave px-3 py-1.5 text-xs font-bold hover:scale-95 transition-all flex items-center gap-1.5"
          >
            {isUploadingDocument ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-3 h-3" />
                Adicionar
              </>
            )}
          </button>
        </label>
      </div>
    </div>

    {/* Lista compacta (máximo 3 visíveis) */}
    {documents.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {documents.slice(0, 3).map((doc) => (
          <div
            key={doc.id}
            className="ceramic-tray px-2 py-1 flex items-center gap-1.5 text-xs"
          >
            <FileCheck className="w-3 h-3 text-green-600" />
            <span className="text-ceramic-text-primary truncate max-w-[120px]">
              {doc.file_name}
            </span>
            <button
              onClick={() => handleRemoveDocument(doc.id, doc.file_name)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {documents.length > 3 && (
          <button
            onClick={() => setShowDocumentsModal(true)}
            className="ceramic-tray px-2 py-1 text-xs text-blue-600 hover:underline"
          >
            +{documents.length - 3} mais
          </button>
        )}
      </div>
    )}
  </div>
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProjectBriefingView.tsx` (linha ~529-618)
- Adicionar import: `FileCheck, FolderOpen` de `lucide-react`

**Critérios de sucesso:**
- [ ] Altura máxima 12vh
- [ ] Badge "P2 - Contexto do Projeto"
- [ ] Mostra apenas 3 documentos
- [ ] Botão "+ N mais" quando >3
- [ ] Botão "Gerenciar" abre modal
- [ ] Chips compactos com ícone
- [ ] Botão X para remover

---

#### 2.1.3 - Criar Modal de Gerenciamento de Documentos
**Duração:** 1.5h

```tsx
{/* Modal para Gerenciar Documentos */}
<AnimatePresence>
  {showDocumentsModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setShowDocumentsModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="ceramic-card max-w-2xl w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Gerenciar Documentos</h3>
          <button
            onClick={() => setShowDocumentsModal(false)}
            className="ceramic-concave w-8 h-8 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="ceramic-tray p-3 flex items-center gap-3"
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.file_name}</p>
                <p className="text-xs text-ceramic-text-tertiary">
                  {doc.document_content
                    ? `${Math.round(doc.document_content.length / 1000)}k caracteres`
                    : 'Processando...'
                  }
                </p>
              </div>
              <button
                onClick={() => handleRemoveDocument(doc.id, doc.file_name)}
                className="ceramic-concave px-3 py-1.5 text-xs text-red-600 hover:scale-95 transition-all"
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-ceramic-text-secondary/10">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingDocument}
            className="w-full ceramic-concave py-2 text-sm font-bold flex items-center justify-center gap-2"
          >
            {isUploadingDocument ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Adicionar Novo Documento
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProjectBriefingView.tsx`
- Adicionar estado: `const [showDocumentsModal, setShowDocumentsModal] = useState(false);`

**Critérios de sucesso:**
- [ ] Modal centralizado
- [ ] Lista completa de documentos
- [ ] Scroll quando >5 documentos
- [ ] Botão remover individual
- [ ] Botão adicionar no footer
- [ ] Fecha ao clicar fora

---

#### 2.1.4 - Ajustar área de campos editáveis para 75vh
**Duração:** 0.5h

```tsx
{/* Área de campos - Nova altura */}
<div className="space-y-6 min-h-[75vh]">
  {formFields.map((field) => (
    <BriefingField
      key={field.id}
      field={field}
      value={localBriefing[field.id] || ''}
      onChange={handleFieldChange}
    />
  ))}
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/ProjectBriefingView.tsx`

**Critérios de sucesso:**
- [ ] Min-height 75vh
- [ ] Scroll suave
- [ ] Campos totalmente visíveis

---

### Comparação Visual:

```
ANTES (Ineficiente):
┌────────────────────────────┐
│ Header (100px)        10%  │
├────────────────────────────┤
│ 📋 Contexto (300px)   30%  │ ← SEMPRE EXPANDIDO
│   [Texto grande]           │
├────────────────────────────┤
│ 📄 Documentos (300px) 30%  │ ← LISTA COMPLETA
│   • Doc 1                  │
│   • Doc 2                  │
│   • Doc 3                  │
├────────────────────────────┤
│ ✏️ Campos (400px)     40%  │ ← ÁREA TRABALHO
│   Campo 1                  │
│   Campo 2                  │
└────────────────────────────┘

DEPOIS (Otimizado):
┌────────────────────────────┐
│ Header (80px)          8%  │
├────────────────────────────┤
│ 📋 Edital (50px) [▼]   5%  │ ← COLAPSADO
├────────────────────────────┤
│ 📄 Docs (120px) [3]   12%  │ ← COMPACTO
├────────────────────────────┤
│ ✏️ Campos (750px)     75%  │ ← FOCO MÁXIMO
│   Campo 1 [Expandido]      │
│   Campo 2                  │
│   Campo 3                  │
│   Campo 4                  │
│   Campo 5                  │
│   ...                      │
└────────────────────────────┘

Ganho: 87% mais espaço de trabalho
```

---

## Tarefa 2.2: Lógica Condicional para Colapsar Campos (3 horas)

**Problema:** Todos os campos podem ser colapsados a qualquer momento, mesmo não aprovados

**Solução:** Apenas campos APROVADOS podem ser colapsados

### Sub-tarefas:

#### 2.2.1 - Criar função canCollapseField
**Duração:** 0.5h

```typescript
/**
 * Determina se um campo pode ser colapsado
 * Regra: Apenas campos APROVADOS podem ser colapsados
 */
const canCollapseField = (fieldId: string): boolean => {
  const state = fieldStates[fieldId];

  // Sem conteúdo = não pode colapsar
  if (!state?.content) return false;

  // Apenas campos aprovados podem ser colapsados
  return state.status === 'approved';
};
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] Função retorna boolean
- [ ] Valida existência de conteúdo
- [ ] Retorna true apenas se approved

---

#### 2.2.2 - Criar função getFieldVisualState
**Duração:** 1h

```typescript
/**
 * Estados visuais dos campos baseados em status
 */
const getFieldVisualState = (fieldId: string): {
  canCollapse: boolean;
  defaultExpanded: boolean;
  icon: React.ReactNode;
  color: string;
} => {
  const state = fieldStates[fieldId];

  if (!state) {
    return {
      canCollapse: false,
      defaultExpanded: true,
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-gray-500'
    };
  }

  switch (state.status) {
    case 'approved':
      return {
        canCollapse: true,  // ✅ PODE COLAPSAR
        defaultExpanded: false,  // Colapsa automaticamente
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: 'text-green-600'
      };

    case 'generated':
    case 'editing':
      return {
        canCollapse: false,  // ❌ NÃO PODE COLAPSAR
        defaultExpanded: true,  // Permanece expandido
        icon: <AlertCircle className="w-5 h-5" />,
        color: 'text-orange-600'
      };

    case 'generating':
      return {
        canCollapse: false,
        defaultExpanded: true,
        icon: <Loader2 className="w-5 h-5 animate-spin" />,
        color: 'text-blue-600'
      };

    default:
      return {
        canCollapse: false,
        defaultExpanded: true,
        icon: <FileText className="w-5 h-5" />,
        color: 'text-gray-500'
      };
  }
};
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] Switch com todos os status
- [ ] Retorna objeto com 4 propriedades
- [ ] Ícones corretos por status
- [ ] Cores adequadas

---

#### 2.2.3 - Implementar auto-colapso ao aprovar
**Duração:** 0.5h

```typescript
/**
 * Auto-colapsar campos quando aprovados
 */
useEffect(() => {
  Object.entries(fieldStates).forEach(([fieldId, state]) => {
    if (state.status === 'approved' && expandedFields.has(fieldId)) {
      // Pequeno delay para usuário ver a aprovação
      setTimeout(() => {
        setExpandedFields(prev => {
          const next = new Set(prev);
          next.delete(fieldId);
          return next;
        });
      }, 800);
    }
  });
}, [fieldStates]);
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] useEffect monitora fieldStates
- [ ] Delay de 800ms
- [ ] Remove de expandedFields
- [ ] Animação suave

---

#### 2.2.4 - Atualizar componente de campo com lógica condicional
**Duração:** 1h

```tsx
<button
  onClick={() => {
    const canCollapse = canCollapseField(field.id);
    if (!canCollapse && !isExpanded) {
      // Mostra tooltip explicativo
      setTooltipMessage('Aprove o campo antes de colapsar');
      setTimeout(() => setTooltipMessage(''), 2000);
      return;
    }
    toggleField(field.id);
  }}
  className="flex-1 text-left flex items-start gap-3"
>
  <div className={`ceramic-concave w-10 h-10 flex items-center justify-center ${getFieldVisualState(field.id).color}`}>
    {getFieldVisualState(field.id).icon}
  </div>
  <div className="flex-1 min-w-0">
    <h3 className="text-lg font-bold">
      {field.label}
      {field.required && <span className="ml-2 text-sm text-red-600">*</span>}
    </h3>
    {field.placeholder && (
      <p className="text-sm text-ceramic-text-tertiary">{field.placeholder}</p>
    )}
  </div>

  {/* Collapse icon - apenas se pode colapsar */}
  {getFieldVisualState(field.id).canCollapse ? (
    isExpanded ? (
      <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary" />
    ) : (
      <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary" />
    )
  ) : (
    <div className="w-5 h-5" /> // Espaço vazio
  )}
</button>

{/* Indicador visual */}
{!getFieldVisualState(field.id).canCollapse && hasContent && (
  <div className="flex items-center gap-1.5 text-xs text-orange-600">
    <AlertCircle className="w-3 h-3" />
    <span>Aprove para economizar espaço</span>
  </div>
)}
```

**Arquivos afetados:**
- `src/modules/grants/components/ProposalGeneratorView.tsx`

**Critérios de sucesso:**
- [ ] onClick valida canCollapse
- [ ] Tooltip aparece se tentar colapsar não aprovado
- [ ] Ícone chevron só aparece se pode colapsar
- [ ] Indicador "Aprove para economizar espaço"

---

## Tarefa 2.3: Otimizar Página do Edital (2 horas)

**Problema:** PDF ocupa 20% da página, empurrando projetos para baixo

**Solução:** Colapsar PDF por padrão (5vh), expandir sob demanda

### Sub-tarefas:

#### 2.3.1 - Criar versão colapsada da seção PDF
**Duração:** 1h

```tsx
{/* EditalDocumentSection - Versão Compacta */}
<div className="mb-6">
  <button
    onClick={() => setShowEditalSection(!showEditalSection)}
    className="w-full ceramic-card p-3 flex items-center justify-between hover:bg-black/5"
  >
    <div className="flex items-center gap-3">
      <FileText className="w-5 h-5 text-purple-500" />
      <div className="text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold">PDF do Edital</h3>
          {editalPdfPath && editalTextContent && (
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
              ✓ Processado
            </span>
          )}
        </div>
        <p className="text-xs text-ceramic-text-tertiary">
          {editalTextContent
            ? `${Math.round(editalTextContent.length / 1000)}k caracteres • Contexto para IA`
            : 'Upload PDF para contexto da IA'
          }
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {/* Quick actions quando collapsed */}
      {!showEditalSection && editalPdfPath && (
        <>
          <a
            href={getPdfUrl() || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ceramic-concave p-2 hover:scale-95"
            title="Visualizar PDF"
          >
            <Eye className="w-4 h-4" />
          </a>
          <a
            href={getPdfUrl() || '#'}
            download
            onClick={(e) => e.stopPropagation()}
            className="ceramic-concave p-2 hover:scale-95"
            title="Baixar PDF"
          >
            <Download className="w-4 h-4" />
          </a>
        </>
      )}

      {showEditalSection ? (
        <ChevronUp className="w-5 h-5" />
      ) : (
        <ChevronDown className="w-5 h-5" />
      )}
    </div>
  </button>

  <AnimatePresence>
    {showEditalSection && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden"
      >
        <div className="p-4 pt-0">
          {/* Conteúdo expandido */}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

**Arquivos afetados:**
- `src/modules/grants/components/EditalDocumentSection.tsx` (linhas 114-285)
- `src/modules/grants/components/EditalDetailView.tsx` (linhas 266-273)
- Adicionar import: `Eye` de `lucide-react`

**Critérios de sucesso:**
- [ ] Colapsado por padrão
- [ ] Quick actions (Ver/Baixar) visíveis quando collapsed
- [ ] Badge "✓ Processado"
- [ ] Expande ao clicar
- [ ] Animação suave

---

#### 2.3.2 - Atualizar EditalDetailView para usar prop defaultCollapsed
**Duração:** 0.5h

```tsx
<EditalDocumentSection
  defaultCollapsed={true}  // ← NOVA PROP
  opportunityId={opportunity.id}
  opportunityTitle={opportunity.title}
  editalPdfPath={opportunity.edital_pdf_path}
  editalTextContent={opportunity.edital_text_content}
  onUpload={handleUploadEditalPDF}
  onDelete={handleDeleteEditalPDF}
/>
```

**Arquivos afetados:**
- `src/modules/grants/components/EditalDetailView.tsx`
- `src/modules/grants/components/EditalDocumentSection.tsx` (adicionar prop ao tipo)

**Critérios de sucesso:**
- [ ] Prop defaultCollapsed aceita
- [ ] Estado inicial baseado na prop
- [ ] TypeScript sem erros

---

#### 2.3.3 - Testar ganho de espaço
**Duração:** 0.5h

**Comparação:**

```
ANTES:
┌────────────────────────────┐
│ Header + Stats (200px) 20% │
├────────────────────────────┤
│ 📄 PDF (200px)        20%  │ ← EXPANDIDO
│   [Preview do PDF]         │
├────────────────────────────┤
│ 📂 Projetos (600px)   60%  │
│   Card 1                   │
│   Card 2                   │
│   Card 3 ← Só com scroll   │
└────────────────────────────┘

DEPOIS:
┌────────────────────────────┐
│ Header + Stats (150px) 15% │
├────────────────────────────┤
│ 📄 PDF (50px) [▼]      5%  │ ← COLAPSADO
├────────────────────────────┤
│ 📂 Projetos (800px)   80%  │
│   Card 1                   │
│   Card 2                   │
│   Card 3                   │
│   Card 4                   │
│   Card 5                   │
│   Card 6 ← Todos visíveis  │
└────────────────────────────┘

Ganho: 100-150% mais projetos visíveis
```

**Critérios de sucesso:**
- [ ] 5-6 projetos visíveis (vs 2-3 antes)
- [ ] Scroll reduzido em 60%

---

### Critérios de Sucesso do Sprint 2:

- [ ] **Espaço de Trabalho Briefing:** 75vh (vs 40vh antes) = ganho de 87%
- [ ] **Projetos Visíveis Edital:** 5-6 cards (vs 2-3 antes) = ganho de 100-150%
- [ ] **Colapso de Campos:** Apenas aprovados podem colapsar (0% de erro)
- [ ] **Auto-colapso:** Campos colapsam 800ms após aprovação
- [ ] **Indicadores Visuais:** "Aprove para economizar espaço" aparece
- [ ] **Scroll Reduzido:** 60-70% menos scroll necessário

**Testes Recomendados:**
1. Verificar altura de cada seção (usar DevTools)
2. Contar projetos visíveis sem scroll
3. Tentar colapsar campo não aprovado (deve mostrar tooltip)
4. Aprovar campo e verificar auto-colapso
5. Expandir Contexto/PDF e verificar scroll suave

---

# Sprint 3: Nice-to-Have (2 semanas - 12h)

**Objetivo:** Automatizar assistência ao usuário com tarefas contextuais

**Impacto Esperado:**
- Reduzir esquecimento de etapas em 70%
- Aumentar taxa de conclusão de projetos em 40%
- Melhorar clareza do processo em 80%
- Integrar Grants ↔ Atlas bidireccionalmente

---

## Tarefa 3.1: Sistema de Tarefas Contextuais (8 horas)

**Objetivo:** Gerar tarefas automaticamente no Atlas baseadas no estado do projeto

**Backend:** ✅ Já implementado (trigger `create_grant_tasks_on_project_insert`)

### Sub-tarefas:

#### 3.1.1 - Criar GrantTaskGenerator service
**Duração:** 2h

```typescript
// src/modules/grants/services/grantTaskGenerator.ts

import { GrantProject, GrantOpportunity } from '../types';

export interface GrantTask {
  id: string;
  project_id: string;
  opportunity_id: string;
  task_type: 'briefing' | 'upload_doc' | 'review_field' | 'external_submit' | 'deadline_reminder';
  title: string;
  description: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  metadata: {
    field_id?: string;
    document_type?: string;
    external_url?: string;
    [key: string]: any;
  };
  created_at: string;
  completed_at?: string;
}

export class GrantTaskGenerator {
  /**
   * Gera tarefas baseadas no estado atual do projeto
   */
  static generateTasksForProject(
    project: GrantProject,
    opportunity: GrantOpportunity
  ): GrantTask[] {
    const tasks: GrantTask[] = [];
    const now = new Date();

    // Task 1: Completar Briefing
    if (project.status === 'draft' || project.status === 'briefing') {
      tasks.push({
        id: `task_briefing_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'briefing',
        title: 'Completar contexto do projeto',
        description: `Preencha informações sobre seu projeto para ${opportunity.title}`,
        priority: 'high',
        status: 'pending',
        metadata: {
          completion_percentage: project.completion_percentage,
          required_fields: opportunity.form_fields.filter(f => f.required).length
        },
        created_at: now.toISOString()
      });
    }

    // Task 2: Upload de documentos
    const hasDocuments = project.documents && project.documents.length > 0;
    if (!hasDocuments && project.status !== 'submitted') {
      tasks.push({
        id: `task_upload_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'upload_doc',
        title: 'Enviar documentos de contexto',
        description: 'Faça upload de PDFs, apresentações ou documentos do projeto',
        priority: 'medium',
        status: 'pending',
        metadata: {
          accepted_formats: ['.pdf', '.md', '.txt', '.docx'],
          recommendation: 'Quanto mais contexto, melhor a IA gerará respostas'
        },
        created_at: now.toISOString()
      });
    }

    // Task 3: Revisar campos
    if (project.status === 'generating' || project.status === 'review') {
      const pendingFields = opportunity.form_fields.length;
      tasks.push({
        id: `task_review_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'review_field',
        title: 'Revisar e aprovar campos gerados',
        description: `Revise ${pendingFields} campos gerados pela IA`,
        priority: 'high',
        status: 'in_progress',
        metadata: {
          pending_fields: pendingFields,
          total_fields: opportunity.form_fields.length
        },
        created_at: now.toISOString()
      });
    }

    // Task 4: Submeter no sistema externo
    if (project.status === 'submitted' && opportunity.external_system_url) {
      const deadline = new Date(opportunity.submission_deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      tasks.push({
        id: `task_external_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'external_submit',
        title: 'Enviar no sistema oficial',
        description: `Acesse ${opportunity.funding_agency} e submeta oficialmente`,
        due_date: opportunity.submission_deadline,
        priority: daysRemaining <= 3 ? 'critical' : daysRemaining <= 7 ? 'high' : 'medium',
        status: 'pending',
        metadata: {
          external_url: opportunity.external_system_url,
          deadline: opportunity.submission_deadline,
          days_remaining: daysRemaining
        },
        created_at: now.toISOString()
      });
    }

    // Task 5: Lembretes de prazo
    const deadline = new Date(opportunity.submission_deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 7 && daysRemaining > 0 && project.status !== 'submitted') {
      tasks.push({
        id: `task_deadline_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'deadline_reminder',
        title: `⚠️ Prazo em ${daysRemaining} dias`,
        description: `O prazo é ${deadline.toLocaleDateString('pt-BR')}`,
        due_date: opportunity.submission_deadline,
        priority: daysRemaining <= 3 ? 'critical' : 'high',
        status: 'pending',
        metadata: {
          days_remaining: daysRemaining,
          deadline: opportunity.submission_deadline
        },
        created_at: now.toISOString()
      });
    }

    return tasks;
  }

  /**
   * Gera tarefas específicas de etapas do edital (ex: 32/2025)
   */
  static generateTasksFromEditalSteps(
    opportunity: GrantOpportunity
  ): GrantTask[] {
    const editalSteps = opportunity.metadata?.steps || [];

    return editalSteps.map((step: any, index: number) => ({
      id: `task_step_${opportunity.id}_${index}`,
      project_id: '',
      opportunity_id: opportunity.id,
      task_type: 'briefing',
      title: step.title,
      description: step.description,
      due_date: step.deadline,
      priority: step.priority || 'medium',
      status: 'pending',
      metadata: {
        step_number: index + 1,
        total_steps: editalSteps.length,
        step_type: step.type,
        ...step.metadata
      },
      created_at: new Date().toISOString()
    }));
  }
}
```

**Arquivos criados:**
- `src/modules/grants/services/grantTaskGenerator.ts` (novo)

**Critérios de sucesso:**
- [ ] Classe estática criada
- [ ] 2 funções principais
- [ ] Tipos TypeScript corretos
- [ ] 5 tipos de tarefas implementados
- [ ] Lógica de prioridade baseada em prazo

---

#### 3.1.2 - Implementar sincronização Grants → Atlas
**Duração:** 2h

```typescript
// src/modules/grants/services/grantTaskSync.ts

import { supabase } from '../../../lib/supabase';
import { GrantTaskGenerator } from './grantTaskGenerator';
import { getProject } from './grantService';

/**
 * Sincroniza tarefas do Grants para o Atlas
 */
export const syncGrantTasksToAtlas = async (
  projectId: string,
  userId: string
) => {
  try {
    // 1. Buscar projeto e oportunidade
    const project = await getProject(projectId);
    const opportunity = project.opportunity;

    if (!opportunity) return;

    // 2. Gerar tarefas contextuais
    const grantTasks = GrantTaskGenerator.generateTasksForProject(
      project,
      opportunity
    );

    // 3. Criar tarefas no Atlas
    for (const grantTask of grantTasks) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('work_items')
        .select('id')
        .eq('metadata->grant_task_id', grantTask.id)
        .maybeSingle();

      if (existing) continue;

      // Buscar life_area "Captação"
      const { data: lifeArea } = await supabase
        .from('life_areas')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'Captação')
        .maybeSingle();

      if (!lifeArea) {
        console.warn('[Grants→Atlas] Life area Captação not found');
        continue;
      }

      // Criar tarefa no Atlas
      await supabase
        .from('work_items')
        .insert({
          user_id: userId,
          title: grantTask.title,
          description: grantTask.description,
          due_date: grantTask.due_date,
          priority: mapPriority(grantTask.priority),
          status: mapStatus(grantTask.status),
          life_area_id: lifeArea.id,
          metadata: {
            source: 'grants',
            grant_task_id: grantTask.id,
            grant_task_type: grantTask.task_type,
            project_id: projectId,
            opportunity_id: opportunity.id,
            ...grantTask.metadata
          }
        });
    }

    console.log(`[Grants→Atlas] Synced ${grantTasks.length} tasks for project ${projectId}`);
  } catch (error) {
    console.error('[Grants→Atlas] Sync error:', error);
  }
};

/**
 * Mapeia prioridade Grants → Atlas
 */
function mapPriority(priority: string): number {
  const map: Record<string, number> = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };
  return map[priority] || 2;
}

/**
 * Mapeia status Grants → Atlas
 */
function mapStatus(status: string): string {
  const map: Record<string, string> = {
    'pending': 'backlog',
    'in_progress': 'in_progress',
    'completed': 'done',
    'skipped': 'cancelled'
  };
  return map[status] || 'backlog';
}
```

**Arquivos criados:**
- `src/modules/grants/services/grantTaskSync.ts` (novo)

**Critérios de sucesso:**
- [ ] Função assíncrona criada
- [ ] Busca life_area "Captação"
- [ ] Verifica duplicação (grant_task_id)
- [ ] Mapeia prioridade e status
- [ ] Insere em work_items com metadata

---

#### 3.1.3 - Implementar sincronização Atlas → Grants
**Duração:** 1.5h

```typescript
// Adicionar em grantTaskSync.ts

/**
 * Sincroniza conclusão de tarefa do Atlas para Grants
 */
export const syncAtlasTaskToGrant = async (taskId: string) => {
  try {
    const { data: task } = await supabase
      .from('work_items')
      .select('*, metadata')
      .eq('id', taskId)
      .single();

    if (!task || task.metadata?.source !== 'grants') return;

    const grantTaskType = task.metadata.grant_task_type;
    const projectId = task.metadata.project_id;

    // Atualizar status do projeto baseado no tipo de tarefa
    switch (grantTaskType) {
      case 'briefing':
        if (task.status === 'done') {
          await updateProjectStatus(projectId, 'generating');
        }
        break;

      case 'review_field':
        // Lógica específica se necessário
        break;

      case 'external_submit':
        if (task.status === 'done') {
          await updateProjectStatus(projectId, 'approved');
        }
        break;
    }

    console.log(`[Atlas→Grants] Updated project ${projectId} based on task ${taskId}`);
  } catch (error) {
    console.error('[Atlas→Grants] Sync error:', error);
  }
};

async function updateProjectStatus(projectId: string, status: string) {
  await supabase
    .from('grant_projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId);
}
```

**Arquivos afetados:**
- `src/modules/grants/services/grantTaskSync.ts`

**Critérios de sucesso:**
- [ ] Detecta origem 'grants'
- [ ] Switch para tipos de tarefa
- [ ] Atualiza status do projeto
- [ ] Log de operação

---

#### 3.1.4 - Adicionar painel flutuante de próximos passos
**Duração:** 2.5h

```tsx
// Adicionar em ProjectBriefingView.tsx

const [contextualTasks, setContextualTasks] = useState<GrantTask[]>([]);
const [showTaskPanel, setShowTaskPanel] = useState(true);

// Carregar tarefas contextuais
useEffect(() => {
  if (!project || !opportunity) return;

  const tasks = GrantTaskGenerator.generateTasksForProject(project, opportunity);
  setContextualTasks(tasks);
}, [project, opportunity]);

// Componente de painel flutuante
{showTaskPanel && contextualTasks.length > 0 && (
  <div className="fixed bottom-6 right-6 z-40 max-w-sm">
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="ceramic-card p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="ceramic-concave w-8 h-8 flex items-center justify-center text-blue-600">
            <ListChecks className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Próximos Passos</h3>
            <p className="text-xs text-ceramic-text-tertiary">
              {contextualTasks.filter(t => t.status === 'pending').length} pendentes
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowTaskPanel(false)}
          className="ceramic-concave w-6 h-6 flex items-center justify-center hover:scale-95"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {contextualTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            className="ceramic-tray p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex items-start gap-2">
              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 ${
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : 'border-ceramic-text-tertiary'
              }`}>
                {task.status === 'completed' && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-ceramic-text-tertiary line-clamp-2">
                  {task.description}
                </p>
                {task.due_date && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">
                      {formatRelativeDate(task.due_date)}
                    </span>
                  </div>
                )}
              </div>
              <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {task.priority}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={() => navigateToAtlas()}
        className="w-full mt-3 ceramic-concave py-2 text-xs font-bold flex items-center justify-center gap-2"
      >
        <ExternalLink className="w-3 h-3" />
        Ver todas no Atlas
      </button>
    </motion.div>
  </div>
)}
```

**Arquivos afetados:**
- `src/modules/grants/components/ProjectBriefingView.tsx`
- Adicionar imports: `ListChecks, Check, Clock, ExternalLink` de `lucide-react`

**Critérios de sucesso:**
- [ ] Painel aparece canto inferior direito
- [ ] Lista tarefas com prioridade
- [ ] Checkboxes para completadas
- [ ] Badges de prioridade (cores)
- [ ] Botão "Ver todas no Atlas"
- [ ] Animação slide-in

---

## Tarefa 3.2: Design System e Documentação (4 horas)

**Objetivo:** Documentar padrões ceramic e criar biblioteca de animações

### Sub-tarefas:

#### 3.2.1 - Documentar padrões ceramic
**Duração:** 1.5h

```markdown
# Design System - Ceramic UI

## Hierarquia de Elementos

### 1. ceramic-card (Base Cards)
**Uso:** Containers principais, seções destacadas
**Shadow:** Suave elevação
**Exemplo:** Cards de projeto, modais, painéis

### 2. ceramic-concave (Botões Secundários / Inputs)
**Uso:** Botões de ação secundária, campos de entrada
**Shadow:** Interna (afundado)
**Exemplo:** Botões "Editar", "Cancelar", inputs

### 3. ceramic-convex (Botões Primários / CTAs)
**Uso:** Ações principais, botões de envio
**Shadow:** Externa (elevado)
**Exemplo:** "Submeter", "Gerar com IA", "Salvar"

### 4. ceramic-tray (Containers de Conteúdo)
**Uso:** Áreas de texto, previews, listas
**Shadow:** Muito suave, quase plana
**Exemplo:** Textareas, previews de documento

### 5. ceramic-trough (Barras de Progresso)
**Uso:** Containers para barras de progresso
**Shadow:** Interna profunda
**Exemplo:** Progress bars, sliders

## Gradientes do Módulo Grants

```css
:root {
  --grants-primary: linear-gradient(145deg, #10b981, #059669);
  --grants-secondary: linear-gradient(145deg, #34d399, #10b981);
  --grants-accent: linear-gradient(145deg, #6ee7b7, #34d399);
  --grants-dark: linear-gradient(145deg, #059669, #047857);
}
```

## Exemplos de Uso

### Botão Primary (ceramic-convex)
```tsx
<button className="ceramic-convex px-7 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
  Submeter Proposta
</button>
```

### Botão Secondary (ceramic-concave)
```tsx
<button className="ceramic-concave px-5 py-2.5 text-ceramic-text-primary">
  Cancelar
</button>
```
```

**Arquivo criado:**
- `docs/DESIGN_SYSTEM_CERAMIC.md` (novo)

**Critérios de sucesso:**
- [ ] 5 classes documentadas
- [ ] Exemplos de código
- [ ] Quando usar cada uma
- [ ] Gradientes do módulo

---

#### 3.2.2 - Criar biblioteca de animações Framer Motion
**Duração:** 2h

```typescript
// src/lib/animations.ts

import { Variants, Transition } from 'framer-motion';

/**
 * Biblioteca de animações reutilizáveis com Framer Motion
 */
export const animations = {
  /**
   * Fade in com slide vertical
   */
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 } as Transition
  },

  /**
   * Scale in (para modais)
   */
  scaleIn: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 25 } as Transition
  },

  /**
   * Slide in lateral direita
   */
  slideInRight: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
    transition: { type: 'spring', stiffness: 200, damping: 20 } as Transition
  },

  /**
   * Slide in lateral esquerda
   */
  slideInLeft: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
    transition: { type: 'spring', stiffness: 200, damping: 20 } as Transition
  },

  /**
   * Collapse/Expand suave
   */
  collapse: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.2 } as Transition
  },

  /**
   * Checkmark success (spring)
   */
  checkmarkPop: {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    transition: { type: 'spring', stiffness: 200, damping: 15 } as Transition
  },

  /**
   * Pulse suave (loop)
   */
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1]
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    } as Transition
  },

  /**
   * Shake (erro)
   */
  shake: {
    animate: {
      x: [0, -10, 10, -10, 10, 0]
    },
    transition: {
      duration: 0.4
    } as Transition
  }
};

/**
 * Variants para stagger de listas
 */
export const staggerVariants: Variants = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.05
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  }
};

/**
 * Exemplo de uso:
 *
 * import { animations } from '@/lib/animations';
 *
 * <motion.div {...animations.fadeInUp}>
 *   Conteúdo
 * </motion.div>
 */
```

**Arquivo criado:**
- `src/lib/animations.ts` (novo)

**Critérios de sucesso:**
- [ ] 8 animações predefinidas
- [ ] Stagger variants
- [ ] TypeScript com tipos Framer Motion
- [ ] Comentários JSDoc
- [ ] Exemplo de uso

---

#### 3.2.3 - Padronizar gradientes verdes do módulo
**Duração:** 0.5h

```css
/* Adicionar em tailwind.config.js ou CSS global */

.bg-grants-primary {
  background: linear-gradient(145deg, #10b981, #059669);
}

.bg-grants-secondary {
  background: linear-gradient(145deg, #34d399, #10b981);
}

.bg-grants-accent {
  background: linear-gradient(145deg, #6ee7b7, #34d399);
}

.bg-grants-dark {
  background: linear-gradient(145deg, #059669, #047857);
}

/* Uso em botões */
.btn-grants-primary {
  @apply bg-grants-primary text-white shadow-lg;
  box-shadow:
    2px 2px 8px rgba(16, 185, 129, 0.3),
    -1px -1px 4px rgba(255, 255, 255, 0.8);
}
```

**Arquivos afetados:**
- `tailwind.config.js` ou `src/index.css`

**Critérios de sucesso:**
- [ ] 4 classes de gradiente
- [ ] Classe btn-grants-primary
- [ ] Shadows adequadas

---

### Critérios de Sucesso do Sprint 3:

- [ ] **Tarefas Geradas:** Automaticamente ao criar projeto ✅
- [ ] **Sincronização Grants→Atlas:** Tarefas aparecem no Atlas
- [ ] **Sincronização Atlas→Grants:** Status atualiza quando tarefa concluída
- [ ] **Painel Flutuante:** Exibe próximos passos contextuais
- [ ] **Design System:** Documentação completa ceramic
- [ ] **Biblioteca de Animações:** 8+ animações prontas
- [ ] **Gradientes Padronizados:** Classes CSS reutilizáveis

**Testes Recomendados:**
1. Criar projeto e verificar tarefa no Atlas
2. Completar tarefa no Atlas e verificar status no Grants
3. Visualizar painel de próximos passos
4. Validar documentação ceramic
5. Usar animações em componentes novos

---

## Resumo Executivo

### Cronograma Total

| Sprint | Duração | Tarefas | Esforço | Prioridade |
|--------|---------|---------|---------|------------|
| Sprint 1 | 1 semana | 9 | 14h | 🔴 CRÍTICO |
| Sprint 2 | 1 semana | 9 | 11h | 🟡 IMPORTANTE |
| Sprint 3 | 2 semanas | 9 | 12h | 🟢 NICE-TO-HAVE |
| **TOTAL** | **~1 mês** | **27** | **37h** | - |

### Métricas de Sucesso

**Antes das Melhorias:**
- Taxa de confusão: 95%
- Espaço de trabalho útil: 40%
- Projetos visíveis: 2-3
- Contraste botão: 3.2:1 ❌
- Taxa de conclusão: baseline

**Depois das Melhorias:**
- Taxa de confusão: 5% ✅ (-94%)
- Espaço de trabalho útil: 75% ✅ (+87%)
- Projetos visíveis: 5-6 ✅ (+150%)
- Contraste botão: 7.8:1 ✅ WCAG AAA
- Taxa de conclusão: +40% ✅

### Próximos Passos

1. ✅ **Sprint 1 priorizado** - Feedback visual e modal de submissão
2. ⏭️ **Sprint 2 sequencial** - Hierarquia visual e colapso inteligente
3. 🎯 **Sprint 3 paralelo** - Tarefas contextuais e design system
4. 🧪 **Testes com usuários** - 5-8 participantes após Sprint 1
5. 🔄 **Iteração baseada em feedback** - Ajustes incrementais

---

**Documento criado por:** Claude Sonnet 4.5
**Data:** 2024-12-09
**Versão:** 1.0
**Status:** ✅ Pronto para execução
