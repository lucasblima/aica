# Design System - Ceramic UI

Aica Life OS utiliza um design system proprietário chamado **Ceramic UI**, que simula superfícies cerâmicas com elevações, depressões e sombras suaves para criar hierarquia visual e affordance.

## Filosofia

O design Ceramic UI é inspirado em:
- **Neomorfismo**: Sombras suaves que simulam elevação/depressão
- **Skeuomorfismo sutil**: Superfícies que parecem tridimensionais
- **Hierarquia tátil**: Botões primários "saltam", botões secundários "afundam"
- **Minimalismo**: Cores neutras com acentos vibrantes

---

## Hierarquia de Elementos

### 1. `ceramic-card` - Cards Base

**Uso:** Containers principais, seções destacadas, modais

**Características:**
- Shadow suave com elevação moderada
- Background branco/cinza claro
- Border-radius arredondado
- Padding generoso

**Quando usar:**
- Cards de projetos, editais, oportunidades
- Modais e dialogs
- Painéis laterais
- Seções destacadas em páginas

**Exemplo:**
```tsx
<div className="ceramic-card p-6">
  <h2>Título do Card</h2>
  <p>Conteúdo aqui...</p>
</div>
```

**CSS (aproximado):**
```css
.ceramic-card {
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  box-shadow:
    8px 8px 16px rgba(163, 177, 198, 0.2),
    -8px -8px 16px rgba(255, 255, 255, 0.6);
  border-radius: 16px;
}
```

---

### 2. `ceramic-concave` - Botões Secundários / Inputs

**Uso:** Botões de ação secundária, campos de entrada, elementos "afundados"

**Características:**
- Shadow **interna** (inset) - cria efeito de depressão
- Parece "afundar" na superfície
- Feedback tátil: ao clicar, "afunda" mais (scale-90)

**Quando usar:**
- Botões secundários (fechar, cancelar, deletar)
- Campos de texto (inputs)
- Chips e badges
- Toggle buttons (quando não selecionado)

**Exemplo:**
```tsx
<button className="ceramic-concave px-4 py-2 hover:scale-95 active:scale-90 transition-all">
  Fechar
</button>
```

**CSS (aproximado):**
```css
.ceramic-concave {
  background: linear-gradient(145deg, #e6e6e6, #ffffff);
  box-shadow:
    inset 4px 4px 8px rgba(163, 177, 198, 0.3),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}
```

---

### 3. `ceramic-convex` - Botões Primários / CTAs

**Uso:** Ações principais, Call-to-Actions, botões de submissão

**Características:**
- Shadow **externa** - cria efeito de elevação
- Parece "saltar" da superfície
- Feedback tátil: ao clicar, "sobe" ainda mais (scale-105 → scale-95)

**Quando usar:**
- Botões primários (submeter, continuar, confirmar)
- CTAs (Call to Actions)
- Botões de conclusão de tarefas
- Elementos interativos importantes

**Exemplo:**
```tsx
<button className="ceramic-convex px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-[1.02] active:scale-95 transition-all">
  Submeter Proposta
</button>
```

**CSS (aproximado):**
```css
.ceramic-convex {
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  box-shadow:
    6px 6px 12px rgba(163, 177, 198, 0.3),
    -6px -6px 12px rgba(255, 255, 255, 0.8);
  border-radius: 12px;
}
```

---

### 4. `ceramic-tray` - Containers de Conteúdo

**Uso:** Áreas de texto, previews, listas, seções de conteúdo

**Características:**
- Shadow interna muito sutil
- Background levemente mais escuro que o card pai
- Parece uma "bandeja" para conteúdo

**Quando usar:**
- Áreas de visualização de texto extraído
- Listas de documentos/campos
- Preview de conteúdo
- Containers para dados tabulares

**Exemplo:**
```tsx
<div className="ceramic-tray rounded-lg p-4">
  <p className="text-sm text-ceramic-text-tertiary">
    Texto do conteúdo aqui...
  </p>
</div>
```

**CSS (aproximado):**
```css
.ceramic-tray {
  background: linear-gradient(145deg, #ececec, #fafafa);
  box-shadow:
    inset 2px 2px 4px rgba(163, 177, 198, 0.15),
    inset -2px -2px 4px rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}
```

---

### 5. `ceramic-trough` - Barras de Progresso

**Uso:** Containers para barras de progresso, sliders

**Características:**
- Shadow interna mais profunda
- Background mais escuro
- Parece um "canal" onde a barra se move

**Quando usar:**
- Barras de progresso (loading, upload)
- Sliders de range
- Track de elementos deslizantes

**Exemplo:**
```tsx
<div className="ceramic-trough rounded-full h-3 overflow-hidden">
  <motion.div
    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
    initial={{ width: 0 }}
    animate={{ width: '75%' }}
  />
</div>
```

**CSS (aproximado):**
```css
.ceramic-trough {
  background: linear-gradient(145deg, #d9d9d9, #f0f0f0);
  box-shadow:
    inset 3px 3px 6px rgba(163, 177, 198, 0.4),
    inset -3px -3px 6px rgba(255, 255, 255, 0.3);
  border-radius: 9999px;
}
```

---

## Cores de Texto

### Hierarquia

```css
/* Primary - Títulos, texto importante */
.text-ceramic-text-primary {
  color: #1a202c; /* Quase preto */
}

/* Secondary - Subtítulos, texto de suporte */
.text-ceramic-text-secondary {
  color: #4a5568; /* Cinza médio */
}

/* Tertiary - Texto de ajuda, placeholders */
.text-ceramic-text-tertiary {
  color: #a0aec0; /* Cinza claro */
}
```

---

## Gradientes do Módulo Grants

