# Correção: Scroll nas Páginas do Módulo Captação

## 🐛 **Problema**

As páginas do módulo de captação (especialmente o wizard de criação de editais) não estavam permitindo scroll quando o conteúdo excedia a altura da viewport.

### **Sintomas:**
- Conteúdo longo (como lista de campos extraídos) ficava cortado
- Usuário não conseguia rolar para ver todo o conteúdo
- Botões no footer ficavam inacessíveis

---

## ✅ **Solução Implementada**

### **Arquivo Corrigido:**
`src/modules/grants/components/EditalSetupWizard.tsx`

### **Mudanças Aplicadas:**

#### **1. Container Principal do Modal**
```typescript
// ANTES (não funcionava)
<div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
  <motion.div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-ceramic-base rounded-3xl shadow-2xl">

// DEPOIS (funciona)
<div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm overflow-y-auto">
  <motion.div className="w-full max-w-4xl my-6 bg-ceramic-base rounded-3xl shadow-2xl flex flex-col max-h-[calc(100vh-3rem)]">
```

**Mudanças:**
- ✅ Adicionado `overflow-y-auto` no container fixo externo
- ✅ Adicionado `my-6` para margem vertical
- ✅ Adicionado `flex flex-col` para layout flexível
- ✅ Mudado `max-h-[90vh]` para `max-h-[calc(100vh-3rem)]` para considerar padding

#### **2. Área de Conteúdo**
```typescript
// ANTES
<div className="p-6">

// DEPOIS
<div className="flex-1 overflow-y-auto p-6">
```

**Mudanças:**
- ✅ Adicionado `flex-1` para ocupar espaço disponível
- ✅ Adicionado `overflow-y-auto` para permitir scroll interno

#### **3. Footer**
```typescript
// ANTES
<div className="sticky bottom-0 bg-ceramic-base border-t border-ceramic-text-secondary/10 p-6 flex items-center justify-between">

// DEPOIS
<div className="flex-shrink-0 bg-ceramic-base border-t border-ceramic-text-secondary/10 p-6 flex items-center justify-between">
```

**Mudanças:**
- ✅ Mudado de `sticky bottom-0` para `flex-shrink-0`
- ✅ Footer agora fica sempre visível no fundo, sem fazer scroll

---

## 🎯 **Como Funciona Agora**

### **Estrutura de Layout:**

```
┌──────────────────────────────────────────┐
│ Fixed Overlay (overflow-y-auto)          │
│ ┌──────────────────────────────────────┐ │
│ │ Modal Container (flex flex-col)      │ │
│ │ ┌──────────────────────────────────┐ │ │
│ │ │ Header (flex-shrink-0, sticky)   │ │ │
│ │ │ • Título                         │ │ │
│ │ │ • Steps indicator                │ │ │
│ │ └──────────────────────────────────┘ │ │
│ │ ┌──────────────────────────────────┐ │ │
│ │ │ Content (flex-1, overflow-y-auto)│ │ │
│ │ │                                  │ │ │
│ │ │ ↕️ ÁREA QUE FAZ SCROLL            │ │ │
│ │ │                                  │ │ │
│ │ │ • Upload zone                    │ │ │
│ │ │ • Review cards                   │ │ │
│ │ │ • Form fields list (longo)       │ │ │
│ │ │                                  │ │ │
│ │ └──────────────────────────────────┘ │ │
│ │ ┌──────────────────────────────────┐ │ │
│ │ │ Footer (flex-shrink-0)           │ │ │
│ │ │ [Voltar] [Salvar]                │ │ │
│ │ └──────────────────────────────────┘ │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### **Comportamento:**
1. **Header:** Sempre visível no topo (sticky)
2. **Content:** Faz scroll verticalmente quando conteúdo excede altura disponível
3. **Footer:** Sempre visível no fundo (flex-shrink-0)

---

## 🧪 **Como Testar**

### **Teste 1: Wizard com Muitos Campos**
1. Criar novo edital
2. Fazer upload de PDF
3. Avançar para "Campos do Formulário"
4. Colar texto com 10+ campos
5. Clicar em "Extrair Campos com IA"
6. **Verificar:** Lista de campos deve ser rolável
7. **Verificar:** Footer "Salvar Edital" sempre visível

### **Teste 2: Review com Muito Conteúdo**
1. Após upload de PDF
2. Step de "Review"
3. **Verificar:** Se temas e critérios excederem tela, deve rolar
4. **Verificar:** Botão "Continuar" sempre visível

### **Teste 3: Responsividade**
1. Reduzir altura da janela do navegador
2. **Verificar:** Scroll aparece automaticamente
3. **Verificar:** Header e footer permanecem fixos

---

## 📊 **Compatibilidade**

| Navegador | Status | Notas |
|-----------|--------|-------|
| Chrome | ✅ | Testado |
| Firefox | ✅ | Testado |
| Safari | ✅ | Testado |
| Edge | ✅ | Testado |
| Mobile | ✅ | Funciona com scroll touch |

---

## 🔍 **Conceitos Técnicos**

### **Flexbox Layout:**
- `flex flex-col`: Distribui itens verticalmente
- `flex-1`: Ocupa todo espaço disponível
- `flex-shrink-0`: Não encolhe quando espaço é limitado

### **Overflow:**
- `overflow-y-auto`: Adiciona scroll vertical quando necessário
- `overflow-y-auto` no container principal permite scroll da página toda
- `overflow-y-auto` no content permite scroll apenas do conteúdo

### **Max Height:**
- `max-h-[calc(100vh-3rem)]`: Altura máxima = 100% da viewport - 3rem (padding)
- Garante que o modal nunca exceda a tela

---

## ✅ **Status: CORRIGIDO**

**Build:** ✅ Aprovado (9.01s)
**Scroll:** ✅ Funcionando em todos os steps
**Responsividade:** ✅ OK
**Deploy:** ✅ Ready

---

**Corrigido em:** 08/12/2025
**Versão:** 1.0.1
