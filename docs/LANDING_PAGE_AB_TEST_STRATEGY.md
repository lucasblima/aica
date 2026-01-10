# Landing Page V5 - Estratégia de A/B Testing
**Validação Data-Driven da Proposta "Ordem ao Caos"**
**Versão:** 1.0

---

## 1. HIPÓTESE CENTRAL

### 1.1 Declaração da Hipótese
**H0 (Hipótese Nula):**
> A landing page V5 "Ordem ao Caos" com demo interativa **não** melhora significativamente as taxas de conversão comparada à landing page atual.

**H1 (Hipótese Alternativa):**
> A landing page V5 "Ordem ao Caos" com demo interativa **aumenta** as taxas de conversão (signup, engajamento) em pelo menos **3x** comparada à landing page atual.

### 1.2 Premissas
1. **Tangibilidade supera abstração:** Demonstrar funcionalidades é mais persuasivo que descrevê-las
2. **Interatividade aumenta engajamento:** Usuários que interagem com a demo têm maior intenção de signup
3. **"Ordem ao Caos" ressoa mais:** Proposta de valor concreta vs "Autoconhecimento" abstrato

### 1.3 Métricas de Sucesso
| Métrica | Baseline (V4) | Target (V5) | Melhoria |
|---------|---------------|-------------|----------|
| **Bounce Rate** | 70% | <50% | -20pp |
| **Time on Page** | 30s | >90s | +200% |
| **CTA Click Rate** | 2% | >8% | +300% |
| **Demo Completion** | N/A | >60% | NEW |
| **Signup Conversion** | 0.5% | >1.5% | +200% |

---

## 2. DESIGN DO EXPERIMENTO

### 2.1 Configuração A/B
```
┌────────────────────────────────────────────────┐
│           Tráfego da Landing Page              │
│                    (100%)                      │
└─────────────────┬──────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │ Random Split      │
        │ (50/50)           │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌────────────────┐  ┌────────────────┐
│  VARIANT A     │  │  VARIANT B     │
│  (Control)     │  │  (Treatment)   │
│                │  │                │
│  Landing V4    │  │  Landing V5    │
│  "Conheça a    │  │  "Ordem ao     │
│   si mesmo"    │  │   Caos"        │
│                │  │                │
│  - Estática    │  │  - Interativa  │
│  - Features    │  │  - Demo real   │
│    listadas    │  │  - Animações   │
│                │  │                │
│  50% tráfego   │  │  50% tráfego   │
└────────────────┘  └────────────────┘
```

### 2.2 Segmentação de Tráfego
**Critérios de Inclusão:**
- ✅ Todos os visitantes novos (first-time)
- ✅ Visitantes retornando após 7+ dias
- ✅ Todas as fontes de tráfego (orgânico, pago, referral)
- ✅ Desktop e Mobile

**Critérios de Exclusão:**
- ❌ Usuários já logados (redirect para dashboard)
- ❌ Bots e crawlers (via user-agent)
- ❌ QA/Testing IPs (lista branca)

### 2.3 Randomização
```typescript
// src/services/abTestService.ts
export const getVariant = (userId: string): 'control' | 'treatment' => {
  // Consistent hashing para garantir experiência consistente
  const hash = murmurhash(userId);
  const bucket = hash % 100;

  // 50/50 split
  return bucket < 50 ? 'control' : 'treatment';
};

// Exemplo de uso
const variant = getVariant(sessionId);
if (variant === 'treatment') {
  // Mostrar Landing V5
  return <LandingPageV5 />;
} else {
  // Mostrar Landing V4
  return <LandingPage />;
}
```

---

## 3. EVENTOS E TRACKING

