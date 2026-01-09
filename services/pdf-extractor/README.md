# PDF Extractor Service

Microserviço Python para extrair PDFs de extratos bancários e converter para Markdown com persistência no Supabase.

## Stack

- **Python 3.11** + FastAPI
- **PyMuPDF4LLM** para extração PDF → Markdown
- **Supabase** para persistência

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| POST | `/extract` | Extrai PDF e salva no banco |
| GET | `/statements` | Lista extratos do usuário |
| GET | `/statements/{id}` | Busca extrato por ID |
| DELETE | `/statements/{id}` | Remove extrato |

## Variáveis de Ambiente

```env
SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
SUPABASE_SERVICE_KEY=eyJ...sua_service_role_key...
ALLOWED_ORIGINS=https://seu-dominio.com,http://localhost:5173
```

## Desenvolvimento Local

```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt

# Rodar servidor
python main.py
```

## Docker

```bash
# Build
docker build -t pdf-extractor:latest .

# Run
docker run -d -p 8000:8000 \
  -e SUPABASE_URL=https://... \
  -e SUPABASE_SERVICE_KEY=eyJ... \
  pdf-extractor:latest
```

## EasyPanel

### Configuração

1. **Novo App** → Docker
2. **Source** → Git → apontar para `services/pdf-extractor/`
3. **Port** → 8000
4. **Health Check** → `/health`

### Variáveis de Ambiente

No EasyPanel, configure:

| Variável | Valor |
|----------|-------|
| `SUPABASE_URL` | URL do seu projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service Role Key (NÃO a anon key!) |
| `ALLOWED_ORIGINS` | Domínios permitidos (separados por vírgula) |

### Obtendo a Service Role Key

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie a **service_role** key (NÃO a anon key!)

> ⚠️ **IMPORTANTE**: A service_role key tem acesso total ao banco. Nunca exponha no frontend!

## Uso via Frontend

```typescript
import { statementService } from '@/modules/finance/services/statementService'

// Upload e extração
const result = await statementService.extractAndSave(file)

// Listar extratos
const { data: statements } = await statementService.list()

// Buscar por ID
const statement = await statementService.getById(id)

// Deletar
await statementService.delete(id)
```

## Validação

```bash
# Health check
curl http://localhost:8000/health

# Extrair PDF
curl -X POST "http://localhost:8000/extract" \
  -H "X-User-Id: seu-user-id" \
  -F "file=@extrato.pdf"
```
