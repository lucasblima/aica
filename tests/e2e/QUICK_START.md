# Playwright - Guia Rápido para Desenvolvimento

## 🎯 Comandos Mais Usados

### 1. **Gerar Teste Automaticamente** (CODEGEN)
```bash
# Grava suas interações e gera código
npx playwright codegen http://localhost:3000 --load-storage=tests/e2e/.auth.json

# Com device específico (mobile)
npx playwright codegen http://localhost:3000 --device="iPhone 13"

# Salvando direto em arquivo
npx playwright codegen http://localhost:3000 --target typescript -o tests/e2e/novo-teste.spec.ts
```

**Workflow:**
1. Roda o comando
2. Interage com a aplicação normalmente
3. Copia o código gerado
4. Cola em `tests/e2e/[nome].spec.ts`
5. Ajusta conforme necessário

---

### 2. **Rodar Testes**

```bash
# Todos os testes (headless)
npm run test:e2e

# Com interface visual (RECOMENDADO para desenvolvimento)
npm run test:e2e:ui

# Com browser visível
npm run test:e2e:headed

# Apenas um arquivo
npm run test:e2e tests/e2e/podcast.spec.ts

# Apenas um teste específico (por nome)
npm run test:e2e -g "Open episode wizard"

# Debug mode (passo a passo)
npm run test:e2e:debug tests/e2e/podcast.spec.ts
```

---

### 3. **Debug e Análise**

```bash
# Ver relatório HTML com screenshots
npx playwright show-report

# Debug específico
npx playwright test tests/e2e/podcast.spec.ts:15 --debug

# UI Mode (melhor para debug)
npm run test:e2e:ui
```

---

### 4. **Inspecionar Seletores**

```bash
# Abre página e permite testar seletores interativamente
npx playwright inspector http://localhost:3000
```

---

## 🧪 Padrões de Seletores (Copiar & Colar)

### Seletor por Texto
```typescript
// Encontra por texto exato
await page.getByText('Sal na Veia').click();

// Encontra por texto parcial (regex)
await page.getByText(/Sal na/i).click();

// Encontra primeiro que contém texto
await page.locator('text=Episódio').first().click();
```

### Seletor por Role (Recomendado - Acessível)
```typescript
// Botão
await page.getByRole('button', { name: 'Salvar' }).click();

// Link
await page.getByRole('link', { name: 'Podcast' }).click();

// Dialog/Modal
await expect(page.getByRole('dialog')).toBeVisible();

// Input
await page.getByRole('textbox', { name: 'Título' }).fill('Texto');
```

### Seletor por Label
```typescript
// Campo de formulário
await page.getByLabel('Título').fill('Meu Episódio');
await page.getByLabel(/email/i).fill('teste@example.com');
```

### Seletor por data-testid (Mais Confiável)
```typescript
// Adicionar no componente:
<button data-testid="create-episode-button">Criar</button>

// No teste:
await page.locator('[data-testid="create-episode-button"]').click();
```

### Seletores Combinados (Fallback)
```typescript
// Tenta primeiro seletor, senão segundo, senão terceiro
const button = page.getByRole('button', { name: 'Salvar' })
  .or(page.locator('[data-testid="save-button"]'))
  .or(page.getByText('Salvar'));

await button.click();
```

---

## 📋 Templates Prontos

### Template: Teste de Modal/Wizard
```typescript
test('Open and interact with wizard', async ({ page }) => {
  await page.goto('/sua-pagina');

  // Abrir wizard
  await page.getByRole('button', { name: 'Novo Item' }).click();

  // Verificar que abriu
  await expect(page.getByRole('dialog')).toBeVisible();

  // Preencher formulário
  await page.getByLabel('Título').fill('Teste');
  await page.getByLabel('Descrição').fill('Descrição do teste');

  // Salvar
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Verificar sucesso
  await expect(page.getByText(/sucesso/i)).toBeVisible();

  // Verificar que fechou
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
```

### Template: Teste de Navegação
```typescript
test('Navigate through pages', async ({ page }) => {
  await page.goto('/');

  // Clica no link
  await page.getByRole('link', { name: 'Página' }).click();

  // Verifica URL mudou
  await expect(page).toHaveURL(/\/pagina/);

  // Verifica conteúdo carregou
  await expect(page.getByText('Título da Página')).toBeVisible();
});
```

### Template: Teste de Formulário
```typescript
test('Fill and submit form', async ({ page }) => {
  await page.goto('/formulario');

  // Preencher campos
  await page.getByLabel('Nome').fill('João Silva');
  await page.getByLabel('Email').fill('joao@example.com');
  await page.getByLabel('Senha').fill('senha123');

  // Selecionar dropdown
  await page.getByLabel('País').selectOption('Brasil');

  // Marcar checkbox
  await page.getByLabel('Aceito os termos').check();

  // Submeter
  await page.getByRole('button', { name: 'Cadastrar' }).click();

  // Verificar sucesso
  await expect(page.getByText('Cadastro realizado')).toBeVisible();
});
```

