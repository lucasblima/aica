# AICA Production Readiness Audit — Prompt de Avaliação

**Data:** 2026-03-11
**Objetivo:** Avaliar sistematicamente cada módulo/página para decidir quais estão prontos para lançamento em produção.

---

## Contexto de Lançamento

### Páginas Obrigatórias (devem atingir 100%)
| Página | Rota | Componente Principal |
|--------|------|---------------------|
| **Vida** (Home) | `/`, `/vida` | `VidaPage` |
| **Meu Dia** (Agenda) | ViewState `agenda` | `AgendaView` |
| **Jornada** | ViewState `journey` | `JourneyFullScreen` |
| **Conexões** | `/connections`, `/connections/:spaceId` | `ConnectionsPage`, `SpaceDetailView` |
| **Pessoas** | `/contacts` | `ContactsView` |
| **Finanças** | `/financeiro` | `FinanceDashboard` |

### Módulos "Explorar Mais" (avaliados mas NÃO bloqueiam lançamento)
Atlas, Studio, Grants, Flux, EraForge, LifeRPG, Life Areas (health, education, professional, legal), Google Hub

---

## Prompt de Avaliação (usar para cada módulo)

```
# AICA Production Readiness Audit — [NOME DO MÓDULO]

Você é um auditor de qualidade de software avaliando o módulo [NOME] do AICA Life OS para decisão de lançamento em produção. Avalie com rigor — o objetivo é que usuários reais usem isso diariamente.

## Instruções

Para cada categoria abaixo, faça:
1. **Análise de código**: Leia os arquivos do módulo em `src/modules/[módulo]/` e componentes relacionados
2. **Análise visual**: Navegue pelo app no browser (dev server ou produção) e teste cada fluxo
3. **Pontuação**: Dê nota 0-100 para cada categoria com justificativa específica
4. **Evidência**: Cite arquivos, linhas de código, screenshots, ou comportamentos observados

## Categorias de Avaliação (7 dimensões, peso igual)

### 1. FUNCIONALIDADE (peso: 20%)
Avaliar se todas as features core do módulo funcionam corretamente.

Checklist:
- [ ] Fluxo principal (happy path) funciona do início ao fim
- [ ] CRUD completo (criar, ler, atualizar, deletar) onde aplicável
- [ ] Estados vazios (empty states) estão tratados com mensagem útil
- [ ] Loading states aparecem durante operações assíncronas
- [ ] Erros são capturados e exibidos ao usuário (não crashes silenciosos)
- [ ] Dados persistem corretamente no Supabase após refresh
- [ ] Navegação entre sub-views funciona sem bugs
- [ ] Filtros/ordenação funcionam corretamente (se existirem)
- [ ] Integração com AI funciona (se o módulo usa Gemini)
- [ ] Real-time updates funcionam (se aplicável)

Pontuação:
- 100: Todos os fluxos funcionam perfeitamente
- 80-99: Funciona bem, 1-2 edge cases menores
- 60-79: Core funciona mas features secundárias têm bugs
- 40-59: Bugs frequentes no fluxo principal
- 0-39: Módulo não funcional

### 2. UX/DESIGN (peso: 20%)
Avaliar qualidade visual e experiência do usuário.

Checklist:
- [ ] Segue Ceramic Design System (tokens corretos, não Material Design)
- [ ] Layout responsivo funciona em mobile (360px) e desktop (1440px)
- [ ] Tipografia legível e hierarquia visual clara
- [ ] Espaçamento consistente (padding/margin uniformes)
- [ ] Cores semânticas corretas (ceramic-error, ceramic-success, etc.)
- [ ] Ícones apropriados e consistentes
- [ ] Transições/animações suaves (não janky)
- [ ] Touch targets >= 44px em mobile
- [ ] Scroll behavior natural (sem scroll traps)
- [ ] Feedback visual para ações do usuário (botões, toggles, etc.)
- [ ] Textos em português correto (sem inglês misturado na UI)
- [ ] Empty states com ilustração ou CTA útil (não apenas texto)

Pontuação:
- 100: Design polido, consistente, prazeroso de usar
- 80-99: Bom design, 1-2 inconsistências menores
- 60-79: Funcional mas com gaps visuais notáveis
- 40-59: Design inconsistente, difícil de navegar
- 0-39: Design quebrado ou inutilizável

### 3. TESTES (peso: 15%)
Avaliar cobertura e qualidade dos testes automatizados.

Checklist:
- [ ] Testes unitários existem para services/hooks principais
- [ ] Testes cobrem happy path + edge cases principais
- [ ] Testes passam (`npm run test` sem falhas neste módulo)
- [ ] Mocks são realistas (não triviais)
- [ ] Nomes dos testes descrevem comportamento esperado
- [ ] Cobertura estimada >= 60% das funções do módulo

Como medir:
```bash
npm run test -- --reporter=verbose src/modules/[módulo]/
npm run test -- --coverage src/modules/[módulo]/
```

Pontuação:
- 100: >80% cobertura, testes significativos, todos passam
- 80-99: >60% cobertura, core testado, todos passam
- 60-79: Testes existem mas cobertura parcial (<60%)
- 40-59: Poucos testes, maioria trivial
- 0-39: Sem testes ou todos falhando

### 4. PERFORMANCE (peso: 10%)
Avaliar velocidade e eficiência.

Checklist:
- [ ] Página carrega em <3s (First Contentful Paint)
- [ ] Interações respondem em <200ms
- [ ] Sem memory leaks visíveis (components cleanup em useEffect)
- [ ] Queries Supabase otimizadas (sem N+1, usa select específico)
- [ ] Lazy loading para componentes pesados
- [ ] Imagens otimizadas (se aplicável)
- [ ] Sem re-renders desnecessários (React DevTools Profiler)
- [ ] Bundle size do módulo razoável (<200KB gzipped)

Como medir:
- Chrome DevTools → Performance tab → Record page load
- Chrome DevTools → Network tab → verificar requests
- React DevTools → Profiler → verificar re-renders

Pontuação:
- 100: Rápido, eficiente, sem waste
- 80-99: Bom performance, 1-2 otimizações possíveis
- 60-79: Aceitável mas com lentidão notável em algum fluxo
- 40-59: Lento, queries ineficientes, re-renders frequentes
- 0-39: Inutilizável por performance

### 5. SEGURANÇA (peso: 15%)
Avaliar proteção de dados e autenticação.

Checklist:
- [ ] RLS habilitado em TODAS as tabelas usadas pelo módulo
- [ ] Queries filtram por user_id (isolamento de dados)
- [ ] Nenhuma API key exposta no frontend (buscar por patterns: `AIza`, `sk-`, `key=`)
- [ ] Chamadas Gemini via Edge Functions (não client-side)
- [ ] Inputs sanitizados (sem XSS via dangerouslySetInnerHTML sem sanitize)
- [ ] Auth check em todas as rotas protegidas
- [ ] Dados sensíveis não logados no console
- [ ] CORS configurado corretamente nas Edge Functions usadas

Como verificar:
```bash
# Buscar API keys expostas
grep -r "AIza\|sk-\|apikey\|api_key" src/modules/[módulo]/ --include="*.ts" --include="*.tsx"

