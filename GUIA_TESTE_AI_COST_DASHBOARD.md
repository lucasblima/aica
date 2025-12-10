# 🎯 Guia de Teste - AI Cost Dashboard

Este guia orienta o teste completo do Dashboard de Custos de IA.

---

## ✅ Passo 1: Aplicar Migration no Supabase

### 1.1 Acessar o Supabase SQL Editor
1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto (Aica)
3. Clique em **SQL Editor** no menu lateral
4. Clique em **New Query**

### 1.2 Executar a Migration
1. Abra o arquivo: `supabase/migrations/EXECUTE_AI_BUDGET_MIGRATION.sql`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole** no SQL Editor do Supabase
4. Clique em **Run** (ou pressione `Ctrl+Enter`)
5. ✅ Aguarde a mensagem de sucesso

### 1.3 Verificar se funcionou
Execute esta query no SQL Editor:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_ai_budget', 'get_budget_alert_level');
```

**Resultado esperado:** Deve retornar 2 linhas mostrando as duas funções.

---

## 📊 Passo 2 (Opcional): Criar Dados de Teste

### 2.1 Obter seu User ID
Execute no SQL Editor:
```sql
SELECT id, email FROM auth.users WHERE email = 'seu-email@aqui.com';
```
**⚠️ IMPORTANTE:** Copie o UUID que aparecer (seu `id`).

### 2.2 Popular Dados de Teste
1. Abra o arquivo: `supabase/migrations/TEST_DATA_ai_usage_analytics.sql`
2. **Encontre a linha 13:** `v_user_id UUID := 'YOUR_USER_ID_HERE';`
3. **Substitua** `'YOUR_USER_ID_HERE'` pelo UUID que você copiou
4. Exemplo: `v_user_id UUID := '123e4567-e89b-12d3-a456-426614174000';`
5. **Copie TODO o conteúdo** do arquivo editado
6. **Cole** no SQL Editor do Supabase
7. Clique em **Run**

### 2.3 Verificar dados criados
```sql
SELECT COUNT(*) as total_records
FROM ai_usage_analytics
WHERE user_id = 'SEU_USER_ID_AQUI';
```

**Resultado esperado:** Deve retornar ~90-100 registros.

---

## 🖥️ Passo 3: Testar o Dashboard no Frontend

### 3.1 Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

O servidor deve iniciar em `http://localhost:3000` (ou outra porta disponível).

### 3.2 Fazer Login
1. Acesse `http://localhost:3000`
2. Faça login com suas credenciais

### 3.3 Navegar para o Dashboard
1. Clique no ícone de **Settings** (engrenagem ⚙️) no canto superior direito
2. Clique em **"Custos de IA"** no menu dropdown
3. ✅ O dashboard deve carregar

---

## ✅ Checklist de Testes

### Teste 1: Dashboard Carrega
- [ ] Dashboard aparece sem erros
- [ ] Nenhum erro no console do navegador (F12)
- [ ] Todos os componentes são visíveis

### Teste 2: Monthly Cost Card
- [ ] Mostra "Custo do Mês Atual"
- [ ] Mostra "Orçamento" (inicialmente $0.00)
- [ ] Mostra barra de progresso
- [ ] Mostra "Dias Restantes"
- [ ] Mostra "Projeção Fim do Mês"
- [ ] Mostra "Disponível"

### Teste 3: Cost Trend Chart (Gráfico de Linha)
- [ ] Gráfico de linha aparece
- [ ] Mostra últimos 30 dias
- [ ] Labels de data no eixo X
- [ ] Labels de custo no eixo Y
- [ ] Linha conecta os pontos
- [ ] Área sob a linha tem gradiente

### Teste 4: Operation Breakdown (Gráfico de Rosca)
- [ ] Gráfico de rosca aparece
- [ ] Mostra diferentes cores por operação
- [ ] Lista de legendas com labels
- [ ] Valores em USD ao lado de cada label

### Teste 5: Model Breakdown (Gráfico de Barras)
- [ ] Gráfico de barras horizontal aparece
- [ ] Diferentes cores por modelo
- [ ] Labels dos modelos visíveis
- [ ] Valores em USD visíveis

### Teste 6: Top 5 Operations (Tabela)
- [ ] Tabela aparece
- [ ] Headers: Operação, Modelo, Custo, Módulo, Data
- [ ] Até 5 linhas de dados
- [ ] Valores formatados corretamente
- [ ] Ordenado por custo (maior → menor)

### Teste 7: Budget Settings Modal
1. Clique no botão **"Orçamento"** no header
- [ ] Modal abre
- [ ] Input numérico visível
- [ ] 4 botões de sugestão ($10, $25, $50, $100)
- [ ] Botões "Cancelar" e "Salvar"

