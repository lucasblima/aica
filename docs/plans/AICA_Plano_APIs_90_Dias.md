# AICA Life OS — Plano de Integração de APIs (90 Dias)

**Data:** Março 2026  
**Contexto:** 1 módulo pronto (Atlas), 5-15 beta testers generalistas, zero messaging infra  
**Sequência de módulos:** Atlas → Jornada → Finance  
**Filosofia:** Menos APIs, mais impacto. Máximo 8-12 integrações em 90 dias.

---

## Diagnóstico: Por que não são 50 APIs

O documento "Strategic API Arsenal" catalogou 50+ APIs gratuitas para os 7 módulos do AICA. É um mapa estratégico valioso para o longo prazo, mas inadequado como plano de execução para a fase atual. Razões:

- **6 de 7 módulos não estão em produção.** Integrar APIs para Studio, Grants, Connections e Finance agora é investimento sem retorno imediato.
- **Testers são generalistas.** Não são pesquisadores que precisam de OpenAlex/CrossRef, nem podcasters que precisam de Deepgram/Freesound.
- **Performance é o problema #1 do Atlas.** Cada API adicional piora o cenário se a base não estiver otimizada.
- **Dev solo = manutenção importa.** Cada API é um ponto de falha para monitorar, um SDK para atualizar, um rate limit para gerenciar.

---

## Mês 1: Atlas Irresistível

### Semana 1-2: Performance (Zero APIs novas)

**Objetivo:** Atlas carregando em < 2 segundos no first meaningful paint.

| Ação | Ferramenta | Esforço | Impacto |
|------|-----------|---------|---------|
| Auditar bundle size | `vite-bundle-visualizer` | 2h | Identificar peso morto |
| Lazy load módulos inativos | React.lazy + Suspense | 4-6h | Reduzir bundle inicial ~40-60% |
| Profiling de re-renders | React DevTools Profiler | 3-4h | Eliminar renders desnecessários |
| Auditar queries Supabase | Supabase Dashboard (logs) | 3-4h | Identificar queries N+1, selects sem filtro |
| Adicionar índices DB faltantes | SQL migrations | 2-3h | Acelerar queries críticas |
| Implementar cache com React Query | `staleTime` + `cacheTime` | 4-6h | Evitar refetches desnecessários |

**Critério de sucesso:** Lighthouse Performance > 80, TTI < 3s em 3G simulado.

### Semana 2-3: Inteligência Contextual (3 APIs)

#### API 1: Nager.Date — Feriados Brasileiros

| Atributo | Detalhe |
|----------|---------|
| **Endpoint** | `GET /api/v3/PublicHolidays/2026/BR` |
| **Custo** | Grátis, ilimitado |
| **Auth** | Nenhuma |
| **CORS** | ✅ |
| **Esforço** | ~4 horas |
| **Valor pro usuário** | Aviso ao agendar tarefa em feriado; visualização na matriz |

**Implementação:** Uma chamada por ano, cachear resultado no Supabase (`brazilian_holidays` table). Checar contra `scheduled_time` e `due_date` dos work_items. Exibir badge visual na tarefa + warning ao criar/editar.

#### API 2: Open-Meteo — Clima Inteligente

| Atributo | Detalhe |
|----------|---------|
| **Endpoint** | `GET /v1/forecast?latitude={lat}&longitude={lng}&hourly=temperature_2m,precipitation,weathercode` |
| **Custo** | Grátis, 10K calls/dia |
| **Auth** | Nenhuma |
| **CORS** | ✅ |
| **Esforço** | ~1.5 dias |
| **Valor pro usuário** | Sugestões tipo "Melhor janela pra corrida: 7-9h, 24°C, sem chuva" |

**Implementação:** Buscar previsão horária (próximas 24-48h) baseada na localização do usuário. Enviar dados ao Gemini com prompt contextual para gerar sugestão em PT-BR. Exibir como card de insight no topo do Atlas. Cachear por 3h no Supabase para não repetir chamadas.

**Prompt Gemini sugerido:**
```
Dado os dados climáticos abaixo para {cidade}, sugira a melhor janela 
de horário para tarefas ao ar livre. Seja conciso (1-2 frases), 
em português brasileiro informal.
Dados: {json_open_meteo}
```

#### API 3: ipapi.co — Detecção de Timezone

| Atributo | Detalhe |
|----------|---------|
| **Endpoint** | `GET /json/` |
| **Custo** | Grátis, 1K/dia |
| **Auth** | Nenhuma |
| **CORS** | ✅ |
| **Esforço** | ~2 horas |
| **Valor pro usuário** | Timezone correto sem configuração manual |

