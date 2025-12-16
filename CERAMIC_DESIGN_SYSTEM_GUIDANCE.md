# Guia de Padrões - Sistema de Design Ceramic V2
## Recomendações Estratégicas para Excelência UX/Acessibilidade

---

## 1. FILOSOFIA CERAMIC - Aplicação Consistente

### 1.1 Os Três Princípios Fundamentais

#### Princípio 1: Tátil e Físico
Cada elemento deve parecer que pode ser "tocado" e "sentido" como objeto real em uma mesa.

**Aplicar em**:
- [ ] Todas as sombras devem ter `rgba(163, 158, 145)` para taupe natural
- [ ] Sombras externas (outset) para elevação
- [ ] Sombras internas (inset) para recesso
- [ ] Nunca usar sombras pretas puras (#000000)

**Exemplo Correto**:
```css
.ceramic-card {
  box-shadow:
    6px 6px 12px rgba(163, 158, 145, 0.20),   /* Sombra taupe natural */
    -6px -6px 12px rgba(255, 255, 255, 0.90); /* Highlight branco */
}
```

**Exemplo Incorreto**:
```css
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);  /* Sombra preta - não ceramica */
}
```

---

#### Princípio 2: Hierarquia Z-Axis Clara
Usuários devem entender imediatamente qual elemento está "frente" e qual está "atrás".

**Sistema de Camadas**:

| Layer | Uso | Sombra | Exemplo |
|-------|-----|--------|---------|
| **0** | Background infinito | Nenhuma | `#F0EFE9` puro |
| **1** | Trays, Insets, Recesso | Inset `4px 4px 8px` | VitalStatsTray |
| **2** | Cards, Elevated, Frente | Outset `6px 6px 12px` | IdentityPassport, EfficiencyFlowCard |
| **3** | Modals, Dialogs, Topo | Outset `8px 8px 20px` | ProfileModal |

**Validação**: Olhar screenshot e contar camadas. Se não consegue distinguir, rever sombras.

---

#### Princípio 3: Feedback Tático Imediato
Todo elemento interativo deve fornecer feedback físico simulado em 3 momentos:
1. **Hover**: Elevação leve (scale + shadow aprofunda)
2. **Active/Press**: Afundamento (inset shadow + scale down)
3. **Release**: Retorno ao estado normal (transição smooth)

**Padrão Correto**:
```tsx
<motion.button
  className="ceramic-btn-primary"
  whileHover={{
    scale: 1.02,
    boxShadow: '8px 8px 16px rgba(163, 158, 145, 0.25), -8px -8px 16px rgba(255, 255, 255, 0.95)'
  }}
  whileTap={{
    scale: 0.98,
    boxShadow: 'inset 3px 3px 6px rgba(163, 158, 145, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 0.9)'
  }}
/>
```

---

### 1.2 Paleta de Cores - Harmonia Cerâmica

#### Cores Principais
```
Background (Layer 0):        #F0EFE9 (Cream infinito)
Text Primário:              #5C554B (Lead/Carvão)
Text Secundário:            #8B8178 (Taupe claro)
Accent:                     #D97706 (Amber queimado)
Accent Light:               #F59E0B (Amber quente)
Accent Ultra Light:         #FBBF24 (Amber suave)
```

#### Validação de Harmonia
- [ ] Accent (#D97706) nunca em fundo branco puro (quebra mood)
- [ ] Use amber-100 (#FEF3C7) como background para accent
- [ ] Text sempre em Lead (#5C554B) ou Taupe (#8B8178)
- [ ] Sombras sempre em taupe, nunca preto

---

### 1.3 Tipografia - Hierarquia Pesada

O redesign usa **Heavy Typography** para criar impacto visual sem reliance em cores.

```tsx
// Padrão Ceramic para hierarquia
<h1 className="text-3xl font-black">Título Principal</h1>         {/* 900 weight */}
<h2 className="text-2xl font-bold">Subtítulo</h2>                 {/* 700 weight */}
<p className="text-base font-medium">Corpo Normal</p>              {/* 500 weight */}
<span className="text-xs font-semibold">Label</span>               {/* 600 weight */}
<p className="text-xs text-ceramic-text-secondary">Secundário</p> {/* 400 weight */}
```

**Recomendação**: Never use font-normal (400) para UI. Mínimo 500 (medium).

---

## 2. PADRÕES DE ACESSIBILIDADE - Checklist por Componente

### 2.1 Componentes com Progresso (Barras)

#### Padrão Obrigatório
```tsx
<div
  className="ceramic-progress-groove"
  role="progressbar"
  aria-valuenow={value}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Descrição clara do progresso"
>
  <div className="ceramic-progress-fill" style={{ width: `${value}%` }} />
</div>
```

#### Checklist
- [ ] `role="progressbar"` presente
- [ ] `aria-valuenow` reflete valor atual em número
- [ ] `aria-valuemin` e `aria-valuemax` definem limites
- [ ] `aria-label` descreve contexto (não apenas "progresso")
- [ ] Cor não é única diferenciação

---

### 2.2 Componentes com Ícones

#### Padrão: Ícone + Label
```tsx
<div role="group" aria-label="Sequência: 7 dias">
  <div aria-hidden="true">
    <Flame className="w-5 h-5" />
  </div>
  <span>7</span>
  <span>Sequência</span>
</div>
```

#### Padrão: Ícone Sozinho (Button Icon)
```tsx
<button aria-label="Abrir menu" className="p-2 hover:bg-gray-100">
  <Menu className="w-5 h-5" aria-hidden="true" />
</button>
```

#### Checklist
- [ ] Se ícone tem label visível: `aria-hidden="true"`
- [ ] Se ícone sozinho: `aria-label` descritivo
- [ ] Nunca deixar ícone sem contexto para screen reader

---

### 2.3 Componentes com Inputs

#### Padrão: Input com Label
```tsx
<div className="space-y-2">
  <label htmlFor="email-input" className="text-sm font-medium">
    Email de confirmação
  </label>
  <input
    id="email-input"
    type="email"
    placeholder="seu@email.com"
    aria-describedby="email-hint"
    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
  />
  <p id="email-hint" className="text-xs text-gray-500">
    Digite seu email para confirmar
  </p>
</div>
```

#### Checklist
- [ ] Input tem `id` único
- [ ] Label tem `htmlFor={id}`
- [ ] Placeholder NÃO substitui label
- [ ] `aria-describedby` aponta para texto hint
- [ ] Focus visible com `focus:ring-2 focus:ring-amber-500`

---

### 2.4 Componentes Modais/Dialogs

#### Padrão Completo
```tsx
<motion.div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  className="fixed inset-0 z-50 flex items-center justify-center"
>
  <div aria-hidden="true" className="absolute inset-0 bg-black/30" onClick={onClose} />

  <div className="relative w-96 ceramic-card p-6">
    <h2 id="dialog-title" className="text-lg font-bold">Título do Modal</h2>
    <p id="dialog-description" className="sr-only">Descrição completa para screen readers</p>

    <div className="mt-4">
      {/* Conteúdo */}
    </div>

    <button onClick={onClose} aria-label="Fechar modal" className="absolute top-4 right-4">
      <X className="w-5 h-5" aria-hidden="true" />
    </button>
  </div>
</motion.div>
```

#### Checklist
- [ ] `role="dialog"` e `aria-modal="true"`
- [ ] `aria-labelledby` aponta para title
- [ ] `aria-describedby` aponta para description (pode ser sr-only)
- [ ] Backdrop é `aria-hidden="true"`
- [ ] Botão fechar tem `aria-label`
- [ ] Focus trap implementado (usar library)
- [ ] ESC key fecha modal

---

## 3. PADRÕES DE INTERAÇÃO - Micro-copywriting

### 3.1 States Visuais com Copy Apropriada

#### Padrão para Ações Destrutivas
```tsx
{!showConfirmation ? (
  <>
    <p>Esta ação é irreversível.</p>
    <button onClick={() => setShowConfirmation(true)}>
      Deletar Minha Conta
    </button>
  </>
) : (
  <>
    <p role="alert">Para confirmar, digite seu email abaixo:</p>
    <input placeholder="seu@email.com" />
    <button disabled={!isConfirmed}>Confirmar Exclusão</button>
  </>
)}
```

**Principles**:
1. Primeira ação é exploratória ("Deletar...")
2. Segunda ação requer confirmação ("Confirmar Exclusão")
3. Copy muda para refletir gravidade
4. Sempre oferecer "Cancelar" como escape hatch

---

#### Padrão para Loading States
```tsx
{isLoading ? (
  <div aria-busy="true" aria-label="Carregando dados...">
    <Loader2 className="animate-spin" />
    <span>Carregando...</span>
  </div>
) : (
  /* Conteúdo */
)}
```

**Principles**:
1. Adicionar visual (ícone + spinner)
2. Adicionar texto ("Carregando...")
3. Usar `aria-busy="true"`
4. NÃO usar apenas cores para indicar estado

---

#### Padrão para Empty States
```tsx
{isEmpty ? (
  <div className="text-center py-12">
    <IconEmpty className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <h3 className="font-bold mb-2">Nenhum dado disponível</h3>
    <p className="text-sm text-gray-600 mb-4">
      Complete pelo menos 7 registros para visualizar gráfico.
    </p>
    <button onClick={navigateToCreate} className="ceramic-btn-primary">
      Criar Primeiro Registro
    </button>
  </div>
) : (
  /* Conteúdo */
)}
```

**Principles**:
1. Ícone visual para contexto
2. Título claro (não genérico)
3. Mensagem explicando PORQUÊ está vazio
4. CTA button para próxima ação

---

## 4. PADRÕES DE FEEDBACK - Comunicação Clara

### 4.1 Validação de Inputs em Tempo Real

```tsx
const [email, setEmail] = useState('')
const isValid = email.includes('@')
const isTouched = email.length > 0

return (
  <>
    <input
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className={`border-2 rounded-lg ${
        !isTouched
          ? 'border-gray-300'
          : isValid
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50'
      }`}
      aria-describedby="email-feedback"
    />
    {isTouched && (
      <p
        id="email-feedback"
        className={isValid ? 'text-green-600' : 'text-red-600'}
        role="alert"
      >
        {isValid ? 'Email válido!' : 'Email deve conter @'}
      </p>
    )}
  </>
)
```

**Principles**:
1. Feedback viável apenas após primeira interação (avoid noise)
2. Cor + ícone + texto (não apenas cor)
3. Usar `role="alert"` para feedback imediato
4. Mensagens específicas (não "inválido", mas "deve conter @")

---

### 4.2 Toast Notifications Acessíveis

```tsx
export function AccessibleToast({ message, type = 'success', duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration)
    return () => clearTimeout(timer)
  }, [duration])

  return (
    <div
      role="status"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`fixed bottom-4 right-4 p-4 rounded-lg ceramic-card ${
        type === 'error'
          ? 'bg-red-50 border-l-4 border-red-600'
          : 'bg-green-50 border-l-4 border-green-600'
      }`}
      style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s' }}
    >
      {message}
    </div>
  )
}
```

**Principles**:
1. `role="status"` para não-critical, `role="alert"` para critical
2. `aria-live="polite"` para não-urgent, `aria-live="assertive"` para urgent
3. `aria-atomic="true"` para anunciar mensagem inteira
4. Auto-dismiss com timeout visual

---

## 5. PERFORMANCE & PERCEIVED PERFORMANCE

### 5.1 Skeleton Screens vs Spinners

**Use Skeleton Screen quando**:
- Conteúdo é previsível e estruturado
- Exemplo: IdentityPassport com known layout

```tsx
if (isLoading) {
  return (
    <div className="ceramic-passport">
      <div className="flex items-center gap-6 animate-pulse">
        <div className="w-14 h-14 bg-gray-300 rounded-full" />
        <div className="flex-1">
          <div className="h-6 bg-gray-300 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-300 rounded w-full" />
        </div>
      </div>
    </div>
  )
}
```

**Use Spinner quando**:
- Conteúdo é dinâmico ou estrutura desconhecida
- Exemplo: EfficiencyFlowCard carregando novo período

```tsx
if (isLoading) {
  return (
    <div className="ceramic-device flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-600" />
        <p className="text-sm text-ceramic-text-secondary">Carregando gráfico...</p>
      </div>
    </div>
  )
}
```

---

### 5.2 Animações - Perceived Performance

**Boas práticas**:
- [ ] Entrada: 0.3-0.5s (rápido, não distrai)
- [ ] Micro-interação: 0.15-0.3s (sensação de responsividade)
- [ ] Saída: 0.2-0.4s (rápido, clean)
- [ ] Sempre usar `ease-out` para entrada (physical feel)
- [ ] Sempre usar `ease-in` para saída

```tsx
// Exemplo correto
<motion.div
  initial={{ opacity: 0, y: -10 }}        // Começa fora/invisível
  animate={{ opacity: 1, y: 0 }}          // Volta ao normal
  transition={{ duration: 0.35, ease: 'easeOut' }}
/>
```

---

## 6. PADRÕES DE CONTRASTE - Sem Sacrificar Estética

### 6.1 Mapa de Contraste Acessível

```css
/* Use WCAG AAA quando possível */

/* Fundos claros (#F0EFE9) */
- Lead (#5C554B): 13.5:1 ✓ Excelente
- Taupe (#8B8178): 5.1:1  ✓ Pass
- Danger (#DC2626): 7.3:1 ✓ Pass

/* Fundos com overlay/cor */
- Amber-100 (#FEF3C7) + Lead: 7.2:1 ✓ Pass
- Red-300 (#F87171) + Red-700: 5.3:1 ✓ Pass

/* EVITE */
- White/50% + Lead: 3.4:1 ✗ Fail
- Red-200 + Red-400: 1.2:1 ✗ Critical Fail
```

---

### 6.2 Guideline para Hover States

```tsx
// EVITAR: mudança apenas de cor
<button className="text-blue-600 hover:text-blue-800">
  Clique aqui
</button>

// FAZER: mudança de cor + profundidade
<button className="text-amber-700 hover:text-amber-900 hover:shadow-md">
  Clique aqui
</button>

// MELHOR: mudança completa de estado
<motion.button
  className="ceramic-btn-primary"
  whileHover={{
    backgroundColor: '#92400E',
    boxShadow: '8px 8px 16px rgba(163, 158, 145, 0.25), -8px -8px 16px rgba(255, 255, 255, 0.95)'
  }}
/>
```

---

## 7. CHECKLIST POR COMPONENTE

### IdentityPassport Checklist
- [ ] Progress bar tem `role="progressbar"`
- [ ] Avatar tem `aria-label`
- [ ] Botão "Minha Conta" tem contraste >= 4.5:1
- [ ] Botão tem focus visible ring
- [ ] Loading skeleton em lugar de spinner
- [ ] Animações em cascata (delay 0s)

### VitalStatsTray Checklist
- [ ] Container tem `role="region" aria-label="..."`
- [ ] Cada stat tem `role="group"`
- [ ] Ícones têm `aria-hidden="true"`
- [ ] Cores + padrões (não apenas ícones)
- [ ] Labels visíveis (não placeholder apenas)
- [ ] Animação entrada em cascata (delay 0, 0.1, 0.2)

### EfficiencyFlowCard Checklist
- [ ] SVG tem `role="img" aria-label="..."`
- [ ] Tabela alternativa (sr-only) com dados
- [ ] Loading state tem `aria-busy="true"`
- [ ] Range selector tem labels acessíveis
- [ ] Empty state com CTA button
- [ ] Gráfico em cores + padrões visuais

### ProfileModal Checklist
- [ ] `role="dialog" aria-modal="true"`
- [ ] `aria-labelledby` e `aria-describedby`
- [ ] Description em sr-only
- [ ] Backdrop é `aria-hidden="true"`
- [ ] Fechar button tem `aria-label`
- [ ] Focus trap implementado
- [ ] ESC fecha modal

### DangerZone Checklist
- [ ] Botão inicial com clara advertência
- [ ] Confirmação tem `role="alert"`
- [ ] Input tem label visível
- [ ] Validação em tempo real com feedback
- [ ] Cores desabilitado >= 5:1 contraste
- [ ] Buttons têm aria-labels dinâmicos

---

## 8. TESTING STRATEGY

### Automated Testing (CI/CD)
```bash
# jest-axe para acessibilidade
npm install --save-dev jest-axe @testing-library/jest-axe

# Exemplo test
describe('IdentityPassport', () => {
  it('should pass accessibility checks', async () => {
    const { container } = render(<IdentityPassport userId="123" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Manual Testing (Before Release)
1. **Keyboard Navigation**: TAB através de toda página
2. **Screen Reader**: Use NVDA (Windows) ou VoiceOver (Mac)
3. **Contrast Check**: Use WebAIM Contrast Checker para cada cor
4. **Color Blindness**: Use ColorOracle para simular daltonismo
5. **Mobile**: Testar com VoiceOver/TalkBack em iPhone/Android

---

## 9. RECURSOS E REFERÊNCIAS

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Components](https://inclusive-components.design/)
- [WebAIM - Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Framer Motion Best Practices](https://www.framer.com/motion/)

---

## Conclusão

Este guia estabelece padrões reusáveis que mantêm:
1. **Aesthetic Excellence**: Ceramic design intent preservado
2. **Accessibility Compliance**: WCAG AA/AAA sem compromissos
3. **Developer Efficiency**: Patterns copy-paste para novos componentes
4. **User Delight**: Micro-interactions que informam e encantam

Ao seguir estes padrões, todo novo componente será automaticamente:
- Acessível para todos
- Visualmente consistente
- Performante
- Delightful para usar

