# Product Planning Skill

Skill para planejamento de produto, incluindo roadmaps, PRDs, monetização e análise de mercado.

---

## Quando Usar Esta Skill

Use quando precisar:
- Criar roadmaps de produto
- Escrever PRDs (Product Requirements Document)
- Planejar estratégias de monetização
- Analisar competidores
- Definir métricas e OKRs

---

## Roadmap de Produto

### Template de Roadmap

```markdown
# Roadmap [Nome do Produto]

## Visão

[Uma frase que descreve onde queremos chegar]

## Timeline

### Q1 2026 - [Tema do Quarter]

#### Mês 1
- [ ] Feature A
- [ ] Feature B

#### Mês 2
- [ ] Feature C
- [ ] Melhoria X

#### Mês 3
- [ ] Feature D
- [ ] Lançamento Beta

### Q2 2026 - [Tema do Quarter]
...

## Legenda

🔴 Crítico - Bloqueante para negócio
🟡 Importante - Alto impacto
🟢 Nice to have - Melhoria incremental
⬜ Backlog - Não priorizado

## Métricas de Sucesso

| Métrica | Atual | Meta Q1 | Meta Q2 |
|---------|-------|---------|---------|
| MAU     | X     | Y       | Z       |
| Retention | X%  | Y%      | Z%      |
```

### Formato Visual (Timeline)

```
2026
────────────────────────────────────────────────────────────
Jan        Feb        Mar        Apr        May        Jun
────────────────────────────────────────────────────────────
█████████████████████  Alpha
            ████████████████████  Beta
                        █████████████████████  Launch
────────────────────────────────────────────────────────────
Feature A  ▓▓▓▓▓▓▓▓▓▓
Feature B      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
Feature C              ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
────────────────────────────────────────────────────────────
```

---

## PRD (Product Requirements Document)

### Template Completo

```markdown
# PRD: [Nome da Feature]

## Metadata

| Campo | Valor |
|-------|-------|
| Autor | @nome |
| Status | Draft / Review / Approved |
| Última Atualização | YYYY-MM-DD |
| Stakeholders | @pessoa1, @pessoa2 |
| Epic Link | [Link] |

## 1. Sumário Executivo

[2-3 parágrafos descrevendo a feature, problema que resolve e impacto esperado]

## 2. Problema

### 2.1 Contexto
[Descrever o contexto do problema]

### 2.2 Problema do Usuário
[Qual dor do usuário estamos resolvendo?]

### 2.3 Problema do Negócio
[Como isso afeta o negócio?]

### 2.4 Evidências
- Dado 1: [estatística, feedback, etc.]
- Dado 2: [...]

## 3. Objetivos

### 3.1 Objetivo Principal
[O que queremos alcançar]

### 3.2 Métricas de Sucesso
| Métrica | Baseline | Target | Como Medir |
|---------|----------|--------|------------|
| Métrica 1 | X | Y | [Método] |

### 3.3 Não-Objetivos
- [O que NÃO faz parte do escopo]

## 4. Proposta de Solução

### 4.1 Visão Geral
[Descrição da solução]

### 4.2 User Stories

#### Epic: [Nome do Epic]

**US1: Como [persona], quero [ação] para [benefício]**

Critérios de Aceitação:
- [ ] CA1
- [ ] CA2

**US2: ...**

### 4.3 Fluxo do Usuário

```
[Diagrama ou descrição do fluxo]
```

### 4.4 Wireframes/Mockups

[Links ou imagens]

## 5. Requisitos Técnicos

### 5.1 Arquitetura
[Descrição de alto nível]

### 5.2 APIs Necessárias
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| /api/x   | POST   | ...       |

### 5.3 Banco de Dados
[Mudanças necessárias]

### 5.4 Dependências
- Dependência 1
- Dependência 2

## 6. Alternativas Consideradas

| Alternativa | Prós | Contras | Por que não? |
|-------------|------|---------|--------------|
| Opção A | ... | ... | ... |
| Opção B | ... | ... | ... |

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Risco 1 | Alta | Alto | ... |

## 8. Timeline

| Fase | Duração | Entregáveis |
|------|---------|-------------|
| Design | X dias | Mockups, protótipo |
| Dev | Y dias | MVP funcional |
| QA | Z dias | Testes completos |
| Launch | W dias | Release |

## 9. Recursos

| Tipo | Quantidade | Período |
|------|------------|---------|
| Dev Frontend | 1 | 2 sprints |
| Dev Backend | 1 | 1 sprint |
| Designer | 0.5 | 1 sprint |

## 10. Go-to-Market

### 10.1 Comunicação
- [ ] Update no changelog
- [ ] Email para usuários
- [ ] Post no blog

### 10.2 Documentação
- [ ] Help center
- [ ] Tooltips in-app

## 11. Appendix

### 11.1 Glossário
- Termo 1: Definição
- Termo 2: Definição

### 11.2 Referências
- [Link 1]
- [Link 2]
```

---

## Estratégia de Monetização

### Modelos de Monetização SaaS