### 3.1 Eventos Google Analytics 4
```javascript
// Event Taxonomy
const GA4_EVENTS = {
  // Page Views
  page_view: {
    page_title: 'Landing Page V5',
    page_location: window.location.href,
    variant: 'treatment' // ou 'control'
  },

  // Demo Interactions
  demo_started: {
    variant: 'treatment',
    message_count: 15,
    timestamp: Date.now()
  },

  demo_stage_completed: {
    variant: 'treatment',
    stage: 'analyzing' | 'embedding' | 'classifying' | 'organizing',
    duration_ms: 1000
  },

  demo_completed: {
    variant: 'treatment',
    total_duration_ms: 4500,
    modules_populated: ['atlas', 'journey', 'studio', 'connections']
  },

  // Module Interactions
  module_hovered: {
    variant: 'treatment',
    module: 'atlas' | 'journey' | 'studio' | 'connections'
  },

  module_expanded: {
    variant: 'treatment',
    module: 'atlas' | 'journey' | 'studio' | 'connections'
  },

  // Conversions
  cta_clicked: {
    variant: 'treatment' | 'control',
    cta_location: 'hero' | 'post_demo' | 'footer',
    cta_text: 'Processar Meu Caos' | 'Começar Agora'
  },

  signup_started: {
    variant: 'treatment' | 'control',
    source: 'landing_page'
  },

  signup_completed: {
    variant: 'treatment' | 'control',
    time_to_signup_ms: 120000
  }
};
```

### 3.2 Funil de Conversão
```
┌─────────────────────────────────────────────────────┐
│ STAGE 1: Page View                                  │
│ ↓                                                    │
│ Variant A: 1000 views  │  Variant B: 1000 views     │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ STAGE 2: Scroll 50%+ (Engagement)                   │
│ ↓                                                    │
│ Variant A: 400 (40%)   │  Variant B: 700 (70%)      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ STAGE 3: Demo Started (Treatment only)              │
│ ↓                                                    │
│ Variant A: N/A         │  Variant B: 500 (50%)      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ STAGE 4: Demo Completed                             │
│ ↓                                                    │
│ Variant A: N/A         │  Variant B: 300 (30%)      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ STAGE 5: CTA Clicked                                │
│ ↓                                                    │
│ Variant A: 20 (2%)     │  Variant B: 80 (8%)        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ STAGE 6: Signup Completed                           │
│ ↓                                                    │
│ Variant A: 5 (0.5%)    │  Variant B: 15 (1.5%)      │
└─────────────────────────────────────────────────────┘
```

### 3.3 Hotjar Heatmaps
**Áreas de Interesse:**
1. **Hero Section**
   - Cliques no botão "Processar Meu Caos"
   - Scrolling behavior
   - Tempo de permanência

2. **Demo Area (V5 only)**
   - Hover sobre mensagens caóticas
   - Cliques em module cards
   - Expansão de cards

3. **CTA Sections**
   - Cliques em CTAs primários/secundários
   - Click-through rate por localização

**Configuração:**
```javascript
// Hotjar event tracking
hj('event', 'ab_test_variant_b_demo_started');
hj('event', 'ab_test_cta_clicked_post_demo');
```

---

## 4. TAMANHO DA AMOSTRA E DURAÇÃO

### 4.1 Cálculo de Amostra
**Parâmetros:**
- **Baseline Conversion Rate (p1):** 0.5% (Landing V4)
- **Target Conversion Rate (p2):** 1.5% (Landing V5)
- **Minimum Detectable Effect (MDE):** +1pp (200% relative)
- **Statistical Power:** 80%
- **Significance Level (α):** 5% (p < 0.05)

**Fórmula:**
```
n = 2 * (Zα/2 + Zβ)² * p * (1-p) / (p2 - p1)²
```

**Resultado:**
- **Amostra necessária por variante:** ~5,000 visitantes
- **Amostra total:** ~10,000 visitantes

### 4.2 Duração do Teste
**Tráfego Atual:**
- **Visitantes únicos/dia:** ~300
- **Visitantes únicos/semana:** ~2,100

**Cronograma:**
```
Semana 1:  2,100 visitantes  (21% da amostra)
Semana 2:  4,200 visitantes  (42% da amostra)
Semana 3:  6,300 visitantes  (63% da amostra)
Semana 4:  8,400 visitantes  (84% da amostra)
Semana 5: 10,500 visitantes (105% da amostra) ← Suficiente
```

**Duração Estimada:** 4-5 semanas

