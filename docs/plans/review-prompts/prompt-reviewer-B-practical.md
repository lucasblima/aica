# Prompt para Reviewer B: Teste Pratico e Stress Test

Cole este prompt em um novo chat Claude Code no projeto AICA.

---

## Sua Missao

Voce e um **tester pratico**. Simule mentalmente cenarios reais de uso do Claude Code no projeto AICA e identifique onde as regras falham, sao ambiguas ou geram fricao desnecessaria.

## O que Fazer

1. Leia TODOS os arquivos de regras:
   - `CLAUDE.md`
   - Todos os `.claude/rules/*.md`
   - `.claude/settings.json`

2. Simule estes 6 cenarios e identifique onde as regras quebram:

### Cenario 1: Bug Simples
> "Tem um typo no botao de login, troca 'Entrar' por 'Acessar'"
- O workflow de 11 steps faz sentido aqui? Ou gera overhead?
- Clarificacao e necessaria? Brainstorming?
- O que deveria acontecer vs o que as regras dizem?

### Cenario 2: Feature Nova Cross-Module
> "Quero um dashboard que mostra o Life Score com dados de todos os modulos"
- O workflow completo se aplica? Todos os 11 steps?
- Agent Team faz sentido? Qual composicao?
- Onde TDD se aplica? E brainstorming?
- O DDD rule ajuda ou atrapalha?

### Cenario 3: Bug Complexo em Producao
> "O login esta dando loop infinito em producao, usuarios nao conseguem acessar"
- O workflow permite acao rapida?
- systematic-debugging e pratico para emergencia?
- Faz sentido exigir brainstorming/plan para um hotfix?

### Cenario 4: Refactoring de Modulo
> "Refatora o modulo Finance para usar o novo design system Ceramic"
- Como agent-teams se aplica?
- TDD faz sentido para refactoring visual?
- Verification pattern e adequado?

### Cenario 5: Sessao de Investigacao
> "Investiga por que as Edge Functions estao lentas"
- O workflow de 11 steps se aplica para research?
- Precisa de worktree? PR?
- Como systematic-debugging se integra?

### Cenario 6: Multi-Sessao com Handoff
> "Comecei uma feature ontem em outro chat, continua de onde parei"
- As regras cobrem continuidade entre sessoes?
- Como encontrar o worktree/branch anterior?
- O session-protocol cobre este caso?

3. Para cada cenario, avalie:
   - As regras guiam corretamente? (sim/nao/parcialmente)
   - Ha fricao desnecessaria? (steps que deveriam ser pulados)
   - Ha gaps? (situacoes nao cobertas)
   - Ha contradicoes? (regras que conflitam entre si)

4. Faca uma analise de **overhead vs valor**:
   - Quais steps do workflow sao high-value em TODOS os cenarios?
   - Quais steps sao high-value apenas em cenarios complexos?
   - Quais steps geram overhead sem valor proporcional?

## Formato do Output

Para cada cenario:

```
### Cenario N: [titulo]

**Fluxo ideal:** [lista dos steps que fazem sentido]
**Fluxo pelas regras atuais:** [lista dos steps que as regras exigem]
**Gap/Fricao:** [onde divergem]
**Issues:**
1. [issue especifica]
2. [outra issue]
**Fix sugerido:** [mudanca concreta nas regras]
```

Ao final:

```
## Matriz de Valor dos Steps

| Step | Bug Simples | Feature | Hotfix | Refactor | Research | Handoff |
|------|------------|---------|--------|----------|----------|---------|
| Name | valor/overhead | ... | ... | ... | ... | ... |
| ...  | ... | ... | ... | ... | ... | ... |

## Top 5 Melhorias Praticas
1. [melhoria com maior impacto]
...
```

**IMPORTANTE:** Seja pratico. O objetivo e que as regras funcionem no dia-a-dia, nao apenas na teoria. Identifique onde as regras atrapalham em vez de ajudar.