```markdown
## 1. Freemium

### Características
- Tier gratuito com funcionalidades limitadas
- Tiers pagos com features adicionais
- Objetivo: Volume → Conversão

### Exemplo de Estrutura

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Projetos | 3 | Ilimitados | Ilimitados |
| Membros | 1 | 5 | Ilimitados |
| Storage | 100MB | 10GB | Ilimitado |
| Suporte | Comunidade | Email | Dedicado |
| Preço | R$ 0 | R$ 49/mês | Customizado |

### Métricas Chave
- Free-to-Paid Conversion Rate: 2-5%
- Time to Conversion: 14-30 dias
- Feature Usage Rate

---

## 2. Usage-Based

### Características
- Cobra pelo uso (API calls, storage, etc.)
- Escala com o cliente
- Menor barreira de entrada

### Exemplo
| Uso | Preço |
|-----|-------|
| 0-1K requests | Grátis |
| 1K-100K | R$ 0.01/request |
| 100K+ | R$ 0.005/request |

---

## 3. Seat-Based

### Características
- Cobra por usuário/seat
- Previsível para ambos os lados
- Comum em B2B

### Exemplo
| Plano | Preço/seat/mês |
|-------|----------------|
| Starter | R$ 19 |
| Pro | R$ 49 |
| Enterprise | Negociável |

---

## 4. Híbrido

Combinação de modelos:
- Base: Seat-based
- Add-ons: Usage-based (ex: AI credits)
- Enterprise: Custom pricing
```

### Framework de Pricing

```markdown
## Análise de Pricing

### 1. Value-Based Pricing

Perguntas:
- Quanto valor o produto gera para o cliente?
- Qual o ROI para o cliente?
- Quanto custaria a alternativa?

### 2. Competitor Analysis

| Competidor | Plano Similar | Preço |
|------------|---------------|-------|
| Comp A | Pro | $X/mês |
| Comp B | Growth | $Y/mês |
| Comp C | Team | $Z/mês |

Posicionamento: [Abaixo/Igual/Acima] do mercado porque [razão]

### 3. Cost Analysis

| Item | Custo/usuário/mês |
|------|-------------------|
| Infraestrutura | R$ X |
| Suporte | R$ Y |
| AI/APIs | R$ Z |
| **Total** | R$ W |

Margem mínima desejada: X%
Preço mínimo: R$ W / (1 - X%)

### 4. Willingness to Pay

Pesquisa com usuários:
- "Quanto você pagaria por [feature]?"
- "Em que preço você consideraria caro demais?"
- "Em que preço você consideraria barato demais?"
```

---

## Análise de Competidores

### Template de Análise

```markdown
# Análise Competitiva: [Seu Produto]

## Mapa de Competidores

### Competidores Diretos
Produtos que resolvem o mesmo problema da mesma forma

| Competidor | Funding | Tamanho | Preço |
|------------|---------|---------|-------|
| Comp A | $XM | Y users | $Z/mo |

### Competidores Indiretos
Produtos que resolvem o mesmo problema de forma diferente

| Competidor | Abordagem |
|------------|-----------|
| Comp B | Planilhas |
| Comp C | Consultoria |

### Substitutos
Soluções alternativas

| Substituto | Por que usam |
|------------|--------------|
| Não fazer nada | Preguiça |
| Fazer manual | Controle |

## Matriz de Features

| Feature | Nós | Comp A | Comp B | Comp C |
|---------|-----|--------|--------|--------|
| Feature 1 | ✅ | ✅ | ❌ | ⚠️ |
| Feature 2 | ✅ | ⚠️ | ✅ | ✅ |
| Feature 3 | ❌ | ✅ | ✅ | ❌ |

Legenda: ✅ Completo | ⚠️ Parcial | ❌ Não tem

## Posicionamento

### Matriz 2x2

```
                    Simples
                       ↑
                       │
           [Comp C]    │    [NÓS]
                       │
    Barato ←───────────┼───────────→ Premium
                       │
           [Comp B]    │    [Comp A]
                       │
                       ↓
                   Complexo
```

### Nosso Diferencial

1. **Diferencial 1**: [Descrição]
2. **Diferencial 2**: [Descrição]
3. **Diferencial 3**: [Descrição]

## SWOT por Competidor

### Competidor A

| Strengths | Weaknesses |
|-----------|------------|
| - S1 | - W1 |
| - S2 | - W2 |

| Opportunities | Threats |
|---------------|---------|
| - O1 | - T1 |
| - O2 | - T2 |
```

---

## OKRs e Métricas

### Framework de OKRs

```markdown
# OKRs Q1 2026

## Objective 1: [Objetivo aspiracional]

**Key Results:**
1. KR1: [Métrica específica de X para Y]
   - Baseline: X
   - Target: Y
   - Responsável: @pessoa

2. KR2: [...]

3. KR3: [...]

**Iniciativas:**
- [ ] Iniciativa A
- [ ] Iniciativa B

---

## Objective 2: [...]
```

### Métricas SaaS Essenciais

