# Setup do Servidor Python LLM no Easypanel

## Pré-requisitos

- Conta no Easypanel
- API Key do Google Gemini
- Credenciais do Supabase (URL + Service Key)

## Passo a Passo

### 1. Criar Novo Serviço no Easypanel

1. Acesse o painel do Easypanel
2. Clique em **"New Service"**
3. Selecione **"Docker"** como tipo de serviço
4. Nome: `aica-llm-server`

### 2. Configurar Build

**Repositório Git**:
```
https://github.com/seu-usuario/Aica_frontend
```

**Branch**: `main`

**Dockerfile Path**: `scripts/Dockerfile`

**Build Context**: `scripts/`

### 3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente no Easypanel:

```env
# API Key do Gemini (OBRIGATÓRIO)
GEMINI_API_KEY=sua_api_key_aqui

# Supabase (OBRIGATÓRIO)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui

# CORS - adicionar domínio de produção
CORS_ORIGINS=https://seu-dominio.com,http://localhost:5173

# Configurações opcionais
LOG_LEVEL=info
MAX_PDF_SIZE_MB=10
RATE_LIMIT_PER_HOUR=100
```

### 4. Configurar Porta

- **Porta do Container**: `8001`
- **Porta Pública**: Auto (Easypanel gerará automaticamente)
- **Protocolo**: HTTP

### 5. Configurar Domínio (Opcional)

Se quiser um domínio customizado:
1. Vá em **"Domains"**
2. Adicione: `llm-api.seu-dominio.com`
3. Easypanel configurará SSL automaticamente

### 6. Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (~5 minutos na primeira vez)
3. Verifique logs em **"Logs"** tab
4. Status deve mostrar: `✅ Running`

### 7. Testar

Após deploy, teste a API:

```bash
# Health check
curl https://seu-dominio/health

# Resposta esperada:
# {"status": "healthy", "timestamp": "2024-01-XX..."}
```

## Estrutura do Projeto no Easypanel

```
Easypanel Dashboard
└── Projects
    └── aica-life-os
        ├── aica-llm-server (Python API)
        │   ├── Environment Variables
        │   ├── Domains
        │   ├── Logs
        │   └── Metrics
        └── (outros serviços...)
```

## Monitoramento

### Logs em Tempo Real
```bash
# No Easypanel, vá em "Logs" tab
# Ou via CLI:
easypanel logs aica-llm-server --follow
```

### Métricas
- CPU Usage
- Memory Usage
- Request Count
- Response Time

Disponível na tab **"Metrics"** do Easypanel.

## Troubleshooting

### Erro: "Module not found"
**Solução**: Verificar se todas as dependências estão em `requirements.txt`

### Erro: "Port 8001 already in use"
**Solução**: Easypanel gerencia portas automaticamente, não precisa configurar

### Erro: "GEMINI_API_KEY not set"
**Solução**: Verificar se a variável de ambiente foi configurada corretamente no painel

### Build muito lento
**Solução**:
- Primeira build demora ~5 minutos (baixa modelo spaCy)
- Builds subsequentes usam cache (~1 minuto)

## Integração com Frontend

Após deploy, atualize o frontend para usar a URL do servidor:

```typescript
// src/config/api.ts
export const LLM_API_URL = import.meta.env.VITE_LLM_API_URL || 'https://llm-api.seu-dominio.com'
```

E adicione no `.env`:
```env
VITE_LLM_API_URL=https://llm-api.seu-dominio.com
```

## Segurança

- ✅ API Key do Gemini protegida no servidor (não exposta ao frontend)
- ✅ Rate limiting por usuário
- ✅ Autenticação via JWT do Supabase
- ✅ CORS configurado apenas para domínios autorizados
- ✅ HTTPS automático via Easypanel

## Custos Estimados

**Easypanel** (self-hosted):
- Grátis se você já tem servidor
- ~$5-10/mês em servidor pequeno (1GB RAM)

**Gemini API**:
- gemini-2.0-flash: $0.075 / 1M tokens input
- Estimativa: ~$10-30/mês para uso moderado

## Backup e Rollback

### Fazer Rollback
1. Vá em **"Deployments"** tab
2. Selecione versão anterior
3. Clique em **"Redeploy"**

### Backup de Configuração
Exporte variáveis de ambiente:
```bash
easypanel env export aica-llm-server > backup.env
```

## Próximos Passos

Após o servidor estar rodando:
1. ✅ Testar endpoints com Postman/curl
2. ✅ Configurar monitoramento de alertas
3. ✅ Integrar frontend com nova API
4. ✅ Configurar backup automático de logs
