# Comandos Rápidos - Testes E2E Journey & Grants

Guia de referência rápida para executar os novos testes E2E.

---

## 🚀 Execução Básica

### Todos os Novos Testes (Journey + Grants)

```bash
# Modo headed (navegador visível) - RECOMENDADO
npm run test:e2e:headed journey-moment-capture grants-full-workflow

# Modo headless (sem navegador)
npm run test:e2e journey-moment-capture grants-full-workflow

# Modo UI interativo
npm run test:e2e:ui
```

---

## 🎯 Journey - Comandos Específicos

### Todos os Testes do Journey

```bash
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts
```

### Por Test Suite

```bash
# Apenas testes de captura de momento
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts -g "Moment Capture Flow"

# Apenas testes de CP (Consciousness Points)
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts -g "Consciousness Points"
```

### Testes Individuais

```bash
# Teste de navegação
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts -g "Test 1.1"

# Teste de criação de momento
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts -g "Test 1.3"

# Teste de análise de IA
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts -g "Test 1.4"

# Teste de incremento de CP
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts -g "Test 2.3"
```

---

## 🏆 Grants - Comandos Específicos

### Todos os Testes do Grants

```bash
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts
```

### Por Test Suite

```bash
# Navegação e dashboard
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Navigation and Dashboard"

# Wizard de edital
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Wizard"

# Gerenciamento de projetos
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Project Management"

# Briefing e geração
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Briefing and Proposal"
```

### Testes Individuais

```bash
# Teste de navegação
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Test 1.1"

# Teste de wizard
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Test 2.1"

# Teste de criação de projeto
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Test 3.3"

# Teste de geração de IA
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts -g "Test 4.4"
```

---

## 🐛 Debug e Troubleshooting

### Modo Debug (Step-by-Step)

```bash
# Journey
npm run test:e2e:debug tests/e2e/journey-moment-capture.spec.ts

# Grants
npm run test:e2e:debug tests/e2e/grants-full-workflow.spec.ts

# Teste específico
npm run test:e2e:debug tests/e2e/journey-moment-capture.spec.ts -g "Test 1.3"
```

### Playwright Inspector

```bash
# Abre inspector para análise detalhada
npx playwright test tests/e2e/journey-moment-capture.spec.ts --debug
```

### Gerar Seletores Automaticamente

```bash
# Abre codegen para criar seletores
npx playwright codegen http://localhost:5173
```

---

## 📊 Relatórios

### Ver Relatório HTML

```bash
# Gerar e abrir relatório
npx playwright show-report
```

### Relatório em Arquivo

```bash
# Relatório fica em:
# playwright-report/index.html
```

---

## 🔧 Configuração e Setup

### Verificar Variáveis de Ambiente

```bash
# Ver variáveis de teste
cat .env | grep TEST_

# Verificar Supabase
cat .env | grep VITE_SUPABASE
```

### Re-executar Setup de Autenticação

```bash
npm run test:e2e tests/e2e/auth.setup.ts
```

### Verificar Arquivo de Auth

```bash
ls -la tests/e2e/.auth.json
cat tests/e2e/.auth.json
```

---

## 📦 Executar com Diferentes Browsers

### Chromium (padrão)

```bash
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts
```

### Firefox

```bash
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts --project=firefox
```

### Ambos

```bash
npm run test:e2e tests/e2e/journey-moment-capture.spec.ts
# Executa em chromium e firefox
```

---

## 🎬 Workflows Completos

### Primeira Execução (Setup Completo)

```bash
# 1. Verificar .env
cat .env | grep TEST_

# 2. Iniciar aplicação
npm run dev

# 3. Executar autenticação (em outra janela)
npm run test:e2e tests/e2e/auth.setup.ts

# 4. Executar testes com navegador visível
npm run test:e2e:headed journey-moment-capture grants-full-workflow

# 5. Ver relatório
npx playwright show-report
```

### Execução Rápida (Já Configurado)