```markdown
## Métricas de Growth

### MRR (Monthly Recurring Revenue)
MRR = Σ (Receita mensal de cada cliente)

### ARR (Annual Recurring Revenue)
ARR = MRR × 12

### Growth Rate
Growth = (MRR_atual - MRR_anterior) / MRR_anterior × 100

---

## Métricas de Aquisição

### CAC (Customer Acquisition Cost)
CAC = (Marketing + Vendas) / Novos Clientes

### Payback Period
Payback = CAC / (ARPU × Gross Margin)

---

## Métricas de Retenção

### Churn Rate
Churn = Clientes perdidos / Total clientes início período

### Net Revenue Retention (NRR)
NRR = (MRR início + Expansion - Contraction - Churn) / MRR início

### LTV (Lifetime Value)
LTV = ARPU × Gross Margin × (1 / Churn Rate)

---

## Métricas de Engajamento

### DAU/MAU Ratio
Stickiness = DAU / MAU
- <10%: Baixo engajamento
- 10-20%: Médio
- >20%: Alto (excelente)

### Feature Adoption
Adoption = Usuários usando feature / Total usuários

---

## Dashboard Template

| Métrica | Meta | Atual | Status |
|---------|------|-------|--------|
| MRR | R$ 100K | R$ 85K | 🟡 |
| Churn | <5% | 4.2% | 🟢 |
| NPS | >50 | 45 | 🟡 |
| DAU/MAU | >20% | 22% | 🟢 |
```

---

## User Research

### Template de Entrevista

```markdown
# Roteiro de Entrevista: [Tema]

## Informações

| Campo | Valor |
|-------|-------|
| Duração | 30-45 min |
| Formato | Video call |
| Incentivo | [se houver] |

## Introdução (2 min)

"Obrigado por participar. Estamos conversando com usuários
para entender melhor [tema]. Não existem respostas certas
ou erradas."

## Perguntas de Contexto (5 min)

1. Conte um pouco sobre seu trabalho/rotina
2. Como você usa [produto/categoria] atualmente?

## Perguntas sobre o Problema (10 min)

3. Qual é o maior desafio que você enfrenta com [área]?
4. Pode me dar um exemplo recente?
5. Como você resolve isso hoje?
6. O que acontece se não resolver?

## Perguntas sobre Solução (10 min)

7. [Mostrar protótipo/conceito]
8. O que você acha?
9. O que está confuso?
10. O que está faltando?

## Perguntas de Fechamento (5 min)

11. Se pudesse mudar uma coisa, o que seria?
12. Algo mais que gostaria de compartilhar?

## Notas do Entrevistador

[Espaço para anotações]
```

### Síntese de Pesquisa

```markdown
# Síntese: [Nome da Pesquisa]

## Metodologia
- X entrevistas qualitativas
- Y respostas de survey
- Z sessões de usabilidade

## Principais Insights

### Insight 1: [Título]
**Evidência:** "Quote do usuário" - Participante X
**Implicação:** [O que isso significa para o produto]

### Insight 2: [...]

## Jobs to be Done

| Job | Contexto | Motivação | Resultado Desejado |
|-----|----------|-----------|-------------------|
| JTBD 1 | Quando... | Quero... | Para que... |

## Personas Atualizadas

### Persona A: [Nome]
- **Características:** ...
- **Dores:** ...
- **Ganhos:** ...

## Recomendações

1. **Recomendação 1** (Alta prioridade)
   - Descrição
   - Impacto esperado

2. **Recomendação 2** (Média prioridade)
   - ...
```

---

## Feature Prioritization

### Framework RICE

```markdown
## RICE Score

| Feature | Reach | Impact | Confidence | Effort | Score |
|---------|-------|--------|------------|--------|-------|
| Feature A | 1000 | 3 | 80% | 2 | 1200 |
| Feature B | 500 | 2 | 90% | 1 | 900 |
| Feature C | 2000 | 1 | 50% | 3 | 333 |

### Cálculo
RICE = (Reach × Impact × Confidence) / Effort

### Escalas

**Reach:** Usuários impactados por período
**Impact:** 3=Massivo, 2=Alto, 1=Médio, 0.5=Baixo, 0.25=Mínimo
**Confidence:** 100%=Alta, 80%=Média, 50%=Baixa
**Effort:** Pessoa-meses
```

### Framework MoSCoW

```markdown
## MoSCoW Prioritization

### Must Have (Crítico)
- [ ] Feature X
- [ ] Feature Y

### Should Have (Importante)
- [ ] Feature Z

### Could Have (Desejável)
- [ ] Feature W

### Won't Have (Futuro)
- [ ] Feature V
```

---

## Links Úteis

- [Product Hunt](https://www.producthunt.com/) - Descoberta de produtos
- [G2](https://www.g2.com/) - Reviews de software
- [Crunchbase](https://www.crunchbase.com/) - Dados de mercado
- [SaaS Metrics](https://www.forentrepreneurs.com/saas-metrics-2/) - Guia de métricas
- [Jobs to be Done](https://jtbd.info/) - Framework JTBD
