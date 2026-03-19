# Prompt para Reviewer A: Analise de Workflow e Consistencia

Cole este prompt em um novo chat Claude Code no projeto AICA.

---

## Sua Missao

Voce e um **reviewer de workflow**. Analise todos os arquivos de regras do Claude Code no projeto AICA e avalie se o workflow esta consistente, completo e sem gaps.

## O que Fazer

1. Leia TODOS os arquivos abaixo (use Read tool):
   - `CLAUDE.md`
   - `.claude/rules/session-protocol.md`
   - `.claude/rules/clarification-first.md`
   - `.claude/rules/agent-teams.md`
   - `.claude/rules/code-patterns.md`
   - `.claude/rules/security.md`
   - `.claude/rules/database.md`
   - `.claude/rules/deploy-pipeline.md`
   - `.claude/rules/architecture.md`
   - `.claude/rules/environments.md`
   - `.claude/rules/design-system.md`
   - `.claude/rules/ai-integration.md`
   - `.claude/rules/whatsapp.md`
   - `.claude/rules/domain-driven-design.md`
   - `.claude/rules/project-structure.md`
   - `.claude/settings.json`
   - `.claude/settings.local.json`

2. Para cada arquivo, avalie de 1 a 10 nos seguintes criterios:
   - **Consistencia**: O workflow descrito neste arquivo e consistente com CLAUDE.md e os outros arquivos?
   - **Completude**: Falta algo importante? Ha gaps no conteudo?
   - **Clareza**: As instrucoes sao claras e sem ambiguidade?
   - **Praticidade**: As instrucoes sao praticas e aplicaveis, ou sao teoricas demais?
   - **Integracao de Superpowers**: Os superpowers estao referenciados nos pontos corretos?

3. Identifique especificamente:
   - Contradicoes entre arquivos (ex: workflow em CLAUDE.md diz X, session-protocol diz Y)
   - Steps do workflow que existem em um arquivo mas faltam em outro
   - Superpowers que deveriam estar referenciados mas nao estao
   - Instrucoes que sao vagas demais ou especificas demais
   - Redundancias desnecessarias que poderiam ser eliminadas

4. Verifique se o workflow de 11 steps e consistente em TODOS os arquivos:
   ```
   Name -> Clarify -> Ask Team -> Brainstorm -> Plan -> Worktree -> TDD/Execute -> Verify -> Review -> Finish -> PR
   ```

5. Verifique se os hooks em `settings.json` estao alinhados com as regras

## Formato do Output

Para cada arquivo, use este formato:

```
### [nome-do-arquivo] — [nota/10]

**Consistencia:** X/10 — [explicacao breve]
**Completude:** X/10 — [explicacao breve]
**Clareza:** X/10 — [explicacao breve]
**Praticidade:** X/10 — [explicacao breve]
**Superpowers:** X/10 — [explicacao breve]

**Issues encontradas:**
1. [issue especifica com localizacao exata]
2. [outra issue]

**Sugestao de melhoria:**
- [melhoria concreta, com texto sugerido se possivel]
```

Ao final, faca um resumo com:
- Top 5 issues mais criticas
- Sugestoes de melhoria priorizadas
- Nota geral do sistema de regras

**IMPORTANTE:** Seja critico. O objetivo e chegar a 10/10 em todos os arquivos. Nao elogie — aponte problemas.
