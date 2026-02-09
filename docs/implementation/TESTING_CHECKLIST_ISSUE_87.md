# Testing Checklist - Issue #87 WhatsApp Pairing Code

**Data:** 2026-01-26
**Status:** Ready for End-to-End Testing
**Tester:** User Validation Required

---

## ✅ Pre-requisites Completed

- [x] Step 1: SQL user_credits RLS policies applied
- [x] Step 2: Edge Function `disconnect-whatsapp` deployed
- [x] Step 3: Navigation link added to SettingsMenu

---

## 🧪 STEP 4: Test Disconnect Functionality (10 min)

### Test 4.1: Verify Page Access

**Objetivo:** Confirmar que a navegação funciona

**Passos:**
1. Acesse a aplicação staging: https://aica-staging-5562559893.southamerica-east1.run.app/
2. Faça login (se necessário)
3. Clique no ícone ⚙️ **Settings** (canto superior direito)
4. Localize o item **"WhatsApp Analytics"** 💬 (deve estar entre "File Search Analytics" e "WhatsApp Monitor")
5. Clique em **"WhatsApp Analytics"**

**Resultado Esperado:**
- ✅ Navega para `/connections/analytics/whatsapp`
- ✅ Página carrega sem erros
- ✅ Exibe 4 abas: Visão Geral, Contatos, Consentimento, Analytics

**Status:** [ ] PASS  [ ] FAIL

**Se FAIL:** Descrever erro: ______________________

---

### Test 4.2: Verify Current Connection Status

**Objetivo:** Confirmar que WhatsApp está conectado antes do teste

**Passos:**
1. Na aba **"Visão Geral"**, localize o card **"Conexão WhatsApp"**
2. Verifique o status exibido

**Resultado Esperado:**
- ✅ Status: **"Conectado"** 🟢
- ✅ Exibe informações:
  - Nome do perfil (seu nome do WhatsApp)
  - Número de telefone (formato: +55 XX XXXXX-XXXX)
  - Conectado em (data/hora)
  - Contatos: (número)
- ✅ Botão **"Desconectar"** visível (vermelho/ceramic-negative)

**Status:** [ ] PASS  [ ] FAIL

**Se status não for "Conectado":** Você precisará conectar primeiro via QR Code antes de testar desconexão.

---

### Test 4.3: Execute Disconnect

**Objetivo:** Testar desconexão real via Evolution API

**Passos:**
1. Clique no botão **"Desconectar"** (vermelho)
2. Aguarde 2-5 segundos
3. Observe mudanças na UI

**Resultado Esperado:**
- ✅ Spinner de loading aparece brevemente
- ✅ Status muda para **"Desconectado"** 🔴
- ✅ Informações de conexão desaparecem
- ✅ Botão muda para **"Conectar"** (verde/ceramic-positive)
- ✅ Toggle aparece: "Código" / "QR Code"

**Status:** [ ] PASS  [ ] FAIL

**Se FAIL:** Abrir DevTools → Console → copiar mensagem de erro

---

### Test 4.4: Verify WhatsApp Mobile Disconnected

**Objetivo:** Confirmar que WhatsApp mobile foi deslogado de verdade

**Passos:**
1. No celular, abra o WhatsApp
2. Vá em: **Configurações → Dispositivos conectados**
3. Procure pela sessão "Aica" (ou nome da instância)

**Resultado Esperado:**
- ✅ Sessão "Aica" **NÃO aparece mais** na lista
- ✅ OU aparece como "Desconectado" (depende do WhatsApp)

**Status:** [ ] PASS  [ ] FAIL

**Se sessão ainda aparece:** A desconexão foi apenas no banco de dados, não na Evolution API. Verificar logs Edge Function.

---

## 🧪 STEP 5: Test Pairing Code Complete Flow (15 min)

### Test 5.1: Generate Pairing Code

**Objetivo:** Gerar código de pareamento de 8 dígitos

