# Fila de Trabalho - AICA Life OS

**Ultima Atualizacao:** 2026-02-11
**Maintainers:** Lucas Boscacci Lima + Claude

---

## Ambiente Ativo

### URLs e Servicos
| Servico | Dominio | Regiao | Uso |
|---------|---------|--------|-----|
| `aica` | https://aica.guru | `southamerica-east1` | Producao |
| `aica-dev` | https://dev.aica.guru | `us-central1` | Desenvolvimento/Staging |
| `aica-agents` | — | `southamerica-east1` | Backend ADK agents |
| Firebase Hosting | `aica-guru.web.app` | Edge CDN | Proxy para Cloud Run prod |

### Supabase
- **URL:** https://uzywajqzbdbrfammshdg.supabase.co
- **Projeto GCP:** gen-lang-client-0948335762

### Deploy Commands
```bash
# Staging (SEMPRE primeiro)
gcloud builds submit --config=cloudbuild.yaml --region=southamerica-east1 --project=gen-lang-client-0948335762 \
  --substitutions=_SERVICE_NAME=aica-dev,_DEPLOY_REGION=us-central1,_VITE_FRONTEND_URL=https://dev.aica.guru

# Producao (SOMENTE apos validacao em staging)
gcloud builds submit --config=cloudbuild.yaml --region=southamerica-east1 --project=gen-lang-client-0948335762
```

---

## Sprint Atual — Pronto para Iniciar

### Concluido Recentemente (Fev 2026)
- [x] Custom domain `aica.guru` (prod) + `dev.aica.guru` (dev)
- [x] Firebase Hosting como edge proxy para producao
- [x] CORS atualizado em 10 Edge Functions (deployed)
- [x] Servicos `aica-staging` deletados (consolidado para `aica-dev`)
- [x] Cloud Build SA com `roles/firebase.admin`
- [x] Ceramic Renaissance Phase 3 (309 arquivos, 15/16 sub-issues)
- [x] Universal Input Funnel Phases 0, 1, 3
- [x] WhatsApp pipeline completo
- [x] Console error fixes (extractJSON, CORS, RPCs)

### Issues Abertas
| Issue | Descricao | Prioridade |
|-------|-----------|------------|
| #194 | Chat Redesign (4 fases) | P2 |
| #211 | Universal Input Funnel (Phase 2 pendente — Web Chat) | P2 |
| #219 | Page Transitions (AnimatePresence) | P3 |

### Backlog de Features
- File Search V2 migration
- Grounding with Google Search no Studio
- ADK Coordinator Agent setup
- Gemini Live API (Tia Sabia)

---

## Protocolo de Deploy

```
1. npm run dev (desenvolvimento local)
   |
2. npm run build && npm run typecheck
   |
3. Deploy para STAGING (aica-dev, us-central1)
   |
4. Testes E2E em dev.aica.guru
   |
5. Validacao do usuario
   |
6. Deploy para PRODUCAO (aica, southamerica-east1) — inclui Firebase Hosting automatico
```

> **NUNCA** deploy direto para producao sem staging validado.
> **NUNCA** deploy staging + producao simultaneamente.
> Se "deploy" sem qualificador → SEMPRE staging.
