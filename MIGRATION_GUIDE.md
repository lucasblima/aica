# Guia de Migração - FileSearch Melhorias

## Mudanças Implementadas

### 1. ✅ Extração de DOCX Implementada
- Biblioteca `mammoth` adicionada ao projeto
- Arquivos `.docx` agora são processados corretamente
- Texto extraído automaticamente de documentos Word

### 2. ✅ Autenticação JWT no Backend
- Backend FastAPI agora requer autenticação JWT
- User ID extraído automaticamente do token
- Maior segurança nas requisições

### 3. ✅ Polling Assíncrono
- Upload de arquivos não bloqueia mais o servidor
- Timeout de 5 minutos para indexação
- Melhor performance geral

### 4. ✅ CORS Configurado
- Domínios específicos em vez de `allow_origins=["*"]`
- Configuração via variáveis de ambiente
- Mais seguro em produção

## O que você precisa fazer

### Frontend - Nenhuma ação necessária! ✅

O hook `useFileSearch.ts` já foi atualizado automaticamente:
- Token JWT é enviado automaticamente
- User ID não é mais enviado manualmente
- Tudo funciona transparentemente

### Backend - Configuração necessária

#### 1. Instalar novas dependências Python

```bash
cd backend
pip install -r requirements.txt
```

Novas dependências instaladas:
- `pyjwt>=2.8.0`
- `gotrue>=2.0.0`

#### 2. Adicionar variáveis de ambiente

Crie ou atualize o arquivo `backend/.env`:

```env
# Existentes (mantenha)
GEMINI_API_KEY=sua_chave_aqui
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui

# NOVAS - Obrigatórias
SUPABASE_JWT_SECRET=seu_jwt_secret_aqui
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development

# NOVAS - Opcionais (apenas em produção)
PRODUCTION_DOMAIN=https://seu-dominio.com
```

#### 3. Obter o JWT Secret do Supabase

O `SUPABASE_JWT_SECRET` pode ser encontrado em:

1. Acesse o dashboard do Supabase
2. Vá em **Project Settings** → **API**
3. Procure por **JWT Secret** na seção "Project API keys"
4. Copie e cole no arquivo `.env`

#### 4. Reiniciar o backend

```bash
python main.py
```

ou

```bash
uvicorn main:app --reload
```

## Frontend - Uso de DOCX

Agora você pode fazer upload de arquivos `.docx`:

```typescript
import { useFileSearch } from '@/hooks/useFileSearch';

function MyComponent() {
  const { uploadDocument } = useFileSearch();

  const handleUpload = async (file: File) => {
    // Funciona com .md, .pdf, .txt e agora .docx!
    const result = await uploadDocument(file, 'documents');
    console.log('Upload concluído:', result);
  };

  return (
    <input
      type="file"
      accept=".md,.pdf,.txt,.docx"  // ✅ .docx agora suportado
      onChange={(e) => handleUpload(e.target.files[0])}
    />
  );
}
```

## Verificação de Funcionamento

### 1. Teste o backend

```bash
curl http://localhost:8000/api/file-search/stores \
  -X POST \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"category": "documents"}'
```

Deve retornar o store_name ou criar um novo.

### 2. Teste o frontend

Faça upload de um arquivo .docx:
- O texto deve ser extraído corretamente
- Nenhum aviso de "não implementado"
- Arquivo indexado com sucesso

### 3. Verifique CORS

Se estiver recebendo erros de CORS:
1. Verifique se `FRONTEND_URL` está correto no `.env`
2. Reinicie o backend
3. Limpe o cache do navegador

## Possíveis Problemas

### Erro: "SUPABASE_JWT_SECRET environment variable is not set"

**Solução:**
```bash
# Adicione ao backend/.env
SUPABASE_JWT_SECRET=seu_secret_aqui
```

### Erro: "Invalid token" ou "Token expired"

**Causa:** Token JWT inválido ou expirado

**Solução:**
- O frontend está enviando o token correto?
- Verifique se o usuário está autenticado
- Faça logout/login novamente

### Erro: CORS blocked

**Solução:**
```bash
# Verifique o backend/.env
FRONTEND_URL=http://localhost:5173  # URL correta do frontend
```

### Erro: "mammoth is not defined"

**Causa:** Biblioteca não instalada

**Solução:**
```bash
# No diretório raiz do frontend
npm install
```

## Rollback (se necessário)

Se precisar voltar às versões anteriores:

### Frontend
```bash
git checkout HEAD~1 src/modules/grants/services/documentService.ts
git checkout HEAD~1 src/hooks/useFileSearch.ts
npm install  # Remove mammoth
```

### Backend
```bash
git checkout HEAD~1 backend/main.py
git checkout HEAD~1 backend/requirements.txt
pip install -r requirements.txt
```

## Suporte

Se encontrar problemas:
1. Verifique os logs do backend
2. Verifique o console do navegador
3. Confirme que todas as variáveis de ambiente estão configuradas
4. Teste com Postman/curl primeiro para isolar o problema