**Passos:**
1. Ainda na página WhatsApp Analytics (aba "Visão Geral")
2. Verifique que status é **"Desconectado"**
3. Localize o toggle: **"Código"** / "QR Code"
4. Clique em **"Código"** (deve ficar destacado)
5. Clique no botão **"Gerar código"**
6. Aguarde 2-3 segundos

**Resultado Esperado:**
- ✅ Código aparece no formato: **XXXX-XXXX** (8 dígitos com traço)
- ✅ Exemplo: `1234-5678`
- ✅ Countdown timer inicia: **1:00** → **0:59** → ...
- ✅ Botão **"Copiar código"** aparece
- ✅ Instruções em português aparecem:
  1. "Abra o WhatsApp no celular"
  2. "Vá em Configurações → Dispositivos conectados"
  3. "Toque em 'Conectar um dispositivo'"
  4. "Escolha 'Conectar com número de telefone'"
  5. "Digite o código de 8 dígitos (sem o traço)"

**Status:** [ ] PASS  [ ] FAIL

**Se FAIL:** Verificar console para erros. Pode ser problema com Edge Function `generate-pairing-code`.

---

### Test 5.2: Copy Pairing Code

**Objetivo:** Testar funcionalidade de copiar código

**Passos:**
1. Clique no botão **"Copiar código"**
2. Observe feedback visual

**Resultado Esperado:**
- ✅ Botão muda para **"Copiado!"** (ou ícone de check)
- ✅ Tooltip/feedback visual aparece
- ✅ Código está na área de transferência (Ctrl+V para testar)

**Status:** [ ] PASS  [ ] FAIL

---

### Test 5.3: Connect via Pairing Code (WhatsApp Mobile)

**Objetivo:** Conectar WhatsApp usando o código gerado

**Passos:**
1. No celular, abra o WhatsApp
2. Vá em: **Configurações → Dispositivos conectados**
3. Toque em **"Conectar um dispositivo"**
4. Escolha **"Conectar com número de telefone"**
5. Digite o código de 8 dígitos (SEM o traço do meio)
   - Exemplo: Se código é `1234-5678`, digite `12345678`
6. Aguarde validação (~5-10 segundos)

**Resultado Esperado no WhatsApp Mobile:**
- ✅ Mensagem: "Conectando..." aparece
- ✅ Conexão estabelecida com sucesso
- ✅ Dispositivo "Aica" (ou nome da instância) aparece na lista

**Status:** [ ] PASS  [ ] FAIL

**Se FAIL - Código inválido:**
- Verificar se código expirou (>60s)
- Gerar novo código e tentar novamente

**Se FAIL - Código não aceito:**
- Verificar formato (8 dígitos, sem traço)
- Verificar se número de telefone usado no generate foi correto

---

### Test 5.4: Verify Real-Time UI Update

**Objetivo:** Confirmar que a UI atualiza automaticamente após conexão

**Passos:**
1. Após conectar no WhatsApp mobile, volte para o navegador
2. Observe o card "Conexão WhatsApp" (NÃO recarregue a página)
3. Aguarde 5-15 segundos

**Resultado Esperado:**
- ✅ Status muda automaticamente para **"Conectado"** 🟢
- ✅ Informações de conexão aparecem:
  - Nome do perfil
  - Número de telefone
  - Conectado em (timestamp atual)
  - Contatos (número pode estar sincronizando)
- ✅ Botão muda para **"Desconectar"**
- ✅ Toggle de método desaparece

**Status:** [ ] PASS  [ ] FAIL

**Se FAIL - UI não atualiza:**
- Verificar Supabase Dashboard → Database → Replication → `whatsapp_sessions` está habilitado
- Verificar webhook `webhook-evolution` recebeu evento `CONNECTION_UPDATE`
- Verificar console para erros de subscription

---

### Test 5.5: Verify Contact Sync

**Objetivo:** Confirmar que contatos do WhatsApp foram sincronizados

**Passos:**
1. Na página WhatsApp Analytics, clique na aba **"Contatos"**
2. Aguarde carregamento (~5-15 segundos)
3. Observe lista de contatos

