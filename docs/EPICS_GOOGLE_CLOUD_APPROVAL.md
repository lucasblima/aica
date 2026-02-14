# Epicos para Aprovacao Google Cloud OAuth + Beta Launch

## Visao Geral do Projeto

**Objetivo:** Preparar a plataforma AICA para lancamento beta publico, incluindo aprovacao Google OAuth para escopos sensiveis (Google Calendar API).

**Status Atual:** 🟡 85% Pronto (codigo 100%, acoes manuais pendentes)
**Meta:** 🟢 100% Pronto para Beta Launch
**Ultima Atualizacao:** 2026-02-13

### Infraestrutura Atual (Configurada)

| Servico | Dominio | Regiao | Status |
|---------|---------|--------|--------|
| `aica` (prod) | https://aica.guru | southamerica-east1 | ✅ Ativo |
| `aica-dev` (staging) | https://dev.aica.guru | us-central1 | ✅ Ativo |
| `aica-agents` (backend) | — | southamerica-east1 | ✅ Ativo |
| Firebase Hosting | aica-guru.web.app → aica.guru | Edge CDN | ✅ Ativo |
| Supabase | uzywajqzbdbrfammshdg.supabase.co | — | ✅ Ativo |

### Diagrama de Dependencias

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DEPENDENCIAS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌──────────────┐     ┌──────────────┐                                   │
│   │   EPICO 1    │     │   EPICO 2    │                                   │
│   │   Escopos    │     │   Dominio    │                                   │
│   │   OAuth      │     │   Proprio    │                                   │
│   │   ✅ FEITO   │     │   ✅ FEITO   │                                   │
│   └──────┬───────┘     └──────┬───────┘                                   │
│          │                    │                                            │
│          │    ┌───────────────┘                                            │
│          │    │                                                            │
│          ▼    ▼                                                            │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│   │   EPICO 3    │     │   EPICO 5    │     │   EPICO 4    │             │
│   │   Privacy    │◄────│   Branding   │     │    Video     │             │
│   │   Policy     │     │   Contato    │     │    Demo      │             │
│   │   ✅ FEITO   │     │   🔄 Parcial │     │   ⬜ Pendente │             │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘             │
│          │                    │                    │                      │
│          └────────────────────┼────────────────────┘                      │
│                               │                                            │
│                               ▼                                            │
│                        ┌──────────────┐                                   │
│                        │   EPICO 6    │                                   │
│                        │  Submissao   │                                   │
│                        │   Final      │                                   │
│                        │   ⬜ Pendente │                                   │
│                        └──────────────┘                                   │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Legenda de Status

| Simbolo | Significado |
|---------|-------------|
| ⬜ | Nao iniciado |
| 🔄 | Em progresso |
| ✅ | Concluido |
| 🚫 | Bloqueado |

---

## EPICO 1: Correcao de Escopos OAuth ✅ CONCLUIDO

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | ✅ CONCLUIDO |
| **Data Conclusao** | 2026-02-13 |

### O que foi feito

Removidos 2 escopos desnecessarios (`contacts.readonly`, `contacts.other.readonly`) que eram solicitados mas nunca usados. `googleContactsService.ts` e `contactSyncService.ts` sao dead code — nunca importados.

### Tarefas

- [x] **1.1** Analisar requisitos de escopo — apenas `calendar.readonly` e `userinfo.email` sao usados
- [x] **1.2** Atualizar `src/services/googleAuthService.ts` — removidos `GOOGLE_CONTACTS_SCOPES`, `ALL_GOOGLE_SCOPES` agora tem apenas 2 escopos
- [x] **1.3** Atualizar documentacao `docs/features/GOOGLE_CALENDAR_INTEGRATION.md` — corrigido storage (DB, nao localStorage), scopes atualizados
- [ ] **1.4** Testar fluxo OAuth com novos escopos em dev.aica.guru (precisa deploy staging)

### Escopos Finais

```
https://www.googleapis.com/auth/calendar.readonly   ← Leitura de eventos
https://www.googleapis.com/auth/userinfo.email       ← Email do usuario
```

### Dead Code Identificado (nao removido — baixa prioridade)

| Arquivo | Status |
|---------|--------|
| `src/services/googleContactsService.ts` | Dead code — nunca importado |
| `src/services/contactSyncService.ts` | Dead code — nunca importado |

---

## EPICO 2: Configuracao de Dominio Proprio ✅ CONCLUIDO

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | ✅ CONCLUIDO |
| **Data Conclusao** | 2026-02-11 |

### O que foi feito

