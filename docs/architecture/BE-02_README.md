# BE-02: Consolidação de Tabelas de Gamificação

Status: **Analysis Complete - Awaiting Approval**

## O Que Foi Descoberto

Aica Life OS tem **dois sistemas de gamificação paralelos** que não conversam um com o outro:

### Sistema A: Consciousness Points (Moderno)
- **Foco:** Consciência e autorreflexão
- **Tabelas:** `user_consciousness_stats`, `consciousness_points_log`
- **Níveis:** 5 (Observador → Mestre)
- **Integração:** Módulo "Minha Jornada" (ATIVO)
- **Dados:** 1 usuário (teste)

### Sistema B: XP + Badges (Legado)
- **Foco:** Tarefas gerais
- **Tabelas:** `user_stats`, `user_achievements`
- **Níveis:** 10+ (exponencial)
- **Integração:** Sem integração ativa
- **Dados:** 1 usuário (teste)

### O Problema
```
RUIM: Dois campos "level" diferentes
RUIM: Dois sistemas de pontos (total_xp vs total_points)
RUIM: Dois "current_streak" duplicados
RUIM: Confusão para developers (qual usar?)
BOM: Dados baixos = fácil migração
```

---

## Recomendação

### CONSOLIDAR PARA CONSCIOUSNESS POINTS

**Por quê?**
- Sistema moderno ✓
- Alinhado com Minha Jornada ✓
- Foco em consciência (missão da app) ✓
- Menos código ✓

**Impacto:**
- Ganhar 1 service consolidado
- Perder 1 tabela legada
- Usuários: sem impacto (dados migram)
- Performance: melhora

---

## O Plano

```
SEMANA 1: DATA MIGRATION
├── Backup das tabelas antigas
├── Migrar dados de user_stats → user_consciousness_stats
├── Validar integridade
└── Monitorar por erros

SEMANA 2-3: CODE CONSOLIDATION
├── Deprecar gamificationService.ts
├── Atualizar testes
├── Unificar tipos
└── Deploy com warnings

MÊS 6: CLEANUP
├── Remover código antigo (após 2 releases)
└── Arquivar tabela legacy
```

---

## Arquivos Criados

```
docs/architecture/
├── BE-02_GAMIFICATION_CONSOLIDATION.md  (análise completa, 400+ linhas)
├── BE-02_DECISION_MATRIX.md             (matriz de decisão, 1-page)
└── BE-02_README.md                      (este arquivo)

migrations/
└── 20250612_consolidate_gamification_migration_template.sql (template)
```

## Como Revisar

### Pra Entender Rápido (5 min)
1. Leia este arquivo
2. Veja `BE-02_DECISION_MATRIX.md`

### Pra Entender Profundo (30 min)
1. Leia `BE-02_GAMIFICATION_CONSOLIDATION.md` completo
2. Revise o schema das tabelas (seção 1)
3. Confirme a decisão

### Pra Implementar
1. Revise `20250612_consolidate_gamification_migration_template.sql`
2. Teste em staging
3. Execute PHASE 1-4 em produção
4. Monitore por 2 semanas
5. Volte para PHASE 3+ depreciação

---

## Tabelas Envolvidas

### Manter (Sem Mudanças)
```sql
✓ user_consciousness_stats
  - Tabela primária do sistema consolidado
  - Schema: user_id, total_points, level, level_name, streaks...
  - RLS: Completo
  - Status: Intocado

✓ consciousness_points_log
  - Histórico auditável
  - Status: Intocto
```

### Migrar Data (Sem Perda)
```sql
→ user_stats (1 row)
  - Dados: total_xp → total_points
           level → level (limitado a 5)
           streaks → streaks
           last_activity_date → last_moment_date

→ Destination: user_consciousness_stats
  - Resultado: Dados preservados, duplicação eliminada
```

### Manter com Ajustes
```sql
✓ user_achievements
  - Adicionar campo: category ('journey', 'tasks', 'streaks', 'milestones')
  - Manter RLS policies
  - Linkar com CP log via reference_id
```

### Remover (Depois de Deprecação)
```sql
✗ user_stats (DEPOIS DE 6 MESES)
  - Será renomeado para: _deprecated_user_stats_20250612
  - Mantido como arquivo (não no live DB)
  - Deletado após validação e approval
```

---

## RLS Policies

**Status:** Sem mudanças necessárias

