# Flux Score Calculation Methodology — Discovery Document (#690)

**Date:** 2026-03-05
**Status:** Research / Proposal
**Module:** Flux (Meu-Treino)

---

## 1. Current State

### Data Collected Today

The athlete fills an **8-question daily questionnaire** (0-5 scale) stored in `athlete_feedback_entries.questionnaire`:

| Key | Question | Scale |
|-----|----------|-------|
| `volume_adequate` | Volume adequado ao perfil? | 0 (Nada) - 5 (Extremo) |
| `volume_completed` | Cumpriu o volume? | 0 (Nada) - 5 (Totalmente) |
| `intensity_adequate` | Intensidade adequada? | 0 (Pessima) - 5 (Excelente) |
| `intensity_completed` | Cumpriu a intensidade? | 0 (Nada) - 5 (Totalmente) |
| `fatigue` | Nivel de cansaco | 0 (Nada) - 5 (Extremo) |
| `stress` | Nivel de stress | 0 (Nada) - 5 (Extremo) |
| `nutrition` | Cuidado com alimentacao | 0 (Nada) - 5 (Extremo) |
| `sleep` | Qualidade do sono | 0 (Nada) - 5 (Extremo) |

### Current Radar Chart (6 axes)

`FeedbackRadarChart.tsx` displays 6 of the 8 fields as a spider chart. Stress and fatigue are shown separately via `StressFatigueGauges.tsx`. The chart uses simple averages across all feedback entries — no weighting, no decay, no load calculation.

### Existing Fatigue Assessment

`useAthleteFatigue.ts` calls `assess-athlete-fatigue` Edge Function which already returns CTL, ATL, TSB, ACWR, readiness score (0-100), and suggested intensity. However, the calculation details are opaque (AI-generated via Gemini) and not grounded in the actual sRPE/TRIMP formulas.

### What is Missing

- No **session duration** collected (critical for sRPE calculation)
- No **heart rate data** (needed for TRIMP/hrTSS — but not required for sRPE)
- Radar chart axes are **raw subjective averages**, not derived training metrics
- No **time-series decay** — a feedback from 3 weeks ago weighs the same as yesterday

---

## 2. Industry Standards

### sRPE — Session RPE (Foster, 1998)

**Formula:** `sRPE load = RPE (0-10) x session duration (minutes)`

- Cross-modality: works for swimming, running, strength, CrossFit
- Validated extensively (Haddad et al. 2017, PMC5673663)
- Only requires two data points: perceived exertion + duration
- Collect RPE 30 minutes post-session for accuracy

**Why it fits AICA:** We already collect RPE-like data (`intensity_completed` on 0-5). We need to add session duration and switch to the standard CR-10 scale.

### TRIMP — Training Impulse (Banister, 1975)

**Formula:** `TRIMP = duration x HRR x weighting factor`

- Heart-rate-based — requires HR monitor data
- Gold standard for endurance sports but impractical without wearable integration
- Not recommended as primary metric for AICA (no HR data)

### TSS — Training Stress Score (Coggan)

**Formula:** `TSS = (duration x NP x IF) / (FTP x 3600) x 100`

- Power-based (cycling) or pace-based (running rTSS)
- Requires sport-specific threshold (FTP, vLT)
- Too sport-specific for AICA's cross-modality needs

### ATL / CTL / TSB — Fitness-Fatigue Model

**Formulas (exponentially weighted moving averages):**
- `CTL(n) = CTL(n-1) + (load(n) - CTL(n-1)) / 42` — Chronic (fitness), 42-day decay
- `ATL(n) = ATL(n-1) + (load(n) - ATL(n-1)) / 7` — Acute (fatigue), 7-day decay
- `TSB = CTL - ATL` — Form/freshness

**Interpretation:**
- TSB positive = fresh/rested, TSB negative = fatigued
- Optimal training zone: TSB between -10 and -30
- Race readiness: TSB between +5 and +25

### ACWR — Acute:Chronic Workload Ratio

**Formula:** `ACWR = ATL / CTL` (or 7-day sum / 28-day rolling avg)

- Sweet spot: 0.8-1.3 (lowest injury risk)
- Danger zone: > 1.5 (spike in load relative to fitness)
- Already returned by our Edge Function but not calculated from real sRPE data

### Hooper Index (Readiness/Wellness)

**Formula:** Sum of sleep + stress + fatigue + muscle soreness (1-7 scale each)

- Simple pre-session wellness check
- Our questionnaire already captures sleep, stress, fatigue — nearly a Hooper Index

---

## 3. Recommended Approach

### Primary Load Metric: sRPE