### 4.3 Interim Analysis (Opcional)
**Checkpoint 1 (Semana 2):**
- Verificar distribuição 50/50 está funcionando
- Checar eventos sendo capturados corretamente
- Identificar bugs críticos

**Checkpoint 2 (Semana 4):**
- Análise preliminar de tendências
- Decisão de continuar ou ajustar duração

---

## 5. ANÁLISE ESTATÍSTICA

### 5.1 Testes de Hipótese
**Primary Metric: Signup Conversion Rate**

**Teste:** Two-proportion Z-test
```python
from scipy.stats import proportions_ztest

# Variant A (Control)
conversions_a = 50
visitors_a = 10000
conversion_rate_a = conversions_a / visitors_a  # 0.5%

# Variant B (Treatment)
conversions_b = 150
visitors_b = 10000
conversion_rate_b = conversions_b / visitors_b  # 1.5%

# Z-test
z_stat, p_value = proportions_ztest(
    [conversions_b, conversions_a],
    [visitors_b, visitors_a]
)

print(f"Z-statistic: {z_stat}")
print(f"P-value: {p_value}")

if p_value < 0.05:
    print("✅ Resultado estatisticamente significativo!")
    print(f"Lift: {(conversion_rate_b - conversion_rate_a) / conversion_rate_a * 100:.1f}%")
else:
    print("❌ Resultado não significativo. Manter Variant A.")
```

### 5.2 Secondary Metrics
**Tempo na Página (T-test):**
```python
from scipy.stats import ttest_ind

# Variant A
time_on_page_a = [30, 25, 35, 28, 32, ...]  # segundos
# Variant B
time_on_page_b = [90, 120, 85, 95, 110, ...]

t_stat, p_value = ttest_ind(time_on_page_b, time_on_page_a)
```

**Bounce Rate (Chi-square test):**
```python
from scipy.stats import chi2_contingency

# Contingency table
observed = [
    [3000, 7000],  # Variant A: [bounced, engaged]
    [2000, 8000]   # Variant B: [bounced, engaged]
]

chi2, p_value, dof, expected = chi2_contingency(observed)
```

### 5.3 Critérios de Decisão
```
┌─────────────────────────────────────────────────────┐
│ Decision Tree                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  P-value < 0.05 AND Lift > +50%?                   │
│          │                                          │
│          ├─ SIM ──► ✅ SHIP V5 (100% traffic)       │
│          │                                          │
│          └─ NÃO ──► P-value < 0.05 BUT Lift < 50%? │
│                          │                          │
│                          ├─ SIM ──► 🤔 ITERATE     │
│                          │         (Ship melhorias) │
│                          │                          │
│                          └─ NÃO ──► ❌ ROLLBACK     │
│                                    (Keep V4)        │
└─────────────────────────────────────────────────────┘
```

---

## 6. SEGMENTAÇÃO E ANÁLISE PROFUNDA

### 6.1 Segmentação por Device
```sql
-- Query SQL para análise por device
SELECT
  variant,
  device_category,
  COUNT(*) as visitors,
  SUM(CASE WHEN signed_up THEN 1 ELSE 0 END) as signups,
  ROUND(AVG(time_on_page_seconds), 2) as avg_time_on_page,
  ROUND(SUM(CASE WHEN signed_up THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100, 2) as conversion_rate
FROM landing_page_analytics
WHERE experiment_id = 'ordem_ao_caos_v1'
GROUP BY variant, device_category
ORDER BY variant, device_category;
```

**Resultado Esperado:**
| Variant | Device | Visitors | Signups | Conv. Rate | Avg Time |
|---------|--------|----------|---------|------------|----------|
| A | Desktop | 6000 | 35 | 0.58% | 32s |
| A | Mobile | 4000 | 15 | 0.38% | 28s |
| B | Desktop | 6000 | 110 | 1.83% | 105s |
| B | Mobile | 4000 | 40 | 1.00% | 75s |

**Insight:** V5 pode performar melhor em desktop devido às animações complexas.