# Verificar RLS
-- No Supabase Dashboard: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

Pontuação:
- 100: Seguro, RLS completo, sem exposição
- 80-99: Seguro com 1 melhoria menor possível
- 60-79: Funcional mas com gap de segurança não-crítico
- 40-59: Vulnerabilidade identificada (dados podem vazar)
- 0-39: Falha crítica de segurança

### 6. ACESSIBILIDADE (peso: 10%)
Avaliar conformidade WCAG 2.1 AA básica.

Checklist:
- [ ] Contraste de cores suficiente (4.5:1 para texto normal)
- [ ] Labels em todos os inputs de formulário
- [ ] Navegação por teclado funciona (tab order lógico)
- [ ] aria-labels em elementos interativos sem texto visível
- [ ] Imagens têm alt text (se aplicável)
- [ ] Focus indicators visíveis
- [ ] Textos não dependem apenas de cor para transmitir informação
- [ ] Zoom até 200% não quebra layout

Como medir:
- Chrome DevTools → Lighthouse → Accessibility
- axe DevTools extension

Pontuação:
- 100: WCAG 2.1 AA compliant
- 80-99: Boa acessibilidade, 1-2 gaps menores
- 60-79: Acessibilidade parcial, navegação por teclado funciona
- 40-59: Vários problemas de acessibilidade
- 0-39: Inacessível para usuários com deficiência

