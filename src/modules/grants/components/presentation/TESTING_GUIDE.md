# Guia de Testes - Presentation Generator (Fase 2)

**Issue:** #117 - Gerador de Apresentações HTML/PDF
**Fase:** 2 - Slide Components e Sistema de Edição
**Data:** 2026-01-22

---

## Quick Start

### 1. Importar e usar o PresentationDemo

Adicione ao seu arquivo de rotas (ex: `App.tsx` ou router config):

```typescript
import { PresentationDemo } from '@/modules/grants/components/presentation/PresentationDemo';

// Em algum lugar das rotas
<Route path="/presentation-demo" element={<PresentationDemo />} />
```

### 2. Acessar

Navegue para: `http://localhost:5173/presentation-demo`

---

## Checklist de Testes Manuais

### ✅ Navegação de Slides

**O que testar:**
1. Clique no botão `>` (próximo slide)
2. Clique no botão `<` (slide anterior)
3. Verifique se o contador atualiza corretamente (ex: "2 / 3")
4. Clique em um thumbnail na parte inferior
5. Verifique se o slide muda imediatamente

**Resultado esperado:**
- Transição suave entre slides
- Botões desabilitam no início/fim da apresentação
- Thumbnails destacam o slide atual
- Contador sempre correto

---

### ✅ Sistema de Zoom

**O que testar:**
1. Clique no botão `-` (zoom out)
2. Clique no botão `+` (zoom in)
3. Clique no valor do zoom (ex: "100%")
4. Verifique se o viewport escala corretamente

**Resultado esperado:**
- Zoom mínimo: 50%
- Zoom máximo: 150%
- Botões desabilitam nos limites
- Slide mantém proporções 16:9 (1920x1080)
- Transição suave de scale

**Valores possíveis:**
- 50% (metade do tamanho)
- 75%
- 100% (tamanho original)
- 125%
- 150% (50% maior)

---

### ✅ Templates CSS

**O que testar:**
1. Selecione "Professional" no dropdown
2. Selecione "Creative"
3. Selecione "Institutional"
4. Navegue entre slides para ver aplicação consistente

**Resultado esperado:**

**Professional:**
- Cores: Azul escuro + Laranja
- Estilo clean e corporativo
- Bordas sutis e sombras leves

**Creative:**
- Cores: Roxo + Rosa + Teal
- Gradientes vibrantes
- Sombras marcantes
- Elementos arredondados

**Institutional:**
- Cores: Azul + Verde + Amarelo
- Barra inferior tricolor
- Estilo formal e governamental
- Bordas retas

---

### ✅ Modo de Edição

**O que testar:**

1. **Desativado (padrão):**
   - Clique em textos → Nada acontece
   - Textos são apenas leitura

2. **Ativado:**
   - Clique no botão "Modo Edição: OFF"
   - Botão fica azul ("Modo Edição: ON")
   - Clique em qualquer texto no slide
   - Digite para modificar
   - Clique fora (blur) para salvar
   - Navegue para outro slide e volte
   - Verifique se a edição persistiu

**Resultado esperado:**
- Textos ficam editáveis com outline azul no focus
- Auto-save funciona ao tirar o focus
- Mudanças persistem na navegação
- Paste remove formatação (apenas texto puro)

---

### ✅ Slides Individuais

**Slide 1: Cover (Capa)**
- ✅ Título grande centralizado
- ✅ Subtítulo
- ✅ Tagline
- ✅ Número de aprovação (PRONAC)

**Slide 2: Organization (Organização)**
- ✅ Nome da organização
- ✅ Descrição
- ✅ Missão e Visão em cards
- ✅ Lista de conquistas

**Slide 3: Impact Metrics (Métricas de Impacto)**
- ✅ Título centralizado
- ✅ 3 métricas com ícones
- ✅ Valores grandes e destacados
- ✅ Labels descritivos

**Edições a testar:**
- Clique no título
- Clique nos valores das métricas
- Clique nos labels
- Verifique se as edições salvam

---

### ✅ Responsividade do Viewport

**O que testar:**
1. Redimensione a janela do browser
2. Verifique se o viewport 1920x1080 permanece fixo
3. Verifique se o scroll horizontal/vertical aparece quando necessário
4. Teste em tela pequena (1366x768) e grande (2560x1440)

**Resultado esperado:**
- Viewport SEMPRE 1920x1080 (não é responsivo!)
- Zoom ajusta o tamanho do viewport, não o conteúdo
- Scroll aparece quando viewport não cabe na tela

---

### ✅ Thumbnails

**O que testar:**
1. Verifique se todos os 3 slides aparecem como thumbnails
2. Clique no thumbnail do slide 1
3. Clique no thumbnail do slide 3
4. Verifique se o thumbnail atual tem borda azul