### 6.2 Segmentação por Fonte de Tráfego
```sql
SELECT
  variant,
  traffic_source,
  COUNT(*) as visitors,
  SUM(CASE WHEN signed_up THEN 1 ELSE 0 END) as signups,
  ROUND(SUM(CASE WHEN signed_up THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100, 2) as conversion_rate
FROM landing_page_analytics
WHERE experiment_id = 'ordem_ao_caos_v1'
GROUP BY variant, traffic_source
ORDER BY variant, conversion_rate DESC;
```

**Resultado Esperado:**
| Variant | Source | Conv. Rate | Sample Size |
|---------|--------|------------|-------------|
| A | Organic | 0.8% | 3000 |
| A | Paid | 0.3% | 2000 |
| A | Referral | 0.5% | 1000 |
| B | Organic | 2.2% | 3000 |
| B | Paid | 0.9% | 2000 |
| B | Referral | 1.5% | 1000 |

**Insight:** Tráfego orgânico pode se beneficiar mais da demo interativa.

### 6.3 Segmentação por Hora do Dia
```sql
SELECT
  variant,
  EXTRACT(HOUR FROM visit_timestamp) as hour_of_day,
  COUNT(*) as visitors,
  ROUND(AVG(time_on_page_seconds), 2) as avg_time_on_page
FROM landing_page_analytics
WHERE experiment_id = 'ordem_ao_caos_v1'
GROUP BY variant, hour_of_day
ORDER BY variant, hour_of_day;
```

**Insight:** Horários de pico podem ter engajamento diferente com a demo.

---

## 7. DASHBOARD DE MONITORAMENTO

### 7.1 Real-Time Dashboard (Streamlit/Dash)
```python
import streamlit as st
import pandas as pd
import plotly.express as px

st.title("🧪 A/B Test: Ordem ao Caos")

# KPIs principais
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Variant A Conversion", "0.5%", "")
with col2:
    st.metric("Variant B Conversion", "1.5%", "+200%")
with col3:
    st.metric("Statistical Significance", "p=0.001", "✅ Significant")
with col4:
    st.metric("Sample Size", "10,500 / 10,000", "✅ Complete")

# Gráfico de conversão ao longo do tempo
st.subheader("Conversion Rate Over Time")
fig = px.line(df, x='date', y='conversion_rate', color='variant')
st.plotly_chart(fig)

# Funnel visualization
st.subheader("Conversion Funnel")
funnel_data = {
    'Stage': ['Page View', 'Scroll 50%', 'Demo Started', 'Demo Complete', 'CTA Click', 'Signup'],
    'Variant A': [1000, 400, 0, 0, 20, 5],
    'Variant B': [1000, 700, 500, 300, 80, 15]
}
fig = px.funnel(pd.DataFrame(funnel_data), x=['Variant A', 'Variant B'], y='Stage')
st.plotly_chart(fig)
```

### 7.2 Alertas Automáticos
```python
# Slack webhook para alertas
import requests

def send_alert(message):
    webhook_url = "https://hooks.slack.com/services/..."
    payload = {"text": message}
    requests.post(webhook_url, json=payload)

# Verificar daily
if variant_b_conversion > variant_a_conversion * 2:
    send_alert("🎉 Variant B está performando 2x melhor que A!")

if p_value < 0.05 and sample_size >= 10000:
    send_alert("✅ Teste atingiu significância estatística! Review os resultados.")
```

---

## 8. RISCOS E MITIGAÇÕES

### 8.1 Risco: Sample Ratio Mismatch (SRM)
**Problema:** Split não está 50/50 real
**Detecção:**
```python
from scipy.stats import chi2_contingency

observed = [visitors_a, visitors_b]
expected = [(visitors_a + visitors_b) / 2] * 2

chi2, p_value = chi2_contingency([observed, expected])

if p_value < 0.05:
    print("⚠️ SRM detectado! Investigar randomização.")
```

**Mitigação:**
- Verificar função de hashing
- Checar se há cache issues
- Validar logs de servidor

### 8.2 Risco: Novelty Effect
**Problema:** Usuários interagem mais com V5 apenas porque é nova
**Mitigação:**
- Rodar teste por tempo suficiente (4-5 semanas)
- Monitorar engajamento ao longo do tempo
- Comparar early vs late adopters