### 7. CÓDIGO (peso: 10%)
Avaliar qualidade e manutenibilidade do código.

Checklist:
- [ ] TypeScript sem `any` explícito (ou mínimo justificado)
- [ ] Tipos definidos para props, states, API responses
- [ ] Imports organizados (barrel exports quando possível)
- [ ] Sem código morto ou comentado em excesso
- [ ] Error boundaries para componentes que podem falhar
- [ ] Hooks customizados para lógica reutilizável
- [ ] Services separados de components (separation of concerns)
- [ ] Naming consistente (português na UI, inglês no código)
- [ ] Build passa sem erros (`npm run build && npm run typecheck`)

Pontuação:
- 100: Código limpo, tipado, bem estruturado
- 80-99: Bom código, 1-2 melhorias possíveis
- 60-79: Funcional mas com dívida técnica notável
- 40-59: Muitos `any`, código confuso, difícil de manter
- 0-39: Código desestruturado, impossível de manter

---

## Cálculo da Nota Final

```
NOTA FINAL = (Funcionalidade × 0.20) + (UX/Design × 0.20) + (Testes × 0.15) +
             (Performance × 0.10) + (Segurança × 0.15) + (Acessibilidade × 0.10) +
             (Código × 0.10)
```

## Critérios de Decisão

| Nota Final | Status | Ação |
|------------|--------|------|
| **90-100** | ✅ APROVADO | Pronto para produção |
| **75-89** | ⚠️ CONDICIONAL | Aprovado com lista de fixes obrigatórios (prazo: 1 sprint) |
| **60-74** | 🔶 EXPLORAR MAIS | Vai para "Explorar Mais" com roadmap de melhorias |
| **0-59** | ❌ NÃO LANÇAR | Precisa de redesign/rewrite significativo |

### Regra Especial para Módulos Obrigatórios
Para Vida, Meu Dia, Jornada, Conexões, Pessoas e Finanças:
- Nota < 90 = **BLOCKER** para lançamento
- Cada categoria individual deve ser >= 70 (nenhuma dimensão pode ser fraca)
- Issues de segurança (nota < 80 em Segurança) = **BLOCKER absoluto**

---

## Template de Relatório por Módulo

```markdown
# Audit: [NOME DO MÓDULO]
**Data:** [data]
**Auditor:** Claude + [nome do usuário]
**Método:** Código + Browser

## Resumo Executivo
[1-2 frases sobre o estado geral]

## Pontuação

| Categoria | Nota | Justificativa |
|-----------|------|---------------|
| Funcionalidade (20%) | XX/100 | [resumo] |
| UX/Design (20%) | XX/100 | [resumo] |
| Testes (15%) | XX/100 | [resumo] |
| Performance (10%) | XX/100 | [resumo] |
| Segurança (15%) | XX/100 | [resumo] |
| Acessibilidade (10%) | XX/100 | [resumo] |
| Código (10%) | XX/100 | [resumo] |
| **NOTA FINAL** | **XX/100** | |

## Status: [✅ APROVADO / ⚠️ CONDICIONAL / 🔶 EXPLORAR MAIS / ❌ NÃO LANÇAR]

## Issues Encontradas

### Críticas (bloqueiam lançamento)
1. [issue + arquivo + linha]

### Altas (devem ser resolvidas em 1 sprint)
1. [issue + arquivo + linha]

### Médias (melhorias desejáveis)
1. [issue]

### Baixas (nice-to-have)
1. [issue]

## Plano de Ação
- [ ] [fix 1 — estimativa: Xh]
- [ ] [fix 2 — estimativa: Xh]

## Evidências
- Screenshot: [descrição]
- Comando: `[comando executado]` → resultado
- Arquivo: `[path:linha]` → [problema]
```

