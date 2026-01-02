# Cloud Run Deployment Skill

Skill para deploy de aplicações no Google Cloud Run, incluindo configuração, variáveis de ambiente, domínios customizados e troubleshooting.

---

## Quando Usar Esta Skill

Use quando precisar:
- Configurar deploy no Google Cloud Run
- Atualizar variáveis de ambiente
- Configurar domínios customizados
- Resolver problemas de deploy/runtime

---

## Estrutura do cloudbuild.yaml

### Template Básico

```yaml
# cloudbuild.yaml - Template para React/Vite

substitutions:
  _SERVICE_NAME: minha-app
  _DEPLOY_REGION: southamerica-east1
  _IMAGE_NAME: minha-app-frontend
  _TAG: latest
  # Variáveis públicas (safe to commit)
  _VITE_SUPABASE_URL: https://xxx.supabase.co
  _VITE_SUPABASE_ANON_KEY: eyJ...
  _VITE_FRONTEND_URL: https://minha-app.run.app

# Secrets do Secret Manager
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/nome-secret/versions/latest
      env: 'VITE_SECRET_KEY'

steps:
  # Step 1: Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-image'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker build \
          --build-arg VITE_SUPABASE_URL="${_VITE_SUPABASE_URL}" \
          --build-arg VITE_SUPABASE_ANON_KEY="${_VITE_SUPABASE_ANON_KEY}" \
          --build-arg VITE_FRONTEND_URL="${_VITE_FRONTEND_URL}" \
          --build-arg VITE_SECRET_KEY="$$VITE_SECRET_KEY" \
          -t gcr.io/$PROJECT_ID/${_IMAGE_NAME}:${_TAG} \
          .
    secretEnv: ['VITE_SECRET_KEY']

  # Step 2: Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-image'
    args: ['push', 'gcr.io/$PROJECT_ID/${_IMAGE_NAME}:${_TAG}']

  # Step 3: Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-cloud-run'
    entrypoint: gcloud
    args:
      - 'run'
      - 'services'
      - 'update'
      - '$_SERVICE_NAME'
      - '--platform=managed'
      - '--image=gcr.io/$PROJECT_ID/${_IMAGE_NAME}:${_TAG}'
      - '--region=$_DEPLOY_REGION'

images:
  - 'gcr.io/$PROJECT_ID/${_IMAGE_NAME}:${_TAG}'

options:
  logging: CLOUD_LOGGING_ONLY

timeout: '1200s'
```

### Dockerfile para React/Vite

```dockerfile
# Dockerfile

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Build args para variáveis de ambiente
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_FRONTEND_URL
ARG VITE_GEMINI_API_KEY
ARG VITE_GOOGLE_OAUTH_CLIENT_ID

# Setar variáveis de ambiente para build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID

# Build da aplicação
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Config para SPA

```nginx
# nginx.conf

server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

---

## Variáveis de Ambiente

### Tipos de Variáveis

```markdown
## Variáveis Públicas (Substitutions)
- Seguras para commit no cloudbuild.yaml
- Visíveis no código fonte do frontend
- Exemplos: URLs públicas, client IDs

## Variáveis Secretas (Secret Manager)
- Nunca commitar no código
- Acessadas via Secret Manager
- Exemplos: API keys, tokens, client secrets
```

### Criando Secrets

```bash
# Criar secret
gcloud secrets create nome-do-secret \
  --replication-policy="automatic"

# Adicionar valor ao secret
echo -n "VALOR_SECRETO" | gcloud secrets versions add nome-do-secret --data-file=-

# Dar acesso ao Cloud Build
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding nome-do-secret \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Verificando Secrets

```bash
# Listar secrets
gcloud secrets list

# Ver versões de um secret
gcloud secrets versions list nome-do-secret

# Acessar valor (cuidado em produção!)
gcloud secrets versions access latest --secret=nome-do-secret
```

### Atualizando Variáveis no Trigger

```bash
# Via Console
1. Cloud Build > Triggers
2. Editar trigger
3. Substitution variables > Adicionar/Editar

# Via gcloud (atualizar trigger inteiro)
gcloud builds triggers update TRIGGER_NAME \
  --substitutions=_VAR1=value1,_VAR2=value2
```

---

## Domínios Customizados

### Configurar Domain Mapping

```bash
# Listar serviços
gcloud run services list --region=southamerica-east1

# Criar domain mapping
gcloud run domain-mappings create \
  --service=NOME_SERVICO \
  --domain=seu-dominio.com \
  --region=southamerica-east1

# Verificar status
gcloud run domain-mappings describe \
  --domain=seu-dominio.com \
  --region=southamerica-east1
```

### Configuração DNS

```markdown
## Registros DNS Necessários

### Para domínio raiz (exemplo.com)
Tipo: A
Nome: @
Valores: (IPs fornecidos pelo Cloud Run)
- 216.239.32.21
- 216.239.34.21
- 216.239.36.21
- 216.239.38.21

### Para subdomínio (app.exemplo.com)
Tipo: CNAME
Nome: app
Valor: ghs.googlehosted.com.

### TTL Recomendado
300 segundos (5 minutos) durante configuração
3600 segundos (1 hora) depois de estável
```

### Verificar Propagação

```bash
# Verificar registros DNS
dig +short exemplo.com
dig +short CNAME app.exemplo.com