### Template: Teste de Lista com Drag & Drop
```typescript
test('Drag and drop items', async ({ page }) => {
  await page.goto('/tarefas');

  // Pega elemento para arrastar
  const task = page.locator('[data-testid="task-1"]');

  // Pega elemento destino
  const column = page.locator('[data-testid="done-column"]');

  // Drag & drop
  await task.dragTo(column);

  // Verifica que moveu
  await expect(column).toContainText('Minha Tarefa');
});
```

---

## 🎬 Workflow Completo: Do Zero ao Teste

### Cenário: Testar Fluxo de Criar Episódio no Podcast

```bash
# 1. Gerar teste automaticamente
npx playwright codegen http://localhost:3000 --load-storage=tests/e2e/.auth.json

# 2. No browser que abre:
#    - Navega para /podcast
#    - Clica em "Sal na Veia"
#    - Clica em "Novo Episódio"
#    - Preenche formulário
#    - Clica em "Salvar"
#    - Verifica mensagem de sucesso

# 3. Copia código gerado para tests/e2e/podcast.spec.ts

# 4. Ajusta seletores para usar data-testid
#    (adiciona data-testid nos componentes se necessário)

# 5. Roda teste com UI mode
npm run test:e2e:ui

# 6. Se falhar, clica no teste para ver screenshot e trace

# 7. Ajusta código conforme necessário

# 8. Commita teste
git add tests/e2e/podcast.spec.ts
git commit -m "test: Add episode creation E2E test"
```

---

## 🤖 Como Usar com Agentes de IA

### Fluxo Recomendado:

1. **Grave o fluxo manualmente:**
   ```bash
   npx playwright codegen http://localhost:3000 --load-storage=tests/e2e/.auth.json
   ```

2. **Salve o teste gerado**

3. **Use como especificação para IA:**
   ```
   Prompt: "Implemente o componente de criação de episódio.
           Aqui está o teste E2E que deve passar:

           [Cola código do teste]

           Implemente os componentes necessários para que este teste passe."
   ```

4. **IA implementa baseada no teste**

5. **Valida rodando o teste:**
   ```bash
   npm run test:e2e:headed tests/e2e/podcast.spec.ts
   ```

6. **Itera até teste passar**

---

## 🔧 Dicas Práticas

### Adicionar data-testid nos Componentes
```tsx
// ✅ Recomendado - Facilita muito os testes
<button data-testid="create-episode-button" onClick={handleCreate}>
  Criar Episódio
</button>

<div data-testid="episode-wizard" className="modal">
  {/* conteúdo */}
</div>

<input data-testid="episode-title-input" type="text" />
```

### Esperar Elementos Dinamicamente
```typescript
// Espera até 10 segundos
await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 10000 });

// Espera desaparecer
await expect(page.getByText('Carregando...')).not.toBeVisible();

// Espera network request completar
await page.waitForResponse(resp => resp.url().includes('/api/episodes'));
```

### Debug Print no Teste
```typescript
// Imprime HTML da página
console.log(await page.content());

// Imprime texto visível
console.log(await page.textContent('body'));

// Tira screenshot manual
await page.screenshot({ path: 'debug.png' });

// Pausa execução para inspecionar
await page.pause();
```

---

## 📊 Comandos de Relatório

```bash
# Ver último report
npx playwright show-report

# Report de teste específico
npx playwright show-report playwright-report/

# Ver trace de teste que falhou
npx playwright show-trace test-results/[test-name]/trace.zip
```

---

## ⚡ Atalhos do UI Mode

Quando rodar `npm run test:e2e:ui`:

- **Pick Locator** 🎯 - Clica em elemento na página → mostra seletor
- **Record** 🔴 - Grava novas ações
- **Step through** ⏭️ - Executa passo a passo
- **Resume** ▶️ - Continua execução
- **Show browser** 👁️ - Mostra/esconde browser

---

## 🎓 Recursos Adicionais

- [Playwright Docs](https://playwright.dev)
- [Locator Cheatsheet](https://playwright.dev/docs/locators)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

## 💡 Exemplo Real: Podcast Wizard

Já criei `tests/e2e/podcast.spec.ts` com testes prontos:
- Navegação para podcast
- Abrir "Sal na Veia"
- Abrir wizard de episódio
- Criar novo episódio
- Editar episódio
- Fechar wizard

Execute:
```bash
npm run test:e2e:headed tests/e2e/podcast.spec.ts
```

Isso vai rodar os testes e você verá exatamente onde falham (se falharem).
Use os screenshots para identificar o que precisa ser ajustado nos seletores.