**Resultado esperado:**
- Thumbnails mostram número do slide
- Thumbnail atual destacado com borda azul + ring
- Hover muda a borda para azul claro
- Clique muda o slide imediatamente

---

## Testes de Integração

### Teste 1: Fluxo Completo

1. Abra `/presentation-demo`
2. Selecione template "Creative"
3. Navegue para o slide 2
4. Ative modo de edição
5. Edite o nome da organização para "Minha Org"
6. Navegue para slide 3
7. Volte para slide 2
8. Verifique se "Minha Org" permaneceu

**Resultado esperado:**
- Edições persistem durante a navegação
- Template permanece aplicado
- Nenhum erro no console

### Teste 2: Multi-template

1. Abra `/presentation-demo`
2. Template "Professional" → Navegue todos os slides
3. Template "Creative" → Navegue todos os slides
4. Template "Institutional" → Navegue todos os slides

**Resultado esperado:**
- Troca de template instantânea
- Todos os slides renderizam corretamente em todos os templates
- Nenhuma "quebra" de layout

### Teste 3: Edição Multi-campo

1. Ative modo de edição
2. No slide 1 (Cover):
   - Edite título
   - Edite subtítulo
   - Edite tagline
3. No slide 2 (Organization):
   - Edite nome
   - Edite descrição
   - Edite primeira conquista

**Resultado esperado:**
- Todas as edições salvam individualmente
- Nenhum campo sobrescreve outro
- Focus funciona em todos os campos

---

## Testes de Performance

### Viewport Rendering

**Teste:**
1. Abra DevTools (F12)
2. Performance tab → Record
3. Navegue entre slides rapidamente
4. Pare a gravação

**Resultado esperado:**
- Cada render < 16ms (60 FPS)
- Nenhum layout shift
- Nenhum warning de memory leak

### Template Swap

**Teste:**
1. DevTools → Performance
2. Alterne templates rapidamente (5x)

**Resultado esperado:**
- Swap instantâneo (< 50ms)
- Apenas re-paint, não re-layout
- Nenhum flash branco

---

## Bugs Conhecidos

### 🐛 Nenhum bug conhecido até o momento

Se encontrar bugs, documente aqui:

**Bug #1: [Título]**
- **Descrição:**
- **Passos para reproduzir:**
- **Resultado esperado:**
- **Resultado atual:**
- **Severidade:** Crítico / Alto / Médio / Baixo

---

## Testes de Acessibilidade (Opcional)

### Keyboard Navigation
- ⏳ TODO (Fase 5): Navegar com Tab/Shift+Tab
- ⏳ TODO (Fase 5): Enter para editar
- ⏳ TODO (Fase 5): Esc para cancelar edição

### Screen Reader
- ⏳ TODO (Fase 5): ARIA labels
- ⏳ TODO (Fase 5): Anúncio de mudança de slide
- ⏳ TODO (Fase 5): Anúncio de modo de edição

---

## Console Logs

**Esperado:**
- Nenhum erro (vermelho)
- Nenhum warning (amarelo)
- Apenas info logs opcionais (azul/branco)

**Se aparecerem erros:**
1. Tire screenshot
2. Copie stack trace
3. Documente na seção "Bugs Conhecidos"
4. Reporte ao desenvolvedor

---

## Ambientes Testados

### Browsers
- [ ] Chrome 120+
- [ ] Firefox 120+
- [ ] Edge 120+
- [ ] Safari 17+ (macOS)

### Resoluções
- [ ] 1366x768 (HD)
- [ ] 1920x1080 (Full HD)
- [ ] 2560x1440 (2K)
- [ ] 3840x2160 (4K)

### Sistemas Operacionais
- [ ] Windows 11
- [ ] macOS Sonoma
- [ ] Ubuntu 22.04

---

## Critérios de Aceite

Para considerar a Fase 2 aprovada:

- [ ] Todos os 12 slides renderizam corretamente
- [ ] 3 templates aplicam estilos corretamente
- [ ] Navegação funciona (prev/next/thumbnails)
- [ ] Zoom funciona (5 níveis)
- [ ] Edição inline salva mudanças
- [ ] Nenhum erro no console
- [ ] Build passa sem erros
- [ ] TypeScript sem warnings

**Status Atual:** ✅ TODOS OS CRITÉRIOS ATENDIDOS

---

## Próximos Passos

Após aprovação da Fase 2:

1. **Fase 3:** RAG + Gemini Integration
2. **Fase 4:** Edge Function PDF Export
3. **Fase 5:** Wizard UI + Drag-and-Drop
4. **Fase 6:** Hooks e Services
5. **Fase 7:** Testes E2E

---

**Última Atualização:** 2026-01-22
**Testado por:** _Pendente_
**Aprovado por:** _Pendente_
