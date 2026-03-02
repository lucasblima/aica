# AICA Life OS — API Frontend Wiring Design

**Data:** 2026-03-02
**Sessao:** feat-api-frontend-wiring
**Escopo:** Conectar 5 APIs (ja com backend pronto) na UI real do AICA
**Abordagem:** Incremental por pagina (Abordagem A)

---

## Contexto

PR #620 entregou toda a infraestrutura de backend (Edge Functions, services, hooks, componentes) para 5 APIs externas. Nenhuma delas esta conectada na UI real. Este design cobre o wiring de cada API nos componentes existentes.

**Componentes prontos (nao conectados):**
- `WeatherInsightCard` — 4 estados (loading, connect, complete, error)
- `LocationConnectModal` — 3 tabs (detectar, CEP, cidade)
- `HolidayBadge` — pill badge para datas em feriado
- Hooks: `useWeatherInsight`, `useUserLocation`, `useHolidays`, `useBrasilApi`

---

## Secao 1: WeatherInsightCard na VidaPage

**Arquivo:** `src/pages/VidaPage.tsx`

**Posicao no layout:**
```
HeaderGlobal
CreditBalanceWidget
MementoMoriBar
VidaUniversalInput
[WeatherInsightCard]     <- NOVO
Quick Stats (CP, Streak, Momentos)
JourneyHeroCard
Module Cards Grid
```

**Comportamento responsivo:**
- **Mobile:** Card compacto colapsavel. Uma linha: "26C - Melhor janela: 7-9h". Toque expande para insight completo.
- **Desktop (lg+):** Sidebar fixa a direita do grid de modulos. Grid muda de 4 para 3 colunas para abrir espaco.

**Mudancas no WeatherInsightCard:**
- Adicionar prop `compact?: boolean`
- Estado `expanded` interno para colapsar/expandir no mobile
- Modo compacto: single-line com icone + temp + insight truncado
- Modo expandido: layout atual completo

---

## Secao 2: HolidayBadge no SwipeableTaskCard

**Arquivo:** `src/components/domain/SwipeableTaskCard.tsx`

**Posicao no card:**
```
[checkbox] [grip] Titulo da tarefa
                  [AssociationChip] [tags]
                  [checklist progress]
                  Calendar 21/04  [HolidayBadge: Tiradentes]  <- NOVO
```

**Logica:** Renderizar `<HolidayBadge date={task.due_date} />` ao lado do `formattedDueDate` na metadata row. So aparece se `task.due_date` existe. O componente retorna null para nao-feriados.

**Toast warning:** Ao salvar tarefa com due_date em feriado, exibir toast: "Atencao: 21/04 e feriado (Tiradentes)". Encontrar o formulario de criacao/edicao (TaskBottomSheet ou similar) e adicionar check pos-save.

---

## Secao 3: Turnstile no Login

**Arquivo:** `src/components/layout/Login.tsx`

**Dependencia:** `@marsidev/react-turnstile` (wrapper React para Cloudflare Turnstile)

**Posicao:**
```
Logo / Header
Error Message
[Turnstile Widget]       <- NOVO (invisivel, managed mode)
Google Login Button
```

**Fluxo:**
1. Widget renderiza invisivelmente no Login (variant='full-page' apenas)
2. Gera token automaticamente quando necessario
3. Token armazenado em state local
4. Ao clicar "Login com Google", token enviado ao backend
5. Backend valida via `external-turnstile-verify`
6. Fail-open: se validacao falhar, deixa passar + log de alerta

**NAO adicionar** no AuthSheet (variant='sheet') — modal compacto nao precisa de CAPTCHA.

---

## Secao 4: Location/CEP no ProfilePage

**Arquivo:** `src/views/ProfilePage.tsx`

**Posicao:** Nova secao na aba "Configuracoes"

**UI:**
```
[Configuracoes tab]
+----------------------------------+
|  MapPin  Localizacao             |
|  Cidade: Sao Paulo              |
|  Fonte: Detectado por IP        |
|  [Alterar localizacao]           | -> abre LocationConnectModal
+----------------------------------+
```

**Auto-geolocation:** Hook `useUserLocation` ja faz auto-deteccao via ipapi.co no primeiro acesso. Basta importar na VidaPage para trigger automatico.

---

## Secao 5: Auto-Geolocation Trigger

**Arquivo:** `src/pages/VidaPage.tsx`

Ao importar `useUserLocation` (que ja e usado internamente pelo `useWeatherInsight`), a geolocalizacao automatica e triggered no primeiro acesso do usuario. Sem UI adicional necessaria.

---

## Arquivos Modificados (Total)

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| `src/pages/VidaPage.tsx` | Adicionar WeatherInsightCard |
| `src/modules/atlas/components/WeatherInsightCard.tsx` | Adicionar modo compact + expanded |
| `src/components/domain/SwipeableTaskCard.tsx` | Adicionar HolidayBadge inline |
| `src/components/layout/Login.tsx` | Adicionar Turnstile widget |
| `src/views/ProfilePage.tsx` | Adicionar secao Location Settings |
| TaskBottomSheet ou form de task | Toast warning para feriados |

**Novos arquivos:** Nenhum (tudo e wiring de componentes existentes).

**Nova dependencia:** `@marsidev/react-turnstile`

---

## Ordem de Implementacao

1. Weather + Holiday (maior impacto visual)
2. Turnstile (seguranca pre-beta)
3. Location/CEP (configuracoes)

Cada grupo em commits separados, testados isoladamente.