```bash
# 1. Aplicação deve estar rodando (npm run dev)

# 2. Executar testes
npm run test:e2e journey-moment-capture grants-full-workflow

# 3. Ver relatório se houver falhas
npx playwright show-report
```

### Debug de Teste Falhando

```bash
# 1. Executar teste específico em modo headed
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts -g "Test 1.3"

# 2. Se ainda falhar, executar em debug
npm run test:e2e:debug tests/e2e/journey-moment-capture.spec.ts -g "Test 1.3"

# 3. Ver screenshot do erro
npx playwright show-report
# Clicar no teste falhado → Ver screenshot e vídeo
```

---

## 📝 Atalhos Úteis

### Executar Testes Modificados Recentemente

```bash
# Lista arquivos .spec.ts modificados recentemente
ls -lt tests/e2e/*.spec.ts | head -5

# Executar o mais recente
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts
```

### Watch Mode (Re-executa ao Salvar)

```bash
# Não suportado nativamente, use UI mode:
npm run test:e2e:ui
# Marque "Watch all" no canto superior direito
```

### Executar em Paralelo (Cuidado)

```bash
# NÃO RECOMENDADO (pode causar race conditions)
# Mas se necessário:
npx playwright test journey-moment-capture grants-full-workflow --workers=2
```

---

## 🚦 Status Checks Rápidos

### Verificar se App Está Rodando

```bash
curl http://localhost:5173
# Deve retornar HTML, não erro
```

### Verificar se Auth Está Configurada

```bash
test -f tests/e2e/.auth.json && echo "Auth OK" || echo "Auth faltando"
```

### Contar Testes Disponíveis

```bash
# Journey
grep -c "^  test(" tests/e2e/journey-moment-capture.spec.ts
# Deve retornar: 12

# Grants
grep -c "^  test(" tests/e2e/grants-full-workflow.spec.ts
# Deve retornar: 13
```

---

## 💡 Dicas de Produtividade

### Alias Úteis (Adicionar ao ~/.bashrc ou ~/.zshrc)

```bash
# Atalhos para testes E2E
alias e2e="npm run test:e2e"
alias e2e:h="npm run test:e2e:headed"
alias e2e:d="npm run test:e2e:debug"
alias e2e:ui="npm run test:e2e:ui"
alias e2e:report="npx playwright show-report"

# Testes específicos
alias e2e:journey="npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts"
alias e2e:grants="npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts"
alias e2e:new="npm run test:e2e:headed journey-moment-capture grants-full-workflow"

# Uso:
# e2e:journey
# e2e:grants -g "Test 3.3"
```

### VS Code Tasks (Adicionar a .vscode/tasks.json)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "E2E: Journey (Headed)",
      "type": "shell",
      "command": "npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts",
      "problemMatcher": []
    },
    {
      "label": "E2E: Grants (Headed)",
      "type": "shell",
      "command": "npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts",
      "problemMatcher": []
    },
    {
      "label": "E2E: Show Report",
      "type": "shell",
      "command": "npx playwright show-report",
      "problemMatcher": []
    }
  ]
}
```

---

## 📚 Documentação Relacionada

- **Guia Completo:** [NEW_TESTS_GUIDE.md](./NEW_TESTS_GUIDE.md)
- **Resumo de Implementação:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **README Geral:** [README.md](./README.md)
- **Playwright Docs:** https://playwright.dev

---

## ⚡ Comandos Copy-Paste Prontos

```bash
# Setup inicial
npm run test:e2e tests/e2e/auth.setup.ts

# Executar todos os novos testes
npm run test:e2e:headed journey-moment-capture grants-full-workflow

# Journey completo
npm run test:e2e:headed tests/e2e/journey-moment-capture.spec.ts

# Grants completo
npm run test:e2e:headed tests/e2e/grants-full-workflow.spec.ts

# Debug de teste específico
npm run test:e2e:debug tests/e2e/journey-moment-capture.spec.ts -g "Test 1.3"

# Ver relatório
npx playwright show-report

# Gerar seletores
npx playwright codegen http://localhost:5173
```

---

**Última atualização:** 10/12/2025
**Versão:** 1.0
