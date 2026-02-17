# Deploy Pipeline

> **REGRA:** Claude pode executar `gcloud builds submit` **somente quando o usuario pedir explicitamente**.
> Se o usuario pedir "deploy", SEMPRE assumir staging (a menos que diga "producao" explicitamente).
> Antes de executar, garantir que `npm run build` passa sem erros.

## Pipeline Obrigatoria

```
1. npm run build && npm run typecheck   (local)
2. Deploy → STAGING (aica-dev)
3. Testes E2E em staging
4. Validacao do usuario
5. Deploy → PRODUCAO (aica) — SOMENTE apos aprovacao
```

**NUNCA** deploy direto para producao sem staging validado primeiro.
**NUNCA** deploy staging + producao simultaneamente.

## Commands

### Commit & Push
```bash
git add -A && git commit -m "sua mensagem" && git push origin main
```

### Staging (us-central1)
```bash
gcloud builds submit --config=cloudbuild.yaml --region=southamerica-east1 --project=gen-lang-client-0948335762 \
  --substitutions=_SERVICE_NAME=aica-dev,_DEPLOY_REGION=us-central1,_VITE_FRONTEND_URL=https://dev.aica.guru
```

### Producao (southamerica-east1) — SOMENTE apos validacao em staging
```bash
gcloud builds submit --config=cloudbuild.yaml --region=southamerica-east1 --project=gen-lang-client-0948335762
```

Deploy leva ~4 minutos. Defaults do `cloudbuild.yaml`: `_SERVICE_NAME=aica`, `_DEPLOY_REGION=southamerica-east1`, `_VITE_FRONTEND_URL=https://aica.guru`.

### Verify Status
```bash
gcloud builds list --limit=5 --region=southamerica-east1 --project=gen-lang-client-0948335762
```

## Cloud Run Services

| Servico | Dominio | Regiao | Uso |
|---------|---------|--------|-----|
| `aica-dev` | dev.aica.guru | us-central1 | Staging |
| `aica` | aica.guru | southamerica-east1 | Producao |
| `aica-agents` | — | southamerica-east1 | Backend ADK |
| `aica-guru.web.app` | aica.guru | Firebase Hosting | Edge proxy |

## Edge Function Deploys

Code changes to Edge Functions require **separate deploy to Supabase** (not just Cloud Run):
```bash
SUPABASE_ACCESS_TOKEN=sbp_... npx supabase functions deploy <name> --no-verify-jwt
```