**Implementação:** Uma chamada no primeiro login. Salvar `timezone` e `city`/`latitude`/`longitude` no perfil do usuário. A latitude/longitude alimenta o Open-Meteo. Nunca mais chamar essa API para o mesmo usuário.

### Semana 3-4: Segurança Pré-Beta

#### API 4: Cloudflare Turnstile — CAPTCHA Invisível

| Atributo | Detalhe |
|----------|---------|
| **Custo** | Grátis, ilimitado |
| **LGPD** | Compliant |
| **Integração Supabase** | Nativa |
| **Esforço** | ~3 horas |
| **Valor** | Proteção contra bots sem fricção para o usuário |

**Implementação:** Adicionar no fluxo de login/signup. Validar token no backend via Supabase Edge Function. Integração direta documentada pelo Supabase.

---

## Mês 2: Jornada em Produção

**Premissa:** Gemini já faz ~90% do que a Jornada precisa (reflexões, análise de sentimento, prompts personalizados). APIs externas são complementares.

### Semana 5-6: Core da Jornada (1-2 APIs)

#### API 5: ZenQuotes — Citações Inspiracionais

| Atributo | Detalhe |
|----------|---------|
| **Endpoint** | `GET /api/quotes` (batch de 50) |
| **Custo** | Grátis com atribuição |
| **Auth** | Nenhuma |
| **Rate Limit** | 5 req / 30 seg |
| **Esforço** | ~4 horas |
| **Valor pro usuário** | Citação diária traduzida e contextualizada |

**Implementação:** Buscar batch de 50 quotes, armazenar no Supabase. Gemini traduz e adapta culturalmente para PT-BR. Servir 1 por dia ao usuário com base no contexto das reflexões anteriores. O cache de 50 quotes dura ~2 meses sem nova chamada.

#### API 6 (Condicional): Google Cloud NL API — Sentiment Scoring

| Atributo | Detalhe |
|----------|---------|
| **Custo** | 5K units/mês grátis + $300 créditos (90 dias) |
| **PT-BR** | ✅ Nativo |
| **Esforço** | ~1 dia |
| **Valor pro usuário** | Gráfico de humor ao longo do tempo |

**Implementação:** Analisar texto das reflexões diárias. Score numérico (-1.0 a +1.0) salvo na tabela `moment_entries`. Alimentar gráfico de tendência emocional com Recharts.

**Por que "condicional":** Gemini já retorna análise de sentimento conversacional. O NL API só se justifica se você quiser scores numéricos consistentes para gráficos. Se a Jornada for mais qualitativa (sem gráficos de humor), pule esta API.

### Semana 7-8: Polish + Preparação para Finance

- Iterar com feedback dos testers no Atlas + Jornada
- Resolver bugs e UX issues que surgirem
- Começar modelagem de dados do módulo Finance

---

## Mês 3: Finance Básico + Infraestrutura de Crescimento

### Semana 9-10: APIs de Dados Financeiros Brasileiros (2-3 APIs)

#### API 7: AwesomeAPI — Câmbio BRL

| Atributo | Detalhe |
|----------|---------|
| **Endpoint** | `GET /json/last/USD-BRL,EUR-BRL` |
| **Custo** | 100K req/mês grátis |
| **Auth** | Nenhuma |
| **Esforço** | ~3 horas |
| **Valor** | Cotações em tempo real no dashboard financeiro |

#### API 8: BCB SGS API — Indicadores Econômicos

| Atributo | Detalhe |
|----------|---------|
| **Endpoint** | `GET /dados/serie/bcdata.sgs.{serie}/dados/ultimos/{n}?formato=json` |
| **Séries chave** | SELIC (11), CDI (12), IPCA (433) |
| **Custo** | Grátis, ilimitado |
| **CORS** | ❌ (precisa proxy via Edge Function) |
| **Esforço** | ~4 horas (incluindo Edge Function proxy) |
| **Valor** | Contexto macroeconômico para decisões financeiras |

#### API 9 (Condicional): brapi.dev — Dados B3/Bovespa

| Atributo | Detalhe |
|----------|---------|
| **Custo** | Free tier (quotes básicas) |
| **Esforço** | ~3 horas |
| **Valor** | Acompanhamento de investimentos brasileiros |

**Por que "condicional":** Só faz sentido se os testers tiverem investimentos em renda variável. Para um MVP de finanças pessoais focado em controle de gastos, AwesomeAPI + BCB são suficientes.

### Semana 11-12: Infraestrutura de Comunicação (1-2 APIs)

#### API 10: Resend — Email Transacional

