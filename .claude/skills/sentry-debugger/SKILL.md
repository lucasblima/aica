---
name: sentry-debugger
description: Debug e corrigir erros capturados pelo Sentry. Use quando o usuario mencionar "sentry", "erros em producao", "fix sentry issues", "bugs em prod", ou quiser investigar/corrigir erros capturados automaticamente.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, Agent, WebFetch
---

# Sentry Debugger - Investigar e Corrigir Erros de Producao

Conecta ao Sentry via API para buscar erros, mapear para codigo-fonte, investigar root cause, e propor/implementar fixes.

## Configuracao

- **Org:** `comtxae`
- **Project:** `javascript-react`
- **API Base:** `https://sentry.io/api/0`
- **Auth Token:** Em `.env.local` como `SENTRY_AUTH_TOKEN`
- **Runtime:** Usar `node` (nao python3 — Windows)

## Workflow

### Passo 1: Buscar Issues Nao Resolvidas

```bash
source .env.local 2>/dev/null && curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/projects/comtxae/javascript-react/issues/?query=is:unresolved&sort=date" \
  | node -e "
const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>{
  const issues=JSON.parse(d.join(''));
  issues.slice(0,10).forEach(i=>{
    console.log('['+i.shortId+'] '+i.title.slice(0,80));
    console.log('   Events: '+i.count+' | Users: '+i.userCount+' | Last: '+i.lastSeen.slice(0,16));
    console.log('   ID: '+i.id);
    console.log();
  });
});"
```

### Passo 2: Obter Detalhes de um Issue

```bash
source .env.local 2>/dev/null && ISSUE_ID="<numero>" && \
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/issues/$ISSUE_ID/events/latest/" \
  | node -e "
const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>{
  const event=JSON.parse(d.join(''));
  for(const entry of event.entries||[]){
    if(entry.type==='exception'){
      for(const val of entry.data.values||[]){
        console.log('Exception: '+val.type+': '+val.value);
        console.log();
        for(const f of (val.stacktrace?.frames||[]).slice(-8)){
          console.log('  '+(f.filename||'?')+':'+(f.lineNo||'?')+' in '+(f.function||'?'));
        }
        console.log();
      }
    }
    if(entry.type==='breadcrumbs'){
      console.log('--- Breadcrumbs (last 5) ---');
      for(const bc of (entry.data.values||[]).slice(-5)){
        console.log('  ['+(bc.category||'?')+'] '+(bc.message||'').slice(0,80));
      }
    }
  }
});"
```

### Passo 3: Mapear para Codigo-Fonte

O build e minificado. Para mapear chunks a modulos:

| Chunk | Modulo fonte |
|-------|-------------|
| `module-journey-*.js` | `src/modules/journey/` |
| `module-finance-*.js` | `src/modules/finance/` |
| `module-connections-*.js` | `src/modules/connections/` |
| `module-grants-*.js` | `src/modules/grants/` |
| `module-onboarding-*.js` | `src/modules/onboarding/` |
| `services-*.js` | `src/services/`, `src/lib/`, `src/hooks/` |
| `vendor-react-*.js` | React internals (hooks, render) |
| `vendor-supabase-*.js` | Supabase client |
| `vendor-libs-*.js` | Third-party libs (Sentry, Framer Motion, etc.) |
| `main-*.js` | `index.tsx`, `App.tsx`, `AppRouter.tsx` |

Para stack traces completos (nao-minificados): `npm run dev` e reproduzir.

### Passo 4: Investigar Root Cause

Invocar `superpowers:systematic-debugging`:
1. Ler os arquivos do modulo identificado
2. Reproduzir localmente (`npm run dev`)
3. Formar hipotese e testar minimamente
4. Implementar fix com TDD

### Passo 5: Resolver no Sentry (apos deploy)

```bash
source .env.local 2>/dev/null && ISSUE_ID="<numero>" && \
curl -s -X PUT -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}' \
  "https://sentry.io/api/0/issues/$ISSUE_ID/"
```

## Fluxo Completo

```
"tem erros no sentry?" → [Passo 1] Listar issues
"fix JAVASCRIPT-REACT-2" → [Passo 2] Detalhes → [Passo 3] Mapear → [Passo 4] Debug → Fix → Deploy → [Passo 5] Resolve
```

## Comandos Extras

```bash
# Issues mais frequentes
source .env.local && curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/projects/comtxae/javascript-react/issues/?query=is:unresolved&sort=freq"

# Issues das ultimas 24h
source .env.local && curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/projects/comtxae/javascript-react/issues/?query=is:unresolved+firstSeen:-24h"
```

## Notas

- **Ad blockers** bloqueiam Sentry — tunnel pendente (Issue #923)
- **Source maps** nao configurados — stack traces minificados
- **Deduplicacao**: Sentry agrupa erros identicos em 1 Issue
- **Trial**: 14 dias a partir de 2026-03-16