### Paleta de Gradientes

```css
/* Primary - Botões principais, headers de sucesso */
--grants-primary: linear-gradient(145deg, #10b981, #059669);

/* Secondary - Badges, chips de status */
--grants-secondary: linear-gradient(145deg, #34d399, #10b981);

/* Accent - Highlights, borders ativos */
--grants-accent: linear-gradient(145deg, #6ee7b7, #34d399);

/* Dark - Hover states, elementos escuros */
--grants-dark: linear-gradient(145deg, #059669, #047857);
```

### Uso Recomendado

**Botão Primário (WCAG AAA - 7.8:1 contrast):**
```tsx
<button className="ceramic-convex px-7 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl">
  Submeter Proposta
</button>
```

**Badge de Status:**
```tsx
<div className="ceramic-concave px-3 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-600/10">
  <span className="text-xs font-bold text-green-600">✓ Aprovado</span>
</div>
```

**Border Ativo:**
```tsx
<div className="ceramic-card border-2 border-green-500/20 bg-green-500/5">
  {/* Conteúdo com destaque verde */}
</div>
```

---

## Animações & Transições

### Padrões de Interação

**Hover (Botões):**
```tsx
className="hover:scale-[1.02] hover:shadow-xl transition-all duration-200"
```

**Active (Click):**
```tsx
className="active:scale-95 transition-all duration-100"
```

**Disabled:**
```tsx
className="disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
```

### Transições de Estado

**Loading → Success:**
```tsx
// Ver ProposalGeneratorView.tsx linha 750-1060
// Estado: idle → submitting (spinner + progress) → success (confetti + cards)
```

**Collapse/Expand:**
```tsx
<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Conteúdo */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## Acessibilidade

### Contraste WCAG AAA

Todos os botões primários devem ter contraste mínimo de **7.8:1** para WCAG AAA:

```tsx
// ✅ Correto - Contraste 7.8:1
<button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
  Botão Acessível
</button>

// ❌ Errado - Contraste insuficiente
<button className="bg-green-200 text-green-500">
  Botão com baixo contraste
</button>
```

### Focus States

Sempre adicione estados de foco visíveis:

```tsx
className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
```

---

## Exemplos Práticos

### Card de Projeto (Grants Module)

```tsx
<div className="ceramic-card p-6 border-2 border-green-500/20 bg-green-500/5">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-bold text-ceramic-text-primary">
      {project.title}
    </h3>
    <div className="ceramic-concave px-3 py-1 rounded-full">
      <span className="text-xs font-bold text-green-600">Em revisão</span>
    </div>
  </div>

  <div className="ceramic-tray rounded-lg p-4 mb-4">
    <p className="text-sm text-ceramic-text-tertiary">
      {project.description}
    </p>
  </div>

  <button className="ceramic-convex px-6 py-3 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
    Continuar Revisão
  </button>
</div>
```

### Modal de Confirmação

```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
  <div className="ceramic-card max-w-md w-full">
    {/* Header com gradiente */}
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl">
      <h2 className="text-xl font-bold text-white">Confirmar Submissão?</h2>
    </div>

    {/* Content */}
    <div className="p-6">
      <p className="text-sm text-ceramic-text-secondary mb-6">
        Você está prestes a submeter a proposta. Revise todos os campos antes de continuar.
      </p>

      <div className="flex gap-3">
        <button className="ceramic-concave px-4 py-2 flex-1">
          Cancelar
        </button>
        <button className="ceramic-convex px-4 py-2 flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          Confirmar
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## Melhores Práticas

### ✅ Fazer

1. **Usar hierarquia visual**: ceramic-convex para ações primárias, ceramic-concave para secundárias
2. **Adicionar transições**: `transition-all duration-200` para todas as interações
3. **Respeitar contraste**: Mínimo 7.8:1 para texto em botões primários (WCAG AAA)
4. **Usar gradientes do módulo**: Manter consistência com paleta verde do Grants
5. **Adicionar feedback tátil**: `hover:scale-[1.02] active:scale-95`
6. **Colapsar conteúdo secundário**: Economizar espaço visual (ver Sprint 2)

### ❌ Evitar

1. **Não misturar estilos**: Não usar ceramic + flat design na mesma interface
2. **Não abusar de elevações**: Máximo 2-3 níveis de shadow (card > button > badge)
3. **Não usar cores puras**: Sempre usar gradientes ou tons suaves
4. **Não ignorar estados disabled**: Sempre reduzir opacity e remover hover
5. **Não criar botões sem feedback**: Todo clique deve ter resposta visual (scale, loading, etc)
6. **Não esquecer dark mode**: Preparar variantes para tema escuro (futuro)

---

## Roadmap Futuro

- [ ] Dark mode variants (ceramic-card-dark, ceramic-concave-dark)
- [ ] Biblioteca de ícones customizados no estilo ceramic
- [ ] Componentes de formulário (ceramic-input, ceramic-select, ceramic-checkbox)
- [ ] Sistema de grid responsivo ceramic
- [ ] Tokens de design exportáveis (Figma/Sketch)
- [ ] Storybook com todos os componentes documentados

---

## Referências

- **Implementação atual**: `src/modules/grants/` (todos os componentes seguem este padrão)
- **Exemplos práticos**:
  - `ProposalGeneratorView.tsx` - Modal com 4 estados (idle/submitting/success/error)
  - `ProjectBriefingView.tsx` - Hierarquia de seções colapsáveis
  - `EditalDocumentSection.tsx` - PDF section com quick actions
  - `FloatingTaskPanel.tsx` - Painel flutuante com badges de prioridade
- **Animações**: Ver `src/lib/animations.ts` (biblioteca Framer Motion)