- [x] Dominio `aica.guru` registrado na Hostinger
- [x] DNS configurado (A record, CNAMEs para dev e www)
- [x] Firebase Hosting como edge proxy para producao (aica.guru → Cloud Run SP)
- [x] Cloud Run domain mapping para dev (dev.aica.guru → aica-dev Iowa)
- [x] SSL/HTTPS provisionado automaticamente (Firebase + Cloud Run)
- [x] OAuth redirect URIs atualizados: `https://aica.guru/auth/callback`, `https://dev.aica.guru/auth/callback`
- [x] Supabase Auth Site URL atualizado para `https://aica.guru`
- [x] CORS em 10 Edge Functions atualizado com ambos dominios
- [x] `cloudbuild.yaml` atualizado com Step 4 (Firebase deploy automatico em prod)
- [x] Cloud Build SA com `roles/firebase.admin`

### Verificacao Search Console (PENDENTE)

- [ ] **2.1** Verificar dominio no Google Search Console (DNS TXT record)
- [ ] **2.2** Confirmar verificacao aprovada

---

## EPICO 3: Atualizacao da Politica de Privacidade ✅ CONCLUIDO

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | ✅ CONCLUIDO |
| **Data Conclusao** | 2026-02-13 |
| **Dependencias** | EPICO 1 (escopos definidos) |

### O que foi feito

- Nova secao 5 "Integracao com Google Calendar API" com 5 subsecoes: escopos, dados acessados/uso, armazenamento de tokens, revogacao, conformidade Google
- Link para Google API Services User Data Policy na secao e no Legal Framework
- Data fixa "13 de fevereiro de 2026" (removida data dinamica)
- Email atualizado para `contato@aica.guru` em ambas as paginas
- Terms of Service secao 7 atualizada com detalhes da integracao Google Calendar
- LGPD: secao 8 ja cobria todos os direitos exigidos, verificado OK

### Tarefas

- [x] **3.1** Adicionar secao Google Calendar API — escopos, uso de dados, armazenamento, revogacao
- [x] **3.2** Corrigir data de atualizacao (trocar data dinamica por fixa)
- [x] **3.3** Adicionar link para Google API Services User Data Policy
- [x] **3.4** Atualizar email de contato para `contato@aica.guru`
- [x] **3.5** Verificar conformidade LGPD

### Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| `src/pages/PrivacyPolicyPage.tsx` | Nova secao 5 Google Calendar, email, data fixa, link Google Policy |
| `src/pages/TermsOfServicePage.tsx` | Secao 7 detalhada, email, data fixa |

---

## EPICO 4: Criacao do Video de Demonstracao

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🔴 ALTA - BLOQUEANTE |
| **Esforco Estimado** | 4-6 horas |
| **Status** | ⬜ Nao iniciado |
| **Dependencias** | EPICO 1, EPICO 2 ✅ |

### Descricao

Google requer video de demonstracao para verificacao de escopos sensiveis. Deve mostrar fluxo OAuth completo, consent screen, e uso real dos dados.

### Tarefas

- [ ] **4.1** Preparar ambiente de demonstracao em aica.guru
- [ ] **4.2** Criar roteiro do video (3-5 min) — intro, fluxo OAuth, consent screen, uso real, desconexao
- [ ] **4.3** Gravar video em 1080p+ com OBS/Loom
- [ ] **4.4** Editar — zoom na consent screen, legendas, logo AICA
- [ ] **4.5** Upload no YouTube como "Nao listado"

### Configuracoes do YouTube

```
Titulo: AICA - Google Calendar Integration OAuth Demo
Descricao:
  Demonstracao do fluxo OAuth para integracao
  com Google Calendar na plataforma AICA.

  Website: https://aica.guru
  Privacy Policy: https://aica.guru/privacy

  Escopos: calendar.readonly, userinfo.email

Visibilidade: NAO LISTADO
```

---

## EPICO 5: Consistencia de Branding e Contato 🔄 PARCIAL

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🟡 MEDIA |
| **Status** | 🔄 Codigo concluido, acoes manuais pendentes |
| **Dependencias** | EPICO 2 ✅ |

### Descricao

Emails de contato unificados com `@aica.guru` em todo o codigo. Restam acoes manuais externas (Hostinger, Google Cloud Console).

### Tarefas

- [ ] **5.1** Configurar email `contato@aica.guru` (Hostinger email forwarding ou Google Workspace) — **MANUAL**
- [x] **5.2** ~~Atualizar footer~~ — MinimalFooter nao existe mais; LandingPage footer nao tem email (apenas links privacy/terms). Copyright atualizado para ano dinamico.
- [x] **5.3** Atualizar Privacy Policy — `contato@aica.guru` (feito no EPICO 3)
- [x] **5.4** Atualizar Terms of Service — `contato@aica.guru` (feito no EPICO 3)
- [ ] **5.5** Atualizar OAuth Consent Screen no Google Cloud Console — **MANUAL**
- [ ] **5.6** Verificar logo no OAuth consent screen — **MANUAL**
- [x] **5.7** Atualizar OAUTH_MATURITY_REPORT.md com status atual
- [x] **5.8** Zero ocorrencias de `comtxae.com` em codigo fonte (.tsx/.ts)