---

## Ordem de Avaliação Recomendada

Avaliar primeiro os módulos obrigatórios (bloqueiam lançamento):

1. **Vida** (Home) — hub central, primeiro contato do usuário
2. **Finanças** — módulo complexo com CSV/PDF/AI
3. **Jornada** — consciousness points, emotion tracking
4. **Meu Dia** (Agenda) — Google Calendar sync
5. **Conexões** — spaces, WhatsApp intelligence
6. **Pessoas** (Contacts) — unified contact view

Depois avaliar módulos secundários (para classificação):

7. **Atlas** — task management
8. **Studio** — podcast production
9. **Grants** — edital parsing
10. **Flux** — training management

---

## Infraestrutura Transversal (avaliar uma vez)

Além dos módulos, avaliar componentes transversais que afetam TODOS:

### Auth & Session
- [ ] Login (Google OAuth + Email) funciona
- [ ] Logout funciona e limpa estado
- [ ] Token refresh automático (sem loops infinitos)
- [ ] Redirect pós-login correto

### Navigation
- [ ] BottomNav funciona em todas as 5 tabs
- [ ] Deep links funcionam (ex: `/connections/abc-123`)
- [ ] Back button funciona corretamente
- [ ] ViewState transitions suaves

### Global Components
- [ ] `AicaChatFAB` funciona em todas as páginas
- [ ] `HeaderGlobal` mostra info correta
- [ ] `PageShell` wrapper consistente
- [ ] Error boundaries capturam crashes

### PWA
- [ ] App instalável (manifest.json válido)
- [ ] Offline graceful degradation
- [ ] Push notifications (se implementado)
- [ ] Share target funciona

### Landing & Onboarding
- [ ] Landing page profissional e funcional
- [ ] Fluxo de cadastro completo (email + Google)
- [ ] Primeiro uso guiado (onboarding)

---

## Como Executar Este Audit

### Opção A: Claude avalia tudo (recomendado)
```
Prompt: "Execute o audit de produção seguindo docs/plans/2026-03-11-production-readiness-audit.md.
Comece pelo módulo [NOME]. Analise código + navegue pelo browser.
Gere o relatório completo com pontuação e issues."
```

### Opção B: Audit em paralelo (mais rápido)
```
Prompt: "Execute o audit de produção em paralelo:
- Agent 1: Vida + Meu Dia + Jornada
- Agent 2: Finanças + Conexões + Pessoas
Siga docs/plans/2026-03-11-production-readiness-audit.md para cada módulo."
```

### Opção C: Módulo por módulo (mais detalhado)
```
Prompt: "Audit de produção: módulo [NOME].
Abra o app no browser em [URL], navegue por todos os fluxos.
Leia todo o código em src/modules/[módulo]/.
Gere relatório com evidências visuais."
```

---

## Resultado Esperado

Ao final do audit, teremos:
1. **Scorecard** com nota de cada módulo
2. **Lista de blockers** para módulos obrigatórios
3. **Decisão** de quais módulos vão para produção vs "Explorar Mais"
4. **Roadmap** de fixes prioritários antes do lançamento
5. **Estimativa** de esforço para resolver blockers