| Atributo | Detalhe |
|----------|---------|
| **Custo** | 3K emails/mês grátis |
| **Stack fit** | React Email templates (JSX/TSX) |
| **Esforço** | ~1 dia |
| **Valor** | Welcome emails, resumos semanais, notificações |

**Implementação:** Começar com templates básicos: welcome email, reset de senha, resumo semanal de produtividade. React Email permite escrever templates no mesmo stack.

#### Decisão: WhatsApp Cloud API vs Evolution API

**Recomendação: NÃO integrar nenhum dos dois neste mês.** Com 15 testers, email + notificação in-app são suficientes. WhatsApp é feature de crescimento — só justifica quando tiver 50+ usuários e quiser viral loops. Avalie no mês 4.

---

## O Que NÃO Integrar (e por quê)

| API | Recomendação do Doc | Minha Recomendação | Razão |
|-----|--------------------|--------------------|-------|
| Groq | High | ❌ Mês 6+ | 15 testers não batem rate limit do Gemini (15 RPM = 900 req/h) |
| Hunter.io | High | ❌ Quando Connections entrar | Módulo CRM não está em produção |
| ZeroBounce | High | ❌ Quando Connections entrar | Idem |
| Gravatar | High | ❌ Quando Connections entrar | Idem |
| DeepL | High | ❌ Desnecessário | Gemini traduz com qualidade equivalente e já está no stack |
| OneSignal | High | ❌ Mês 4+ | Push notifications são premature com 15 testers |
| Deepgram | High | ❌ Quando Studio entrar | Módulo podcast não está em produção |
| Google Cloud TTS | High | ❌ Quando Studio entrar | Idem |
| OpenAlex | Critical | ❌ Quando Grants entrar | Módulo captação não está em produção |
| Portal Transparência | Critical | ❌ Quando Grants entrar | Idem |
| Todoist API | Medium | ❌ Nunca | Competidor direto, não parceiro |
| OpenWeatherMap | Medium | ❌ Nunca | Redundante com Open-Meteo (inferior em tudo) |
| API Ninjas | High | ❌ Desnecessário | Gemini + ZenQuotes cobrem o caso de uso |
| Belvo (Open Finance) | Não listada | ❌ Mês 6+ | Complexidade regulatória, feature de produto maduro |
| Apify/Firecrawl | Não listada | ❌ Quando Grants entrar | Scraping de editais só com módulo ativo |

---

## Resumo: As 10 APIs dos Próximos 90 Dias

| # | API | Módulo | Mês | Esforço | Tipo |
|---|-----|--------|-----|---------|------|
| 1 | Nager.Date | Atlas | 1 | 4h | Obrigatória |
| 2 | Open-Meteo | Atlas | 1 | 1.5 dias | Obrigatória |
| 3 | ipapi.co | Atlas | 1 | 2h | Obrigatória |
| 4 | Cloudflare Turnstile | Global | 1 | 3h | Obrigatória |
| 5 | ZenQuotes | Jornada | 2 | 4h | Obrigatória |
| 6 | Google Cloud NL API | Jornada | 2 | 1 dia | Condicional |
| 7 | AwesomeAPI | Finance | 3 | 3h | Obrigatória |
| 8 | BCB SGS API | Finance | 3 | 4h | Obrigatória |
| 9 | brapi.dev | Finance | 3 | 3h | Condicional |
| 10 | Resend | Global | 3 | 1 dia | Obrigatória |

**Esforço total estimado: ~8-10 dias de desenvolvimento** (distribuídos em 90 dias)  
**Custo mensal: R$ 0**  
**APIs obrigatórias: 7 | Condicionais: 3**

---

## Princípios de Implementação

1. **Cache agressivo.** Nager.Date = 1 call/ano. ZenQuotes = 1 call/2 meses. ipapi.co = 1 call/vida do usuário. Open-Meteo = cache 3h. Minimize chamadas ao máximo.

2. **Proxy via Edge Functions.** BCB SGS não tem CORS. Outras APIs podem mudar CORS policies. Sempre roteie por Supabase Edge Functions para controle centralizado.

3. **Degradação graciosa.** Se Open-Meteo cair, o Atlas funciona sem sugestões de clima. Se ZenQuotes cair, Gemini gera citações próprias. Nenhuma API externa deve ser ponto de falha crítico.

4. **Métricas de uso.** Antes de adicionar a API 11, saiba quantas vezes as APIs 1-10 estão sendo chamadas. Se ninguém clica nas sugestões de clima, não adicione mais dados meteorológicos.

5. **Uma API por vez.** Integre, teste com testers, colete feedback, itere. Depois passe pra próxima. Não faça batch de 3-4 APIs simultâneas.