sRPE is the best fit because:
1. Works across all modalities (swimming, CrossFit, running, strength)
2. Requires only RPE + duration — no wearable hardware
3. We already collect a form of RPE (`intensity_completed`)
4. Extensively validated in sports science literature

**Proposed change:** Map our 0-5 `intensity_completed` to Borg CR-10 scale (or add a dedicated RPE question using CR-10 directly). Collect session duration in minutes.

### Fatigue/Freshness Model: CTL/ATL/TSB from sRPE

Replace the opaque AI-based fatigue assessment with deterministic calculation:
1. Calculate daily sRPE load = RPE(0-10) x duration(min)
2. Apply EWMA with 42-day (CTL) and 7-day (ATL) time constants
3. TSB = CTL - ATL
4. ACWR = ATL / CTL

### Readiness Score: Hooper-Inspired

Combine our existing wellness data (sleep, stress, fatigue) into a readiness composite:
- `readiness = 100 - ((stress_norm + fatigue_norm - sleep_norm) / 3 * 100)`
- Where each value is normalized from 0-5 to 0-1
- Sleep is inverted (higher = better), stress/fatigue are direct (higher = worse)

---

## 4. Radar Chart Mapping

Proposed 6-axis mapping grounded in real training science:

| Axis | Current Source | Proposed Calculation |
|------|---------------|---------------------|
| **Volume adequado** | `volume_adequate` avg | Keep as-is (coach prescription quality) |
| **Intensidade adequada** | `intensity_adequate` avg | Keep as-is (coach prescription quality) |
| **Aderencia** (replaces "Cumpriu volume") | `volume_completed` avg | `(volume_completed + intensity_completed) / 2` — single compliance axis |
| **Carga (Load)** (new) | N/A | sRPE percentile vs athlete's own history (0-5 mapped) |
| **Recuperacao** (replaces "Qualidade do sono") | `sleep` avg | Hooper-inspired: `(sleep_norm - stress_norm - fatigue_norm + 2) / 3 * 5` |
| **Alimentacao** | `nutrition` avg | Keep as-is (self-reported) |

This reduces redundancy (volume+intensity compliance merged) and introduces a real load metric.

---

## 5. Data Sources Needed

### Must Add (Phase 1)

| Data | Where to Collect | Storage |
|------|-----------------|---------|
| **Session duration (min)** | Post-workout questionnaire or slot completion | `workout_slots.actual_duration_min` |
| **RPE on CR-10 scale** | Post-workout, 30 min after session | `athlete_feedback_entries.questionnaire.rpe_cr10` |

### Nice to Have (Phase 2+)

| Data | Where to Collect | Storage |
|------|-----------------|---------|
| Heart rate avg/max | Wearable sync (Garmin/Apple Health) | `workout_slots.hr_data` |
| Muscle soreness | Morning wellness check | `athlete_feedback_entries.questionnaire.soreness` |
| Body weight | Morning check-in | `athlete_daily_metrics.weight_kg` |

---

## 6. Implementation Roadmap

### Phase 1 — sRPE Foundation (2-3 days)

1. Add `actual_duration_min` (int) and `rpe_cr10` (smallint 0-10) columns to `workout_slots`
2. Add duration + RPE(CR-10) inputs to `WeeklyFeedbackCard` post-workout flow
3. Create `calculateSRPE(rpe: number, duration: number): number` utility
4. Create `calculateTrainingLoad(entries: SRPEEntry[], days: number)` returning CTL/ATL/TSB/ACWR
5. Replace AI-opaque fatigue assessment with deterministic calculation

### Phase 2 — Radar Chart Upgrade (1-2 days)

1. Implement the new 6-axis mapping from Section 4
2. Add Hooper-inspired readiness composite
3. Add "Carga" axis using sRPE percentile ranking
4. Update `FeedbackRadarChart.tsx` with new dimension extraction

### Phase 3 — Time-Series Visualization (2-3 days)

1. Build CTL/ATL/TSB line chart (Performance Management Chart)
2. Add ACWR gauge with injury risk zones (green 0.8-1.3, red >1.5)
3. Historical trend view for load progression

### Phase 4 — Wearable Integration (future)

1. Garmin Connect / Apple HealthKit API sync
2. Auto-capture HR, duration, and distance
3. Enable hrTRIMP as secondary load metric for endurance athletes

---

## References

- Foster et al. (1998) — Session RPE method
- Banister (1975) — TRIMP Training Impulse
- Coggan — TSS / Performance Management Chart
- Hooper & Mackinnon (1995) — Hooper Index for athlete monitoring
- Hulin et al. (2014) — ACWR for injury prevention
- Haddad et al. (2017) — sRPE validity review (PMC5673663)