2. Teste o input:
- [ ] Digite um valor (ex: 50)
- [ ] Clique em "Salvar"
- [ ] Modal fecha
- [ ] Dashboard recarrega com novo orçamento
- [ ] Monthly Cost Card mostra o novo orçamento

3. Teste as sugestões:
- [ ] Clique em um botão de sugestão (ex: $50)
- [ ] Input preenche automaticamente
- [ ] Salve e verifique

### Teste 8: Budget Alerts
Configure um orçamento baixo para testar alertas:

1. Defina orçamento = $10.00
2. Com ~$12-15 de custo nos dados de teste:
- [ ] Banner de alerta aparece no topo
- [ ] Cor do banner é vermelho (>100%)
- [ ] Mensagem indica "Orçamento excedido"

### Teste 9: Refresh Button
- [ ] Clique no botão "Atualizar" (ícone de refresh)
- [ ] Ícone gira durante loading
- [ ] Dados recarregam

### Teste 10: Back Button
- [ ] Clique no botão "Voltar" (seta)
- [ ] Retorna para a tela principal (Minha Vida)

---

## 📱 Teste de Responsividade

### Desktop (>1024px)
- [ ] Todos os componentes visíveis
- [ ] Charts lado a lado
- [ ] Tabela com todas as colunas

### Tablet (768px - 1024px)
- [ ] Layout se ajusta
- [ ] Charts empilhados
- [ ] Tabela responsiva

### Mobile (<768px)
- [ ] Scroll vertical funciona
- [ ] Charts redimensionados
- [ ] Tabela oculta colunas menos importantes
- [ ] Botões acessíveis

**Como testar:**
1. Abra DevTools (F12)
2. Clique no ícone de dispositivo móvel (Ctrl+Shift+M)
3. Teste diferentes resoluções

---

## 🔍 Teste de Empty States

### Sem Dados
1. Delete os dados de teste:
```sql
DELETE FROM ai_usage_analytics WHERE user_id = 'SEU_USER_ID';
```
2. Recarregue o dashboard
- [ ] Mensagens apropriadas aparecem
- [ ] Nenhum erro no console
- [ ] Charts mostram estado vazio

### Sem Orçamento
1. Limpe o orçamento:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'monthly_ai_budget_usd'
WHERE id = 'SEU_USER_ID';
```
2. Recarregue o dashboard
- [ ] Orçamento mostra $0.00
- [ ] Nenhum banner de alerta
- [ ] Dashboard funciona normalmente

---

## 🐛 Troubleshooting

### Problema: Dashboard não carrega
**Solução:**
1. Verifique console do navegador (F12)
2. Verifique se migration foi aplicada no Supabase
3. Verifique se você está autenticado

### Problema: Charts não aparecem
**Solução:**
1. Verifique se existem dados em `ai_usage_analytics`
2. Execute: `SELECT COUNT(*) FROM ai_usage_analytics WHERE user_id = auth.uid();`
3. Se retornar 0, execute o script de dados de teste

### Problema: Budget não salva
**Solução:**
1. Verifique console do navegador para erros
2. Verifique RLS policies: `SELECT * FROM auth.users WHERE id = auth.uid();`
3. Confirme que você pode atualizar user_metadata

### Problema: "MCP Permission Error"
**Isso é esperado!** As migrations não podem ser aplicadas via MCP.
**Solução:** Execute manualmente no Supabase SQL Editor (Passo 1).

---

## ✅ Critérios de Sucesso

O teste é considerado bem-sucedido se:

1. ✅ Migration aplicada sem erros
2. ✅ Dashboard carrega completamente
3. ✅ Todos os 6 componentes visuais aparecem (card + 3 charts + tabela + modal)
4. ✅ Budget pode ser salvo e persiste após reload
5. ✅ Alerts funcionam quando orçamento é ultrapassado
6. ✅ Navegação funciona (Settings → Dashboard → Back)
7. ✅ Responsivo em desktop, tablet e mobile
8. ✅ Nenhum erro no console do navegador

---

## 📝 Próximos Passos Após Teste

Após validar que tudo funciona:

1. **Integrar tracking nos módulos:**
   - Grants (file search, text generation)
   - Podcast (transcription, video generation)
   - Journey (image analysis)
   - Finance (chat interactions)

2. **Monitorar custos reais:**
   - Toda chamada à API Gemini deve chamar `trackAIUsage()`
   - Ver exemplos no `README_AI_COST_DASHBOARD.md`

3. **Ajustar preços:**
   - Se os preços mudarem, atualizar em `aiCostAnalyticsService.ts`

---

**Status:** 🎯 Pronto para teste
**Data:** 2025-12-09
**Autor:** Claude Code (Sonnet 4.5)