```sql
-- user_consciousness_stats
✓ SELECT: Users can view own stats       [CORRETO]
✓ UPDATE: Users can update own stats     [CORRETO]

-- consciousness_points_log
✓ SELECT: Users can view own CP log      [CORRETO - read-only]

-- user_achievements
✓ SELECT: Users can view own achievements [CORRETO]
✓ INSERT: Via service layer only          [CORRETO]
```

---

## Dados Atuais

```sql
-- Production state (2025-12-12)
user_stats:                    1 row (user_id: ?, xp: ?, level: ?)
user_consciousness_stats:      1 row (user_id: ?, points: ?, level: ?)
consciousness_points_log:      1 row (history entry)
user_achievements:             1 row (badge)

-- Conclusion: Low risk, easy migration
```

---

## Timeline Estimada

| Fase | Atividade | Duração | Risco | Aprovação |
|------|-----------|---------|-------|-----------|
| **1** | Data Migration | 30 min | BAIXO | Backend Lead |
| **2** | Code Deprecation | 1 semana | BAIXO | Tech Lead |
| **3** | Monitoring | 2 semanas | BAIXO | Observação |
| **4** | Code Removal | 1 dia | BAIXO | DevOps |
| **5** | Table Cleanup | 1 dia | BAIXO | DevOps |

**Total:** 3 semanas (Phase 1-3 = active)

---

## Checklist Rápido

### Antes de Aprovar
- [ ] Leu a análise completa?
- [ ] Entendeu o plano de 3 fases?
- [ ] Confirmou que dados são non-critical?
- [ ] Consultou o team?

### Antes de Executar
- [ ] Backup de produção?
- [ ] Testado em staging?
- [ ] Comunicou ao team?
- [ ] Janela de manutenção agendada?

### Depois de Migração
- [ ] Validou integridade (seção 4.1)?
- [ ] Monitorou erros?
- [ ] Confirmou que app funciona?

### Depois de Deprecação
- [ ] Removeu código antigo?
- [ ] Atualizou documentação?
- [ ] Feito changelog?

---

## Próximos Passos

### Se Aprovado (RECOMENDADO)
```bash
# Semana 1
→ Execute migration PHASE 1-4
→ Validar dados
→ Monitorar

# Semana 2-3
→ Update src/services/gamificationService.ts (deprecate)
→ Update tests
→ Deploy

# Semana 4+
→ Monitor por 2 semanas
→ Remove old code
→ Archive user_stats
```

### Se Rejeitado
```bash
→ Manter ambos sistemas
→ Documentar qual usar para novas features
→ Revisar consolidação em 3 meses
```

---

## Documentação Relacionada

- **Backend Architecture:** `docs/architecture/backend_architecture.md`
- **Database Schema:** `docs/DATABASE_SCHEMA_NEW_TABLES.sql`
- **Migration Guide:** `docs/MIGRATION_GUIDE_NEW_TABLES.md`
- **Journey Module:** `src/modules/journey/README.md` (if exists)

---

## Perguntas Frequentes

### P: Vai perder dados do user_stats?
**R:** Não. Dados são migrados para user_consciousness_stats. Backup criado.

### P: E se der ruim?
**R:** Rollback procedure disponível. Backup tables estão lá.

### P: Afeta usuários?
**R:** Não. 2 usuários em teste. Mudança invisível (mesmo features).

### P: Quanto tempo leva?
**R:** Phase 1 = 30 min. Phase 2-3 = 2 semanas. Phase 4 = pode esperar 6 meses.

### P: E o código antigo?
**R:** Deprecado na Phase 2, removido na Phase 4 (após 2 releases).

### P: Performance melhora?
**R:** Sim. Menos queries, menos índices, schema mais simples.

---

## Aprovação Necessária

**Para Aprovar, preencha:**

```markdown
- [ ] Aprovo consolidação para Consciousness Points
- [ ] Aprovo timeline (Phase 1 imediatamente, Phase 2-3 semanas depois)
- [ ] Entendo que Phase 4 pode aguardar 6 meses
- [ ] Confirmei com meu time

Comentários/Preocupações:
_________________________________________________
_________________________________________________

Assinado: _________________ Data: __________
```

---

## Contato

Dúvidas sobre esta análise?
- Revise `BE-02_GAMIFICATION_CONSOLIDATION.md` seção correspondente
- Ou contacte: Backend Architect Agent

---

**Documento:** BE-02 - Gamification Consolidation
**Status:** ANÁLISE COMPLETA - AGUARDANDO APROVAÇÃO
**Data:** 2025-12-12
**Versão:** 1.0 (Production Ready)