### URLs para OAuth Consent Screen (configurar manualmente)

```
App name: AICA - Life OS
Support email: contato@aica.guru
Homepage: https://aica.guru
Privacy Policy: https://aica.guru/privacy
Terms of Service: https://aica.guru/terms
Authorized domains: aica.guru
Logo: public/assets/images/logo-aica-blue.png
```

### Acoes Manuais Pendentes

1. **Hostinger**: Painel → Email → Criar `contato@aica.guru` (forwarding para email pessoal)
2. **Google Cloud Console**: APIs & Services → OAuth consent screen → Editar conforme URLs acima
3. **Google Search Console**: Verificar dominio `aica.guru` via DNS TXT record

### Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| `src/pages/PrivacyPolicyPage.tsx` | Email atualizado (EPICO 3) |
| `src/pages/TermsOfServicePage.tsx` | Email atualizado (EPICO 3) |
| `src/modules/onboarding/components/landing/LandingPage.tsx` | Copyright ano dinamico |
| `OAUTH_MATURITY_REPORT.md` | Relatorio atualizado com status corrente |

---

## EPICO 6: Preparacao e Submissao Final 🔄 PARCIAL

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| **Prioridade** | 🟡 MEDIA |
| **Status** | 🔄 Documentacao pronta, acoes manuais pendentes |
| **Dependencias** | TODOS os epicos anteriores |

### Tarefas

- [ ] **6.1** Criar conta de teste (`google-review@aica.guru`) com dados de exemplo — **MANUAL**
- [x] **6.2** Escrever justificativas detalhadas para cada escopo OAuth — `docs/GOOGLE_OAUTH_SUBMISSION_GUIDE.md`
- [ ] **6.3** Verificar dominio no Google Search Console — **MANUAL**
- [x] **6.4** Compilar documentacao de suporte (valores do formulario, roteiro video, FAQ) — `docs/GOOGLE_OAUTH_SUBMISSION_GUIDE.md`
- [ ] **6.5** Preencher formulario de verificacao no Google Cloud Console — **MANUAL**
- [x] **6.6** Revisao final — checklist pre-submissao compilado no guia
- [ ] **6.7** Submeter para verificacao — **MANUAL**

### Checklist Pre-Submissao

```
Infraestrutura:
  [x] Dominio proprio configurado (aica.guru)
  [x] SSL/HTTPS funcionando
  [ ] Dominio verificado no Google Search Console

Codigo:
  [x] Escopos OAuth sao minimos necessarios (calendar.readonly + userinfo.email)
  [x] Tratamento de erros OAuth implementado

Paginas Publicas:
  [x] Homepage acessivel: https://aica.guru
  [x] Privacy Policy atualizada: https://aica.guru/privacy
  [x] Terms of Service atualizado: https://aica.guru/terms

Privacy Policy:
  [x] Secao Google Calendar API
  [x] Escopos listados e explicados
  [x] Link para Google User Data Policy
  [x] Data fixa de atualizacao
  [x] Email de contato correto

OAuth Consent Screen:
  [ ] Nome: AICA - Life OS
  [ ] Logo configurado
  [ ] URLs corretas (homepage, privacy, terms)
  [ ] Support email: contato@aica.guru
  [ ] Authorized domains: aica.guru

Video de Demonstracao:
  [ ] Video gravado e editado
  [ ] YouTube "Nao listado"
  [ ] Consent screen claramente visivel

Credenciais de Teste:
  [ ] Conta de teste criada
  [ ] Dados de exemplo populados
```

---

## Timeline Estimado

```
Semana 1 (Sprint atual):
├── EPICO 1: Correcao de Escopos OAuth (4-6h)
├── EPICO 3: Privacy Policy (2-4h)
└── EPICO 5: Branding/Email (2-3h)

Semana 2:
├── EPICO 4: Video Demo (4-6h)
├── EPICO 6: Submissao (2-4h)
└── Aguardar revisao Google (3-5 dias uteis)
```

---

## Recursos Uteis

### Documentacao Google
- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [OAuth Consent Screen Configuration](https://developers.google.com/workspace/guides/configure-oauth-consent)

### Ferramentas
- [Google Search Console](https://search.google.com/search-console)
- [Google Cloud Console](https://console.cloud.google.com)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [YouTube Studio](https://studio.youtube.com)

---

*Documento criado: 02/01/2026*
*Ultima atualizacao: 11/02/2026*