# Verificar SSL
curl -I https://exemplo.com

# Sites úteis
# - https://dnschecker.org
# - https://www.ssllabs.com/ssltest/
```

---

## Deploy Manual

### Via gcloud CLI

```bash
# Build e push da imagem
docker build -t gcr.io/PROJECT_ID/IMAGE_NAME:TAG .
docker push gcr.io/PROJECT_ID/IMAGE_NAME:TAG

# Deploy
gcloud run deploy SERVICE_NAME \
  --image gcr.io/PROJECT_ID/IMAGE_NAME:TAG \
  --platform managed \
  --region southamerica-east1 \
  --allow-unauthenticated

# Com variáveis de ambiente
gcloud run deploy SERVICE_NAME \
  --image gcr.io/PROJECT_ID/IMAGE_NAME:TAG \
  --set-env-vars "VAR1=value1,VAR2=value2" \
  --platform managed \
  --region southamerica-east1
```

### Via Cloud Build Trigger

```bash
# Listar triggers
gcloud builds triggers list

# Executar trigger manualmente
gcloud builds triggers run TRIGGER_NAME --branch=main

# Ver builds em execução
gcloud builds list --ongoing

# Ver logs de build específico
gcloud builds log BUILD_ID
```

---

## Troubleshooting

### Problemas de Build

```markdown
## "Secret not found"
```bash
# Verificar se secret existe
gcloud secrets describe nome-secret

# Verificar permissões
gcloud secrets get-iam-policy nome-secret
```

## "npm install failed"
- Verificar package-lock.json está commitado
- Verificar versão do Node no Dockerfile
- Limpar cache: `npm cache clean --force`

## "Build timeout"
- Aumentar timeout no cloudbuild.yaml
- Otimizar Dockerfile (multi-stage build)
- Verificar se não há loop infinito

## "Image push failed"
- Verificar permissões do Cloud Build
- Verificar se Container Registry está habilitado
```

### Problemas de Deploy

```markdown
## "Service unavailable" / 503
```bash
# Ver logs do serviço
gcloud run services logs read SERVICE_NAME --region=REGION

# Ver revisões
gcloud run revisions list --service=SERVICE_NAME --region=REGION
```

## "Container failed to start"
- Verificar porta (Cloud Run usa 8080)
- Verificar CMD no Dockerfile
- Ver logs: `gcloud logging read "resource.type=cloud_run_revision"`

## "Memory limit exceeded"
```bash
# Aumentar memória
gcloud run services update SERVICE_NAME \
  --memory=1Gi \
  --region=REGION
```
```

### Problemas de Domínio

```markdown
## "SSL certificate pending"
- Aguardar até 24h para provisioning
- Verificar DNS está correto
- Verificar domínio não tem CAA record bloqueando

## "Domain verification failed"
- Adicionar domínio em Authorized domains no OAuth
- Verificar TXT record para Google Search Console

## "404 Not Found" em rotas
- Verificar nginx.conf tem fallback para index.html
- SPA routing: `try_files $uri $uri/ /index.html;`
```

---

## Comandos Úteis

### Gerenciamento de Serviços

```bash
# Ver detalhes do serviço
gcloud run services describe SERVICE_NAME --region=REGION

# Atualizar configurações
gcloud run services update SERVICE_NAME \
  --region=REGION \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=10

# Ver tráfego
gcloud run services update-traffic SERVICE_NAME \
  --to-latest \
  --region=REGION

# Rollback
gcloud run services update-traffic SERVICE_NAME \
  --to-revisions=REVISION_NAME=100 \
  --region=REGION
```

### Logs e Monitoramento

```bash
# Stream de logs
gcloud run services logs read SERVICE_NAME \
  --region=REGION \
  --tail

# Filtrar logs por severidade
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --limit=50

# Ver métricas
gcloud monitoring dashboards list
```

### Cleanup

```bash
# Deletar revisões antigas (manter últimas 5)
gcloud run revisions list --service=SERVICE_NAME --region=REGION \
  | tail -n +6 \
  | awk '{print $2}' \
  | xargs -I {} gcloud run revisions delete {} --quiet --region=REGION

# Deletar imagens antigas do Container Registry
gcloud container images list-tags gcr.io/PROJECT_ID/IMAGE_NAME \
  --filter='-tags:*' \
  --format='get(digest)' \
  | xargs -I {} gcloud container images delete gcr.io/PROJECT_ID/IMAGE_NAME@{} --quiet
```

---

## Checklist de Deploy

```markdown
## Pré-Deploy

- [ ] Código testado localmente
- [ ] Build local funciona: `npm run build`
- [ ] Dockerfile atualizado
- [ ] cloudbuild.yaml atualizado
- [ ] Secrets criados/atualizados
- [ ] Variáveis de ambiente corretas

## Durante Deploy

- [ ] Build iniciado sem erros
- [ ] Imagem pushed com sucesso
- [ ] Deploy completado
- [ ] Nova revisão ativa

## Pós-Deploy

- [ ] App acessível na URL
- [ ] Funcionalidades principais funcionando
- [ ] Logs sem erros críticos
- [ ] SSL válido
- [ ] Performance aceitável
```

---

## Links Úteis

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Container Registry](https://cloud.google.com/container-registry/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains)