**Resultado Esperado:**
- ✅ Lista de contatos do WhatsApp aparece
- ✅ Contatos exibem:
  - Nome (do WhatsApp)
  - Número de telefone
  - Foto de perfil (ou iniciais se foto 404)
  - Última mensagem (se disponível)
- ✅ Contagem de contatos: > 0

**Status:** [ ] PASS  [ ] FAIL

**Se lista vazia:** Aguardar mais 30-60s para sync completar. Verificar logs `webhook-evolution`.

---

## 🧪 EDGE CASES: Additional Tests (Optional - 5 min)

### Edge Test 1: Code Expiration

**Passos:**
1. Gerar código de pareamento
2. **NÃO escanear/digitar** o código
3. Aguardar 60 segundos (countdown chegar a 0:00)

**Resultado Esperado:**
- ✅ Mensagem: **"Código expirado"** aparece
- ✅ Botão **"Gerar novo código"** aparece
- ✅ Código antigo fica "apagado" ou desabilitado

**Status:** [ ] PASS  [ ] FAIL

---

### Edge Test 2: Already Connected

**Passos:**
1. Com WhatsApp já conectado (status "Conectado")
2. Tentar gerar novo código de pareamento

**Resultado Esperado:**
- ✅ Erro: **"WhatsApp already connected. Disconnect first."**
- ✅ OU botão "Gerar código" está desabilitado
- ✅ OU toggle de método não aparece

**Status:** [ ] PASS  [ ] FAIL

---

### Edge Test 3: Multiple Browser Tabs (Real-time)

**Passos:**
1. Abrir app em **2 abas do navegador**
2. Na Aba 1: Gerar código e conectar
3. Observar Aba 2 (sem recarregar)

**Resultado Esperado:**
- ✅ Aba 2 atualiza automaticamente para "Conectado"
- ✅ Sem precisar refresh manual

**Status:** [ ] PASS  [ ] FAIL

---

## 📊 SUMMARY - Issue #87 Validation

### Core Functionality

| Feature | Status | Notes |
|---------|--------|-------|
| Navigate to WhatsApp Analytics | [ ] PASS [ ] FAIL | Via SettingsMenu |
| Disconnect WhatsApp (UI update) | [ ] PASS [ ] FAIL | Status → "Desconectado" |
| Disconnect WhatsApp (Evolution API) | [ ] PASS [ ] FAIL | Mobile session removed |
| Generate Pairing Code | [ ] PASS [ ] FAIL | Format XXXX-XXXX |
| Copy to Clipboard | [ ] PASS [ ] FAIL | Button feedback |
| Connect via Pairing Code | [ ] PASS [ ] FAIL | Mobile WhatsApp |
| Real-time Status Update | [ ] PASS [ ] FAIL | Auto UI refresh |
| Contact Sync | [ ] PASS [ ] FAIL | List populated |

### Edge Cases (Optional)

| Feature | Status | Notes |
|---------|--------|-------|
| Code Expiration (60s) | [ ] PASS [ ] FAIL | Shows "expired" |
| Already Connected Error | [ ] PASS [ ] FAIL | Blocks duplicate |
| Multi-tab Real-time | [ ] PASS [ ] FAIL | Sync across tabs |

---

## 🐛 BUGS FOUND

**List any bugs discovered during testing:**

1. **Bug #1:**
   - **Descrição:** ___________________________
   - **Passos para reproduzir:** _______________
   - **Resultado esperado:** __________________
   - **Resultado atual:** _____________________
   - **Severidade:** [ ] Crítico [ ] Alto [ ] Médio [ ] Baixo

2. **Bug #2:** (se aplicável)

---

## ✅ FINAL SIGN-OFF

**Testador:** ___________________________
**Data:** ___________________________
**Resultado:** [ ] APROVADO PARA PRODUÇÃO  [ ] REQUER CORREÇÕES

**Observações:**
_____________________________________
_____________________________________
_____________________________________

---

**Arquivo gerado para Issue #87 - WhatsApp Pairing Code Implementation**
🤖 Generated with [Claude Code](https://claude.com/claude-code)
