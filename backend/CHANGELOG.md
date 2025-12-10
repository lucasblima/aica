# Changelog - Backend FileSearch

## Melhorias Implementadas (2025-12-08)

### 1. Autenticação JWT Implementada
- ✅ Adicionada verificação de tokens JWT do Supabase
- ✅ Todos os endpoints agora requerem autenticação via Bearer token
- ✅ User ID extraído automaticamente do token (não mais enviado no body)
- ✅ Segurança aprimorada com validação de tokens

**Dependências adicionadas:**
- `pyjwt>=2.8.0`
- `gotrue>=2.0.0`

**Variável de ambiente necessária:**
- `SUPABASE_JWT_SECRET` - Secret usado para verificar tokens JWT

### 2. CORS Configurado para Produção
- ✅ CORS não aceita mais `allow_origins=["*"]`
- ✅ Domínios específicos configurados via variáveis de ambiente
- ✅ Suporte para múltiplos ambientes (dev/prod)

**Variáveis de ambiente:**
- `FRONTEND_URL` - URL do frontend (padrão: http://localhost:5173)
- `ENVIRONMENT` - "development" ou "production"
- `PRODUCTION_DOMAIN` - Domínio de produção (apenas se ENVIRONMENT=production)

**Domínios permitidos por padrão:**
- http://localhost:5173
- http://localhost:3000
- Valor de `FRONTEND_URL`
- Valor de `PRODUCTION_DOMAIN` (se em produção)

### 3. Polling Assíncrono no Upload
- ✅ Substituído `time.sleep()` por `asyncio.sleep()`
- ✅ Adicionado timeout de 5 minutos para indexação
- ✅ Melhor performance e não bloqueio do event loop

**Melhorias:**
- Timeout configurável (300 segundos padrão)
- Mensagem de erro clara quando timeout é excedido
- Uso de async/await para melhor concorrência

### 4. Frontend Atualizado
- ✅ Hook `useFileSearch.ts` atualizado para enviar token JWT
- ✅ Removido envio manual de `user_id` (agora extraído do token)
- ✅ Autenticação via `Authorization: Bearer <token>`

## Como Usar

### 1. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha as variáveis obrigatórias:

```env
GEMINI_API_KEY=sua_chave_aqui
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui
SUPABASE_JWT_SECRET=seu_jwt_secret_aqui
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

### 2. Instalar dependências

```bash
pip install -r requirements.txt
```

### 3. Executar servidor

```bash
python main.py
```

ou

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Mudanças nos Endpoints

### POST `/api/file-search/upload`

**Antes:**
```typescript
// user_id enviado no FormData
formData.append('user_id', user.id);
```

**Depois:**
```typescript
// user_id extraído do token JWT
headers: {
    'Authorization': `Bearer ${session.access_token}`
}
```

### POST `/api/file-search/query-authenticated`

**Antes:**
```typescript
body: JSON.stringify({
    query,
    categories,
    filters,
    user_id: user.id  // ❌ Inseguro
})
```

**Depois:**
```typescript
headers: {
    'Authorization': `Bearer ${session.access_token}`  // ✅ Seguro
},
body: JSON.stringify({
    query,
    categories,
    filters
})
```

## Notas de Segurança

- 🔒 Tokens JWT são verificados em todos os endpoints
- 🔒 CORS configurado apenas para domínios permitidos
- 🔒 User ID não pode mais ser falsificado no frontend
- 🔒 Service key mantida apenas no backend

## Próximos Passos Sugeridos

- [ ] Implementar rate limiting por usuário
- [ ] Adicionar logs estruturados (JSON)
- [ ] Implementar caching de stores por usuário
- [ ] Adicionar métricas de uso (Prometheus/Grafana)
- [ ] Implementar retry automático para operações do Gemini