### 8.3 Risco: Performance Issues (V5)
**Problema:** Animações causam lag, degradando experiência
**Detecção:**
```javascript
// Track Core Web Vitals
window.addEventListener('load', () => {
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

  ga('send', 'event', {
    eventCategory: 'Performance',
    eventAction: 'Page Load Time',
    eventValue: pageLoadTime,
    variant: getVariant()
  });
});
```

**Mitigação:**
- Lazy load componentes pesados
- Feature detection para devices low-end
- Fallback para versão estática

---

## 9. CHECKLIST PRÉ-LAUNCH

### 9.1 Setup Técnico
- [ ] Randomização implementada e testada
- [ ] GA4 events configurados e disparando
- [ ] Hotjar instalado e heatmaps ativados
- [ ] Dashboard de monitoramento configurado
- [ ] Feature flag para kill switch (caso de emergência)
- [ ] QA em ambas variantes (desktop + mobile)

### 9.2 Documentação
- [ ] Hipótese documentada
- [ ] Métricas de sucesso definidas
- [ ] Tamanho de amostra calculado
- [ ] Critérios de decisão estabelecidos
- [ ] Stakeholders alinhados

### 9.3 Compliance
- [ ] Cookie consent implementado (LGPD)
- [ ] Privacy policy atualizada
- [ ] Opt-out mechanism para tracking
- [ ] Dados anonimizados

---

## 10. PÓS-EXPERIMENTO

### 10.1 Relatório Final (Template)
```markdown
# A/B Test Report: Landing Page V5 "Ordem ao Caos"

## Executive Summary
- **Winner:** Variant B (Landing V5)
- **Lift:** +200% conversion rate (0.5% → 1.5%)
- **Statistical Significance:** p < 0.001
- **Recommendation:** Ship to 100% traffic

## Key Metrics
| Metric | Variant A | Variant B | Lift | P-value |
|--------|-----------|-----------|------|---------|
| Signup Conversion | 0.5% | 1.5% | +200% | <0.001 |
| Time on Page | 30s | 95s | +217% | <0.001 |
| Bounce Rate | 70% | 48% | -31% | <0.001 |
| CTA Click Rate | 2% | 8.5% | +325% | <0.001 |

## Learnings
1. **Interatividade funciona:** 60% dos usuários completaram a demo
2. **"Ordem ao Caos" ressoa:** CTA clicks +325%
3. **Mobile performance OK:** Nenhuma degradação detectada

## Next Steps
1. Ship V5 to 100% traffic
2. Monitor for 1 week
3. Iterate on module cards (expandir functionality)
```

### 10.2 Iterações Futuras
**Se V5 vencer:**
1. **Fase 1:** Ship to 100% traffic
2. **Fase 2:** Adicionar mais módulos (Finance, Grants)
3. **Fase 3:** Integração real com WhatsApp (via OAuth)
4. **Fase 4:** Personalização da demo (usuário digita mensagens)

**Se V5 perder:**
1. **Análise profunda:** Onde usuários droparam?
2. **User interviews:** Feedback qualitativo
3. **Iterate:** Simplificar animações? Reduzir complexidade?
4. **Re-test:** V5.1 com melhorias

---

## 11. CONCLUSÃO

Esta estratégia de A/B testing garante:

1. **Validação rigorosa** - Amostra suficiente e significância estatística
2. **Decisão data-driven** - Métricas claras e objetivas
3. **Aprendizado contínuo** - Insights para futuras iterações
4. **Risco mitigado** - Rollback fácil se V5 performar mal

**Timeline Total:**
- Setup: 1 semana
- Teste: 4-5 semanas
- Análise: 3 dias
- Decisão: 1 dia
- **Total: ~6 semanas**

**ROI Esperado:** Se V5 atingir +200% lift, o investimento de 6 semanas será recuperado em ~2 meses de operação com maior conversão.

---

**Aprovado por:** [Stakeholder]
**Data de Início do Teste:** [TBD]
**Data Prevista de Conclusão:** [TBD]
