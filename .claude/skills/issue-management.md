# Issue Management Skill

Skill para gerenciamento de issues no GitHub, incluindo templates, labels, milestones, workflow de PR e automações.

---

## Quando Usar Esta Skill

Use quando precisar:
- Criar e organizar issues eficientemente
- Configurar labels e milestones
- Gerenciar workflow de Pull Requests
- Configurar automações do GitHub

---

## Templates de Issues

### Configuração de Issue Templates

```yaml
# .github/ISSUE_TEMPLATE/config.yml

blank_issues_enabled: false
contact_links:
  - name: 💬 Discussões
    url: https://github.com/org/repo/discussions
    about: Perguntas e discussões gerais
  - name: 📖 Documentação
    url: https://docs.exemplo.com
    about: Consulte a documentação
```

### Bug Report Template

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml

name: 🐛 Bug Report
description: Reportar um bug ou comportamento inesperado
title: "[Bug]: "
labels: ["bug", "triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Obrigado por reportar este bug! Por favor, preencha as informações abaixo.

  - type: textarea
    id: description
    attributes:
      label: Descrição do Bug
      description: Descrição clara e concisa do bug
      placeholder: O que aconteceu?
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Passos para Reproduzir
      description: Passos para reproduzir o comportamento
      placeholder: |
        1. Vá para '...'
        2. Clique em '...'
        3. Veja o erro
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Comportamento Esperado
      description: O que deveria acontecer?
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Comportamento Atual
      description: O que está acontecendo?
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severidade
      options:
        - Crítico (app não funciona)
        - Alto (feature principal quebrada)
        - Médio (feature secundária quebrada)
        - Baixo (inconveniência menor)
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Ambiente
      description: Informações sobre o ambiente
      placeholder: |
        - OS: macOS 14.0
        - Browser: Chrome 120
        - Versão: 1.2.3
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Logs/Screenshots
      description: Cole logs ou screenshots relevantes
      render: shell

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: Verifiquei que não existe issue duplicada
          required: true
        - label: Testei na versão mais recente
          required: true
```

### Feature Request Template

```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml

name: ✨ Feature Request
description: Sugerir nova funcionalidade
title: "[Feature]: "
labels: ["enhancement", "triage"]

body:
  - type: textarea
    id: problem
    attributes:
      label: Problema
      description: Qual problema esta feature resolve?
      placeholder: É frustrante quando...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Solução Proposta
      description: Como você gostaria que funcionasse?
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternativas Consideradas
      description: Outras soluções que você considerou

  - type: dropdown
    id: priority
    attributes:
      label: Prioridade Sugerida
      options:
        - Alta (impacta muitos usuários)
        - Média (melhoria significativa)
        - Baixa (nice to have)

  - type: textarea
    id: context
    attributes:
      label: Contexto Adicional
      description: Mockups, exemplos, referências

  - type: checkboxes
    id: contribution
    attributes:
      label: Contribuição
      options:
        - label: Estou disposto a implementar esta feature
```

### Task/Chore Template

```yaml
# .github/ISSUE_TEMPLATE/task.yml

name: 📋 Task
description: Tarefa de desenvolvimento ou manutenção
title: "[Task]: "
labels: ["task"]

body:
  - type: textarea
    id: description
    attributes:
      label: Descrição
      description: O que precisa ser feito?
    validations:
      required: true

  - type: textarea
    id: acceptance
    attributes:
      label: Critérios de Aceitação
      description: Como sabemos que está pronto?
      placeholder: |
        - [ ] Critério 1
        - [ ] Critério 2
    validations:
      required: true

  - type: textarea
    id: technical
    attributes:
      label: Detalhes Técnicos
      description: Arquivos, APIs, dependências envolvidas

  - type: dropdown
    id: effort
    attributes:
      label: Esforço Estimado
      options:
        - XS (< 1 hora)
        - S (1-4 horas)
        - M (1-2 dias)
        - L (3-5 dias)
        - XL (1+ semana)
```

---

## Sistema de Labels

### Labels Padrão

```yaml
# Criar via GitHub CLI ou API

# Tipo
- name: bug
  color: d73a4a
  description: Algo não está funcionando

- name: enhancement
  color: a2eeef
  description: Nova feature ou melhoria

- name: documentation
  color: 0075ca
  description: Melhorias na documentação

- name: task
  color: 7057ff
  description: Tarefa de desenvolvimento

- name: refactor
  color: fbca04
  description: Melhoria de código sem mudança de comportamento

# Prioridade
- name: priority:critical
  color: b60205
  description: Deve ser resolvido imediatamente

- name: priority:high
  color: d93f0b
  description: Deve ser resolvido logo

- name: priority:medium
  color: fbca04
  description: Resolução planejada

- name: priority:low
  color: 0e8a16
  description: Quando houver tempo

# Status
- name: triage
  color: ededed
  description: Precisa de análise

- name: in-progress
  color: 0052cc
  description: Sendo trabalhado

- name: blocked
  color: b60205
  description: Bloqueado por dependência

- name: ready-for-review
  color: 0e8a16
  description: Pronto para revisão

# Área
- name: area:frontend
  color: 1d76db
  description: Frontend React

- name: area:backend
  color: 5319e7
  description: Backend/API

- name: area:infra
  color: 006b75
  description: Infraestrutura/DevOps

- name: area:auth
  color: e99695
  description: Autenticação

# Outros
- name: good-first-issue
  color: 7057ff
  description: Bom para iniciantes

- name: help-wanted
  color: 008672
  description: Precisa de ajuda

- name: wontfix
  color: ffffff
  description: Não será implementado

- name: duplicate
  color: cfd3d7
  description: Issue duplicada
```

### Criar Labels via CLI

```bash
# Instalar GitHub CLI
brew install gh

# Autenticar
gh auth login

# Criar label
gh label create "bug" --color "d73a4a" --description "Algo não está funcionando"

# Criar múltiplas labels via script
labels=(
  "bug,d73a4a,Algo não está funcionando"
  "enhancement,a2eeef,Nova feature ou melhoria"
  "documentation,0075ca,Melhorias na documentação"
)

for label in "${labels[@]}"; do
  IFS=',' read -r name color desc <<< "$label"
  gh label create "$name" --color "$color" --description "$desc"
done
```

---

## Milestones

### Estrutura de Milestones

```markdown
## Por Versão
- v1.0.0 - MVP
- v1.1.0 - Google Calendar Integration
- v1.2.0 - AI Features
- v2.0.0 - Major Redesign

## Por Sprint
- Sprint 2026-01 (Jan 1-15)
- Sprint 2026-02 (Jan 16-31)
- Sprint 2026-03 (Feb 1-15)

## Por Quarter
- Q1 2026
- Q2 2026
```

### Criar Milestones via CLI

```bash
# Criar milestone
gh api repos/{owner}/{repo}/milestones \
  -f title="v1.1.0" \
  -f description="Google Calendar Integration" \
  -f due_on="2026-01-31T23:59:59Z"

# Listar milestones
gh api repos/{owner}/{repo}/milestones

# Associar issue a milestone
gh issue edit 123 --milestone "v1.1.0"
```

---

## Workflow de Pull Request

### PR Template

```markdown
<!-- .github/pull_request_template.md -->

## Descrição

<!-- Descreva as mudanças brevemente -->

## Tipo de Mudança

- [ ] 🐛 Bug fix
- [ ] ✨ Nova feature
- [ ] 📝 Documentação
- [ ] ♻️ Refatoração
- [ ] 🎨 Estilo/UI
- [ ] ⚡ Performance
- [ ] 🧪 Testes
- [ ] 🔧 Configuração

## Issue Relacionada

Closes #

## Screenshots (se aplicável)

| Antes | Depois |
|-------|--------|
| img   | img    |

## Checklist

- [ ] Meu código segue os padrões do projeto
- [ ] Fiz self-review do meu código
- [ ] Comentei código complexo
- [ ] Atualizei documentação relevante
- [ ] Minhas mudanças não geram warnings
- [ ] Adicionei testes que cobrem minhas mudanças
- [ ] Testes novos e existentes passam localmente

## Notas para Revisores

<!-- Informações úteis para quem vai revisar -->
```

### Branch Naming Convention

```markdown
## Formato
<type>/<issue-number>-<short-description>

## Types
- feature/  - Nova funcionalidade
- fix/      - Correção de bug
- hotfix/   - Correção urgente em produção
- refactor/ - Refatoração
- docs/     - Documentação
- test/     - Testes
- chore/    - Manutenção

## Exemplos
feature/123-google-calendar-sync
fix/456-auth-redirect-loop
hotfix/789-critical-crash
docs/101-readme-update
```

### Workflow de Review

```markdown
## Processo de Review

### 1. Autor cria PR
- Preenche template completo
- Adiciona labels apropriadas
- Solicita reviewers
- Liga a issue relacionada

### 2. CI/CD Verifica
- Lint passa
- Testes passam
- Build funciona
- Preview deploy (se configurado)

### 3. Reviewer analisa
- Código correto e limpo
- Testes adequados
- Documentação atualizada
- Sem vulnerabilidades

### 4. Feedback Loop
- Autor endereça comentários
- Re-request review
- Aprovação final

### 5. Merge
- Squash and merge (preferido)
- Delete branch após merge
- Issue automaticamente fechada
```

---

## GitHub Actions Automations

### Auto-labeler

```yaml
# .github/workflows/labeler.yml

name: Pull Request Labeler

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v4
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

```yaml
# .github/labeler.yml

area:frontend:
  - 'src/components/**'
  - 'src/pages/**'
  - '*.tsx'

area:backend:
  - 'supabase/**'
  - 'src/services/**'

documentation:
  - 'docs/**'
  - '*.md'

tests:
  - 'tests/**'
  - '**/*.test.ts'
```

### Stale Issues

```yaml
# .github/workflows/stale.yml

name: Close Stale Issues

on:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v8
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          stale-issue-message: >
            Esta issue está inativa há 30 dias.
            Será fechada em 7 dias se não houver atividade.
          stale-pr-message: >
            Este PR está inativo há 14 dias.
            Será fechado em 7 dias se não houver atividade.
          stale-issue-label: stale
          stale-pr-label: stale
          days-before-issue-stale: 30
          days-before-pr-stale: 14
          days-before-close: 7
          exempt-issue-labels: 'pinned,security,blocked'
```

### Auto-assign

```yaml
# .github/workflows/auto-assign.yml

name: Auto Assign

on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]

jobs:
  assign:
    runs-on: ubuntu-latest
    steps:
      - uses: pozil/auto-assign-issue@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          assignees: maintainer1,maintainer2
          numOfAssignee: 1
```

### Welcome Bot

```yaml
# .github/workflows/welcome.yml

name: Welcome New Contributors

on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]

jobs:
  welcome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/first-interaction@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          issue-message: |
            👋 Obrigado por abrir sua primeira issue!
            Nossa equipe vai analisar em breve.
          pr-message: |
            🎉 Obrigado pela sua primeira contribuição!
            Vamos revisar seu PR em breve.
```

---

## GitHub CLI Commands

### Gerenciamento de Issues

```bash
# Criar issue
gh issue create --title "Bug: ..." --body "Descrição" --label bug

# Criar com template
gh issue create --template bug_report.yml

# Listar issues
gh issue list
gh issue list --label bug --state open

# Ver issue
gh issue view 123

# Editar issue
gh issue edit 123 --add-label "priority:high"
gh issue edit 123 --milestone "v1.1.0"
gh issue edit 123 --add-assignee @username

# Fechar issue
gh issue close 123

# Reabrir issue
gh issue reopen 123
```

### Gerenciamento de PRs

```bash
# Criar PR
gh pr create --title "Feature: ..." --body "Descrição"

# Criar PR interativo
gh pr create

# Listar PRs
gh pr list
gh pr list --state open --author @me

# Ver PR
gh pr view 123

# Checkout de PR
gh pr checkout 123

# Aprovar PR
gh pr review 123 --approve

# Solicitar mudanças
gh pr review 123 --request-changes --body "Comentário"

# Merge PR
gh pr merge 123 --squash --delete-branch
```

### Automações com gh

```bash
# Fechar issues duplicadas
gh issue close 456 --comment "Duplicada de #123"

# Mover issues entre projetos
gh issue edit 123 --add-project "Kanban"

# Bulk operations
gh issue list --label "wontfix" --json number \
  | jq -r '.[].number' \
  | xargs -I {} gh issue close {}
```

---

## Checklist de Configuração

```markdown
## Setup Inicial

- [ ] Issue templates configurados
- [ ] PR template configurado
- [ ] Labels criadas
- [ ] Milestones definidas
- [ ] Branch protection rules
- [ ] Required reviewers
- [ ] GitHub Actions básicos

## Automações

- [ ] Auto-labeler
- [ ] Stale issues
- [ ] Welcome bot
- [ ] CI/CD pipeline
- [ ] Deploy previews

## Documentação

- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md
- [ ] SECURITY.md
- [ ] CODEOWNERS
```

---

## Links Úteis

- [GitHub Issues Documentation](https://docs.github.com/en/issues)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Probot Apps](https://probot.github.io/apps/)
- [GitHub Marketplace](https://github.com/marketplace)
