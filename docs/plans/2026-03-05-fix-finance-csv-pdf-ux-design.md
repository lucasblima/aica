# Design: fix-finance-csv-pdf-ux

**Session:** fix-finance-csv-pdf-ux
**Date:** 2026-03-05
**Issues:** #749, #750, #751

---

## Bug Fixes

### Bug #749: CSV Parser nao reconhece colunas

**Root cause:** `csvParserService.ts` compara colunas contra header string raw em vez do array parseado. CSV com `Data,Valor,Identificador,Descricao` (virgula) nao casa com formato Inter (semicolon + coluna "Saldo").

**Fix:** Tornar `getColumnIndices` case-insensitive e accent-insensitive. Adicionar fallback generico: se encontrar colunas "Data" + "Descricao" + "Valor" em qualquer ordem/separador, aceitar como CSV generico.

### Bug #750: PDF upload 401

**Root cause:** `edgeFunctionService.ts` usa `getCachedSession()` que pode retornar token expirado. Nao ha retry com refresh.

**Fix:** Apos 401, chamar `supabase.auth.getSession()` (fresh, nao cached) e retry uma vez. Se falhar de novo, mostrar erro claro ao usuario.

### Bug #751: Dados Jan/2025 inacessiveis + cedilha

**Root cause:** Dashboard so mostra `currentYear` (2026). Statements com `period_start` null ficam invisiveis.

**Fix:** Navegacao por mes/ano, inferir periodo de statements sem `period_start` a partir das transacoes associadas. Corrigir "Financas" -> "Financas" em todos os arquivos.

---

## UX Redesign: Dashboard Hibrido

### Layout

1. **Header compacto** — Titulo "Financas" + seletor de periodo `[< Mar 2026 >]` + botao upload, tudo em uma linha (~48px)
2. **Cards de resumo** — 3 cards inline (Receita, Despesa, Saldo) com sparkline mini-grafico e indicador de tendencia
3. **Lista de transacoes agrupada por categoria** — Accordion colapsavel, cada categoria mostra total + transacoes individuais ao expandir
4. **Footer de acoes** — Botoes "Graficos" e "Comparar" levam as abas existentes

### Navegacao de periodo

- Seletor mes/ano com < > (navega mes a mes)
- Click no texto "Mar 2026" abre dropdown com todos os meses que tem dados
- Popula automaticamente a lista de meses disponiveis a partir dos statements existentes

### Statements sem period_start

- Inferir periodo da transaction_date mais antiga e mais recente das transacoes associadas
- Mostrar badge "Periodo estimado" nesses casos
- Nao excluir do dashboard — sempre visiveis

---

## Escopo

### Incluido

- Fix CSV parser: accent/case-insensitive matching + fallback generico
- Fix PDF 401: session refresh + retry no edgeFunctionService
- Fix cedilha: "Financas" -> "Financas" em ~4 arquivos
- Fix period_start: inferir de transacoes quando null
- Redesign FinanceDashboard: header compacto, cards resumo com sparklines, seletor mes/ano, transacoes agrupadas por categoria
- Manter abas existentes (Graficos, Comparativo) funcionando

### Excluido

- Redesign de outras views (BudgetView, FinanceAgentView)
- Novos graficos ou tipos de chart
- Mudancas no backend/Edge Functions (fix do 401 e client-side)
- Mudancas em tabelas do banco
- Suporte a novos bancos no CSV parser

---

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `csvParserService.ts` | Fix column matching |
| `edgeFunctionService.ts` | Token refresh + retry on 401 |
| `FinanceDashboard.tsx` | Redesign completo do layout |
| `FinanceEmptyState.tsx` | Fix cedilha |
| `financeAgentService.ts` | Fix cedilha |
| `useFinanceStatements.ts` | Period inference logic |
